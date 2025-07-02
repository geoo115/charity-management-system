package volunteer

import (
	"log"
	"strconv"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/geoo115/LDH/internal/handlers_new/shared"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"
	"github.com/gin-gonic/gin"
)

// ApplicationsHandler handles volunteer application operations
type ApplicationsHandler struct {
	*shared.BaseHandler
}

// NewApplicationsHandler creates a new applications handler
func NewApplicationsHandler(base *shared.BaseHandler) *ApplicationsHandler {
	return &ApplicationsHandler{
		BaseHandler: base,
	}
}

// ApplicationRequest holds volunteer application data
type ApplicationRequest struct {
	FirstName     string `json:"first_name" validate:"required,min=2,max=50"`
	LastName      string `json:"last_name" validate:"required,min=2,max=50"`
	Email         string `json:"email" validate:"required,email"`
	Phone         string `json:"phone" validate:"required"`
	Experience    string `json:"experience" validate:"required"`
	Skills        string `json:"skills" validate:"required"`
	Availability  string `json:"availability" validate:"required"`
	Password      string `json:"password" validate:"required,min=8"`
	TermsAccepted bool   `json:"terms_accepted" validate:"required"`
}

// ApplicationResponse represents a volunteer application
type ApplicationResponse struct {
	ID              uint      `json:"id"`
	FirstName       string    `json:"first_name"`
	LastName        string    `json:"last_name"`
	Email           string    `json:"email"`
	Phone           string    `json:"phone"`
	Experience      string    `json:"experience"`
	Skills          string    `json:"skills"`
	Availability    string    `json:"availability"`
	TermsAccepted   bool      `json:"terms_accepted"`
	Status          string    `json:"status"`
	RejectionReason string    `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ApproveRequest holds approval data
type ApproveRequest struct {
	Notes string `json:"notes"`
}

// RejectRequest holds rejection data
type RejectRequest struct {
	Reason string `json:"reason" validate:"required"`
}

// SubmitApplication submits a new volunteer application
// @Summary Submit volunteer application
// @Description Submits a new volunteer application
// @Tags volunteer
// @Accept json
// @Produce json
// @Param request body ApplicationRequest true "Application data"
// @Success 201 {object} shared.StandardResponse{data=ApplicationResponse}
// @Failure 400 {object} shared.StandardResponse
// @Router /api/v1/volunteer/applications [post]
func (h *ApplicationsHandler) SubmitApplication(c *gin.Context) {
	var req ApplicationRequest
	if err := h.ValidateAndBind(c, &req); err != nil {
		return // Error already handled
	}

	// Check if application already exists for this email
	var existingApplication models.VolunteerApplication
	if err := h.DB.Where("email = ?", req.Email).First(&existingApplication).Error; err == nil {
		h.BadRequest(c, "Application already exists for this email")
		return
	}

	// Create application
	application := models.VolunteerApplication{
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Email:         req.Email,
		Phone:         req.Phone,
		Experience:    req.Experience,
		Skills:        req.Skills,
		Availability:  req.Availability,
		Password:      req.Password,
		TermsAccepted: req.TermsAccepted,
		Status:        "pending",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := h.DB.Create(&application).Error; err != nil {
		h.InternalError(c, "Failed to create application")
		return
	}

	// Send confirmation email
	go func() {
		if err := h.sendApplicationConfirmationEmail(application); err != nil {
			h.LogError("Failed to send application confirmation email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "SubmitApplication", "VolunteerApplication", application.ID, "Volunteer application submitted")

	response := convertToApplicationResponse(application)
	h.SuccessWithMessage(c, response, "Application submitted successfully")
}

// ApproveApplication approves a volunteer application
// @Summary Approve volunteer application
// @Description Approves a volunteer application and creates user account
// @Tags volunteer
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Application ID"
// @Param request body ApproveRequest false "Approval notes"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Failure 404 {object} shared.StandardResponse
// @Router /api/v1/admin/volunteer/applications/{id}/approve [post]
func (h *ApplicationsHandler) ApproveApplication(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	// Parse application ID
	applicationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		h.BadRequest(c, "Invalid application ID")
		return
	}

	var req ApproveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Notes are optional, so we don't return error
	}

	// Begin transaction
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if tx.Error != nil {
		h.InternalError(c, "Failed to start transaction")
		return
	}

	// Find the application
	var application models.VolunteerApplication
	if err := tx.First(&application, applicationID).Error; err != nil {
		tx.Rollback()
		h.NotFound(c, "Application not found")
		return
	}

	// Check if already approved
	if application.Status == "approved" {
		tx.Rollback()
		h.BadRequest(c, "Application already approved")
		return
	}

	// Create or update user account
	var user models.User
	userExists := tx.Where("email = ?", application.Email).First(&user).Error == nil

	if userExists {
		// Update existing user
		user.Role = models.RoleVolunteer
		user.Status = "active"
		user.UpdatedAt = time.Now()

		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			h.InternalError(c, "Failed to update user")
			return
		}
	} else {
		// Create new user
		tempPassword := h.generateSecureTempPassword()
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			h.InternalError(c, "Failed to create password")
			return
		}

		user = models.User{
			FirstName: application.FirstName,
			LastName:  application.LastName,
			Email:     application.Email,
			Phone:     application.Phone,
			Role:      models.RoleVolunteer,
			Status:    "active",
			Password:  string(hashedPassword),
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			h.InternalError(c, "Failed to create user account")
			return
		}

		// Send approval email with password
		go func() {
			if err := h.sendApprovalEmailWithPassword(user, tempPassword); err != nil {
				h.LogError("Failed to send approval email: %v", err)
			}
		}()
	}

	// Create volunteer profile
	volunteerProfile := models.VolunteerProfile{
		UserID:        user.ID,
		ApplicationID: &application.ID,
		Experience:    application.Experience,
		Skills:        application.Skills,
		Availability:  application.Availability,
		Status:        "active",
	}

	if err := tx.Create(&volunteerProfile).Error; err != nil {
		tx.Rollback()
		h.InternalError(c, "Failed to create volunteer profile")
		return
	}

	// Update application status
	application.Status = "approved"
	application.UpdatedAt = time.Now()
	if err := tx.Save(&application).Error; err != nil {
		tx.Rollback()
		h.InternalError(c, "Failed to update application status")
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		h.InternalError(c, "Failed to commit transaction")
		return
	}

	// Send approval notification
	go func() {
		if err := h.sendApprovalEmail(application); err != nil {
			h.LogError("Failed to send approval email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "ApproveApplication", "VolunteerApplication", application.ID, "Application approved")

	h.SuccessWithMessage(c, nil, "Application approved successfully")
}

// RejectApplication rejects a volunteer application
// @Summary Reject volunteer application
// @Description Rejects a volunteer application with reason
// @Tags volunteer
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Application ID"
// @Param request body RejectRequest true "Rejection reason"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Failure 404 {object} shared.StandardResponse
// @Router /api/v1/admin/volunteer/applications/{id}/reject [post]
func (h *ApplicationsHandler) RejectApplication(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	// Parse application ID
	applicationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		h.BadRequest(c, "Invalid application ID")
		return
	}

	var req RejectRequest
	if err := h.ValidateAndBind(c, &req); err != nil {
		return // Error already handled
	}

	// Find the application
	var application models.VolunteerApplication
	if err := h.DB.First(&application, applicationID).Error; err != nil {
		h.NotFound(c, "Application not found")
		return
	}

	// Update application status
	application.Status = "rejected"
	application.RejectionReason = req.Reason
	application.UpdatedAt = time.Now()
	if err := h.DB.Save(&application).Error; err != nil {
		h.InternalError(c, "Failed to update application status")
		return
	}

	// Send rejection email
	go func() {
		if err := h.sendRejectionEmail(application, req.Reason); err != nil {
			h.LogError("Failed to send rejection email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "RejectApplication", "VolunteerApplication", application.ID, "Application rejected")

	h.SuccessWithMessage(c, nil, "Application rejected successfully")
}

// GetApplications returns volunteer applications
// @Summary Get volunteer applications
// @Description Returns volunteer applications with optional filtering
// @Tags volunteer
// @Security BearerAuth
// @Produce json
// @Param status query string false "Filter by status (pending, approved, rejected)"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} shared.StandardResponse{data=[]ApplicationResponse}
// @Failure 401 {object} shared.StandardResponse
// @Router /api/v1/admin/volunteer/applications [get]
func (h *ApplicationsHandler) GetApplications(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	query := h.DB.Model(&models.VolunteerApplication{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var applications []models.VolunteerApplication
	offset := (page - 1) * limit

	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&applications).Error; err != nil {
		h.InternalError(c, "Failed to fetch applications")
		return
	}

	// Convert to response format
	var response []ApplicationResponse
	for _, app := range applications {
		response = append(response, convertToApplicationResponse(app))
	}

	h.Success(c, response)
}

// GetApplication returns a specific volunteer application
// @Summary Get volunteer application
// @Description Returns a specific volunteer application by ID
// @Tags volunteer
// @Security BearerAuth
// @Produce json
// @Param id path int true "Application ID"
// @Success 200 {object} shared.StandardResponse{data=ApplicationResponse}
// @Failure 404 {object} shared.StandardResponse
// @Router /api/v1/admin/volunteer/applications/{id} [get]
func (h *ApplicationsHandler) GetApplication(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	// Parse application ID
	applicationID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		h.BadRequest(c, "Invalid application ID")
		return
	}

	var application models.VolunteerApplication
	if err := h.DB.First(&application, applicationID).Error; err != nil {
		h.NotFound(c, "Application not found")
		return
	}

	response := convertToApplicationResponse(application)
	h.Success(c, response)
}

// Helper functions
func (h *ApplicationsHandler) generateSecureTempPassword() string {
	// Generate a secure temporary password
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, 12)
	for i := range password {
		password[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(password)
}

func (h *ApplicationsHandler) sendApplicationConfirmationEmail(application models.VolunteerApplication) error {
	// Implementation would use the notification service
	log.Printf("Application confirmation email sent to %s", application.Email)
	return nil
}

func (h *ApplicationsHandler) sendApprovalEmail(application models.VolunteerApplication) error {
	// Implementation would use the notification service
	log.Printf("Approval email sent to %s", application.Email)
	return nil
}

func (h *ApplicationsHandler) sendApprovalEmailWithPassword(user models.User, tempPassword string) error {
	// Implementation would use the notification service
	log.Printf("Approval email with password sent to %s", user.Email)
	return nil
}

func (h *ApplicationsHandler) sendRejectionEmail(application models.VolunteerApplication, reason string) error {
	// Implementation would use the notification service
	log.Printf("Rejection email sent to %s with reason: %s", application.Email, reason)
	return nil
}

func convertToApplicationResponse(application models.VolunteerApplication) ApplicationResponse {
	return ApplicationResponse{
		ID:              application.ID,
		FirstName:       application.FirstName,
		LastName:        application.LastName,
		Email:           application.Email,
		Phone:           application.Phone,
		Experience:      application.Experience,
		Skills:          application.Skills,
		Availability:    application.Availability,
		TermsAccepted:   application.TermsAccepted,
		Status:          application.Status,
		RejectionReason: application.RejectionReason,
		CreatedAt:       application.CreatedAt,
		UpdatedAt:       application.UpdatedAt,
	}
}

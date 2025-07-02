package visitor

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db" // Add this import
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils" // Add this import

	"github.com/geoo115/charity-management-system/internal/notifications"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
)

// LegacyHelpRequestRequest maintains backward compatibility with older request formats
type LegacyHelpRequestRequest struct {
	VisitorName  string `json:"visitor_name" binding:"required"`
	ContactEmail string `json:"contact_email" binding:"required,email"`
	ContactPhone string `json:"contact_phone" binding:"required"`
	Postcode     string `json:"postcode" binding:"required"`
	Category     string `json:"category"` // Make category optional since it's missing from frontend
	Details      string `json:"details" binding:"required"`
}

// HelpRequestRequest represents the modern request format matching frontend field names
type HelpRequestRequest struct {
	Category      string `json:"category" binding:"required"`
	Details       string `json:"details" binding:"required"`
	VisitDay      string `json:"visit_day" binding:"required"`
	TimeSlot      string `json:"time_slot" binding:"required"`
	UrgencyLevel  string `json:"urgency_level"`
	HouseholdSize int    `json:"household_size"`
	SpecialNeeds  string `json:"special_needs"`
}

type UpdateHelpRequestRequest struct {
	Status           string     `json:"status" binding:"omitempty,oneof=New InProgress Assigned Fulfilled Closed"`
	AssignedDatetime *time.Time `json:"assigned_datetime"`
	AssignedStaffID  *uint      `json:"assigned_staff_id"` // New: assign staff
}

// HandleLegacyRequest processes the older format of help request
func HandleLegacyRequest(c *gin.Context) {
	// First, read the raw body for logging in case of errors
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to read request body",
			"message": err.Error(),
		})
		return
	}

	// Log the raw body for debugging
	log.Printf("Help request raw body: %s", string(bodyBytes))

	// Reset the request body for binding
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	var req LegacyHelpRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Add more detailed error logging to debug the issue
		log.Printf("Help request binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    err.Error(),
			"message":  "Invalid help request data",
			"received": string(bodyBytes),
		})
		return
	}

	// Log successful binding
	log.Printf("Successfully bound help request: %+v", req)

	// Set a default category if none was provided
	if req.Category == "" {
		req.Category = "General"
	}

	helpRequest := models.HelpRequest{
		VisitorName: req.VisitorName,
		Email:       req.ContactEmail, // Corrected field name
		Phone:       req.ContactPhone, // Corrected field name
		Postcode:    req.Postcode,
		Category:    req.Category,
		Details:     req.Details,
		Status:      "New",
	}

	if err := db.DB.Create(&helpRequest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create help request"})
		return
	}

	// Generate a reference number (could be more sophisticated in production)
	reference := "HR-" + strconv.FormatUint(uint64(helpRequest.ID), 10)

	c.JSON(http.StatusCreated, gin.H{
		"id":        helpRequest.ID,
		"status":    helpRequest.Status,
		"reference": reference,
	})
}

// ListHelpRequests returns a list of help requests for admin with pagination and visitor details
func ListHelpRequests(c *gin.Context) {
	// Get query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	status := c.Query("status")
	category := c.Query("category")
	priority := c.Query("priority")
	search := c.Query("search")

	// Ensure page is at least 1
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Build query
	query := db.DB.Model(&models.HelpRequest{}).Preload("Visitor")

	// Apply filters
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}
	if category != "" && category != "all" {
		query = query.Where("category = ?", category)
	}
	if priority != "" && priority != "all" {
		query = query.Where("priority = ?", priority)
	}
	if search != "" {
		query = query.Where("reference LIKE ? OR visitor_name LIKE ? OR email LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count help requests"})
		return
	}

	// Get paginated results
	var helpRequests []models.HelpRequest
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&helpRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve help requests"})
		return
	}

	// Transform to include visitor details in expected format
	var responseData []gin.H
	for _, req := range helpRequests {
		// Get visitor details
		var visitor models.User
		db.DB.First(&visitor, req.VisitorID)

		responseData = append(responseData, gin.H{
			"id":                   req.ID,
			"visitor_id":           req.VisitorID,
			"visitor_name":         req.VisitorName,
			"category":             req.Category,
			"reference":            req.Reference,
			"status":               req.Status,
			"priority":             req.Priority,
			"details":              req.Details,
			"visit_day":            req.VisitDay,
			"time_slot":            req.TimeSlot,
			"household_size":       req.HouseholdSize,
			"special_requirements": req.SpecialNeeds,
			"created_at":           req.CreatedAt,
			"updated_at":           req.UpdatedAt,
			"approved_at":          req.ApprovedAt,
			"ticket_number":        req.TicketNumber,
			"qr_code":              req.QRCode,
			"visitor": gin.H{
				"id":         visitor.ID,
				"first_name": visitor.FirstName,
				"last_name":  visitor.LastName,
				"email":      visitor.Email,
				"phone":      visitor.Phone,
			},
		})
	}

	// Calculate pagination info
	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": responseData,
		"pagination": gin.H{
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": totalPages,
		},
	})
}

// UpdateHelpRequest updates a help request's status and/or assignment
func UpdateHelpRequest(c *gin.Context) {
	id := c.Param("id")

	var helpRequest models.HelpRequest
	if err := db.DB.First(&helpRequest, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "help request not found"})
		return
	}

	// Store the original status for comparison later
	originalStatus := helpRequest.Status

	// Log the raw request for debugging
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	log.Printf("Update help request raw body: %s", string(bodyBytes))

	var req UpdateHelpRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "Invalid request data: " + err.Error(),
			"received": string(bodyBytes),
		})
		return
	}

	updates := make(map[string]interface{})

	if req.Status != "" {
		updates["status"] = req.Status
	}

	if req.AssignedDatetime != nil {
		updates["assigned_datetime"] = req.AssignedDatetime
	}

	if req.AssignedStaffID != nil {
		updates["assigned_staff_id"] = req.AssignedStaffID
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "No valid fields to update",
			"received": string(bodyBytes),
		})
		return
	}

	if err := db.DB.Model(&helpRequest).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update help request"})
		return
	}

	// Check if status changed to InProgress and send notification
	if req.Status == "InProgress" && originalStatus != "InProgress" {
		// Get the full updated help request with all fields for the email
		db.DB.First(&helpRequest, id)

		// Send notification about status change (non-blocking)
		go func() {
			if err := sendHelpRequestInProgressEmail(helpRequest); err != nil {
				log.Printf("Failed to send help request in-progress email: %v", err)
			}
		}()
	}

	// Use the shared createAuditLog function
	description := "Updated help request"
	if req.Status != "" {
		description = "Updated help request status to " + req.Status
	}
	utils.CreateAuditLog(c, "Update", "HelpRequest", helpRequest.ID, description)

	c.JSON(http.StatusOK, helpRequest)
}

// GetTimeSlots returns available time slots for help requests
func GetTimeSlots(c *gin.Context) {
	date := c.Query("date")
	category := c.Query("category")

	if date == "" || category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date and category are required"})
		return
	}

	// Parse the date
	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format"})
		return
	}

	// Get day of week
	dayOfWeek := parsedDate.Weekday()

	// Validate allowed days (Tue, Wed, Thu)
	if dayOfWeek != time.Tuesday && dayOfWeek != time.Wednesday && dayOfWeek != time.Thursday {
		c.JSON(http.StatusBadRequest, gin.H{"error": "appointments are only available on Tuesday, Wednesday, and Thursday"})
		return
	}

	// Define time slot range based on category (handle both cases)
	var startHour, startMinute, endHour, endMinute int
	categoryLower := strings.ToLower(category)
	switch categoryLower {
	case "food":
		// Food Support: 11:30am – 2:30pm
		startHour, startMinute = 11, 30
		endHour, endMinute = 14, 30
	case "general":
		// General Support: 10:30am – 2:30pm
		startHour, startMinute = 10, 30
		endHour, endMinute = 14, 30
	default:
		// Default fallback
		startHour, startMinute = 10, 30
		endHour, endMinute = 14, 30
	}

	slotInterval := 10 // minutes
	maxVisitorsPerSlot := 2

	// Query database for existing bookings
	var bookings []models.HelpRequest
	if err := db.DB.Where("visit_day = ? AND category = ?", date, category).Find(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check existing bookings"})
		return
	}

	// Create map to count bookings per time slot
	bookingCounts := make(map[string]int)
	for _, booking := range bookings {
		bookingCounts[booking.TimeSlot]++
	}

	// Generate time slots based on category-specific hours
	var timeSlots []gin.H

	// Convert start and end times to minutes for easier calculation
	startTotalMinutes := startHour*60 + startMinute
	endTotalMinutes := endHour*60 + endMinute

	// Generate slots at 10-minute intervals
	for totalMinutes := startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += slotInterval {
		hour := totalMinutes / 60
		minute := totalMinutes % 60
		timeStr := fmt.Sprintf("%02d:%02d", hour, minute)

		// Count how many bookings exist for this time slot
		booked := bookingCounts[timeStr]

		timeSlots = append(timeSlots, gin.H{
			"time":      timeStr,
			"available": booked < maxVisitorsPerSlot,
			"capacity":  maxVisitorsPerSlot,
			"booked":    booked,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"available":  true,
		"time_slots": timeSlots,
		"date":       date,
		"category":   category,
	})
}

// generateHelpRequestReference generates a unique reference number for help requests
func generateHelpRequestReference() string {
	now := time.Now()
	random := rand.Intn(999)
	return fmt.Sprintf("HR-%d%02d%02d-%03d", now.Year(), now.Month(), now.Day(), random)
}

// CheckVisitor checks if a visitor has requested help within the past week and returns visit history
func CheckVisitor(c *gin.Context) {
	var request struct {
		Email string `json:"email"`
		Phone string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Check for recent requests (within 7 days)
	oneWeekAgo := time.Now().AddDate(0, 0, -7)

	var count int64
	if err := db.DB.Model(&models.HelpRequest{}).
		Where("(email = ? OR phone = ?) AND created_at > ?",
			request.Email, request.Phone, oneWeekAgo).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check visitor history"})
		return
	}

	// Check if this is a first-time visitor
	var totalCount int64
	if err := db.DB.Model(&models.HelpRequest{}).
		Where("email = ? OR phone = ?", request.Email, request.Phone).
		Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check visitor history"})
		return
	}

	// Get previous visits (limited to last 5)
	var previousVisits []struct {
		CreatedAt time.Time `json:"date"`
		Category  string    `json:"category"`
		Status    string    `json:"status"`
	}

	if totalCount > 0 {
		if err := db.DB.Model(&models.HelpRequest{}).
			Select("created_at, category, status").
			Where("email = ? OR phone = ?", request.Email, request.Phone).
			Order("created_at DESC").
			Limit(5).
			Scan(&previousVisits).Error; err != nil {
			// Log the error but don't fail the request
			log.Printf("Failed to fetch previous visits: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"hasRequestedRecently": count > 0,
		"isFirstTimeVisitor":   totalCount == 0,
		"previousVisits":       previousVisits,
	})
}

// CreateHelpRequest creates a new help request using the modern request format
func CreateHelpRequest(c *gin.Context) {
	var request HelpRequestRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("CreateHelpRequest error: %v, endpoint: %s, payload: %+v", err, c.FullPath(), request)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Get authenticated user ID
	visitorID := utils.GetUserIDFromContext(c)
	if visitorID == 0 {
		log.Printf("CreateHelpRequest error: no authenticated user found")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized access",
		})
		return
	}

	// Check visit eligibility
	if err := shared.CheckVisitEligibility(visitorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Visit eligibility check failed: %v", err),
		})
		return
	}

	// Check daily capacity
	if err := shared.CheckDailyCapacity(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Daily capacity exceeded",
		})
		return
	}

	ticketNumber := shared.GenerateTicketNumber()
	qrCode, err := shared.GenerateQRCode(ticketNumber)
	if err != nil {
		log.Printf("Failed to generate QR code: %v", err)
		qrCode = "" // Continue without QR code
	}

	// Get user details for the help request
	var user models.User
	if err := db.DB.First(&user, visitorID).Error; err != nil {
		log.Printf("CreateHelpRequest error: failed to get user %d: %v", visitorID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Internal server error",
		})
		return
	}

	// Generate reference number
	reference := generateHelpRequestReference()

	// Create help request record
	helpRequest := models.HelpRequest{
		VisitorID:     visitorID,
		VisitorName:   user.FirstName + " " + user.LastName,
		Email:         user.Email,
		Phone:         user.Phone,
		Postcode:      user.Postcode,
		Category:      request.Category,
		Details:       request.Details,
		VisitDay:      request.VisitDay,
		TimeSlot:      request.TimeSlot,
		HouseholdSize: request.HouseholdSize,
		SpecialNeeds:  request.SpecialNeeds,
		Priority:      request.UrgencyLevel,
		Reference:     reference,
		Status:        models.HelpRequestStatusPending,
		RequestDate:   time.Now(),
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Set ticket details
	helpRequest.TicketNumber = ticketNumber
	helpRequest.QRCode = qrCode

	// If visitor is eligible for Food or General help and daily capacity allows, auto-approve and issue ticket
	if request.Category == "Food" || request.Category == "General" {
		// Auto-approve and issue ticket
		helpRequest.Status = models.HelpRequestStatusTicketIssued

		// Set approval timestamp
		now := time.Now()
		helpRequest.ApprovedAt = &now
		helpRequest.EligibilityNotes = "Auto-approved: Visit eligibility and daily capacity checks passed"

		log.Printf("Auto-issuing ticket for eligible visitor %d: ticket=%s", visitorID, ticketNumber)
	} else if shared.CheckVisitEligibility(visitorID) != nil {
		log.Printf("Visitor %d requires manual review for %s category", visitorID, request.Category)
	}

	// Save the help request
	if err := db.DB.Create(&helpRequest).Error; err != nil {
		log.Printf("Error creating help request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create help request",
		})
		return
	}

	// Update daily capacity if ticket was issued
	if helpRequest.Status == models.HelpRequestStatusTicketIssued {
		visitDay, _ := time.Parse("2006-01-02", helpRequest.VisitDay)
		if err := shared.UpdateDailyCapacity(visitDay, helpRequest.Category, 1); err != nil {
			log.Printf("Failed to update daily capacity: %v", err)
		}
	}

	// Generate reference code
	referenceCode := fmt.Sprintf("HR-%s-%d", helpRequest.Category[:1], helpRequest.ID)

	// Update the reference code in the database
	if err := db.DB.Model(&helpRequest).Update("reference", referenceCode).Error; err != nil {
		log.Printf("Failed to update reference code: %v", err)
		// Continue anyway since it's not critical
	}

	// Set reference code in struct for email notification
	helpRequest.Reference = referenceCode

	// If ticket was auto-issued, update daily capacity
	if helpRequest.Status == models.HelpRequestStatusTicketIssued {
		visitDay, _ := time.Parse("2006-01-02", helpRequest.VisitDay)
		if err := shared.UpdateDailyCapacity(visitDay, helpRequest.Category, 1); err != nil {
			log.Printf("Failed to update daily capacity: %v", err)
		}
	}

	// Send appropriate notification email (non-blocking)
	go func() {
		if helpRequest.Status == models.HelpRequestStatusTicketIssued {
			// Send ticket issued notification
			if err := sendTicketIssuedNotificationDirect(helpRequest); err != nil {
				log.Printf("Failed to send ticket issued notification: %v", err)
			}
		} else {
			// Send regular confirmation email
			if err := sendHelpRequestConfirmationEmail(helpRequest); err != nil {
				log.Printf("Failed to send help request confirmation email: %v", err)
			}
		}
	}()

	// Prepare response based on whether ticket was issued
	response := gin.H{
		"id":             helpRequest.ID,
		"reference_code": referenceCode,
		"status":         helpRequest.Status,
		"message":        "Help request created successfully",
	}

	if helpRequest.Status == models.HelpRequestStatusTicketIssued {
		response["ticket_number"] = helpRequest.TicketNumber
		response["qr_code"] = helpRequest.QRCode
		response["message"] = "Help request created and ticket issued automatically"
		response["auto_approved"] = true
	}

	c.JSON(http.StatusCreated, response)
}

// Update the sendHelpRequestConfirmationEmail function to use the global notification service
func sendHelpRequestConfirmationEmail(helpRequest models.HelpRequest) error {
	// Get the notification service
	notificationService := notifications.GetService()
	if notificationService == nil {
		return fmt.Errorf("notification service is not initialized")
	}

	// Send the confirmation email
	return notificationService.SendHelpRequestNotification(helpRequest, notifications.HelpRequestSubmitted)
}

// Update the sendHelpRequestInProgressEmail function to use the global notification service
func sendHelpRequestInProgressEmail(helpRequest models.HelpRequest) error {
	// Get the notification service
	notificationService := notifications.GetService()
	if notificationService == nil {
		return fmt.Errorf("notification service is not initialized")
	}

	// Send the in-progress email
	return notificationService.SendHelpRequestNotification(helpRequest, notifications.HelpRequestInProgress)
}

// GetAvailableDays returns available operating days for help requests
func GetAvailableDays(c *gin.Context) {
	category := c.Query("category")
	log.Printf("GetAvailableDays called with category: %s", category)

	if category == "" {
		category = "food" // Default to food if not specified
		log.Printf("No category specified, defaulting to: %s", category)
	}

	// Get next 14 days that are operating days
	var availableDays []string
	today := time.Now()

	for i := 0; i < 14; i++ {
		checkDate := today.AddDate(0, 0, i)
		// Operating days are Tuesday, Wednesday, Thursday
		if checkDate.Weekday() >= time.Tuesday && checkDate.Weekday() <= time.Thursday {
			availableDays = append(availableDays, checkDate.Format("2006-01-02"))
		}
	}

	log.Printf("Returning %d available days: %v", len(availableDays), availableDays)
	c.JSON(http.StatusOK, gin.H{
		"available_days": availableDays,
		"category":       category,
	})
}

// CancelHelpRequest cancels a help request
func CancelHelpRequest(c *gin.Context) {
	helpRequestID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert helpRequestID to uint
	id, err := strconv.ParseUint(helpRequestID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid help request ID"})
		return
	}

	var helpRequest models.HelpRequest
	if err := db.DB.First(&helpRequest, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Help request not found"})
		return
	}

	// Check if user owns this help request or is admin/staff
	userRole, _ := c.Get("userRole")
	if helpRequest.VisitorID != userID.(uint) &&
		userRole != models.RoleAdmin && userRole != "staff" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to cancel this help request"})
		return
	}

	// Check if help request can be cancelled
	if helpRequest.Status == models.HelpRequestStatusCancelled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Help request is already cancelled"})
		return
	}

	if helpRequest.Status == models.HelpRequestStatusCompleted {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel a completed help request"})
		return
	}

	// Get cancellation reason from request body (optional)
	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	// Begin transaction
	tx := db.DB.Begin()

	// Update help request status
	now := time.Now()
	helpRequest.Status = models.HelpRequestStatusCancelled
	helpRequest.UpdatedAt = now

	if err := tx.Save(&helpRequest).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel help request"})
		return
	}

	// If ticket was issued, mark it as cancelled
	if helpRequest.TicketNumber != "" {
		// Update any associated visit records
		var visit models.Visit
		if err := tx.Where("ticket_id = ?", helpRequest.ID).First(&visit).Error; err == nil {
			visit.Status = "cancelled"
			visit.UpdatedAt = now
			tx.Save(&visit)
		}
	}

	// Free up capacity for the visit day if ticket was issued
	if helpRequest.TicketNumber != "" {
		visitDate, err := time.Parse("2006-01-02", helpRequest.VisitDay)
		if err == nil {
			var capacity models.VisitCapacity
			if err := tx.Where("date = ?", visitDate).First(&capacity).Error; err == nil {
				switch helpRequest.Category {
				case models.CategoryFood:
					if capacity.CurrentFoodVisits > 0 {
						capacity.CurrentFoodVisits--
					}
				case models.CategoryGeneral:
					if capacity.CurrentGeneralVisits > 0 {
						capacity.CurrentGeneralVisits--
					}
				}
				capacity.UpdatedAt = now
				tx.Save(&capacity)
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete cancellation"})
		return
	}

	// Send cancellation notification (async)
	go func() {
		var user models.User
		if err := db.DB.First(&user, helpRequest.VisitorID).Error; err == nil {
			notificationService := notifications.GetService()
			if notificationService != nil {
				data := notifications.NotificationData{
					To:               user.Email,
					Subject:          "Help Request Cancelled",
					TemplateType:     "help_request_cancelled",
					NotificationType: notifications.EmailNotification,
					TemplateData: map[string]interface{}{
						"Name":      user.FirstName + " " + user.LastName,
						"Reference": helpRequest.Reference,
						"Category":  helpRequest.Category,
						"Reason":    req.Reason,
					},
				}

				if err := notificationService.SendNotification(data, user); err != nil {
					log.Printf("Failed to send cancellation notification: %v", err)
				}
			}
		}
	}()

	// Create audit log
	auditMessage := fmt.Sprintf("Help request %s cancelled", helpRequest.Reference)
	if req.Reason != "" {
		auditMessage += fmt.Sprintf(" - Reason: %s", req.Reason)
	}
	utils.CreateAuditLog(c, "Cancel", "HelpRequest", helpRequest.ID, auditMessage)

	c.JSON(http.StatusOK, gin.H{
		"message": "Help request cancelled successfully",
		"help_request": gin.H{
			"id":           helpRequest.ID,
			"reference":    helpRequest.Reference,
			"status":       helpRequest.Status,
			"cancelled_at": now,
		},
		"next_steps": []string{
			"You can submit a new help request when needed",
			"Contact us if you have any questions",
		},
	})
}

// GetHelpRequestDetails retrieves detailed information about a specific help request for admin dashboard
func GetHelpRequestDetails(c *gin.Context) {
	id := c.Param("id")

	var helpRequest models.HelpRequest
	if err := db.DB.Preload("Visitor").First(&helpRequest, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Help request not found"})
		return
	}

	c.JSON(http.StatusOK, helpRequest)
}

// UpdateHelpRequestStatus updates only the status of a help request
func UpdateHelpRequestStatus(c *gin.Context) {
	id := c.Param("id")

	var helpRequest models.HelpRequest
	if err := db.DB.First(&helpRequest, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Help request not found"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=New Pending InProgress Assigned Approved Fulfilled Closed Rejected"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store original status for notifications
	originalStatus := helpRequest.Status

	// Update the status
	if err := db.DB.Model(&helpRequest).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update help request status"})
		return
	}

	// Send notification if status changed to InProgress
	if req.Status == "InProgress" && originalStatus != "InProgress" {
		go func() {
			// Reload with visitor data for email
			db.DB.Preload("Visitor").First(&helpRequest, id)
			if err := sendHelpRequestInProgressEmail(helpRequest); err != nil {
				log.Printf("Failed to send help request in-progress email: %v", err)
			}
		}()
	}

	// Create audit log
	utils.CreateAuditLog(c, "Update", "HelpRequest", helpRequest.ID,
		fmt.Sprintf("Status updated from %s to %s", originalStatus, req.Status))

	c.JSON(http.StatusOK, helpRequest)
}

// AssignVolunteerToRequest assigns a volunteer to a help request
func AssignVolunteerToRequest(c *gin.Context) {
	requestID := c.Param("id")

	var req struct {
		VolunteerID uint `json:"volunteer_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID for audit trail
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin authentication required"})
		return
	}

	// Find the help request
	var helpRequest models.HelpRequest
	if err := db.DB.Preload("Visitor").First(&helpRequest, requestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Help request not found"})
		return
	}

	// Find the volunteer
	var volunteer models.User
	if err := db.DB.Where("id = ? AND role = ?", req.VolunteerID, models.RoleVolunteer).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer not found"})
		return
	}

	// Check if volunteer is active
	if volunteer.Status != models.StatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Volunteer is not active"})
		return
	}

	// Update help request with volunteer assignment
	now := time.Now()
	adminIDVal := adminID.(uint)
	updates := map[string]interface{}{
		"assigned_staff_id": req.VolunteerID,
		"assigned_datetime": &now,
		"status":            "Assigned",
		"updated_at":        now,
	}

	if err := db.DB.Model(&helpRequest).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign volunteer"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Assign", "HelpRequest", helpRequest.ID,
		fmt.Sprintf("Assigned volunteer %s %s (ID: %d) by admin %d",
			volunteer.FirstName, volunteer.LastName, volunteer.ID, adminIDVal))

	// Send notification to volunteer (async)
	go func() {
		notificationService := notifications.GetService()
		if notificationService != nil {
			data := notifications.NotificationData{
				To:               volunteer.Email,
				Subject:          "New Help Request Assignment",
				TemplateType:     "volunteer_assignment",
				NotificationType: notifications.EmailNotification,
				TemplateData: map[string]interface{}{
					"VolunteerName":    volunteer.FirstName + " " + volunteer.LastName,
					"RequestID":        helpRequest.ID,
					"VisitorName":      helpRequest.Visitor.FirstName + " " + helpRequest.Visitor.LastName,
					"Category":         helpRequest.Category,
					"Details":          helpRequest.Details,
					"OrganizationName": "Lewisham Charity",
				},
			}
			if err := notificationService.SendNotification(data, volunteer); err != nil {
				log.Printf("Failed to send volunteer assignment notification: %v", err)
			}
		}
	}()

	// Return updated help request
	db.DB.Preload("Visitor").First(&helpRequest, requestID)
	c.JSON(http.StatusOK, helpRequest)
}

// sendTicketIssuedNotificationDirect sends a direct notification when a ticket is auto-issued during help request creation
func sendTicketIssuedNotificationDirect(helpRequest models.HelpRequest) error {
	// Get the notification service
	notificationService := notifications.GetService()
	if notificationService == nil {
		return fmt.Errorf("notification service is not initialized")
	}

	// Get user details for the visitor
	var user models.User
	if err := db.DB.First(&user, helpRequest.VisitorID).Error; err != nil {
		return fmt.Errorf("failed to find user for ticket notification: %v", err)
	}

	// Prepare notification data for ticket issued email
	data := notifications.NotificationData{
		To:               user.Email,
		Subject:          "Your Visit Ticket is Ready - " + helpRequest.TicketNumber,
		TemplateType:     "ticket_issued",
		NotificationType: notifications.EmailNotification,
		TemplateData: map[string]interface{}{
			"Name":             user.FirstName + " " + user.LastName,
			"TicketNumber":     helpRequest.TicketNumber,
			"Reference":        helpRequest.Reference,
			"Category":         helpRequest.Category,
			"VisitDay":         helpRequest.VisitDay,
			"TimeSlot":         helpRequest.TimeSlot,
			"QRCode":           helpRequest.QRCode,
			"Instructions":     shared.GetVisitInstructions(),
			"Requirements":     shared.GetVisitRequirements(),
			"OrganizationName": "Lewisham Donation Hub",
		},
	}

	// Send the notification
	if err := notificationService.SendNotification(data, user); err != nil {
		return fmt.Errorf("failed to send ticket issued notification: %v", err)
	}

	return nil
}

// DownloadHelpRequestTicket generates and downloads a ticket PDF for a help request
func DownloadHelpRequestTicket(c *gin.Context) {
	// Get help request ID
	requestID := c.Param("id")
	requestIDInt, err := strconv.ParseUint(requestID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid help request ID",
		})
		return
	}

	// Get current user ID for access validation
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Get help request with visitor details
	var helpRequest models.HelpRequest
	if err := db.DB.Preload("Visitor").Where("id = ? AND visitor_id = ?", requestIDInt, userID).First(&helpRequest).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Help request not found or access denied",
		})
		return
	}

	// Check if help request has a ticket
	if helpRequest.TicketNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No ticket available for this help request",
		})
		return
	}

	// Generate simple ticket content (in a real implementation, you'd use a PDF library)
	ticketContent := fmt.Sprintf(`
VISIT TICKET
============

Ticket Number: %s
Reference: %s
Visitor: %s %s
Category: %s
Visit Date: %s
Time Slot: %s
Status: %s

INSTRUCTIONS:
- Arrive 15 minutes before your appointment time
- Bring valid photo ID and proof of address
- Show this ticket at reception for check-in
- Location: Lewisham Donation Hub, 123 Community Road, SE13 7XX

QR Code: %s

Generated on: %s
	`,
		helpRequest.TicketNumber,
		helpRequest.Reference,
		helpRequest.Visitor.FirstName,
		helpRequest.Visitor.LastName,
		helpRequest.Category,
		helpRequest.VisitDay,
		helpRequest.TimeSlot,
		helpRequest.Status,
		helpRequest.QRCode,
		time.Now().Format("2006-01-02 15:04:05"),
	)

	// Set response headers for download
	c.Header("Content-Type", "text/plain")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"ticket-%s.txt\"", helpRequest.TicketNumber))

	// Return the ticket content
	c.String(http.StatusOK, ticketContent)
}

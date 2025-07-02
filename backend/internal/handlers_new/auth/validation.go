package auth

import (
	"fmt"
	"log"
	"time"

	"github.com/geoo115/charity-management-system/internal/auth"
	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"
	"github.com/gin-gonic/gin"
)

// ValidationHandler handles token validation and password reset operations
type ValidationHandler struct {
	*shared.BaseHandler
}

// NewValidationHandler creates a new validation handler
func NewValidationHandler(base *shared.BaseHandler) *ValidationHandler {
	return &ValidationHandler{
		BaseHandler: base,
	}
}

// ForgotPasswordRequest holds the forgot password request data
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest holds the password reset data
type ResetPasswordRequest struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

// VerifyEmailRequest holds the email verification data
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

// ValidateToken validates a JWT token
// @Summary Validate token
// @Description Validates a JWT token and returns user information
// @Tags auth
// @Accept json
// @Produce json
// @Param token query string true "JWT token"
// @Success 200 {object} shared.StandardResponse{data=User}
// @Failure 400 {object} shared.StandardResponse
// @Failure 401 {object} shared.StandardResponse
// @Router /api/v1/auth/validate [get]
func (h *ValidationHandler) ValidateToken(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		h.BadRequest(c, "Token is required")
		return
	}

	// Check if token is blacklisted (using a simple table check)
	var blacklistedCount int64
	h.DB.Table("token_blacklists").Where("token = ?", token).Count(&blacklistedCount)
	if blacklistedCount > 0 {
		h.Unauthorized(c, "Token has been invalidated")
		return
	}

	// Validate token
	claims, err := auth.ValidateToken(token)
	if err != nil {
		h.Unauthorized(c, "Invalid or expired token")
		return
	}

	// Get user
	var user models.User
	if err := h.DB.First(&user, claims.UserID).Error; err != nil {
		h.Unauthorized(c, "User not found")
		return
	}

	// Check if user is active
	if user.Status != "active" {
		h.Unauthorized(c, "User account is not active")
		return
	}

	userResponse := convertToUserResponse(user)
	h.Success(c, userResponse)
}

// ForgotPassword initiates password reset process
// @Summary Forgot password
// @Description Initiates password reset process by sending reset email
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ForgotPasswordRequest true "Email address"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Router /api/v1/auth/forgot-password [post]
func (h *ValidationHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := h.ValidateAndBind(c, &req); err != nil {
		return // Error already handled
	}

	// Find user by email
	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if email exists or not for security
		h.SuccessWithMessage(c, nil, "If the email exists, a password reset link has been sent")
		return
	}

	// Generate reset token
	resetToken, err := shared.GenerateSecureToken(32)
	if err != nil {
		h.InternalError(c, "Failed to generate reset token")
		return
	}

	// Store reset token
	passwordReset := models.PasswordReset{
		UserID:    user.ID,
		Token:     resetToken,
		ExpiresAt: time.Now().Add(1 * time.Hour), // 1 hour expiry
		Used:      false,
	}
	h.DB.Create(&passwordReset)

	// Send reset email
	go func() {
		if err := sendPasswordResetEmail(user, resetToken); err != nil {
			h.LogError("Failed to send password reset email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "ForgotPassword", "User", user.ID, "Password reset requested")

	h.SuccessWithMessage(c, nil, "If the email exists, a password reset link has been sent")
}

// ResetPassword resets user password using reset token
// @Summary Reset password
// @Description Resets user password using a valid reset token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body ResetPasswordRequest true "Reset password data"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Failure 401 {object} shared.StandardResponse
// @Router /api/v1/auth/reset-password [post]
func (h *ValidationHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := h.ValidateAndBind(c, &req); err != nil {
		return // Error already handled
	}

	// Find reset token
	var passwordReset models.PasswordReset
	if err := h.DB.Where("token = ? AND used = ? AND expires_at > ?",
		req.Token, false, time.Now()).First(&passwordReset).Error; err != nil {
		h.BadRequest(c, "Invalid or expired reset token")
		return
	}

	// Find user
	var user models.User
	if err := h.DB.First(&user, passwordReset.UserID).Error; err != nil {
		h.BadRequest(c, "User not found")
		return
	}

	// Validate password strength
	if err := validatePasswordStrength(req.Password); err != nil {
		h.ValidationError(c, err.Error())
		return
	}

	// Update password
	user.Password = req.Password
	if err := user.HashPassword(); err != nil {
		h.InternalError(c, "Failed to process password")
		return
	}

	if err := h.DB.Save(&user).Error; err != nil {
		h.InternalError(c, "Failed to update password")
		return
	}

	// Mark reset token as used
	passwordReset.MarkAsUsed()
	h.DB.Save(&passwordReset)

	// Invalidate all refresh tokens for this user
	h.DB.Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked = ?", user.ID, false).
		Update("revoked", true)

	// Create audit log
	utils.CreateAuditLog(c, "ResetPassword", "User", user.ID, "Password reset successfully")

	h.SuccessWithMessage(c, nil, "Password reset successfully")
}

// VerifyEmail verifies user email using verification token
// @Summary Verify email
// @Description Verifies user email address using verification token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body VerifyEmailRequest true "Verification token"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Router /api/v1/auth/verify-email [post]
func (h *ValidationHandler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := h.ValidateAndBind(c, &req); err != nil {
		return // Error already handled
	}

	// Find verification token using the Verification model
	var verification models.Verification
	if err := h.DB.Where("token = ? AND type = ? AND status = ? AND expires_at > ?",
		req.Token, models.VerificationTypeEmail, models.VerificationStatusPending, time.Now()).First(&verification).Error; err != nil {
		h.BadRequest(c, "Invalid or expired verification token")
		return
	}

	// Find user
	var user models.User
	if err := h.DB.First(&user, verification.UserID).Error; err != nil {
		h.BadRequest(c, "User not found")
		return
	}

	// Update user email verification status
	user.EmailVerified = true
	now := time.Now()
	user.EmailVerifiedAt = &now
	if err := h.DB.Save(&user).Error; err != nil {
		h.InternalError(c, "Failed to update user")
		return
	}

	// Mark verification as completed
	verification.Status = models.VerificationStatusCompleted
	verification.CompletedAt = &now
	h.DB.Save(&verification)

	// Create audit log
	utils.CreateAuditLog(c, "VerifyEmail", "User", user.ID, "Email verified successfully")

	h.SuccessWithMessage(c, nil, "Email verified successfully")
}

// ResendVerificationEmail resends email verification
// @Summary Resend verification email
// @Description Resends email verification to unverified users
// @Tags auth
// @Accept json
// @Produce json
// @Param email query string true "Email address"
// @Success 200 {object} shared.StandardResponse
// @Failure 400 {object} shared.StandardResponse
// @Router /api/v1/auth/resend-verification [post]
func (h *ValidationHandler) ResendVerificationEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		h.BadRequest(c, "Email is required")
		return
	}

	// Find user
	var user models.User
	if err := h.DB.Where("email = ?", email).First(&user).Error; err != nil {
		h.BadRequest(c, "User not found")
		return
	}

	// Check if already verified
	if user.EmailVerified {
		h.BadRequest(c, "Email is already verified")
		return
	}

	// Generate new verification token
	verificationToken, err := shared.GenerateSecureToken(32)
	if err != nil {
		h.InternalError(c, "Failed to generate verification token")
		return
	}

	// Store verification token
	verification := models.Verification{
		UserID:    user.ID,
		Type:      models.VerificationTypeEmail,
		Token:     verificationToken,
		Status:    models.VerificationStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24 hour expiry
	}
	h.DB.Create(&verification)

	// Send verification email
	go func() {
		if err := shared.SendEmailVerification(user); err != nil {
			h.LogError("Failed to send verification email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "ResendVerification", "User", user.ID, "Verification email resent")

	h.SuccessWithMessage(c, nil, "Verification email sent")
}

// Helper functions
func sendPasswordResetEmail(user models.User, token string) error {
	// Implementation would use the notification service
	// For now, just log the reset email
	log.Printf("Password reset email sent to %s with token: %s", user.Email, token)
	return nil
}

func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		case char >= 33 && char <= 126:
			hasSpecial = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return fmt.Errorf("password must contain at least one digit")
	}
	if !hasSpecial {
		return fmt.Errorf("password must contain at least one special character")
	}

	return nil
}

func convertToUserResponse(user models.User) User {
	return User{
		ID:                      int(user.ID),
		FirstName:               user.FirstName,
		LastName:                user.LastName,
		Email:                   user.Email,
		Role:                    user.Role,
		Status:                  user.Status,
		EmailVerified:           user.EmailVerified,
		CreatedAt:               user.CreatedAt,
		UpdatedAt:               user.UpdatedAt,
		Phone:                   user.Phone,
		Address:                 user.Address,
		City:                    user.City,
		Postcode:                user.Postcode,
		NotificationPreferences: user.NotificationPreferences,
	}
}

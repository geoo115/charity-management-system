package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/geoo115/charity-management-system/internal/auth"
	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
)

// User represents a user in the system
type User struct {
	ID                      int                             `json:"id"`
	FirstName               string                          `json:"first_name"`
	LastName                string                          `json:"last_name"`
	Email                   string                          `json:"email"`
	Password                string                          `json:"-"` // Never include in JSON responses
	Role                    string                          `json:"role"`
	Status                  string                          `json:"status"`
	EmailVerified           bool                            `json:"email_verified"`
	CreatedAt               time.Time                       `json:"created_at"`
	UpdatedAt               time.Time                       `json:"updated_at"`
	LastLoginAt             *time.Time                      `json:"last_login_at"`
	Phone                   string                          `json:"phone"`
	Address                 string                          `json:"address"`
	City                    string                          `json:"city"`
	Postcode                string                          `json:"postcode"`
	HouseholdSize           int                             `json:"household_size"`
	DietaryRequirements     string                          `json:"dietary_requirements"`
	AccessibilityNeeds      string                          `json:"accessibility_needs"`
	PreferredDonationType   string                          `json:"preferred_donation_type"`
	GiftAidEligible         bool                            `json:"gift_aid_eligible"`
	DonationFrequency       string                          `json:"donation_frequency"`
	Experience              string                          `json:"experience"`
	References              string                          `json:"references"`
	Skills                  string                          `json:"skills"`
	Availability            string                          `json:"availability"`
	NotificationPreferences *models.NotificationPreferences `json:"notification_preferences"`
}

// AuthRefreshToken represents a refresh token (renamed to avoid conflict)
type AuthRefreshToken struct {
	Token     string    `json:"token"`
	UserID    int       `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	IsActive  bool      `json:"is_active"`
}

// TokenBlacklist represents blacklisted tokens
type TokenBlacklist struct {
	Token         string    `json:"token"`
	BlacklistedAt time.Time `json:"blacklisted_at"`
	Reason        string    `json:"reason"`
}

// RegisterRequest holds the data needed for user registration
type RegisterRequest struct {
	FirstName        string                 `json:"first_name" binding:"required"`
	LastName         string                 `json:"last_name" binding:"required"`
	Email            string                 `json:"email" binding:"required,email"`
	Password         string                 `json:"password" binding:"required,min=8"`
	Role             string                 `json:"role" binding:"required,oneof=Admin Volunteer Donor Visitor"`
	Phone            string                 `json:"phone"`
	Address          string                 `json:"address"`
	City             string                 `json:"city"`
	Postcode         string                 `json:"postcode"`
	PhoneNumber      string                 `json:"phoneNumber"`
	RoleSpecificData map[string]interface{} `json:"roleSpecificData"`
}

// Register creates a new user account
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if database connection is alive before proceeding
	sqlDB, err := db.DB.DB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error: " + err.Error()})
		return
	}
	if err := sqlDB.Ping(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database is not available: " + err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
		return
	}

	// Prepare user fields
	user := models.User{
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Email:         strings.ToLower(req.Email),
		Password:      req.Password,
		Role:          req.Role,
		Status:        "active", // Default status for most users
		FirstLogin:    true,
		EmailVerified: false, // Email verification required
	}

	// Set volunteer status to pending by default
	if user.Role == models.RoleVolunteer {
		user.Status = "pending" // Volunteers need approval
	}

	// Always set these fields from the top-level request
	if req.PhoneNumber != "" {
		user.Phone = req.PhoneNumber
	} else if req.Phone != "" {
		user.Phone = req.Phone
	}
	user.Address = req.Address
	user.City = req.City
	user.Postcode = req.Postcode

	// Handle role-specific fields - create separate profile records
	if req.RoleSpecificData != nil {
		// Create VisitorProfile for visitors
		if visitor, ok := req.RoleSpecificData["visitor"].(map[string]interface{}); ok && req.Role == models.RoleVisitor {
			householdSize := 1
			if hs, ok := visitor["householdSize"].(string); ok {
				if parsed, err := strconv.Atoi(hs); err == nil {
					householdSize = parsed
				}
			}

			visitorProfile := models.VisitorProfile{
				UserID:              user.ID,
				HouseholdSize:       householdSize,
				DietaryRequirements: getStringValue(visitor, "dietaryRequirements"),
				AccessibilityNeeds:  getStringValue(visitor, "accessibilityNeeds"),
			}
			db.DB.Create(&visitorProfile)
		}

		// Create DonorProfile for donors
		if donor, ok := req.RoleSpecificData["donor"].(map[string]interface{}); ok && req.Role == models.RoleDonor {
			donorProfile := models.DonorProfile{
				UserID:                user.ID,
				PreferredDonationType: getStringValue(donor, "preferredDonationType"),
				GiftAidEligible:       getBoolValue(donor, "giftAidEligible"),
				DonationFrequency:     getStringValue(donor, "donationFrequency"),
			}
			db.DB.Create(&donorProfile)
		}

		// Create VolunteerApplication for volunteers
		if volunteer, ok := req.RoleSpecificData["volunteer"].(map[string]interface{}); ok && req.Role == models.RoleVolunteer {
			application := models.VolunteerApplication{
				Email:        user.Email,
				Phone:        user.Phone,
				Skills:       getStringValue(volunteer, "skills"),
				Experience:   getStringValue(volunteer, "experience"),
				Availability: getStringValue(volunteer, "availability"),
				Status:       "pending",
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			db.DB.Create(&application)
		}
	}

	// Hash password
	if err := user.HashPassword(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	// Create notification preferences
	user.NotificationPreferences = createDefaultNotificationPreferences()

	// Save user to database
	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Handle volunteer application process
	if user.Role == models.RoleVolunteer {
		// Get volunteer profile data from request if available
		var volunteerSkills, volunteerExperience, volunteerAvailability string

		if req.RoleSpecificData != nil {
			if volunteer, ok := req.RoleSpecificData["volunteer"].(map[string]interface{}); ok {
				// Extract experience if present
				if experience, ok := volunteer["experience"].(string); ok {
					volunteerExperience = experience
				}
				// Extract skills and convert to string
				if skillsArray, ok := volunteer["skills"].([]interface{}); ok {
					skills := make([]string, 0, len(skillsArray))
					for _, skill := range skillsArray {
						if skillStr, ok := skill.(string); ok {
							skills = append(skills, skillStr)
						}
					}
					volunteerSkills = strings.Join(skills, ", ")
				}
				// Handle availability array
				if availabilityArray, ok := volunteer["availability"].([]interface{}); ok {
					availability := make([]string, 0, len(availabilityArray))
					for _, avail := range availabilityArray {
						if availStr, ok := avail.(string); ok {
							availability = append(availability, availStr)
						}
					}
					volunteerAvailability = strings.Join(availability, ", ")
				}
			}
		}

		// Create volunteer application record instead of active volunteer
		// Create volunteer application record instead of active volunteer
		application := models.VolunteerApplication{
			Email:         user.Email,
			Phone:         user.Phone,
			Skills:        volunteerSkills,
			Experience:    volunteerExperience,
			Availability:  volunteerAvailability,
			Status:        "pending",
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
			FirstLogin:    true,
			TermsAccepted: true, // Assuming acceptance through registration
		}
		if err := db.DB.Create(&application).Error; err != nil {
			log.Printf("Warning: Failed to create volunteer application: %v", err)
			// Continue despite error - the user account is created
		} else {
			log.Printf("Volunteer application created for user ID: %d", user.ID)

			// Send notification to admins about new volunteer application
			// This would typically involve an email notification system
			go func() {
				// Insert notification code here (email to admins)
				log.Printf("Notification sent about new volunteer application: %s", user.Email)
			}()
		}
	}

	// After creating the user, try to create notification preferences
	preferences := models.NotificationPreferences{
		UserID:         user.ID,
		EmailEnabled:   true,
		SMSEnabled:     false,
		PushEnabled:    true,
		UpcomingShifts: true,
		ShiftReminders: true,
		ShiftUpdates:   true,
		SystemUpdates:  true,
	}

	// Attempt to create notification preferences, but don't fail registration if it errors
	if err := db.DB.Create(&preferences).Error; err != nil {
		// Log the error but continue with registration
		log.Printf("Failed to create notification preferences: %v", err)

		// Check if the error is about missing table
		if strings.Contains(err.Error(), "relation \"notification_preferences\" does not exist") {
			log.Printf("notification_preferences table does not exist. Please run migrations.")
		}
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Create audit log for registration
	utils.CreateAuditLog(c, "Register", "User", user.ID, "User registered successfully")

	// Send email verification after successful registration
	go func() {
		log.Printf("Starting email verification for user %s", user.Email)
		if err := shared.SendEmailVerification(user); err != nil {
			log.Printf("Failed to send email verification to %s: %v", user.Email, err)
		} else {
			log.Printf("Email verification successfully sent to %s", user.Email)
		}
	}()

	// Customize response based on role
	response := gin.H{
		"message":              "User registered successfully",
		"verificationRequired": true,
		"verificationMessage":  "Please check your email and click the verification link to activate your account",
		"token":                token,
		"user": gin.H{
			"id":         user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"role":       normalizeRoleForFrontend(user.Role),
			"status":     user.Status,
		},
	}

	// Add volunteer-specific information
	if user.Role == models.RoleVolunteer {
		response["message"] = "Your application is under review"
		response["description"] = "Our team will review your application and will contact you."
		response["application_status"] = "pending"
		response["current_stage"] = gin.H{
			"stage":   2,
			"title":   "Application Review",
			"message": "You are now in Stage 2 - Application Review and someone will be in touch with you soon.",
		}
		response["process"] = []gin.H{
			{
				"stage":       1,
				"title":       "Register Account",
				"description": "Create your volunteer account with your details",
				"status":      "completed",
			},
			{
				"stage":       2,
				"title":       "Application Review",
				"description": "Our team will review your application",
				"status":      "current",
			},
			{
				"stage":       3,
				"title":       "Start Volunteering",
				"description": "Once approved, browse and sign up for shifts",
				"status":      "pending",
			},
		}
	}

	c.JSON(http.StatusCreated, response)
}

// LoginRequest holds the data needed for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login authenticates a user and returns a JWT token
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email (ensure lowercase for consistency)
	var user models.User
	if err := db.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Check password (handle bcrypt hash vs. plain text)
	if err := user.CheckPassword(req.Password); err != nil {
		// If password is not hashed (should not happen), try hashing and comparing
		if err == bcrypt.ErrHashTooShort {
			// Hash the stored password and compare again
			hashed, hashErr := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
			if hashErr == nil && bcrypt.CompareHashAndPassword(hashed, []byte(req.Password)) == nil {
				goto login_success
			}
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

login_success:
	// Check if user is a volunteer with pending status
	if user.Role == models.RoleVolunteer && user.Status == "pending" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your volunteer application is pending approval. Please wait for an administrator to review your application."})
		return
	}

	// Check if user is active for all other cases
	if user.Status != "active" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account is not active"})
		return
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	user.FirstLogin = false
	if err := db.DB.Save(&user).Error; err != nil {
		log.Printf("Failed to update last login: %v", err)
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Generate refresh token
	refreshToken, err := auth.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Login", "User", user.ID, fmt.Sprintf("User logged in: %s", user.Email))

	// Return consistent response format
	c.JSON(http.StatusOK, gin.H{
		"message":       "Login successful",
		"token":         token,
		"refresh_token": refreshToken,
		"user": gin.H{
			"id":         user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"role":       normalizeRoleForFrontend(user.Role),
			"status":     user.Status,
		},
		"success": true, // Add explicit success flag
	})
}

// Logout handles user logout with token blacklisting
func Logout(c *gin.Context) {
	// Get token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Authorization header required",
		})
		return
	}

	// Extract token (remove "Bearer " prefix)
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid token format",
		})
		return
	}

	// Add token to blacklist
	blacklistEntry := TokenBlacklist{
		Token:         token,
		BlacklistedAt: time.Now(),
		Reason:        "user_logout",
	}

	// TODO: Save to blacklist database
	_ = blacklistEntry // Use the variable to avoid unused error

	// Invalidate refresh token if provided
	var request struct {
		RefreshToken string `json:"refresh_token"`
	}

	c.ShouldBindJSON(&request)
	if request.RefreshToken != "" {
		// TODO: Invalidate refresh token in database
		// db.Model(&AuthRefreshToken{}).Where("token = ?", request.RefreshToken).Update("is_active", false)
	}

	// Clear refresh token cookie
	c.SetCookie(
		"refresh_token",
		"",
		-1,
		"/",
		"",
		true,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// RefreshTokenHandler handles JWT token refresh (renamed to avoid conflict)
func RefreshTokenHandler(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate refresh token using auth service instead of utils
	claims, err := auth.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	// Get user from database
	var user models.User
	if err := db.DB.First(&user, claims.UserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Generate new access token using auth service
	newToken, err := auth.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": newToken,
		"token_type":   "Bearer",
		"expires_in":   3600, // 1 hour
	})
}

// AuthVerifyEmail handles email verification for users (renamed to avoid conflict)
func AuthVerifyEmail(c *gin.Context) {
	var request struct {
		Token string `json:"token" binding:"required"`
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Validate verification token from database
	// This would typically involve:
	// 1. Looking up the token in a verification_tokens table
	// 2. Checking if it's not expired
	// 3. Matching it with the provided email

	// Find user by email
	var user models.User
	if err := db.DB.Where("email = ?", strings.ToLower(request.Email)).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	// Mark user as email verified
	user.EmailVerified = true
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to verify email",
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "VerifyEmail", "User", user.ID, "Email verified successfully")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Email verified successfully",
		"data": gin.H{
			"userId":        user.ID,
			"email":         user.Email,
			"emailVerified": user.EmailVerified,
			"verifiedAt":    time.Now().Format(time.RFC3339),
		},
	})
}

// ForgotPassword handles password reset requests
func ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := db.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		// Don't reveal if email exists or not for security
		c.JSON(http.StatusOK, gin.H{
			"message": "If an account with that email exists, you will receive password reset instructions",
		})
		return
	}

	// Check if user account is active
	if user.Status != models.StatusActive {
		c.JSON(http.StatusOK, gin.H{
			"message": "If an account with that email exists, you will receive password reset instructions",
		})
		return
	}

	// Generate secure reset token
	resetToken, err := generateSecureToken(32)
	if err != nil {
		log.Printf("Failed to generate reset token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// Hash the token for storage
	hashedToken, err := bcrypt.GenerateFromPassword([]byte(resetToken), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Failed to hash reset token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// Store reset token with expiry (1 hour)
	expiresAt := time.Now().Add(auth.PasswordResetTokenExpiry)
	passwordReset := models.PasswordReset{
		UserID:    user.ID,
		Token:     string(hashedToken),
		ExpiresAt: expiresAt,
		Used:      false,
		CreatedAt: time.Now(),
	}

	// Delete any existing reset tokens for this user
	db.DB.Where("user_id = ?", user.ID).Delete(&models.PasswordReset{})

	// Create new reset token
	if err := db.DB.Create(&passwordReset).Error; err != nil {
		log.Printf("Failed to save reset token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// Generate reset URL
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", baseURL, resetToken)

	// Send reset email
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		err := notificationService.SendPasswordResetEmail(user, resetToken, resetURL)
		if err != nil {
			log.Printf("Failed to send password reset email: %v", err)
			// Don't fail the request, just log the error
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "ForgotPassword", "User", user.ID,
		fmt.Sprintf("Password reset requested for email: %s", user.Email))

	c.JSON(http.StatusOK, gin.H{
		"message": "If an account with that email exists, you will receive password reset instructions",
		"details": "Please check your email for reset instructions. The link will expire in 1 hour.",
	})
}

// ResetPassword handles password reset with token
func ResetPassword(c *gin.Context) {
	var req struct {
		Token           string `json:"token" binding:"required"`
		Password        string `json:"password" binding:"required,min=8"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate password confirmation
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Passwords do not match"})
		return
	}

	// Validate password strength
	if err := validatePasswordStrength(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find valid reset token
	var passwordResets []models.PasswordReset
	if err := db.DB.Where("expires_at > ? AND used = ?", time.Now(), false).
		Preload("User").Find(&passwordResets).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	var validReset *models.PasswordReset
	var user models.User

	// Check each token to find a match
	for _, reset := range passwordResets {
		if err := bcrypt.CompareHashAndPassword([]byte(reset.Token), []byte(req.Token)); err == nil {
			validReset = &reset
			user = reset.User
			break
		}
	}

	if validReset == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Begin database transaction
	tx := db.DB.Begin()

	// Hash new password
	if err := user.HashPasswordWithValue(req.Password); err != nil {
		tx.Rollback()
		log.Printf("Failed to hash new password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Update user password and last login
	now := time.Now()
	user.LastLogin = &now
	user.UpdatedAt = time.Now()
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to save new password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Mark reset token as used
	validReset.Used = true
	validReset.UsedAt = &now // Fix: use the same now variable that's already a pointer target
	validReset.UpdatedAt = time.Now()
	if err := tx.Save(validReset).Error; err != nil {
		tx.Rollback()
		log.Printf("Failed to mark reset token as used: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete password reset"})
		return
	}

	// Delete all other reset tokens for this user
	if err := tx.Where("user_id = ? AND id != ?", user.ID, validReset.ID).
		Delete(&models.PasswordReset{}).Error; err != nil {
		log.Printf("Failed to cleanup old reset tokens: %v", err)
		// Don't fail the transaction for this
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Failed to commit password reset transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete password reset"})
		return
	}

	// Invalidate all existing user sessions (force re-login)
	// This would require a session management system - for now just log
	log.Printf("Password reset completed for user %d - all sessions should be invalidated", user.ID)

	// Send confirmation email
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		go func() {
			data := notifications.NotificationData{
				To:               user.Email,
				Subject:          "Password Successfully Reset - Lewishame Charity",
				TemplateType:     "password_reset_confirmation",
				NotificationType: notifications.EmailNotification,
				TemplateData: map[string]interface{}{
					"Name":             user.FirstName + " " + user.LastName,
					"ResetTime":        time.Now().Format("2006-01-02 15:04:05"),
					"OrganizationName": "Lewishame Charity",
					"SupportEmail":     "support@lewishamCharity.org",
					"SupportPhone":     "020 8314 6000",
				},
			}

			if err := notificationService.SendNotification(data, user); err != nil {
				log.Printf("Failed to send password reset confirmation: %v", err)
			}
		}()
	}

	// Create audit log
	utils.CreateAuditLog(c, "ResetPassword", "User", user.ID,
		fmt.Sprintf("Password reset completed for user: %s", user.Email))

	c.JSON(http.StatusOK, gin.H{
		"message": "Password has been reset successfully",
		"details": "You can now log in with your new password. For security, you may need to log in again on all devices.",
	})
}

// ResendVerificationEmail sends a new verification email
func ResendVerificationEmail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get user
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already verified
	if user.EmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Email already verified",
			"message": "Your email address has already been verified",
		})
		return
	}

	// Generate new verification token
	verificationToken := fmt.Sprintf("verify_%d_%d", user.ID, time.Now().Unix())

	// Send verification email
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		baseURL := os.Getenv("FRONTEND_URL")
		if baseURL == "" {
			baseURL = "http://localhost:3000"
		}
		verificationURL := fmt.Sprintf("%s/verify-email?token=%s", baseURL, verificationToken)

		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Verify Your Email - Lewishame Charity",
			TemplateType:     "email_verification",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"FirstName":        user.FirstName,
				"LastName":         user.LastName,
				"VerificationURL":  verificationURL,
				"OrganizationName": "Lewishame Charity",
				"SupportEmail":     "support@lewishamCharity.org",
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send verification email: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send verification email"})
			return
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "ResendVerification", "User", user.ID,
		fmt.Sprintf("Verification email resent to: %s", user.Email))

	c.JSON(http.StatusOK, gin.H{
		"message": "Verification email sent successfully",
		"details": "Please check your email and click the verification link to activate your account",
	})
}

// sendEmailVerification sends an email verification email to a newly registered user
func SendEmailVerification(user models.User) error {
	log.Printf("sendEmailVerification: Starting for user %s", user.Email)

	// Generate verification token
	verificationToken := fmt.Sprintf("verify_%d_%d", user.ID, time.Now().Unix())
	log.Printf("sendEmailVerification: Generated token")

	// Get notification service
	notificationService := shared.GetNotificationService()
	if notificationService == nil {
		log.Printf("sendEmailVerification: Notification service not available")
		return fmt.Errorf("notification service not available")
	}
	log.Printf("sendEmailVerification: Got notification service")

	// Get base URL for frontend
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}
	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", baseURL, verificationToken)
	log.Printf("sendEmailVerification: Generated verification URL")

	// Prepare notification data
	data := notifications.NotificationData{
		To:               user.Email,
		Subject:          "Verify Your Email - Lewishame Charity",
		TemplateType:     notifications.EmailVerification,
		NotificationType: notifications.EmailNotification,
		TemplateData: map[string]interface{}{
			"FirstName":        user.FirstName,
			"LastName":         user.LastName,
			"VerificationURL":  verificationURL,
			"OrganizationName": "Lewishame Charity",
			"SupportEmail":     "support@lewishamCharity.org",
		},
	}
	log.Printf("sendEmailVerification: Prepared notification data")

	// Send the notification
	log.Printf("sendEmailVerification: About to send notification")
	if err := notificationService.SendNotification(data, user); err != nil {
		log.Printf("sendEmailVerification: Failed to send notification: %v", err)
		return fmt.Errorf("failed to send verification email: %v", err)
	}

	log.Printf("Email verification sent to %s", user.Email)
	return nil
}

// Helper functions

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GetJWTSecret returns the JWT secret from environment or a default value
func GetJWTSecret() string {
	secret := getenv("JWT_SECRET", "default_secret_for_development_only")
	return secret
}

// Helper function to get an environment variable with fallback
func getenv(key, fallback string) string {
	value := getEnv(key)
	if len(value) == 0 {
		return fallback
	}
	return value
}

// getEnv wraps os.Getenv for testing
var getEnv = func(key string) string {
	// This is a wrapper that can be mocked in tests
	return os.Getenv(key)
}

// createDefaultNotificationPreferences creates default notification preferences
func createDefaultNotificationPreferences() *models.NotificationPreferences {
	return &models.NotificationPreferences{
		Email:          true,
		SMS:            true,
		Push:           true,
		EmailEnabled:   true,
		SMSEnabled:     true,
		PushEnabled:    true,
		ShiftReminders: true,
		ShiftUpdates:   true,
		UpcomingShifts: true,
		SystemUpdates:  true,
	}
}

// ValidateToken validates a JWT token and returns user information
func ValidateToken(c *gin.Context) {
	// Get token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authorization header required",
		})
		return
	}

	// Extract token (remove "Bearer " prefix)
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid token format",
		})
		return
	}

	// Validate token using auth service
	claims, err := auth.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid or expired token",
		})
		return
	}

	// Get user from database
	var user models.User
	if err := db.DB.First(&user, claims.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"userId":    user.ID,
			"email":     user.Email,
			"role":      user.Role,
			"status":    user.Status,
			"isValid":   true,
			"expiresAt": claims.ExpiresAt.Format(time.RFC3339),
		},
	})
}

// GetCurrentUser returns the current authenticated user's information
func GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Don't include sensitive information
	response := gin.H{
		"id":             user.ID,
		"first_name":     user.FirstName,
		"last_name":      user.LastName,
		"email":          user.Email,
		"phone":          user.Phone,
		"role":           normalizeRoleForFrontend(user.Role),
		"status":         user.Status,
		"email_verified": user.EmailVerified,
		"phone_verified": user.PhoneVerified,
		"created_at":     user.CreatedAt,
		"address":        user.Address,
		"city":           user.City,
		"postcode":       user.Postcode,
	}

	// Add role-specific information
	switch user.Role {
	case models.RoleVisitor:
		// Get visitor profile if exists
		var visitorProfile models.VisitorProfile
		if err := db.DB.Where("user_id = ?", user.ID).First(&visitorProfile).Error; err == nil {
			response["visitor_profile"] = gin.H{
				"household_size":       visitorProfile.HouseholdSize,
				"dietary_requirements": visitorProfile.DietaryRequirements,
				"accessibility_needs":  visitorProfile.AccessibilityNeeds,
				"emergency_contact":    visitorProfile.EmergencyContact,
			}
		}
	case models.RoleVolunteer:
		// Get volunteer application status if exists
		var volunteerApp models.VolunteerApplication
		if err := db.DB.Where("user_id = ?", user.ID).First(&volunteerApp).Error; err == nil {
			response["volunteer_status"] = gin.H{
				"application_status": volunteerApp.Status,
				"approved_at":        volunteerApp.CreatedAt, // Use CreatedAt instead of ApprovedAt
				"skills":             volunteerApp.Skills,
				"availability":       volunteerApp.Availability,
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// GetNotificationService returns the notification service instance
func GetNotificationService() *notifications.NotificationService {
	// Initialize notification service with environment variables
	config := notifications.NotificationConfig{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     587, // Default SMTP port
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
		FromName:     os.Getenv("FROM_NAME"),
		Enabled:      true, // Always enabled
	}

	// Set defaults if environment variables are not set
	if config.SMTPHost == "" {
		config.SMTPHost = "smtp.gmail.com"
	}
	if config.FromEmail == "" {
		config.FromEmail = "noreply@lewishamCharity.org"
	}
	if config.FromName == "" {
		config.FromName = "Lewishame Charity"
	}

	service, err := notifications.NewNotificationService(config)
	if err != nil {
		log.Printf("Failed to initialize notification service: %v", err)
		return nil
	}

	return service
}

// Helper functions
func getStringValue(data map[string]interface{}, key string) string {
	if val, ok := data[key].(string); ok {
		return val
	}
	return ""
}

func getBoolValue(data map[string]interface{}, key string) bool {
	if val, ok := data[key].(bool); ok {
		return val
	}
	return false
}

// normalizeRoleForFrontend converts backend role names to frontend-expected format
func normalizeRoleForFrontend(role string) string {
	switch role {
	case "admin":
		return "Admin"
	case "volunteer":
		return "Volunteer"
	case "donor":
		return "Donor"
	case "visitor":
		return "Visitor"
	case "super_admin":
		return "SuperAdmin"
	default:
		// Capitalize first letter for any other roles
		if len(role) > 0 {
			return strings.ToUpper(role[:1]) + role[1:]
		}
		return role
	}
}

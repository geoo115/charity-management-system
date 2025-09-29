package services

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserService handles user-related business logic
type UserService struct {
	db *gorm.DB
}

// NewUserService creates a new user service
func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
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

// CreateUser creates a new user and their associated profiles
func (s *UserService) CreateUser(c *gin.Context, req RegisterRequest) (*models.User, error) {
	// Check if user already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("email already registered")
	}

	// Prepare user fields
	user := models.User{
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Email:         strings.ToLower(req.Email),
		Password:      req.Password,
		Role:          req.Role,
		Status:        "active", // Default status
		FirstLogin:    true,
		EmailVerified: false,
	}

	if req.PhoneNumber != "" {
		user.Phone = req.PhoneNumber
	} else if req.Phone != "" {
		user.Phone = req.Phone
	}
	user.Address = req.Address
	user.City = req.City
	user.Postcode = req.Postcode

	if user.Role == models.RoleVolunteer {
		user.Status = "pending"
	}

	if err := user.HashPassword(); err != nil {
		return nil, fmt.Errorf("failed to process password: %w", err)
	}

	// Create user within a transaction
	tx := s.db.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create role-specific profiles
	if err := s.createRoleSpecificProfile(tx, user, req.RoleSpecificData); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create notification preferences
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
	if err := tx.Create(&preferences).Error; err != nil {
		log.Printf("Failed to create notification preferences for user %d: %v", user.ID, err)
		// Non-critical error, so we don't rollback
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit user creation: %w", err)
	}

	// Create audit log for registration
	utils.CreateAuditLog(c, "Register", "User", user.ID, "User registered successfully")

	// Send email verification after successful registration
	log.Printf("Starting email verification for user %s", user.Email)
	if err := s.sendEmailVerification(user); err != nil {
		log.Printf("Failed to send email verification to %s: %v", user.Email, err)
	} else {
		log.Printf("Email verification successfully sent to %s", user.Email)
	}

	return &user, nil
}

func (s *UserService) createRoleSpecificProfile(tx *gorm.DB, user models.User, data map[string]interface{}) error {
	if data == nil {
		return nil
	}

	switch user.Role {
	case models.RoleVisitor:
		if visitorData, ok := data["visitor"].(map[string]interface{}); ok {
			householdSize := 1
			if hs, ok := visitorData["householdSize"].(string); ok {
				if parsed, err := strconv.Atoi(hs); err == nil {
					householdSize = parsed
				}
			}
			profile := models.VisitorProfile{
				UserID:              user.ID,
				HouseholdSize:       householdSize,
				DietaryRequirements: getStringValue(visitorData, "dietaryRequirements"),
				AccessibilityNeeds:  getStringValue(visitorData, "accessibilityNeeds"),
			}
			return tx.Create(&profile).Error
		}
	case models.RoleDonor:
		if donorData, ok := data["donor"].(map[string]interface{}); ok {
			profile := models.DonorProfile{
				UserID:                user.ID,
				PreferredDonationType: getStringValue(donorData, "preferredDonationType"),
				GiftAidEligible:       getBoolValue(donorData, "giftAidEligible"),
				DonationFrequency:     getStringValue(donorData, "donationFrequency"),
			}
			return tx.Create(&profile).Error
		}
	case models.RoleVolunteer:
		if volunteerData, ok := data["volunteer"].(map[string]interface{}); ok {
			application := models.VolunteerApplication{
				Email:         user.Email,
				Phone:         user.Phone,
				Skills:        getStringValue(volunteerData, "skills"),
				Experience:    getStringValue(volunteerData, "experience"),
				Availability:  getStringValue(volunteerData, "availability"),
				Status:        "pending",
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
				FirstLogin:    true,
				TermsAccepted: true,
			}

			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("failed to hash password for application: %w", err)
			}
			application.Password = string(hashedPassword)

			return tx.Create(&application).Error
		}
	}
	return nil
}

// Helper functions to safely extract values from map[string]interface{}
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

// sendEmailVerification sends email verification to user
func (s *UserService) sendEmailVerification(user models.User) error {
	// Placeholder implementation - use the user parameter to avoid unused param warnings
	log.Printf("(placeholder) sending email verification to user id=%d email=%s", user.ID, user.Email)
	return nil
}

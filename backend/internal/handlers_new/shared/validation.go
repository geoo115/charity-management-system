package shared

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// Validator instance for input validation
var validate *validator.Validate

func init() {
	validate = validator.New()

	// Register custom validators
	validate.RegisterValidation("phone", validatePhone)
	validate.RegisterValidation("role", validateRole)
	validate.RegisterValidation("status", validateStatus)
}

// ValidateStruct validates a struct using the validator package
func ValidateStruct(s interface{}) error {
	return validate.Struct(s)
}

// ValidateAndBind validates and binds JSON input to a struct
func (h *BaseHandler) ValidateAndBind(c *gin.Context, obj interface{}) error {
	if err := c.ShouldBindJSON(obj); err != nil {
		h.BadRequest(c, "Invalid JSON format: "+err.Error())
		return err
	}

	if err := ValidateStruct(obj); err != nil {
		h.ValidationError(c, "Validation failed: "+err.Error())
		return err
	}

	return nil
}

// Common validation patterns
var (
	emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)
	phoneRegex = regexp.MustCompile(`^[\+]?[1-9][\d]{0,15}$`)
)

// validatePhone validates phone number format
func validatePhone(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	if phone == "" {
		return true // Allow empty phone numbers
	}
	return phoneRegex.MatchString(phone)
}

// validateRole validates user role
func validateRole(fl validator.FieldLevel) bool {
	role := fl.Field().String()
	validRoles := []string{"Admin", "Volunteer", "Donor", "Visitor"}

	for _, validRole := range validRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

// validateStatus validates status field
func validateStatus(fl validator.FieldLevel) bool {
	status := fl.Field().String()
	validStatuses := []string{"active", "inactive", "pending", "suspended", "approved", "rejected"}

	for _, validStatus := range validStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email is required")
	}

	if !emailRegex.MatchString(email) {
		return fmt.Errorf("invalid email format")
	}

	return nil
}

// ValidateRequired checks if a field is not empty
func ValidateRequired(field, fieldName string) error {
	if strings.TrimSpace(field) == "" {
		return ErrMissingField
	}
	return nil
}

// ValidateLength validates string length
func ValidateLength(field string, min, max int) error {
	length := len(strings.TrimSpace(field))
	if length < min || length > max {
		return ErrInvalidInput
	}
	return nil
}

// ValidateDateFormat validates date format (YYYY-MM-DD)
func ValidateDateFormat(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, ErrMissingField
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, ErrInvalidInput
	}

	return date, nil
}

// ValidateDateTimeFormat validates datetime format (RFC3339)
func ValidateDateTimeFormat(dateTimeStr string) (time.Time, error) {
	if dateTimeStr == "" {
		return time.Time{}, ErrMissingField
	}

	dateTime, err := time.Parse(time.RFC3339, dateTimeStr)
	if err != nil {
		return time.Time{}, ErrInvalidInput
	}

	return dateTime, nil
}

// ValidateRange validates if a number is within a specified range
func ValidateRange(value, min, max int) error {
	if value < min || value > max {
		return ErrInvalidInput
	}
	return nil
}

// SanitizeString removes potentially harmful characters from input
func SanitizeString(input string) string {
	// Remove leading/trailing whitespace
	sanitized := strings.TrimSpace(input)

	// Remove null characters
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")

	return sanitized
}

// Common validation request structures
type IDRequest struct {
	ID uint `json:"id" validate:"required,min=1"`
}

type PaginationRequest struct {
	Page  int `json:"page" validate:"min=1"`
	Limit int `json:"limit" validate:"min=1,max=100"`
}

type DateRangeRequest struct {
	StartDate string `json:"start_date" validate:"required"`
	EndDate   string `json:"end_date" validate:"required"`
}

type StatusUpdateRequest struct {
	Status string `json:"status" validate:"required,status"`
	Reason string `json:"reason,omitempty"`
}

// ValidateDateRange validates that start date is before end date
func ValidateDateRange(startDate, endDate time.Time) error {
	if startDate.After(endDate) {
		return ErrInvalidInput
	}
	return nil
}

// ValidateFileExtension validates file extension
func ValidateFileExtension(filename string, allowedExtensions []string) bool {
	if filename == "" {
		return false
	}

	parts := strings.Split(filename, ".")
	if len(parts) < 2 {
		return false
	}

	extension := strings.ToLower(parts[len(parts)-1])

	for _, allowed := range allowedExtensions {
		if extension == strings.ToLower(allowed) {
			return true
		}
	}

	return false
}

// ValidateFileSize validates file size in bytes
func ValidateFileSize(size int64, maxSize int64) bool {
	return size > 0 && size <= maxSize
}

// Utility functions used across handlers

// generateSecureToken generates a cryptographically secure random token
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// convertToUint converts string to uint safely
func ConvertToUint(s string) (uint, error) {
	if s == "" {
		return 0, nil
	}

	val, err := strconv.ParseUint(s, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid number format")
	}

	return uint(val), nil
}

// GetNotificationService returns the notification service instance
func GetNotificationService() *notifications.NotificationService {
	return notifications.GetService()
}

// generateTicketNumber generates a unique ticket number
func GenerateTicketNumber() string {
	token, _ := GenerateSecureToken(4)
	return fmt.Sprintf("TKT-%s", strings.ToUpper(token[:8]))
}

// generateQRCode generates a QR code for tickets
func GenerateQRCode(data string) (string, error) {
	// For now, return a placeholder QR code
	// In production, this would integrate with a QR code library
	return fmt.Sprintf("QR_%s", data), nil
}

// checkVisitEligibility checks if a visitor is eligible for a visit
func CheckVisitEligibility(userID uint) error {
	// Placeholder implementation
	// In production, this would check various eligibility criteria
	return nil
}

// checkDailyCapacity checks if daily capacity allows new visits
func CheckDailyCapacity() error {
	// Placeholder implementation
	// In production, this would check current capacity
	return nil
}

// UpdateDailyCapacity updates the daily capacity count
func UpdateDailyCapacity(visitDay time.Time, category string, increment int) error {
	// Placeholder implementation
	// In production, this would update capacity tracking
	return nil
}

// getVisitInstructions returns visit instructions for users
func GetVisitInstructions() string {
	return "Please arrive 15 minutes early and bring valid ID."
}

// getVisitRequirements returns visit requirements
func GetVisitRequirements() string {
	return "Valid ID, completed application, and appointment confirmation."
}

// getNextTicketReleaseDate returns the next ticket release date
func GetNextTicketReleaseDate() string {
	return "Next Monday at 9:00 AM"
}

// sendEmailVerification sends email verification to user
func SendEmailVerification(user models.User) error {
	// Placeholder implementation
	// In production, this would send actual verification emails
	return nil
}

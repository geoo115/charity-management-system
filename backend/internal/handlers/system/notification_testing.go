package system

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"

	"github.com/gin-gonic/gin"
)

// TestNotificationRequest defines the structure for testing notifications
type TestNotificationRequest struct {
	NotificationType string `json:"notificationType"` // email, sms, push
	TemplateType     string `json:"templateType"`     // shift_reminder, urgent_callout, etc.
	Email            string `json:"email"`
	Phone            string `json:"phone"`
	Name             string `json:"name"`
}

// TestNotification handles requests to test notification delivery
func TestNotification(c *gin.Context) {
	var req TestNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate required fields
	if req.NotificationType == "" || req.TemplateType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "notificationType and templateType are required"})
		return
	}

	if req.NotificationType == "email" && req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is required for email notifications"})
		return
	}

	if req.NotificationType == "sms" && req.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone is required for SMS notifications"})
		return
	}

	// Create mock user for notification
	testUser := models.User{
		FirstName: "Test",
		LastName:  "User",
		Email:     "test@example.com",
		Phone:     req.Phone,
		NotificationPreferences: &models.NotificationPreferences{
			EmailEnabled: true,
			SMSEnabled:   true,
			PushEnabled:  true,
		},
	}

	// Get notification service
	ns := notifications.GetService()
	if ns == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "notification service not available"})
		return
	}

	// Map templateType string to enum
	var templateType notifications.TemplateType
	switch req.TemplateType {
	case "shift_reminder":
		templateType = notifications.ShiftReminder
	case "shift_signup":
		templateType = notifications.ShiftSignup
	case "shift_cancellation":
		templateType = notifications.ShiftCancellation
	case "urgent_callout":
		templateType = notifications.UrgentCallout
	case "help_request_submitted":
		templateType = notifications.HelpRequestSubmitted
	case "help_request_in_progress":
		templateType = notifications.HelpRequestInProgress
	case "donation_received":
		templateType = notifications.DonationReceived
	case "dropoff_scheduled":
		templateType = notifications.DropoffScheduled
	case "password_reset":
		templateType = notifications.PasswordReset
	case "account_creation":
		templateType = notifications.AccountCreated
	case "email_verification":
		templateType = notifications.EmailVerification
	case "application_update":
		templateType = notifications.ApplicationUpdate
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template type: " + req.TemplateType})
		return
	}

	// Map notificationType string to enum
	var notificationType notifications.NotificationType
	switch req.NotificationType {
	case "email":
		notificationType = notifications.EmailNotification
	case "sms":
		notificationType = notifications.SMSNotification
	case "push":
		notificationType = notifications.PushNotification
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification type: " + req.NotificationType})
		return
	}

	// Create template data with sample values
	templateData := map[string]interface{}{
		"Name":             req.Name,
		"FirstName":        "Test",
		"LastName":         "User",
		"Date":             time.Now().Format("Monday, January 2, 2006"),
		"Time":             "2:00 PM - 4:00 PM",
		"Location":         "Lewisham Food Hub",
		"Role":             "Food Handler",
		"OrganizationName": "Lewishame Charity",
		"Reference":        "TEST-123",
		"Category":         "Test Category",
		"Status":           "Test Status",
		"VisitDay":         time.Now().Format("2006-01-02"),
		"TimeSlot":         "14:00",
		"VerificationURL":  "http://localhost:3000/verify-email?token=test-token-123",
		"SupportEmail":     "support@lewishamCharity.org",
	}

	// Prepare notification data
	data := notifications.NotificationData{
		To:               req.Email,
		Subject:          "Test Notification - " + req.TemplateType,
		TemplateType:     templateType,
		NotificationType: notificationType,
		TemplateData:     templateData,
	}

	// Override To field for SMS
	if req.NotificationType == "sms" {
		data.To = req.Phone
	}

	// Send notification
	if err := ns.SendNotification(data, testUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to send test notification",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test notification sent successfully",
		"details": gin.H{
			"type":     req.NotificationType,
			"template": req.TemplateType,
			"to":       data.To,
		},
	})
}

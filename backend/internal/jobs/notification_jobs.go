package jobs

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"github.com/twilio/twilio-go"
	twilioApi "github.com/twilio/twilio-go/rest/api/v2010"
)

// NotificationMode defines how notifications are sent
type NotificationMode string

const (
	ModeProduction  NotificationMode = "production"  // Send actual notifications
	ModeDevelopment NotificationMode = "development" // Log notifications only
	ModeDisabled    NotificationMode = "disabled"    // Disable notifications
)

var (
	// Global notification mode
	currentMode NotificationMode = ModeDevelopment
)

// InitializeNotifications sets up the notification system
func InitializeNotifications() {
	// Get mode from environment
	mode := os.Getenv("NOTIFICATION_MODE")
	switch mode {
	case "production":
		currentMode = ModeProduction
	case "disabled":
		currentMode = ModeDisabled
	default:
		currentMode = ModeDevelopment
	}

	log.Printf("Notification system initialized in %s mode", currentMode)
}

// SendSMS sends an SMS message via Twilio
func SendSMS(to, message string) error {
	// Check if notifications are disabled
	if currentMode == ModeDisabled {
		return nil
	}

	// In development mode, just log the message
	if currentMode == ModeDevelopment {
		log.Printf("[DEV SMS] To: %s, Message: %s", to, message)
		return nil
	}

	// Production mode - check for Twilio credentials
	accountSid := os.Getenv("TWILIO_ACCOUNT_SID")
	authToken := os.Getenv("TWILIO_AUTH_TOKEN")
	fromNumber := os.Getenv("TWILIO_FROM_NUMBER")

	if accountSid == "" || authToken == "" || fromNumber == "" {
		log.Println("WARNING: Twilio credentials not configured, logging SMS instead")
		log.Printf("[SMS] To: %s, Message: %s", to, message)
		return nil
	}

	client := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: accountSid,
		Password: authToken,
	})

	params := &twilioApi.CreateMessageParams{}
	params.SetTo(to)
	params.SetFrom(fromNumber)
	params.SetBody(message)

	resp, err := client.Api.CreateMessage(params)
	if err != nil {
		log.Printf("Failed to send SMS: %v", err)
		return err
	}

	log.Printf("SMS sent successfully, SID: %s", *resp.Sid)
	return nil
}

// SendEmail sends an email via SendGrid
func SendEmail(to, subject, htmlContent string) error {
	// Check if notifications are disabled
	if currentMode == ModeDisabled {
		return nil
	}

	// In development mode, just log the message
	if currentMode == ModeDevelopment {
		log.Printf("[DEV EMAIL] To: %s, Subject: %s, Content: %s", to, subject, htmlContent)
		return nil
	}

	// Production mode - check for SendGrid credentials
	apiKey := os.Getenv("SENDGRID_API_KEY")
	fromEmail := os.Getenv("SENDGRID_FROM_EMAIL")
	fromName := os.Getenv("SENDGRID_FROM_NAME")

	if apiKey == "" || fromEmail == "" {
		log.Println("WARNING: SendGrid credentials not configured, logging email instead")
		log.Printf("[EMAIL] To: %s, Subject: %s", to, subject)
		// Log a truncated version of the content
		if len(htmlContent) > 100 {
			log.Printf("[EMAIL CONTENT] %s...", htmlContent[:100])
		} else {
			log.Printf("[EMAIL CONTENT] %s", htmlContent)
		}
		return nil
	}

	from := mail.NewEmail(fromName, fromEmail)
	recipient := mail.NewEmail("", to)

	message := mail.NewSingleEmail(from, subject, recipient, "", htmlContent)
	client := sendgrid.NewSendClient(apiKey)

	response, err := client.Send(message)
	if err != nil {
		log.Printf("Failed to send email: %v", err)
		return err
	}

	// Check response status
	if response.StatusCode >= 400 {
		log.Printf("SendGrid error: %d - %s", response.StatusCode, response.Body)
		return fmt.Errorf("failed to send email, status code: %d", response.StatusCode)
	}

	log.Printf("Email sent successfully to %s", to)
	return nil
}

// QueueDonationReminder queues an SMS and email reminder for a donation
func QueueDonationReminder(userID uint, name, email, phone, donationType string, scheduledTime string) error {
	timestamp := time.Now().Format(time.RFC3339)

	// Simplified notification data
	notificationData := map[string]interface{}{
		"user_id":        userID,
		"name":           name,
		"email":          email,
		"phone":          phone,
		"donation_type":  donationType,
		"scheduled_time": scheduledTime,
		"created_at":     timestamp,
	}

	// Queue SMS notification if phone provided
	if phone != "" {
		smsText := fmt.Sprintf("Hi %s, reminder of your %s donation scheduled for %s",
			name, donationType, scheduledTime)

		smsData := map[string]interface{}{
			"to":       phone,
			"message":  smsText,
			"metadata": notificationData,
		}

		if err := EnqueueNotification("sms", smsData); err != nil {
			log.Printf("Failed to queue SMS notification: %v", err)
			// Continue with email notification
		}
	}

	// Queue email notification if email provided
	if email != "" {
		htmlContent := fmt.Sprintf("<p>Hi %s,</p><p>This is a reminder of your %s donation scheduled for %s.</p><p>Thank you for your support!</p>",
			name, donationType, scheduledTime)

		emailData := map[string]interface{}{
			"to":       email,
			"subject":  "Donation Reminder",
			"html":     htmlContent,
			"metadata": notificationData,
		}

		if err := EnqueueNotification("email", emailData); err != nil {
			log.Printf("Failed to queue email notification: %v", err)
			return err
		}
	}

	return nil
}

// SendDirectNotification sends a notification immediately without queuing
// Useful for critical notifications or simple development environments
func SendDirectNotification(notificationType string, to, subject, message string) error {
	switch notificationType {
	case "email":
		return SendEmail(to, subject, message)
	case "sms":
		return SendSMS(to, message)
	default:
		return fmt.Errorf("unsupported notification type: %s", notificationType)
	}
}

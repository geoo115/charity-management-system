package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"text/template"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	EmailNotification NotificationType = "email"
	SMSNotification   NotificationType = "sms"
	PushNotification  NotificationType = "push"
)

// String returns the string representation of NotificationType
func (nt NotificationType) String() string {
	return string(nt)
}

// TemplateType represents the template for a specific notification
type TemplateType string

const (
	ShiftReminder         TemplateType = "shift_reminder"
	ShiftCancellation     TemplateType = "shift_cancellation"
	ShiftSignup           TemplateType = "shift_signup"
	UrgentCallout         TemplateType = "urgent_callout"
	HelpRequestSubmitted  TemplateType = "help_request_submitted"
	HelpRequestInProgress TemplateType = "help_request_in_progress"
	VolunteerApplication  TemplateType = "volunteer_application"
	VolunteerApproval     TemplateType = "volunteer_approval"
	VolunteerRejection    TemplateType = "volunteer_rejection"
	DonationReceived      TemplateType = "donation_received"
	DropoffScheduled      TemplateType = "dropoff_scheduled"
	PasswordReset         TemplateType = "password_reset"
	AccountCreated        TemplateType = "account_created"
	EmailVerification     TemplateType = "email_verification"
	ApplicationSubmitted  TemplateType = "application_submitted"
	ApplicationUpdate     TemplateType = "application_update"
	SystemMaintenance     TemplateType = "system_maintenance"
	EmergencyAlert        TemplateType = "emergency_alert"
	ScheduleChange        TemplateType = "schedule_change"
)

// String returns the string representation of TemplateType
func (tt TemplateType) String() string {
	return string(tt)
}

// NotificationData contains the data for a notification
type NotificationData struct {
	To               string                 `json:"to"`
	Subject          string                 `json:"subject"`
	TemplateType     TemplateType           `json:"templateType"`
	TemplateData     map[string]interface{} `json:"templateData"`
	NotificationType NotificationType       `json:"notificationType"`
	ScheduledFor     *time.Time             `json:"scheduledFor,omitempty"`
}

// NotificationClient is the interface for sending notifications
type NotificationClient interface {
	SendEmail(to, subject, body string) error
	SendSMS(to, message string) error
}

// mockNotificationClient is a mock implementation for development/testing
type mockNotificationClient struct{}

func (c *mockNotificationClient) SendEmail(to, subject, body string) error {
	log.Printf("Mock Email Sent to %s: Subject: %s, Body: %s\n", to, subject, body[:50]+"...")
	return nil
}

func (c *mockNotificationClient) SendSMS(to, message string) error {
	log.Printf("Mock SMS Sent to %s: %s\n", to, message)
	return nil
}

// sendGridClient is an implementation for SendGrid
type sendGridClient struct {
	apiKey    string
	fromEmail string
	fromName  string
}

func (c *sendGridClient) SendEmail(to, subject, body string) error {
	if c.apiKey == "" {
		return fmt.Errorf("sendgrid api key not configured")
	}

	url := "https://api.sendgrid.com/v3/mail/send"

	// Use environment variables for sender info, with fallbacks
	fromEmail := c.fromEmail
	if fromEmail == "" {
		fromEmail = "noreply@lewishamCharity.org"
	}
	fromName := c.fromName
	if fromName == "" {
		fromName = "Lewisham Charity"
	}

	// Create the email payload
	payload := map[string]interface{}{
		"personalizations": []map[string]interface{}{
			{
				"to": []map[string]string{
					{"email": to},
				},
				"subject": subject,
			},
		},
		"from": map[string]string{
			"email": fromEmail,
			"name":  fromName,
		},
		"content": []map[string]string{
			{
				"type":  "text/html",
				"value": body,
			},
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal email payload: %w", err)
	}

	// Create the request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Send the request
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendgrid api error: status %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (c *sendGridClient) SendSMS(to, message string) error {
	// SendGrid doesn't support SMS, so we'd need to implement Twilio or another service
	// This is a placeholder for now
	return fmt.Errorf("sms sending not implemented for sendgrid")
}

// twilioClient is an implementation for Twilio
type twilioClient struct {
	accountSid string
	authToken  string
	fromNumber string
}

func (c *twilioClient) SendEmail(to, subject, body string) error {
	// Twilio doesn't support email, so we'd need to implement another service
	return fmt.Errorf("email sending not implemented for Twilio")
}

func (c *twilioClient) SendSMS(to, message string) error {
	if c.accountSid == "" || c.authToken == "" || c.fromNumber == "" {
		return fmt.Errorf("twilio credentials not configured")
	}

	url := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", c.accountSid)

	// Prepare form data
	formData := fmt.Sprintf("From=%s&To=%s&Body=%s", c.fromNumber, to, message)

	// Create the request
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(formData))
	if err != nil {
		return err
	}

	// Set headers
	req.SetBasicAuth(c.accountSid, c.authToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != 201 {
		return fmt.Errorf("failed to send SMS, status code: %d", resp.StatusCode)
	}

	return nil
}

// NotificationConfig holds configuration for notification services
type NotificationConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromEmail    string
	FromName     string
	Enabled      bool
}

// NotificationService handles sending notifications
type NotificationService struct {
	emailClient NotificationClient
	smsClient   NotificationClient
	templates   map[TemplateType]*template.Template
	enabled     bool
}

// NewNotificationService creates a new NotificationService
func NewNotificationService(config NotificationConfig) (*NotificationService, error) {
	// Initialize clients based on environment variables
	var emailClient, smsClient NotificationClient

	// Check if we're in development/test mode
	if os.Getenv("APP_ENV") == "development" || os.Getenv("APP_ENV") == "testing" {
		mockClient := &mockNotificationClient{}
		emailClient = mockClient
		smsClient = mockClient
	} else {
		// Production mode - use real clients
		sendGridApiKey := os.Getenv("SENDGRID_API_KEY")
		if sendGridApiKey != "" {
			emailClient = &sendGridClient{
				apiKey:    sendGridApiKey,
				fromEmail: os.Getenv("SENDGRID_FROM_EMAIL"),
				fromName:  os.Getenv("SENDGRID_FROM_NAME"),
			}
		} else {
			log.Println("Warning: SendGrid API key not configured, using mock email client")
			emailClient = &mockNotificationClient{}
		}

		twilioAccountSid := os.Getenv("TWILIO_ACCOUNT_SID")
		twilioAuthToken := os.Getenv("TWILIO_AUTH_TOKEN")
		twilioFromNumber := os.Getenv("TWILIO_FROM_NUMBER")
		if twilioAccountSid != "" && twilioAuthToken != "" && twilioFromNumber != "" {
			smsClient = &twilioClient{
				accountSid: twilioAccountSid,
				authToken:  twilioAuthToken,
				fromNumber: twilioFromNumber,
			}
		} else {
			log.Println("Warning: Twilio credentials not configured, using mock SMS client")
			smsClient = &mockNotificationClient{}
		}
	}

	// Load templates from files
	templates := loadTemplates()

	return &NotificationService{
		emailClient: emailClient,
		smsClient:   smsClient,
		templates:   templates,
		enabled:     config.Enabled,
	}, nil
}

// Add a simpler constructor for backward compatibility
func NewNotificationServiceSimple() *NotificationService {
	config := NotificationConfig{
		Enabled: true, // Default to enabled
	}
	service, _ := NewNotificationService(config)
	return service
}

// loadTemplates loads all notification templates from files
func loadTemplates() map[TemplateType]*template.Template {
	templates := make(map[TemplateType]*template.Template)

	// First try to find the templates relative to the current working directory
	templatePaths := []string{
		"internal/notifications/templates",
		"backend/internal/notifications/templates",
		"@/internal/notifications/templates",
	}

	var templatePath string
	for _, path := range templatePaths {
		if _, err := os.Stat(path); err == nil {
			templatePath = path
			break
		}
	}

	if templatePath == "" {
		log.Println("Warning: Could not find notification templates directory, using fallback templates")
		return loadFallbackTemplates()
	}

	log.Printf("Loading notification templates from: %s", templatePath)

	// Map of template types to file names
	templateFiles := map[TemplateType]string{
		ShiftReminder:         "shift_reminder.html",
		ShiftCancellation:     "shift_cancellation.html",
		ShiftSignup:           "shift_signup.html",
		UrgentCallout:         "urgent_callout.html",
		HelpRequestSubmitted:  "help_request_submitted.html",
		HelpRequestInProgress: "help_request_in_progress.html",
		VolunteerApplication:  "volunteer_application.html",
		VolunteerApproval:     "volunteer_approval.html",
		VolunteerRejection:    "volunteer_rejection.html",
		DonationReceived:      "donation_received.html",
		DropoffScheduled:      "dropoff_scheduled.html",
		PasswordReset:         "password_reset.html",
		AccountCreated:        "account_created.html",
		EmailVerification:     "email_verification.html",
		ApplicationSubmitted:  "application_submitted.html",
		ApplicationUpdate:     "application_update.html",
		SystemMaintenance:     "system_maintenance.html",
		EmergencyAlert:        "emergency_alert.html",
		ScheduleChange:        "schedule_change.html",
	}

	for templateType, fileName := range templateFiles {
		filePath := filepath.Join(templatePath, fileName)
		// Try to read the template file
		templateData, err := os.ReadFile(filePath)
		if err != nil {
			// If we can't read the file, log it and use the fallback template
			log.Printf("Error reading template file %s: %v, using fallback template", filePath, err)
			// Use fallback template from hardcoded map if exists
			if fallbackTemplate, ok := fallbackTemplates[templateType]; ok {
				t, err := template.New(string(templateType)).Parse(fallbackTemplate)
				if err != nil {
					log.Printf("Error parsing fallback template for %s: %v", templateType, err)
					continue
				}
				templates[templateType] = t
			}
			continue
		}

		// Parse the template from file
		t, err := template.New(string(templateType)).Parse(string(templateData))
		if err != nil {
			log.Printf("Error parsing template file %s: %v", filePath, err)
			continue
		}
		templates[templateType] = t
	}

	return templates
}

// loadFallbackTemplates loads hardcoded templates
func loadFallbackTemplates() map[TemplateType]*template.Template {
	templates := make(map[TemplateType]*template.Template)

	for templateType, templateStr := range fallbackTemplates {
		t, err := template.New(string(templateType)).Parse(templateStr)
		if err != nil {
			log.Printf("Error parsing fallback template for %s: %v", templateType, err)
			continue
		}
		templates[templateType] = t
	}

	return templates
}

// Fallback templates to use if file loading fails
var fallbackTemplates = map[TemplateType]string{
	ShiftReminder: `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2>Shift Reminder</h2>
			<p>Hello {{.Name}},</p>
			<p>This is a friendly reminder about your upcoming volunteer shift:</p>
			<div style="background-color: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 5px;">
				<p><strong>Date:</strong> {{.Date}}</p>
				<p><strong>Time:</strong> {{.Time}}</p>
				<p><strong>Location:</strong> {{.Location}}</p>
				<p><strong>Role:</strong> {{.Role}}</p>
			</div>
			<p>Please arrive 10 minutes before your shift begins. If you need to cancel, please do so at least 24 hours in advance through your volunteer dashboard.</p>
			<p>Thank you for volunteering with us!</p>
			<p>Best regards,</p>
			<p>{{.OrganizationName}}</p>
		</div>
	`,
	VolunteerApplication: `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2>Volunteer Application Received</h2>
			<p>Hello {{.Name}},</p>
			<p>Thank you for applying to volunteer with us at {{.OrganizationName}}. We have received your application and will review it shortly.</p>
			<div style="background-color: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 5px;">
				<p><strong>Name:</strong> {{.Name}}</p>
				<p><strong>Email:</strong> {{.Email}}</p>
				<p><strong>Role Interest:</strong> {{.Role}}</p>
				<p><strong>Submitted On:</strong> {{.SubmittedDate}}</p>
			</div>
			<p>Our team will review your application and get back to you within 3-5 business days. If approved, we'll send you instructions on how to log in to your volunteer account.</p>
			<p>If you have any questions in the meantime, please contact us.</p>
			<p>Best regards,</p>
			<p>{{.OrganizationName}} Team</p>
		</div>
	`,
	VolunteerApproval: `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2>Welcome to Our Volunteer Team!</h2>
			<p>Hello {{.Name}},</p>
			<p>We're pleased to inform you that your volunteer application has been <strong>approved</strong>!</p>
			<p>An account has been created for you on our volunteer portal. You can now log in using the following information:</p>
			<div style="background-color: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 5px;">
				<p><strong>Email:</strong> {{.Email}}</p>
				<p><strong>Password:</strong> Use the password you provided during registration</p>
				<p><strong>Login URL:</strong> <a href="{{.LoginUrl}}">{{.LoginUrl}}</a></p>
			</div>
			<p><strong>Next Steps:</strong></p>
			<ol>
				<li>Log in to your account using the link above</li>
				<li>Complete your volunteer profile</li>
				<li>Browse available shifts and sign up for your first volunteer session</li>
			</ol>
			<p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
			<p>Thank you for volunteering with us!</p>
			<p>Best regards,</p>
			<p>{{.OrganizationName}} Team</p>
		</div>
	`,
	VolunteerRejection: `
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
			<h2>Volunteer Application Update</h2>
			<p>Hello {{.Name}},</p>
			<p>Thank you for your interest in volunteering with {{.OrganizationName}}.</p>
			<p>After careful consideration of your application, we regret to inform you that we are unable to move forward with your volunteer application at this time.</p>
			{{if .RejectionReason}}
			<p><strong>Feedback from our team:</strong></p>
			<div style="background-color: #f3f4f6; padding: 15px; margin: 15px 0; border-radius: 5px;">
				<p>{{.RejectionReason}}</p>
			</div>
			{{end}}
			<p>Please note this decision doesn't reflect on your capabilities, and we encourage you to apply again in the future if circumstances change.</p>
			<p>If you have any questions, please contact us.</p>
			<p>Best regards,</p>
			<p>{{.OrganizationName}} Team</p>
		</div>
	`,
	// Include other fallback templates here...
}

// shouldSendNotification checks if the user should receive a notification based on preferences
func (ns *NotificationService) shouldSendNotification(templateType TemplateType, notificationChannel NotificationType, user models.User) bool {
	// If user has no preferences, default to sending notifications
	if user.NotificationPreferences == nil {
		return true
	}

	// First check template type-specific settings
	switch templateType {
	case ShiftReminder:
		if !user.NotificationPreferences.ShiftReminders {
			return false
		}
	case ShiftSignup, ShiftCancellation:
		if !user.NotificationPreferences.ShiftUpdates {
			return false
		}
	case VolunteerApplication, VolunteerApproval, VolunteerRejection:
		// Always send these important notifications
		return true
	}

	// Then check channel-specific settings
	switch notificationChannel {
	case EmailNotification:
		return user.NotificationPreferences.EmailEnabled
	case SMSNotification:
		return user.NotificationPreferences.SMSEnabled
	case PushNotification:
		return user.NotificationPreferences.PushEnabled
	default:
		return true
	}
}

// SendNotification sends a notification based on the provided data
func (ns *NotificationService) SendNotification(data NotificationData, user models.User) error {
	// Check if notification should be sent based on user preferences
	if !ns.shouldSendNotification(data.TemplateType, data.NotificationType, user) {
		log.Printf("Notification skipped based on user preferences: %s for user %s", data.TemplateType, user.Email)
		return nil
	}

	// Get the template for the notification
	tmpl, ok := ns.templates[data.TemplateType]
	if !ok {
		return fmt.Errorf("template not found: %s", data.TemplateType)
	}

	// Render the template with provided data
	var rendered bytes.Buffer
	if err := tmpl.Execute(&rendered, data.TemplateData); err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	// Send notification based on type
	switch data.NotificationType {
	case EmailNotification:
		return ns.emailClient.SendEmail(data.To, data.Subject, rendered.String())
	case SMSNotification:
		// For SMS, create a plain text version of the notification
		plainText := stripHTML(rendered.String())
		return ns.smsClient.SendSMS(data.To, plainText)
	case PushNotification:
		// Push notifications not implemented yet
		return fmt.Errorf("push notifications not implemented")
	default:
		return fmt.Errorf("unknown notification type: %s", data.NotificationType)
	}
}

// stripHTML is a helper function to convert HTML to plain text for SMS
func stripHTML(html string) string {
	// Very simple HTML stripping - in a real app, use a proper HTML parser
	text := html
	text = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(text, "")
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")
	text = strings.Replace(text, "&nbsp;", " ", -1)
	text = strings.Replace(text, "&amp;", "&", -1)
	text = strings.Replace(text, "&lt;", "<", -1)
	text = strings.Replace(text, "&gt;", ">", -1)
	text = strings.TrimSpace(text)
	return text
}

// ScheduleNotification schedules a notification to be sent at a later time
func (ns *NotificationService) ScheduleNotification(data NotificationData, user models.User, scheduledFor time.Time) error {
	// Create scheduled notification record
	scheduledNotification := models.ScheduledNotification{
		UserID:           user.ID,
		Type:             string(data.NotificationType),
		Channel:          string(data.NotificationType),
		Subject:          data.Subject,
		To:               data.To,
		ScheduledFor:     scheduledFor,
		Status:           "pending",
		TemplateDataJSON: mustMarshalJSON(data.TemplateData),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := db.GetDB().Create(&scheduledNotification).Error; err != nil {
		return fmt.Errorf("failed to create scheduled notification: %w", err)
	}

	return nil
}

// Helper function to marshal JSON without error handling in the main function
func mustMarshalJSON(data interface{}) string {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "{}"
	}
	return string(jsonData)
}

// SendShiftReminder sends a reminder for an upcoming shift
func (ns *NotificationService) SendShiftReminder(shift models.Shift, volunteer models.User) error {
	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             volunteer.FirstName + " " + volunteer.LastName,
		"Date":             shift.Date.Format("Monday, January 2, 2006"),
		"Time":             fmt.Sprintf("%s - %s", shift.StartTime.Format("3:04 PM"), shift.EndTime.Format("3:04 PM")),
		"Location":         shift.Location,
		"Role":             shift.Role,
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	notificationData := NotificationData{
		To:               volunteer.Email,
		Subject:          "Reminder: Your Volunteer Shift Tomorrow",
		TemplateType:     ShiftReminder,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send email notification
	if err := ns.SendNotification(notificationData, volunteer); err != nil {
		return err
	}

	// If user has SMS enabled and has a phone number, send SMS too
	if volunteer.NotificationPreferences != nil &&
		volunteer.NotificationPreferences.SMSEnabled &&
		volunteer.Phone != "" {

		notificationData.NotificationType = SMSNotification
		notificationData.To = volunteer.Phone

		if err := ns.SendNotification(notificationData, volunteer); err != nil {
			log.Printf("Failed to send SMS reminder: %v", err)
			// Continue even if SMS fails, since we've already sent the email
		}
	}

	return nil
}

// SendShiftSignupConfirmation sends a confirmation for a shift signup
func (ns *NotificationService) SendShiftSignupConfirmation(shift models.Shift, volunteer models.User) error {
	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             volunteer.FirstName + " " + volunteer.LastName,
		"Date":             shift.Date.Format("Monday, January 2, 2006"),
		"Time":             fmt.Sprintf("%s - %s", shift.StartTime.Format("3:04 PM"), shift.EndTime.Format("3:04 PM")),
		"Location":         shift.Location,
		"Role":             shift.Role,
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	notificationData := NotificationData{
		To:               volunteer.Email,
		Subject:          "Confirmation: Volunteer Shift Sign-up",
		TemplateType:     ShiftSignup,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send notification
	return ns.SendNotification(notificationData, volunteer)
}

// SendShiftCancellationConfirmation sends a confirmation for a shift cancellation
func (ns *NotificationService) SendShiftCancellationConfirmation(shift models.Shift, volunteer models.User) error {
	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             volunteer.FirstName + " " + volunteer.LastName,
		"Date":             shift.Date.Format("Monday, January 2, 2006"),
		"Time":             fmt.Sprintf("%s - %s", shift.StartTime.Format("3:04 PM"), shift.EndTime.Format("3:04 PM")),
		"Location":         shift.Location,
		"Role":             shift.Role,
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	notificationData := NotificationData{
		To:               volunteer.Email,
		Subject:          "Confirmed: Volunteer Shift Cancellation",
		TemplateType:     ShiftCancellation,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send notification
	return ns.SendNotification(notificationData, volunteer)
}

// SendUrgentCallout sends an urgent callout for volunteer help
func (ns *NotificationService) SendUrgentCallout(calloutData map[string]interface{}, volunteers []models.User) []error {
	var errors []error

	// Create template data from callout data
	templateData := map[string]interface{}{
		"Date":             calloutData["date"],
		"Time":             calloutData["time"],
		"Location":         calloutData["location"],
		"Role":             calloutData["role"],
		"Reason":           calloutData["reason"],
		"OrganizationName": "Lewisham Charity",
	}

	// Send to all provided volunteers
	for _, volunteer := range volunteers {
		// Add volunteer name to template data
		volunteerData := make(map[string]interface{})
		for k, v := range templateData {
			volunteerData[k] = v
		}
		volunteerData["Name"] = volunteer.FirstName + " " + volunteer.LastName

		// Prepare email notification data
		emailData := NotificationData{
			To:               volunteer.Email,
			Subject:          "URGENT: Volunteer Help Needed",
			TemplateType:     UrgentCallout,
			TemplateData:     volunteerData,
			NotificationType: EmailNotification,
		}

		// Send email
		if err := ns.SendNotification(emailData, volunteer); err != nil {
			errors = append(errors, err)
			continue
		}

		// Send SMS if available
		if volunteer.NotificationPreferences != nil &&
			volunteer.NotificationPreferences.SMSEnabled &&
			volunteer.Phone != "" {

			smsData := NotificationData{
				To:               volunteer.Phone,
				Subject:          "URGENT: Volunteer Help Needed",
				TemplateType:     UrgentCallout,
				TemplateData:     volunteerData,
				NotificationType: SMSNotification,
			}

			if err := ns.SendNotification(smsData, volunteer); err != nil {
				log.Printf("Failed to send SMS urgent callout to %s: %v", volunteer.FirstName+" "+volunteer.LastName, err)
				// Continue even if SMS fails
			}
		}
	}

	return errors
}

// getHelpRequestSubject returns an appropriate subject line based on template type
func (ns *NotificationService) getHelpRequestSubject(templateType TemplateType, reference string) string {
	switch templateType {
	case HelpRequestSubmitted:
		return fmt.Sprintf("Request Received: %s", reference)
	case HelpRequestInProgress:
		return fmt.Sprintf("Update on Your Request: %s", reference)
	default:
		return fmt.Sprintf("Update on Help Request: %s", reference)
	}
}

// SendHelpRequestNotification sends a notification for a help request update
func (ns *NotificationService) SendHelpRequestNotification(request models.HelpRequest, templateType TemplateType) error {
	// Create a mock user object for the visitor
	user := models.User{
		FirstName: "Test",
		LastName:  "User",
		Email:     "test@example.com",
		Phone:     request.Phone,
		NotificationPreferences: &models.NotificationPreferences{
			EmailEnabled: true,
			SMSEnabled:   request.Phone != "",
		},
	}

	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             request.VisitorName,
		"Reference":        request.Reference,
		"Category":         request.Category,
		"Status":           request.Status,
		"Details":          request.Details,
		"VisitDay":         request.VisitDay,
		"TimeSlot":         request.TimeSlot,
		"OrganizationName": "Lewisham Charity",
	}

	// Get appropriate subject line
	subject := ns.getHelpRequestSubject(templateType, request.Reference)

	// Prepare notification data
	emailData := NotificationData{
		To:               user.Email,
		Subject:          subject,
		TemplateType:     templateType,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send email notification
	if err := ns.SendNotification(emailData, user); err != nil {
		return err
	}

	// Send SMS if phone number is available
	if user.Phone != "" {
		smsData := NotificationData{
			To:               user.Phone,
			Subject:          subject,
			TemplateType:     templateType,
			TemplateData:     templateData,
			NotificationType: SMSNotification,
		}

		if err := ns.SendNotification(smsData, user); err != nil {
			log.Printf("Failed to send SMS for help request: %v", err)
			// Continue even if SMS fails, since we've already sent the email
		}
	}

	return nil
}

// SendDonationReceipt sends a receipt for a donation
func (ns *NotificationService) SendDonationReceipt(donation models.Donation, donor models.User) error {
	// Use either the donor model passed in, or create a mock user from donation data
	user := donor
	if user.ID == 0 {
		user = models.User{
			FirstName: donation.Name, // Change to just use name field from donation for FirstName
			LastName:  "",            // Empty LastName since we only have one name field
			Email:     donation.ContactEmail,
			Phone:     donation.ContactPhone,
			NotificationPreferences: &models.NotificationPreferences{
				EmailEnabled: true,
			},
		}
	}

	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             user.FirstName + " " + user.LastName, // Concatenate name
		"DonationType":     donation.Type,
		"Amount":           donation.Amount,
		"Currency":         donation.Currency,
		"Goods":            donation.Goods,
		"Date":             donation.CreatedAt.Format("January 2, 2006"),
		"ID":               donation.ID,
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	notificationData := NotificationData{
		To:               user.Email,
		Subject:          "Thank You for Your Donation",
		TemplateType:     DonationReceived,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send email notification
	return ns.SendNotification(notificationData, user)
}

// SendDropoffConfirmation sends a confirmation for a scheduled donation drop-off
func (ns *NotificationService) SendDropoffConfirmation(donation models.Donation, scheduledTime time.Time, donor models.User) error {
	// Use either the donor model passed in, or create a mock user from donation data
	user := donor
	if user.ID == 0 {
		user = models.User{
			FirstName: donation.Name, // Change to just use name field from donation for FirstName
			LastName:  "",            // Empty LastName since we only have one name field
			Email:     donation.ContactEmail,
			Phone:     donation.ContactPhone,
			NotificationPreferences: &models.NotificationPreferences{
				EmailEnabled: true,
				SMSEnabled:   donation.ContactPhone != "",
			},
		}
	}

	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             user.FirstName + " " + user.LastName, // Concatenate name
		"DonationType":     donation.Type,
		"Goods":            donation.Goods,
		"ScheduledDate":    scheduledTime.Format("Monday, January 2, 2006"),
		"ScheduledTime":    scheduledTime.Format("3:04 PM"),
		"Location":         "Lewisham Charity, 123 Main Street, Lewisham",
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	emailData := NotificationData{
		To:               user.Email,
		Subject:          "Your Scheduled Donation Drop-off Confirmation",
		TemplateType:     DropoffScheduled,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send email notification
	if err := ns.SendNotification(emailData, user); err != nil {
		return err
	}

	// Send SMS reminder if phone is available
	if user.Phone != "" {
		smsData := NotificationData{
			To:               user.Phone,
			Subject:          "Donation Drop-off Confirmation",
			TemplateType:     DropoffScheduled,
			TemplateData:     templateData,
			NotificationType: SMSNotification,
		}

		if err := ns.SendNotification(smsData, user); err != nil {
			log.Printf("Failed to send SMS drop-off confirmation: %v", err)
			// Continue even if SMS fails, since we've already sent the email
		}
	}

	return nil
}

// SendPasswordResetEmail sends a password reset email to the user
func (ns *NotificationService) SendPasswordResetEmail(user models.User, resetToken, resetURL string) error {
	if !ns.enabled {
		log.Println("Notification service is disabled")
		return nil
	}

	data := NotificationData{
		To:               user.Email,
		Subject:          "Password Reset Request - Lewisham Charity",
		TemplateType:     PasswordReset,
		NotificationType: EmailNotification,
		TemplateData: map[string]interface{}{
			"Name":             user.FirstName + " " + user.LastName,
			"ResetURL":         resetURL,
			"ResetToken":       resetToken,
			"ExpiryTime":       "1 hour",
			"OrganizationName": "Lewisham Charity",
			"SupportEmail":     "support@lewishamCharity.org",
			"SupportPhone":     "020 8314 6000",
		},
	}

	return ns.SendNotification(data, user)
}

// SendAccountCreationEmail sends a welcome email for new account
func (ns *NotificationService) SendAccountCreationEmail(user models.User, tempPassword string) error {
	// Prepare template data
	templateData := map[string]interface{}{
		"Name":             user.FirstName + " " + user.LastName,
		"Email":            user.Email,
		"TempPassword":     tempPassword,
		"LoginURL":         "https://lewisham-donation-hub.org/login",
		"OrganizationName": "Lewisham Charity",
	}

	// Prepare notification data
	notificationData := NotificationData{
		To:               user.Email,
		Subject:          "Welcome to Lewisham Charity",
		TemplateType:     AccountCreated,
		TemplateData:     templateData,
		NotificationType: EmailNotification,
	}

	// Send notification
	return ns.SendNotification(notificationData, user)
}

// CreateDefaultNotificationPreferences creates default preferences for a new user
func CreateDefaultNotificationPreferences(userID uint) *models.NotificationPreferences {
	return &models.NotificationPreferences{
		UserID:         userID,
		EmailEnabled:   true,
		SMSEnabled:     false, // Default to false until phone verified
		PushEnabled:    true,
		ShiftReminders: true,
		ShiftUpdates:   true,
		UpcomingShifts: true,
		SystemUpdates:  true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"text/template"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
)

// SimpleNotificationService provides basic notification functionality
type SimpleNotificationService struct {
	emailClient EmailClient
	templates   map[string]*template.Template
	enabled     bool
}

// EmailClient interface for sending emails
type EmailClient interface {
	SendEmail(to, subject, body string) error
}

// MockEmailClient for development/testing
type MockEmailClient struct{}

func (c *MockEmailClient) SendEmail(to, subject, body string) error {
	log.Printf("Mock Email Sent to %s: Subject: %s", to, subject)
	return nil
}

// SendGridClient for production email sending
type SendGridClient struct {
	apiKey    string
	fromEmail string
	fromName  string
}

func (c *SendGridClient) SendEmail(to, subject, body string) error {
	if c.apiKey == "" {
		return fmt.Errorf("sendgrid api key not configured")
	}

	url := "https://api.sendgrid.com/v3/mail/send"

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
			"email": c.fromEmail,
			"name":  c.fromName,
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

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("sendgrid api error: status %d", resp.StatusCode)
	}

	return nil
}

// NewSimpleNotificationService creates a new simplified notification service
func NewSimpleNotificationService() *SimpleNotificationService {
	// Use mock client for development
	emailClient := &MockEmailClient{}

	// Load basic templates
	templates := loadBasicTemplates()

	return &SimpleNotificationService{
		emailClient: emailClient,
		templates:   templates,
		enabled:     true,
	}
}

// loadBasicTemplates loads essential templates only
func loadBasicTemplates() map[string]*template.Template {
	templates := make(map[string]*template.Template)

	// Basic email templates
	basicTemplates := map[string]string{
		"welcome": `
			<h2>Welcome to Lewisham Charity</h2>
			<p>Hello {{.Name}},</p>
			<p>Welcome to our community! Your account has been created successfully.</p>
			<p>Best regards,<br>Lewisham Charity Team</p>
		`,
		"password_reset": `
			<h2>Password Reset Request</h2>
			<p>Hello {{.Name}},</p>
			<p>You requested a password reset. Click the link below to reset your password:</p>
			<p><a href="{{.ResetURL}}">Reset Password</a></p>
			<p>If you didn't request this, please ignore this email.</p>
			<p>Best regards,<br>Lewisham Charity Team</p>
		`,
		"shift_reminder": `
			<h2>Shift Reminder</h2>
			<p>Hello {{.Name}},</p>
			<p>This is a reminder about your upcoming shift:</p>
			<p><strong>Date:</strong> {{.ShiftDate}}<br>
			<strong>Time:</strong> {{.ShiftTime}}</p>
			<p>Thank you for your service!</p>
			<p>Best regards,<br>Lewisham Charity Team</p>
		`,
		"donation_received": `
			<h2>Thank You for Your Donation</h2>
			<p>Hello {{.Name}},</p>
			<p>Thank you for your generous donation of £{{.Amount}}.</p>
			<p>Your support makes a real difference in our community.</p>
			<p>Best regards,<br>Lewisham Charity Team</p>
		`,
	}

	for name, content := range basicTemplates {
		if tmpl, err := template.New(name).Parse(content); err == nil {
			templates[name] = tmpl
		}
	}

	return templates
}

// SendWelcomeEmail sends a welcome email to new users
func (ns *SimpleNotificationService) SendWelcomeEmail(user models.User) error {
	if !ns.enabled {
		return nil
	}

	data := map[string]interface{}{
		"Name": user.FirstName + " " + user.LastName,
	}

	body, err := ns.renderTemplate("welcome", data)
	if err != nil {
		return err
	}

	return ns.emailClient.SendEmail(user.Email, "Welcome to Lewisham Charity", body)
}

// SendPasswordResetEmail sends a password reset email
func (ns *SimpleNotificationService) SendPasswordResetEmail(user models.User, resetURL string) error {
	if !ns.enabled {
		return nil
	}

	data := map[string]interface{}{
		"Name":     user.FirstName + " " + user.LastName,
		"ResetURL": resetURL,
	}

	body, err := ns.renderTemplate("password_reset", data)
	if err != nil {
		return err
	}

	return ns.emailClient.SendEmail(user.Email, "Password Reset Request", body)
}

// SendShiftReminder sends a shift reminder email
func (ns *SimpleNotificationService) SendShiftReminder(user models.User, shiftDate, shiftTime string) error {
	if !ns.enabled {
		return nil
	}

	data := map[string]interface{}{
		"Name":      user.FirstName + " " + user.LastName,
		"ShiftDate": shiftDate,
		"ShiftTime": shiftTime,
	}

	body, err := ns.renderTemplate("shift_reminder", data)
	if err != nil {
		return err
	}

	return ns.emailClient.SendEmail(user.Email, "Shift Reminder", body)
}

// SendDonationReceipt sends a donation receipt email
func (ns *SimpleNotificationService) SendDonationReceipt(user models.User, amount float64) error {
	if !ns.enabled {
		return nil
	}

	data := map[string]interface{}{
		"Name":   user.FirstName + " " + user.LastName,
		"Amount": fmt.Sprintf("%.2f", amount),
	}

	body, err := ns.renderTemplate("donation_received", data)
	if err != nil {
		return err
	}

	return ns.emailClient.SendEmail(user.Email, "Thank You for Your Donation", body)
}

// renderTemplate renders a template with given data
func (ns *SimpleNotificationService) renderTemplate(templateName string, data interface{}) (string, error) {
	tmpl, exists := ns.templates[templateName]
	if !exists {
		return "", fmt.Errorf("template %s not found", templateName)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

// SetEmailClient sets the email client (for testing or production)
func (ns *SimpleNotificationService) SetEmailClient(client EmailClient) {
	ns.emailClient = client
}

// Enable/Disable notifications
func (ns *SimpleNotificationService) Enable() {
	ns.enabled = true
}

func (ns *SimpleNotificationService) Disable() {
	ns.enabled = false
}

// SendNotification is a generic notification method for backward compatibility
func (ns *SimpleNotificationService) SendNotification(data NotificationData, user models.User) error {
	if !ns.enabled {
		return nil
	}

	// Map template types to our simplified templates
	var templateName string
	var subject string

	switch data.TemplateType {
	case "account_created":
		templateName = "welcome"
		subject = "Welcome to Lewisham Charity"
	case "password_reset":
		templateName = "password_reset"
		subject = "Password Reset Request"
	case "shift_reminder":
		templateName = "shift_reminder"
		subject = "Shift Reminder"
	case "donation_received":
		templateName = "donation_received"
		subject = "Thank You for Your Donation"
	default:
		// For unknown templates, create a simple generic email
		body := fmt.Sprintf("<h2>Notification</h2><p>%s</p>", data.Subject)
		return ns.emailClient.SendEmail(data.To, data.Subject, body)
	}

	// Prepare template data
	templateData := map[string]interface{}{
		"Name": user.FirstName + " " + user.LastName,
	}

	// Add custom data from the notification
	for key, value := range data.TemplateData {
		templateData[key] = value
	}

	body, err := ns.renderTemplate(templateName, templateData)
	if err != nil {
		return err
	}

	return ns.emailClient.SendEmail(data.To, subject, body)
}

// SendHelpRequestNotification sends a help request notification
func (ns *SimpleNotificationService) SendHelpRequestNotification(request models.HelpRequest, templateType TemplateType) error {
	if !ns.enabled {
		return nil
	}

	// Create a simple help request notification
	subject := "Help Request Update"
	body := fmt.Sprintf(`
		<h2>Help Request Update</h2>
		<p>Your help request has been %s.</p>
		<p><strong>Request ID:</strong> %d</p>
		<p><strong>Category:</strong> %s</p>
		<p><strong>Status:</strong> %s</p>
		<p>Thank you for reaching out to us.</p>
		<p>Best regards,<br>Lewisham Charity Team</p>
	`, templateType, request.ID, request.Category, request.Status)

	// Find the user who made the request
	var user models.User
	if err := db.DB.First(&user, request.VisitorID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	return ns.emailClient.SendEmail(user.Email, subject, body)
}

// SendShiftSignupConfirmation sends a shift signup confirmation email
func (ns *SimpleNotificationService) SendShiftSignupConfirmation(user models.User, shift models.Shift) error {
	if !ns.enabled {
		return nil
	}

	subject := "Shift Signup Confirmation"
	body := fmt.Sprintf(`
		<h2>Shift Signup Confirmation</h2>
		<p>Hello %s,</p>
		<p>Your shift signup has been confirmed!</p>
		<p><strong>Shift Details:</strong></p>
		<p><strong>Date:</strong> %s<br>
		<strong>Time:</strong> %s<br>
		<strong>Role:</strong> %s</p>
		<p>Thank you for volunteering with us!</p>
		<p>Best regards,<br>Lewisham Charity Team</p>
	`, user.FirstName+" "+user.LastName, shift.Date.Format("2006-01-02"), shift.StartTime, shift.Role)

	return ns.emailClient.SendEmail(user.Email, subject, body)
}

// SendShiftCancellationConfirmation sends a shift cancellation confirmation email
func (ns *SimpleNotificationService) SendShiftCancellationConfirmation(user models.User, shift models.Shift) error {
	if !ns.enabled {
		return nil
	}

	subject := "Shift Cancellation Confirmation"
	body := fmt.Sprintf(`
		<h2>Shift Cancellation Confirmation</h2>
		<p>Hello %s,</p>
		<p>Your shift cancellation has been confirmed.</p>
		<p><strong>Cancelled Shift:</strong></p>
		<p><strong>Date:</strong> %s<br>
		<strong>Time:</strong> %s<br>
		<strong>Role:</strong> %s</p>
		<p>We hope to see you at another shift soon!</p>
		<p>Best regards,<br>Lewisham Charity Team</p>
	`, user.FirstName+" "+user.LastName, shift.Date.Format("2006-01-02"), shift.StartTime, shift.Role)

	return ns.emailClient.SendEmail(user.Email, subject, body)
}

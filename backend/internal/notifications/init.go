package notifications

import (
	"log"
	"os"
)

// Service is the global NotificationService instance
var Service *NotificationService

// Initialize creates and initializes the global notification service
func Initialize() error {
	log.Println("Initializing notification service...")

	// Create a new notification service with proper config
	config := NotificationConfig{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     587,
		SMTPUsername: os.Getenv("SMTP_USERNAME"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		FromEmail:    os.Getenv("FROM_EMAIL"),
		FromName:     os.Getenv("FROM_NAME"),
		Enabled:      true,
	}

	// Set defaults if environment variables are not set
	if config.SMTPHost == "" {
		config.SMTPHost = "smtp.gmail.com"
	}
	if config.FromEmail == "" {
		config.FromEmail = "noreply@lewishamCharity.org"
	}
	if config.FromName == "" {
		config.FromName = "Lewisham Charity"
	}

	service, err := NewNotificationService(config)
	if err != nil {
		log.Printf("Failed to initialize notification service: %v", err)
		return err
	}

	Service = service

	// Validate that templates are loaded
	if len(Service.templates) == 0 {
		log.Println("Warning: No notification templates loaded")
	} else {
		log.Printf("Loaded %d notification templates", len(Service.templates))
	}

	return nil
}

// GetService returns the global notification service instance
func GetService() *NotificationService {
	if Service == nil {
		log.Println("Warning: Notification service requested but not initialized. Initializing now...")
		Initialize()
	}
	return Service
}

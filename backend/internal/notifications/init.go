package notifications

import (
	"log"
)

// Service is the global SimpleNotificationService instance
var Service *SimpleNotificationService

// Initialize creates and initializes the global simplified notification service
func Initialize() error {
	log.Println("Initializing simplified notification service...")

	// Create a new simplified notification service
	service := NewSimpleNotificationService()

	Service = service

	log.Printf("Simplified notification service initialized with %d templates", len(Service.templates))

	return nil
}

// GetService returns the global notification service instance
func GetService() *SimpleNotificationService {
	if Service == nil {
		log.Println("Warning: Notification service requested but not initialized. Initializing now...")
		Initialize()
	}
	return Service
}

package services

import (
	"fmt"
	"log"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/notifications"
	"github.com/geoo115/LDH/internal/websocket"
)

// RealtimeNotificationService handles sending notifications via multiple channels including WebSocket
type RealtimeNotificationService struct {
	wsManager           *websocket.WebSocketManager
	notificationService *notifications.NotificationService
}

// NewRealtimeNotificationService creates a new real-time notification service
func NewRealtimeNotificationService() *RealtimeNotificationService {
	return &RealtimeNotificationService{
		wsManager:           websocket.GetGlobalManager(),
		notificationService: notifications.NewNotificationServiceSimple(),
	}
}

// NotificationData represents data for sending notifications
type RealtimeNotificationData struct {
	UserID    uint                   `json:"user_id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Priority  string                 `json:"priority"`
	Category  string                 `json:"category"`
	ActionURL string                 `json:"action_url,omitempty"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Channels  []string               `json:"channels"` // ["websocket", "push", "email", "sms"]
}

// SendNotification sends a notification via specified channels
func (rns *RealtimeNotificationService) SendNotification(data RealtimeNotificationData) error {
	log.Printf("Sending real-time notification to user %d: %s", data.UserID, data.Title)

	// Create in-app notification record
	inAppNotification := models.InAppNotification{
		UserID:    data.UserID,
		Type:      data.Type,
		Title:     data.Title,
		Message:   data.Message,
		Priority:  data.Priority,
		ActionURL: data.ActionURL,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	// Set expiration based on type
	if data.Type == "queue_update" {
		expiry := time.Now().Add(24 * time.Hour)
		inAppNotification.ExpiresAt = &expiry
	}

	// Save to database
	if err := db.DB.Create(&inAppNotification).Error; err != nil {
		log.Printf("Failed to create in-app notification: %v", err)
		return fmt.Errorf("failed to create notification: %w", err)
	}

	// Send via requested channels
	for _, channel := range data.Channels {
		switch channel {
		case "websocket":
			if err := rns.sendWebSocketNotification(data, inAppNotification.ID); err != nil {
				log.Printf("Failed to send WebSocket notification: %v", err)
			}
		case "push":
			if err := rns.sendPushNotification(data); err != nil {
				log.Printf("Failed to send push notification: %v", err)
			}
		case "email":
			if err := rns.sendEmailNotification(data); err != nil {
				log.Printf("Failed to send email notification: %v", err)
			}
		case "sms":
			if err := rns.sendSMSNotification(data); err != nil {
				log.Printf("Failed to send SMS notification: %v", err)
			}
		}
	}

	return nil
}

// sendWebSocketNotification sends notification via WebSocket
func (rns *RealtimeNotificationService) sendWebSocketNotification(data RealtimeNotificationData, notificationID uint) error {
	wsMessage := map[string]interface{}{
		"type":              "notification",
		"id":                notificationID,
		"user_id":           data.UserID,
		"notification_type": data.Type,
		"title":             data.Title,
		"message":           data.Message,
		"priority":          data.Priority,
		"category":          data.Category,
		"action_url":        data.ActionURL,
		"timestamp":         time.Now(),
		"data":              data.Data,
	}

	// Send to specific user via WebSocket manager
	if err := rns.wsManager.BroadcastToUser(data.UserID, wsMessage); err != nil {
		return fmt.Errorf("failed to send WebSocket message: %w", err)
	}

	log.Printf("WebSocket notification sent to user %d", data.UserID)
	return nil
}

// sendPushNotification sends notification via browser push
func (rns *RealtimeNotificationService) sendPushNotification(data RealtimeNotificationData) error {
	// Get user's active push subscriptions
	var subscriptions []models.PushSubscription
	if err := db.DB.Where("user_id = ? AND active = ?", data.UserID, true).Find(&subscriptions).Error; err != nil {
		return fmt.Errorf("failed to get push subscriptions: %w", err)
	}

	if len(subscriptions) == 0 {
		log.Printf("No active push subscriptions found for user %d", data.UserID)
		return nil // Not an error - user might not have push enabled
	}

	// For now, we'll just log it (mock implementation)
	log.Printf("PUSH NOTIFICATION: %s - %s (User: %d, Devices: %d)",
		data.Title, data.Message, data.UserID, len(subscriptions))
	return nil
}

// sendEmailNotification sends notification via email using the existing service
func (rns *RealtimeNotificationService) sendEmailNotification(data RealtimeNotificationData) error {
	// Get user details
	var user models.User
	if err := db.DB.First(&user, data.UserID).Error; err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	userName := user.FirstName + " " + user.LastName

	// Use the existing notification service for email
	notificationData := notifications.NotificationData{
		To:           user.Email,
		Subject:      data.Title,
		TemplateType: notifications.TemplateType(data.Type),
		TemplateData: map[string]interface{}{
			"Name":    userName,
			"Message": data.Message,
			"Title":   data.Title,
		},
		NotificationType: notifications.EmailNotification,
	}

	return rns.notificationService.SendNotification(notificationData, user)
}

// sendSMSNotification sends notification via SMS using the existing service
func (rns *RealtimeNotificationService) sendSMSNotification(data RealtimeNotificationData) error {
	// Get user details
	var user models.User
	if err := db.DB.First(&user, data.UserID).Error; err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	userName := user.FirstName + " " + user.LastName

	// Use the existing notification service for SMS
	notificationData := notifications.NotificationData{
		To:           user.Phone,
		Subject:      data.Title,
		TemplateType: notifications.TemplateType(data.Type),
		TemplateData: map[string]interface{}{
			"Name":    userName,
			"Message": data.Message,
		},
		NotificationType: notifications.SMSNotification,
	}

	return rns.notificationService.SendNotification(notificationData, user)
}

// SendToRole sends a notification to all users with a specific role
func (rns *RealtimeNotificationService) SendToRole(role string, data RealtimeNotificationData) error {
	// Get all users with the specified role
	var users []models.User
	if err := db.DB.Where("role = ?", role).Find(&users).Error; err != nil {
		return fmt.Errorf("failed to get users with role %s: %w", role, err)
	}

	// Send to each user
	successCount := 0
	for _, user := range users {
		userData := data
		userData.UserID = user.ID
		if err := rns.SendNotification(userData); err != nil {
			log.Printf("Failed to send notification to user %d: %v", user.ID, err)
		} else {
			successCount++
		}
	}

	log.Printf("Sent notification to %d/%d users with role %s", successCount, len(users), role)
	return nil
}

// SendToMultipleUsers sends a notification to multiple specific users
func (rns *RealtimeNotificationService) SendToMultipleUsers(userIDs []uint, data RealtimeNotificationData) error {
	successCount := 0
	failureCount := 0

	for _, userID := range userIDs {
		userData := data
		userData.UserID = userID
		if err := rns.SendNotification(userData); err != nil {
			log.Printf("Failed to send notification to user %d: %v", userID, err)
			failureCount++
		} else {
			successCount++
		}
	}

	log.Printf("Sent notification to %d users (%d successes, %d failures)",
		len(userIDs), successCount, failureCount)
	return nil
}

// BroadcastToTopic sends a notification to all users subscribed to a topic
func (rns *RealtimeNotificationService) BroadcastToTopic(topic string, data RealtimeNotificationData) error {
	wsMessage := map[string]interface{}{
		"type":              "broadcast",
		"topic":             topic,
		"notification_type": data.Type,
		"title":             data.Title,
		"message":           data.Message,
		"priority":          data.Priority,
		"category":          data.Category,
		"timestamp":         time.Now(),
		"data":              data.Data,
	}

	// Broadcast to topic via WebSocket manager
	if err := rns.wsManager.BroadcastToTopic(topic, wsMessage); err != nil {
		return fmt.Errorf("failed to broadcast to topic %s: %w", topic, err)
	}

	log.Printf("Broadcasted notification to topic: %s", topic)
	return nil
}

// SendSystemAlert sends a system-wide alert notification
func (rns *RealtimeNotificationService) SendSystemAlert(title, message string, priority string) error {
	// Send to all connected users via WebSocket
	wsMessage := map[string]interface{}{
		"type":      "system_alert",
		"title":     title,
		"message":   message,
		"priority":  priority,
		"timestamp": time.Now(),
	}

	// Broadcast to all topics
	topics := []string{"notifications", "general", "admin_notifications", "volunteer_notifications"}
	for _, topic := range topics {
		if err := rns.wsManager.BroadcastToTopic(topic, wsMessage); err != nil {
			log.Printf("Failed to broadcast system alert to topic %s: %v", topic, err)
		}
	}

	log.Printf("System alert sent: %s", title)
	return nil
}

// SendQueueUpdate sends a queue position update to a user
func (rns *RealtimeNotificationService) SendQueueUpdate(userID uint, position int, estimatedWait string) error {
	data := RealtimeNotificationData{
		UserID:   userID,
		Type:     "queue_update",
		Title:    "Queue Update",
		Message:  fmt.Sprintf("Your position in queue: %d. Estimated wait: %s", position, estimatedWait),
		Priority: "normal",
		Category: "queue",
		Channels: []string{"websocket"},
		Data: map[string]interface{}{
			"position":       position,
			"estimated_wait": estimatedWait,
		},
	}

	return rns.SendNotification(data)
}

// SendShiftReminder sends a shift reminder notification
func (rns *RealtimeNotificationService) SendShiftReminder(userID uint, shiftDate time.Time, location string) error {
	data := RealtimeNotificationData{
		UserID:   userID,
		Type:     "shift_reminder",
		Title:    "Shift Reminder",
		Message:  fmt.Sprintf("You have a shift tomorrow at %s", location),
		Priority: "high",
		Category: "volunteer",
		Channels: []string{"websocket", "push", "email"},
		Data: map[string]interface{}{
			"shift_date": shiftDate,
			"location":   location,
		},
	}

	return rns.SendNotification(data)
}

// SendDocumentStatusUpdate sends a document verification status update
func (rns *RealtimeNotificationService) SendDocumentStatusUpdate(userID uint, documentName, status string) error {
	var title, message string
	var priority string = "normal"

	switch status {
	case "approved":
		title = "Document Approved"
		message = fmt.Sprintf("Your document '%s' has been approved", documentName)
		priority = "high"
	case "rejected":
		title = "Document Needs Attention"
		message = fmt.Sprintf("Your document '%s' needs to be resubmitted", documentName)
		priority = "high"
	default:
		title = "Document Status Update"
		message = fmt.Sprintf("Your document '%s' status has been updated to: %s", documentName, status)
	}

	data := RealtimeNotificationData{
		UserID:    userID,
		Type:      "document_update",
		Title:     title,
		Message:   message,
		Priority:  priority,
		Category:  "documents",
		ActionURL: "/documents",
		Channels:  []string{"websocket", "push"},
		Data: map[string]interface{}{
			"document_name": documentName,
			"status":        status,
		},
	}

	return rns.SendNotification(data)
}

// SendHelpRequestUpdate sends a help request status update
func (rns *RealtimeNotificationService) SendHelpRequestUpdate(userID uint, requestID uint, status string) error {
	var title, message string
	var priority string = "normal"

	switch status {
	case "approved":
		title = "Help Request Approved"
		message = "Your help request has been approved. Please check your appointment details."
		priority = "high"
	case "in_progress":
		title = "Help Request In Progress"
		message = "Your help request is being processed."
	case "completed":
		title = "Help Request Completed"
		message = "Your help request has been completed. Thank you for visiting us!"
		priority = "high"
	default:
		title = "Help Request Update"
		message = fmt.Sprintf("Your help request status has been updated to: %s", status)
	}

	data := RealtimeNotificationData{
		UserID:    userID,
		Type:      "help_request_update",
		Title:     title,
		Message:   message,
		Priority:  priority,
		Category:  "help_requests",
		ActionURL: fmt.Sprintf("/visitor/help-request/%d", requestID),
		Channels:  []string{"websocket", "push"},
		Data: map[string]interface{}{
			"request_id": requestID,
			"status":     status,
		},
	}

	return rns.SendNotification(data)
}

// GetGlobalRealtimeNotificationService returns the global real-time notification service instance
var globalRealtimeNotificationService *RealtimeNotificationService

func GetGlobalRealtimeNotificationService() *RealtimeNotificationService {
	if globalRealtimeNotificationService == nil {
		globalRealtimeNotificationService = NewRealtimeNotificationService()
	}
	return globalRealtimeNotificationService
}

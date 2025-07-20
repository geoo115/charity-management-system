package system

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"
	"github.com/gin-gonic/gin"
)

// PushNotificationPayload represents the payload sent to push service
type PushNotificationPayload struct {
	Title   string                 `json:"title"`
	Body    string                 `json:"body"`
	Icon    string                 `json:"icon,omitempty"`
	Badge   string                 `json:"badge,omitempty"`
	Image   string                 `json:"image,omitempty"`
	Tag     string                 `json:"tag,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
	Actions []PushAction           `json:"actions,omitempty"`
	Silent  bool                   `json:"silent,omitempty"`
}

// PushAction represents an action button in push notification
type PushAction struct {
	Action string `json:"action"`
	Title  string `json:"title"`
	Icon   string `json:"icon,omitempty"`
}

// SubscribeToPushNotifications handles push notification subscription
func SubscribeToPushNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var subscription struct {
		Endpoint string `json:"endpoint" binding:"required"`
		Keys     struct {
			P256DH string `json:"p256dh" binding:"required"`
			Auth   string `json:"auth" binding:"required"`
		} `json:"keys" binding:"required"`
		UserAgent string `json:"userAgent"`
		Platform  string `json:"platform"`
		Browser   string `json:"browser"`
	}

	if err := c.ShouldBindJSON(&subscription); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subscription data: " + err.Error()})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Check if subscription already exists
	var existingSubscription models.PushSubscription
	result := db.DB.Where("user_id = ? AND endpoint = ?", uid, subscription.Endpoint).First(&existingSubscription)

	if result.Error == nil {
		// Update existing subscription
		existingSubscription.P256DH = subscription.Keys.P256DH
		existingSubscription.Auth = subscription.Keys.Auth
		existingSubscription.Active = true
		existingSubscription.UserAgent = subscription.UserAgent
		existingSubscription.Platform = subscription.Platform
		existingSubscription.Browser = subscription.Browser
		existingSubscription.UpdatedAt = time.Now()

		if err := db.DB.Save(&existingSubscription).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subscription"})
			return
		}

		log.Printf("Updated push subscription for user %d", uid)
	} else {
		// Create new subscription
		newSubscription := models.PushSubscription{
			UserID:    uid,
			Endpoint:  subscription.Endpoint,
			P256DH:    subscription.Keys.P256DH,
			Auth:      subscription.Keys.Auth,
			Active:    true,
			UserAgent: subscription.UserAgent,
			Platform:  subscription.Platform,
			Browser:   subscription.Browser,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := db.DB.Create(&newSubscription).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription"})
			return
		}

		log.Printf("Created new push subscription for user %d", uid)
	}

	// Create audit log
	utils.CreateAuditLog(c, "Create", "PushSubscription", uid, "Push notification subscription created/updated")

	c.JSON(http.StatusOK, gin.H{
		"message": "Push notification subscription successful",
		"status":  "subscribed",
	})
}

// UnsubscribeFromPushNotifications handles push notification unsubscription
func UnsubscribeFromPushNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var request struct {
		Endpoint string `json:"endpoint"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// If endpoint is provided, unsubscribe specific endpoint
	if request.Endpoint != "" {
		result := db.DB.Where("user_id = ? AND endpoint = ?", uid, request.Endpoint).
			Updates(&models.PushSubscription{Active: false, UpdatedAt: time.Now()})

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unsubscribe"})
			return
		}

		if result.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
			return
		}
	} else {
		// Unsubscribe all endpoints for the user
		result := db.DB.Model(&models.PushSubscription{}).Where("user_id = ?", uid).
			Updates(&models.PushSubscription{Active: false, UpdatedAt: time.Now()})

		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unsubscribe"})
			return
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "Update", "PushSubscription", uid, "Push notification unsubscribed")

	log.Printf("User %d unsubscribed from push notifications", uid)

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully unsubscribed from push notifications",
		"status":  "unsubscribed",
	})
}

// SendTestPushNotification sends a test push notification
func SendTestPushNotification(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var request struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Icon    string `json:"icon"`
		Tag     string `json:"tag"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Set defaults if not provided
	if request.Title == "" {
		request.Title = "Test Notification"
	}
	if request.Message == "" {
		request.Message = "This is a test push notification from Lewisham Charity"
	}
	if request.Icon == "" {
		request.Icon = "/logo.svg"
	}
	if request.Tag == "" {
		request.Tag = "test-notification"
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user's active push subscriptions
	var subscriptions []models.PushSubscription
	if err := db.DB.Where("user_id = ? AND active = ?", uid, true).Find(&subscriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get subscriptions"})
		return
	}

	if len(subscriptions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active push subscriptions found"})
		return
	}

	// Create notification payload
	payload := PushNotificationPayload{
		Title: request.Title,
		Body:  request.Message,
		Icon:  request.Icon,
		Tag:   request.Tag,
		Data: map[string]interface{}{
			"type":      "test",
			"timestamp": time.Now().Unix(),
			"url":       "/notifications",
		},
		Actions: []PushAction{
			{
				Action: "view",
				Title:  "View",
				Icon:   "/icons/view.png",
			},
			{
				Action: "dismiss",
				Title:  "Dismiss",
				Icon:   "/icons/close.png",
			},
		},
	}

	// Send to all subscriptions
	successCount := 0
	failureCount := 0

	for _, subscription := range subscriptions {
		if err := sendPushNotification(subscription, payload); err != nil {
			log.Printf("Failed to send push notification to subscription %d: %v", subscription.ID, err)
			failureCount++
		} else {
			successCount++
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "Create", "TestPushNotification", uid,
		fmt.Sprintf("Test push notification sent to %d subscriptions", successCount))

	log.Printf("Test push notification sent to user %d: %d success, %d failures", uid, successCount, failureCount)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Test push notification sent",
		"sent_to":       successCount,
		"failed":        failureCount,
		"total_devices": len(subscriptions),
	})
}

// SendPushNotificationToUser sends a push notification to a specific user
func SendPushNotificationToUser(userID uint, payload PushNotificationPayload) error {
	// Get user's active push subscriptions
	var subscriptions []models.PushSubscription
	if err := db.DB.Where("user_id = ? AND active = ?", userID, true).Find(&subscriptions).Error; err != nil {
		return fmt.Errorf("failed to get subscriptions for user %d: %w", userID, err)
	}

	if len(subscriptions) == 0 {
		log.Printf("No active push subscriptions found for user %d", userID)
		return nil // Not an error - user might not have push enabled
	}

	// Send to all subscriptions
	successCount := 0
	var lastError error

	for _, subscription := range subscriptions {
		if err := sendPushNotification(subscription, payload); err != nil {
			log.Printf("Failed to send push notification to user %d subscription %d: %v", userID, subscription.ID, err)
			lastError = err
		} else {
			successCount++
		}
	}

	if successCount == 0 && lastError != nil {
		return fmt.Errorf("failed to send push notification to any device for user %d: %w", userID, lastError)
	}

	log.Printf("Push notification sent to user %d: %d/%d devices", userID, successCount, len(subscriptions))
	return nil
}

// sendPushNotification sends a push notification to a specific subscription
func sendPushNotification(subscription models.PushSubscription, payload PushNotificationPayload) error {
	// For now, we'll log the notification instead of actually sending it
	// In a real implementation, you would use a library like webpush-go
	// to send the notification to the browser's push service

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	log.Printf("MOCK PUSH NOTIFICATION - Would send to endpoint: %s", subscription.Endpoint[:50]+"...")
	log.Printf("MOCK PUSH NOTIFICATION - Payload: %s", string(payloadJSON))
	log.Printf("MOCK PUSH NOTIFICATION - Keys: p256dh=%s..., auth=%s...",
		subscription.P256DH[:10], subscription.Auth[:10])

	// In a real implementation, you would:
	// 1. Use webpush-go library
	// 2. Configure VAPID keys
	// 3. Send to the actual push service (FCM, Mozilla, etc.)
	//
	// Example with webpush-go:
	// resp, err := webpush.SendNotification(payloadJSON, &subscription, &webpush.Options{
	//     Subscriber:      "mailto:admin@lewishamCharity.org",
	//     VAPIDPublicKey:  vapidPublicKey,
	//     VAPIDPrivateKey: vapidPrivateKey,
	//     TTL:             30,
	// })

	// For now, simulate success
	return nil
}

// GetPushSubscriptionStatus returns push subscription status for current user
func GetPushSubscriptionStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user's push subscriptions
	var subscriptions []models.PushSubscription
	if err := db.DB.Where("user_id = ?", uid).Find(&subscriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get subscription status"})
		return
	}

	activeCount := 0
	for _, sub := range subscriptions {
		if sub.Active {
			activeCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"subscribed":     activeCount > 0,
		"active_devices": activeCount,
		"total_devices":  len(subscriptions),
		"subscriptions":  subscriptions,
	})
}

// InitializePushSubscriptionTable creates the push subscription table if it doesn't exist
func InitializePushSubscriptionTable() error {
	if err := db.DB.AutoMigrate(&models.PushSubscription{}); err != nil {
		return fmt.Errorf("failed to migrate push subscription table: %w", err)
	}

	log.Println("Push subscription table initialized successfully")
	return nil
}

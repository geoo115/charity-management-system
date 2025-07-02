package system

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/websocket"

	"github.com/gin-gonic/gin"
)

// ComprehensiveTestNotificationRequest represents the request payload for comprehensive test notifications
type ComprehensiveTestNotificationRequest struct {
	Type     string `json:"type" binding:"required"`
	Title    string `json:"title" binding:"required"`
	Message  string `json:"message" binding:"required"`
	Priority string `json:"priority"`
	UserID   uint   `json:"user_id"`
}

// SendComprehensiveTestNotification sends a test notification for system testing
// @Summary Send comprehensive test notification
// @Description Sends a test notification via both WebSocket and database storage for testing purposes
// @Tags Testing
// @Accept json
// @Produce json
// @Param notification body ComprehensiveTestNotificationRequest true "Test notification details"
// @Success 200 {object} map[string]interface{} "Notification sent successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/notifications/test [post]
func SendComprehensiveTestNotification(c *gin.Context) {
	var req ComprehensiveTestNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the requesting user
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Set target user (use requesting user if not specified)
	targetUserID := req.UserID
	if targetUserID == 0 {
		targetUserID = userID.(uint)
	}

	// Validate priority
	if req.Priority == "" {
		req.Priority = "medium"
	}

	// Create in-app notification record
	notification := models.InAppNotification{
		UserID:    targetUserID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Priority:  req.Priority,
		ActionURL: "", // No action for test notifications
		Read:      false,
		CreatedAt: time.Now(),
	}

	if err := db.DB.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create notification record",
		})
		return
	}

	// Send real-time notification via WebSocket
	wsMessage := map[string]interface{}{
		"type": "notification",
		"data": map[string]interface{}{
			"id":        notification.ID,
			"type":      req.Type,
			"title":     req.Title,
			"message":   req.Message,
			"priority":  req.Priority,
			"timestamp": notification.CreatedAt,
			"read":      false,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	}

	// Broadcast via WebSocket manager
	if err := websocket.GetGlobalManager().BroadcastToUser(targetUserID, wsMessage); err != nil {
		// Log error but don't fail the request - notification was still stored
		c.JSON(http.StatusOK, gin.H{
			"message":         "Test notification created but WebSocket delivery failed",
			"notification_id": notification.ID,
			"websocket_error": err.Error(),
			"stored_in_db":    true,
		})
		return
	}

	// Also send via notification service for completeness
	go func() {
		// Get notification service
		notificationService := notifications.GetService()
		if notificationService == nil {
			println("Notification service not available")
			return
		}

		// Create mock user for notification service
		user := models.User{
			ID:    targetUserID,
			Email: "test@example.com", // Mock email for testing
		}

		notificationData := notifications.NotificationData{
			To:               user.Email,
			Subject:          req.Title,
			TemplateType:     notifications.SystemMaintenance, // Using system maintenance template for tests
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":    "Test User",
				"Message": req.Message,
				"Type":    req.Type,
				"Test":    true,
			},
		}

		if err := notificationService.SendNotification(notificationData, user); err != nil {
			// This is async, so we just log the error
			println("Failed to send notification via notification service:", err.Error())
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":         "Test notification sent successfully",
		"notification_id": notification.ID,
		"target_user_id":  targetUserID,
		"type":            req.Type,
		"priority":        req.Priority,
		"websocket_sent":  true,
		"stored_in_db":    true,
		"timestamp":       notification.CreatedAt,
	})
}

// GetTestNotificationStats returns statistics about test notifications
// @Summary Get test notification statistics
// @Description Returns statistics about test notifications for monitoring
// @Tags Testing
// @Produce json
// @Success 200 {object} map[string]interface{} "Test notification statistics"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /api/v1/notifications/test/stats [get]
func GetTestNotificationStats(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get test notification count for the user
	var totalCount int64
	var unreadCount int64
	var last24HCount int64

	db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND type LIKE ?", userID, "test_%").
		Count(&totalCount)

	db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND type LIKE ? AND read = false", userID, "test_%").
		Count(&unreadCount)

	db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND type LIKE ? AND created_at > ?", userID, "test_%", time.Now().Add(-24*time.Hour)).
		Count(&last24HCount)

	// Get WebSocket connection status
	wsManager := websocket.GetGlobalManager()
	stats := wsManager.GetConnectionStats()
	wsConnected := stats.ConnectionsByUser[userID.(uint)] > 0

	c.JSON(http.StatusOK, gin.H{
		"user_id":                     userID,
		"total_test_notifications":    totalCount,
		"unread_test_notifications":   unreadCount,
		"last_24h_test_notifications": last24HCount,
		"websocket_connected":         wsConnected,
		"timestamp":                   time.Now(),
	})
}

// ClearTestNotifications removes all test notifications for the current user
// @Summary Clear test notifications
// @Description Removes all test notifications for the authenticated user
// @Tags Testing
// @Produce json
// @Success 200 {object} map[string]interface{} "Test notifications cleared"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /api/v1/notifications/test/clear [delete]
func ClearTestNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Delete all test notifications for the user
	result := db.DB.Where("user_id = ? AND type LIKE ?", userID, "test_%").
		Delete(&models.InAppNotification{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to clear test notifications",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Test notifications cleared successfully",
		"deleted_count": result.RowsAffected,
		"user_id":       userID,
		"timestamp":     time.Now(),
	})
}

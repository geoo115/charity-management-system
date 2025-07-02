package system

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"

	"github.com/gin-gonic/gin"
)

// NotificationPreferencesRequest represents user notification preferences
type NotificationPreferencesRequest struct {
	EmailEnabled         bool     `json:"email_enabled"`
	SMSEnabled           bool     `json:"sms_enabled"`
	PushEnabled          bool     `json:"push_enabled"`
	QueueUpdates         bool     `json:"queue_updates"`
	ShiftReminders       bool     `json:"shift_reminders"`
	ApplicationUpdates   bool     `json:"application_updates"`
	GeneralAnnouncements bool     `json:"general_announcements"`
	EmergencyAlerts      bool     `json:"emergency_alerts"`
	ReminderTiming       []string `json:"reminder_timing"`  // e.g., ["24h", "2h"]
	PreferredMethod      string   `json:"preferred_method"` // email, sms, both
}

// NotificationHistoryItem represents a notification record
type NotificationHistoryItem struct {
	ID      uint       `json:"id"`
	Type    string     `json:"type"`
	Title   string     `json:"title"`
	Message string     `json:"message"`
	Method  string     `json:"method"`
	Status  string     `json:"status"`
	SentAt  time.Time  `json:"sent_at"`
	ReadAt  *time.Time `json:"read_at"`
}

// InAppNotification represents an in-app notification
type InAppNotification struct {
	ID        uint       `json:"id"`
	UserID    uint       `json:"user_id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	ActionURL string     `json:"action_url,omitempty"`
	IsRead    bool       `json:"is_read"`
	Priority  string     `json:"priority"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// GetNotificationPreferences returns user's notification preferences
func GetNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var preferences models.NotificationPreferences
	err := db.DB.Where("user_id = ?", userID).First(&preferences).Error

	if err != nil {
		// Return default preferences if none exist
		preferences = models.NotificationPreferences{
			UserID:               userID.(uint),
			EmailEnabled:         true,
			SMSEnabled:           false,
			QueueUpdates:         true,
			ShiftReminders:       true,
			ApplicationUpdates:   true,
			GeneralAnnouncements: true,
			EmergencyAlerts:      true,
			ReminderTiming:       "24h,2h",
			PreferredMethod:      "email",
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"preferences": preferences,
	})
}

// UpdateNotificationPreferences updates user's notification preferences
func UpdateNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req NotificationPreferencesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find or create preferences
	var preferences models.NotificationPreferences
	result := db.DB.Where("user_id = ?", userID).First(&preferences)

	if result.Error != nil {
		// Create new preferences
		preferences = models.NotificationPreferences{
			UserID: userID.(uint),
		}
	}

	// Update preferences
	preferences.EmailEnabled = req.EmailEnabled
	preferences.SMSEnabled = req.SMSEnabled
	preferences.QueueUpdates = req.QueueUpdates
	preferences.ShiftReminders = req.ShiftReminders
	preferences.ApplicationUpdates = req.ApplicationUpdates
	preferences.GeneralAnnouncements = req.GeneralAnnouncements
	preferences.EmergencyAlerts = req.EmergencyAlerts
	preferences.PreferredMethod = req.PreferredMethod
	preferences.UpdatedAt = time.Now()

	// Convert reminder timing array to string
	if len(req.ReminderTiming) > 0 {
		preferences.ReminderTiming = fmt.Sprintf("%v", req.ReminderTiming)
	}

	// Save preferences
	if result.Error != nil {
		preferences.CreatedAt = time.Now()
		err := db.DB.Create(&preferences).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create preferences"})
			return
		}
	} else {
		err := db.DB.Save(&preferences).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
			return
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "Update", "NotificationPreferences", userID.(uint), "Notification preferences updated")

	c.JSON(http.StatusOK, gin.H{
		"message":     "Notification preferences updated successfully",
		"preferences": preferences,
	})
}

// GetInAppNotifications returns user's in-app notifications
func GetInAppNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Parse query parameters
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	unreadOnly := c.Query("unread_only") == "true"

	// Build query
	query := db.DB.Where("user_id = ?", userID).
		Where("(expires_at IS NULL OR expires_at > ?)", time.Now()).
		Order("created_at DESC").
		Limit(limit)

	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}

	var notifications []models.InAppNotification
	if err := query.Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notifications"})
		return
	}

	// Convert to response format
	var formattedNotifications []InAppNotification
	for _, notif := range notifications {
		formattedNotifications = append(formattedNotifications, InAppNotification{
			ID:        notif.ID,
			UserID:    notif.UserID,
			Type:      notif.Type,
			Title:     notif.Title,
			Message:   notif.Message,
			ActionURL: notif.ActionURL,
			IsRead:    notif.IsRead,
			Priority:  notif.Priority,
			CreatedAt: notif.CreatedAt,
			ExpiresAt: notif.ExpiresAt,
		})
	}

	// Get unread count
	var unreadCount int64
	db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND is_read = ? AND (expires_at IS NULL OR expires_at > ?)",
			userID, false, time.Now()).
		Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"notifications": formattedNotifications,
		"unread_count":  unreadCount,
		"total":         len(formattedNotifications),
		"pages":         1, // Since we're not implementing pagination yet, always 1
	})
}

// MarkNotificationAsRead marks a notification as read
func MarkNotificationAsRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	notificationID := c.Param("id")

	var notification models.InAppNotification
	err := db.DB.Where("id = ? AND user_id = ?", notificationID, userID).
		First(&notification).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	if !notification.IsRead {
		now := time.Now()
		notification.IsRead = true
		notification.ReadAt = &now

		if err := db.DB.Save(&notification).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Notification marked as read",
		"notification_id": notification.ID,
	})
}

// MarkAllNotificationsAsRead marks all user's notifications as read
func MarkAllNotificationsAsRead(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	now := time.Now()
	result := db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "All notifications marked as read",
		"updated_count": result.RowsAffected,
	})
}

// GetNotificationHistory returns user's notification history
func GetNotificationHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Parse query parameters
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	typeFilter := c.Query("type")
	methodFilter := c.Query("method")

	// Build query for notification logs
	query := db.DB.Model(&models.NotificationLog{}).
		Where("user_id = ?", userID).
		Order("sent_at DESC").
		Limit(limit)

	if typeFilter != "" {
		query = query.Where("type = ?", typeFilter)
	}

	if methodFilter != "" {
		query = query.Where("method = ?", methodFilter)
	}

	var logs []models.NotificationLog
	if err := query.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notification history"})
		return
	}

	// Convert to response format
	var history []NotificationHistoryItem
	for _, log := range logs {
		history = append(history, NotificationHistoryItem{
			ID:      log.ID,
			Type:    log.Type,
			Title:   log.Subject,
			Message: log.Message,
			Method:  log.Method,
			Status:  log.Status,
			SentAt:  *log.SentAt,
			ReadAt:  log.ReadAt,
		})
	}

	// Get summary statistics
	var stats struct {
		Total     int64 `json:"total"`
		Email     int64 `json:"email"`
		SMS       int64 `json:"sms"`
		InApp     int64 `json:"in_app"`
		Delivered int64 `json:"delivered"`
		Failed    int64 `json:"failed"`
	}

	db.DB.Model(&models.NotificationLog{}).Where("user_id = ?", userID).Count(&stats.Total)
	db.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND method = ?", userID, "email").Count(&stats.Email)
	db.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND method = ?", userID, "sms").Count(&stats.SMS)
	db.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND method = ?", userID, "in_app").Count(&stats.InApp)
	db.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND status = ?", userID, "delivered").Count(&stats.Delivered)
	db.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND status = ?", userID, "failed").Count(&stats.Failed)

	c.JSON(http.StatusOK, gin.H{
		"history": history,
		"stats":   stats,
		"total":   len(history),
	})
}

// CreateInAppNotification creates a new in-app notification (for internal use)
func CreateInAppNotification(userID uint, notificationType, title, message string, actionURL string, priority string) error {
	notification := models.InAppNotification{
		UserID:    userID,
		Type:      notificationType,
		Title:     title,
		Message:   message,
		ActionURL: actionURL,
		Priority:  priority,
		IsRead:    false,
		CreatedAt: time.Now(),
	}

	// Set expiration for certain types
	if notificationType == "queue_update" {
		expiry := time.Now().Add(24 * time.Hour)
		notification.ExpiresAt = &expiry
	} else if notificationType == "reminder" {
		expiry := time.Now().Add(7 * 24 * time.Hour)
		notification.ExpiresAt = &expiry
	}

	return db.DB.Create(&notification).Error
}

// SendTestNotification sends a test notification (for testing purposes)
func SendTestNotification(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Type    string `json:"type" binding:"required"`
		Method  string `json:"method" binding:"required,oneof=email sms in_app"`
		Message string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create test notification
	if req.Method == "in_app" {
		err := CreateInAppNotification(
			userID.(uint),
			"test",
			"Test Notification",
			req.Message,
			"",
			"normal",
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create test notification"})
			return
		}
	}

	// Log the test notification
	now := time.Now()
	log := models.NotificationLog{
		UserID:  userID.(uint),
		Type:    "test",
		Method:  req.Method,
		Subject: "Test Notification",
		Message: req.Message,
		Status:  "delivered",
		SentAt:  &now,
	}

	db.DB.Create(&log)

	c.JSON(http.StatusOK, gin.H{
		"message": "Test notification sent successfully",
		"type":    req.Type,
		"method":  req.Method,
	})
}

// GetNotificationCount returns just the notification count for the user
func GetNotificationCount(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get unread count
	var unreadCount int64
	db.DB.Model(&models.InAppNotification{}).
		Where("user_id = ? AND is_read = ? AND (expires_at IS NULL OR expires_at > ?)",
			userID, false, time.Now()).
		Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"unread_count": unreadCount,
	})
}

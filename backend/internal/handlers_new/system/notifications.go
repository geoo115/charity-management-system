package system

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetUnifiedNotificationPreferences gets preferences for the current user
func GetUnifiedNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user and determine role
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}

	// Get user's notification preferences
	var preferences models.NotificationPreferences
	result := db.DB.Where("user_id = ?", userID).First(&preferences)

	// If no preferences found, create default ones
	if result.Error != nil {
		preferences = models.NotificationPreferences{
			UserID:         userID.(uint),
			Email:          true,
			SMS:            user.Phone != "",
			Push:           true,
			EmailEnabled:   true,
			SMSEnabled:     user.Phone != "",
			PushEnabled:    true,
			ShiftReminders: true,
			ShiftUpdates:   true,
			UpcomingShifts: true,
			SystemUpdates:  true,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		if err := db.DB.Create(&preferences).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default preferences"})
			return
		}
	}

	// Define available channels
	channels := []map[string]interface{}{
		{
			"id":      "email",
			"name":    "Email",
			"enabled": true,
		},
		{
			"id":      "sms",
			"name":    "SMS",
			"enabled": user.Phone != "",
		},
		{
			"id":      "push",
			"name":    "Push Notifications",
			"enabled": true,
		},
	}

	// Get type-specific preferences
	var typePrefs []models.NotificationTypePreference
	db.DB.Where("user_id = ?", userID).Find(&typePrefs)

	// Map for quick lookup
	prefMap := make(map[string]models.NotificationTypePreference)
	for _, pref := range typePrefs {
		prefMap[pref.NotificationType] = pref
	}

	// Define relevant notification types based on user role
	var notificationTypes []map[string]interface{}

	// Common notifications for all users
	notificationTypes = append(notificationTypes, map[string]interface{}{
		"id":          "account_updates",
		"name":        "Account Updates",
		"description": "Password changes, profile updates, and security alerts",
		"channels": map[string]bool{
			"email": preferences.Email,
			"sms":   preferences.SMS && getTypePrefValue(prefMap, "account_updates", "sms"),
			"push":  preferences.Push && getTypePrefValue(prefMap, "account_updates", "push"),
		},
	})

	notificationTypes = append(notificationTypes, map[string]interface{}{
		"id":          "general_announcements",
		"name":        "General Announcements",
		"description": "Community updates and important news",
		"channels": map[string]bool{
			"email": preferences.Email && getTypePrefValue(prefMap, "general_announcements", "email"),
			"sms":   preferences.SMS && getTypePrefValue(prefMap, "general_announcements", "sms"),
			"push":  preferences.Push && getTypePrefValue(prefMap, "general_announcements", "push"),
		},
	})

	// Role-specific notifications
	switch user.Role {
	case "visitor", "Visitor":
		notificationTypes = append(notificationTypes, map[string]interface{}{
			"id":          "visitor_appointments",
			"name":        "Visit Appointments",
			"description": "Reminders about your scheduled visits and updates",
			"channels": map[string]bool{
				"email": preferences.Email && getTypePrefValue(prefMap, "visitor_appointments", "email"),
				"sms":   preferences.SMS && getTypePrefValue(prefMap, "visitor_appointments", "sms"),
				"push":  preferences.Push && getTypePrefValue(prefMap, "visitor_appointments", "push"),
			},
		})

	case "donor", "Donor":
		notificationTypes = append(notificationTypes, map[string]interface{}{
			"id":          "donor_receipts",
			"name":        "Donation Receipts",
			"description": "Receipts and confirmation of your donations",
			"channels": map[string]bool{
				"email": preferences.Email && getTypePrefValue(prefMap, "donor_receipts", "email"),
				"sms":   preferences.SMS && getTypePrefValue(prefMap, "donor_receipts", "sms"),
				"push":  preferences.Push && getTypePrefValue(prefMap, "donor_receipts", "push"),
			},
		})

		notificationTypes = append(notificationTypes, map[string]interface{}{
			"id":          "donor_impact",
			"name":        "Impact Updates",
			"description": "Information about how your donations are making a difference",
			"channels": map[string]bool{
				"email": preferences.Email && getTypePrefValue(prefMap, "donor_impact", "email"),
				"sms":   preferences.SMS && getTypePrefValue(prefMap, "donor_impact", "sms"),
				"push":  preferences.Push && getTypePrefValue(prefMap, "donor_impact", "push"),
			},
		})

	case "volunteer", "Volunteer":
		notificationTypes = append(notificationTypes, map[string]interface{}{
			"id":          "volunteer_shifts",
			"name":        "Shift Updates",
			"description": "Shift assignments, reminders, and changes",
			"channels": map[string]bool{
				"email": preferences.Email && getTypePrefValue(prefMap, "volunteer_shifts", "email"),
				"sms":   preferences.SMS && getTypePrefValue(prefMap, "volunteer_shifts", "sms"),
				"push":  preferences.Push && getTypePrefValue(prefMap, "volunteer_shifts", "push"),
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"channels": channels,
		"types":    notificationTypes,
	})
}

// Helper function to get preference values with defaults
func getTypePrefValue(prefMap map[string]models.NotificationTypePreference, notifType, channel string) bool {
	if pref, exists := prefMap[notifType]; exists {
		switch channel {
		case "email":
			return pref.Email
		case "sms":
			return pref.SMS
		case "push":
			return pref.Push
		}
	}
	return true // Default to true if not specified
}

// UpdateUnifiedNotificationPreferences updates notification preferences for the current user
func UpdateUnifiedNotificationPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Types []struct {
			ID       string          `json:"id" validate:"required"`
			Channels map[string]bool `json:"channels" validate:"required"`
		} `json:"types" validate:"required,dive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Validate input
	if len(req.Types) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No notification types provided"})
		return
	}

	// Valid notification types
	validTypes := map[string]bool{
		"shift_reminders":    true,
		"shift_updates":      true,
		"application_status": true,
		"system_updates":     true,
		"emergency_alerts":   true,
	}

	// Valid channels
	validChannels := map[string]bool{
		"email": true,
		"sms":   true,
		"push":  true,
	}

	// Validate all types and channels
	for _, typePref := range req.Types {
		if !validTypes[typePref.ID] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid notification type: " + typePref.ID,
			})
			return
		}

		if len(typePref.Channels) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "No channels provided for type: " + typePref.ID,
			})
			return
		}

		for channel := range typePref.Channels {
			if !validChannels[channel] {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid channel: " + channel,
				})
				return
			}
		}
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

	// Begin transaction
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Update main preferences first
	mainPrefs := struct {
		Email bool
		SMS   bool
		Push  bool
	}{
		Email: false,
		SMS:   false,
		Push:  false,
	}

	// Check if any channel is enabled for any notification
	for _, typePref := range req.Types {
		for channel, enabled := range typePref.Channels {
			if enabled {
				switch channel {
				case "email":
					mainPrefs.Email = true
				case "sms":
					mainPrefs.SMS = true
				case "push":
					mainPrefs.Push = true
				}
			}
		}
	}

	// Update or create main preferences record
	var existingMainPrefs models.NotificationPreferences
	result := tx.Where("user_id = ?", uid).First(&existingMainPrefs)

	if result.Error != nil {
		// Create new main preferences
		newMainPrefs := models.NotificationPreferences{
			UserID:       uid,
			Email:        mainPrefs.Email,
			SMS:          mainPrefs.SMS,
			Push:         mainPrefs.Push,
			EmailEnabled: mainPrefs.Email,
			SMSEnabled:   mainPrefs.SMS,
			PushEnabled:  mainPrefs.Push,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(&newMainPrefs).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create main preferences"})
			return
		}
	} else {
		// Update existing preferences
		if err := tx.Model(&existingMainPrefs).Updates(map[string]interface{}{
			"email":         mainPrefs.Email,
			"sms":           mainPrefs.SMS,
			"push":          mainPrefs.Push,
			"email_enabled": mainPrefs.Email,
			"sms_enabled":   mainPrefs.SMS,
			"push_enabled":  mainPrefs.Push,
			"updated_at":    time.Now(),
		}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update main preferences"})
			return
		}
	}

	// Now process individual type preferences
	for _, typePref := range req.Types {
		// Check if type preference exists
		var existingPref models.NotificationTypePreference
		result := tx.Where("user_id = ? AND notification_type = ?", uid, typePref.ID).First(&existingPref)

		emailEnabled := typePref.Channels["email"]
		smsEnabled := typePref.Channels["sms"]
		pushEnabled := typePref.Channels["push"]

		if result.Error != nil {
			// Create new preference
			newPref := models.NotificationTypePreference{
				UserID:           uid,
				NotificationType: typePref.ID,
				Email:            emailEnabled,
				SMS:              smsEnabled,
				Push:             pushEnabled,
				CreatedAt:        time.Now(),
				UpdatedAt:        time.Now(),
			}

			if err := tx.Create(&newPref).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create type preference"})
				return
			}
		} else {
			// Update existing preference
			if err := tx.Model(&existingPref).Updates(map[string]interface{}{
				"email":      emailEnabled,
				"sms":        smsEnabled,
				"push":       pushEnabled,
				"updated_at": time.Now(),
			}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update type preference"})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Update", "NotificationPreferences", uid, "Notification preferences updated")

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification preferences updated successfully",
	})
}

// ResetNotificationPreferencesToDefaults resets preferences to default values
func ResetNotificationPreferencesToDefaults(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Begin transaction
	tx := db.DB.Begin()

	// Delete existing type preferences
	if err := tx.Where("user_id = ?", userID).Delete(&models.NotificationTypePreference{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset preferences"})
		return
	}

	// Reset main preferences to default (all enabled)
	if err := tx.Model(&models.NotificationPreferences{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"email":           true,
			"sms":             true,
			"push":            true,
			"email_enabled":   true,
			"sms_enabled":     true,
			"push_enabled":    true,
			"shift_reminders": true,
			"shift_updates":   true,
			"upcoming_shifts": true,
			"system_updates":  true,
			"updated_at":      time.Now(),
		}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset main preferences"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification preferences reset to defaults",
	})
}

// GetUserNotificationSettings returns notification settings for a specific user
func GetUserNotificationSettings(c *gin.Context) {
	userID := c.Param("userId")
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var preferences models.NotificationPreferences
	if err := db.GetDB().Where("user_id = ?", id).First(&preferences).Error; err != nil {
		// Create default preferences if none exist
		preferences = models.NotificationPreferences{
			UserID:         uint(id),
			EmailEnabled:   true,
			SMSEnabled:     false,
			PushEnabled:    true,
			UpcomingShifts: true,
			ShiftReminders: true,
			ShiftUpdates:   true,
			SystemUpdates:  true,
		}
		if err := db.GetDB().Create(&preferences).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification preferences"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": preferences})
}

// UpdateUserNotificationSettings updates notification settings for a specific user
func UpdateUserNotificationSettings(c *gin.Context) {
	userID := c.Param("userId")
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var updateData models.NotificationPreferences
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData.UserID = uint(id)
	if err := db.GetDB().Save(&updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification preferences updated successfully", "data": updateData})
}

// GetNotificationTemplates returns available notification templates
func GetNotificationTemplates(c *gin.Context) {
	templates := []gin.H{
		{
			"id":          "shift_reminder",
			"name":        "Shift Reminders",
			"description": "Reminders about upcoming shifts",
			"enabled":     true,
		},
		{
			"id":          "shift_updates",
			"name":        "Shift Updates",
			"description": "Updates about shift changes or cancellations",
			"enabled":     true,
		},
		{
			"id":          "system_updates",
			"name":        "System Updates",
			"description": "Important system announcements",
			"enabled":     true,
		},
		{
			"id":          "weekly_summary",
			"name":        "Weekly Summary",
			"description": "Weekly summary of your volunteer activities",
			"enabled":     false,
		},
	}

	c.JSON(http.StatusOK, gin.H{"data": templates})
}

// GetUserNotifications returns notifications for a specific user
func GetUserNotifications(c *gin.Context) {
	userID := c.Param("userId")
	_, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// For now, return empty notifications array since we don't have a notifications table yet
	notifications := []gin.H{}

	c.JSON(http.StatusOK, gin.H{"data": notifications})
}

// GetCurrentUserNotificationSettings returns notification settings for the current authenticated user
func GetCurrentUserNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

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

	var preferences models.NotificationPreferences
	if err := db.GetDB().Where("user_id = ?", uid).First(&preferences).Error; err != nil {
		// Create default preferences if none exist
		preferences = models.NotificationPreferences{
			UserID:         uid,
			EmailEnabled:   true,
			SMSEnabled:     false,
			PushEnabled:    true,
			UpcomingShifts: true,
			ShiftReminders: true,
			ShiftUpdates:   true,
			SystemUpdates:  true,
		}
		if err := db.GetDB().Create(&preferences).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification preferences"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": preferences})
}

// UpdateCurrentUserNotificationSettings updates notification settings for the current authenticated user
func UpdateCurrentUserNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

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

	var updateData models.NotificationPreferences
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateData.UserID = uid
	if err := db.GetDB().Save(&updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification preferences updated successfully", "data": updateData})
}

// GetCurrentUserNotifications returns notifications for the current authenticated user
func GetCurrentUserNotifications(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// For now, return empty notifications array since we don't have a notifications table yet
	notifications := []gin.H{}

	c.JSON(http.StatusOK, gin.H{"data": notifications})
}

// MarkAllCurrentUserNotificationsAsRead marks all notifications as read for the current authenticated user
func MarkAllCurrentUserNotificationsAsRead(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// For now, just return success since we don't have notifications table yet
	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// GetScheduledNotifications returns scheduled notifications
func GetScheduledNotifications(c *gin.Context) {
	// For now, return empty array since we don't have scheduled notifications table yet
	scheduledNotifications := []gin.H{}

	c.JSON(http.StatusOK, gin.H{"data": scheduledNotifications})
}

// GetNotificationDeliveryStatus returns notification delivery status
func GetNotificationDeliveryStatus(c *gin.Context) {
	// For now, return empty array since we don't have delivery status table yet
	deliveryStatus := []gin.H{}

	c.JSON(http.StatusOK, gin.H{"data": deliveryStatus})
}

// ScheduleNotification schedules a notification
func ScheduleNotification(c *gin.Context) {
	var req struct {
		TemplateID   string   `json:"templateId"`
		ScheduledFor string   `json:"scheduledFor"`
		Channels     []string `json:"channels"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// For now, just return success since we don't have scheduled notifications table
	c.JSON(http.StatusOK, gin.H{"message": "Notification scheduled successfully"})
}

// CancelScheduledNotification cancels a scheduled notification
func CancelScheduledNotification(c *gin.Context) {
	notificationID := c.Param("id")

	// For now, just return success since we don't have scheduled notifications table
	c.JSON(http.StatusOK, gin.H{"message": "Scheduled notification cancelled", "id": notificationID})
}

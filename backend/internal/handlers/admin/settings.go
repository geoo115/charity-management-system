package admin

import (
	"log"
	"net/http"
	"strconv"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"

	"github.com/gin-gonic/gin"
)

// GetNotificationSettings retrieves notification settings
func GetNotificationSettings(c *gin.Context) {
	// Mock notification settings - implement database storage as needed
	settings := gin.H{
		"emailNotifications": true,
		"smsNotifications":   false,
		"notificationTypes": gin.H{
			"newHelpRequest":   true,
			"donationReceived": true,
			"volunteerSignup":  true,
			"taskAssigned":     true,
		},
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateNotificationSettings updates notification settings
func UpdateNotificationSettings(c *gin.Context) {
	var settings map[string]interface{}
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID for audit trail
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Save settings to database
	for key, value := range settings {
		var config models.SystemConfig
		configKey := "notification_" + key

		// Try to find existing setting
		err := db.DB.Where("key = ?", configKey).First(&config).Error
		if err != nil {
			// Create new setting
			config = models.SystemConfig{
				Key:         configKey,
				Category:    "notification",
				Description: "Notification setting: " + key,
				UpdatedBy:   userID.(*uint),
			}
		} else {
			// Update existing setting
			config.UpdatedBy = userID.(*uint)
		}

		config.SetValue(value)

		if err := db.DB.Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save notification settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification settings updated successfully"})
}

// GetEmailTemplates retrieves all email templates
func GetEmailTemplates(c *gin.Context) {
	var templates []models.EmailTemplate
	if err := db.DB.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch email templates"})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// GetEmailTemplate retrieves a specific email template
func GetEmailTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.EmailTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// CreateEmailTemplate creates a new email template
func CreateEmailTemplate(c *gin.Context) {
	var template models.EmailTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create email template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// UpdateEmailTemplate updates an existing email template
func UpdateEmailTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.EmailTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email template not found"})
		return
	}

	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email template"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// DeleteEmailTemplate deletes an email template
func DeleteEmailTemplate(c *gin.Context) {
	id := c.Param("id")

	if err := db.DB.Where("id = ?", id).Delete(&models.EmailTemplate{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete email template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email template deleted successfully"})
}

// GetSystemSettings retrieves system settings
func GetSystemSettings(c *gin.Context) {
	// Mock system settings - implement database storage as needed
	settings := gin.H{
		"siteName":     "Lewisham Charity",
		"contactEmail": "contact@lewishamCharity.org",
		"supportPhone": "020 1234 5678",
		"timezone":     "Europe/London",
		"dateFormat":   "DD/MM/YYYY",
		"language":     "en",
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSystemSettings updates system settings
func UpdateSystemSettings(c *gin.Context) {
	var settings map[string]interface{}
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID for audit trail
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Save settings to database
	for key, value := range settings {
		var config models.SystemConfig
		configKey := "system_" + key

		// Try to find existing setting
		err := db.DB.Where("key = ?", configKey).First(&config).Error
		if err != nil {
			// Create new setting
			config = models.SystemConfig{
				Key:         configKey,
				Category:    "system",
				Description: "System setting: " + key,
				UpdatedBy:   userID.(*uint),
			}
		} else {
			// Update existing setting
			config.UpdatedBy = userID.(*uint)
		}

		config.SetValue(value)

		if err := db.DB.Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save system settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "System settings updated successfully"})
}

// GetSecuritySettings retrieves security settings
func GetSecuritySettings(c *gin.Context) {
	// Mock security settings - implement database storage as needed
	settings := gin.H{
		"passwordPolicy": gin.H{
			"minLength":        8,
			"requireUppercase": true,
			"requireNumbers":   true,
			"requireSpecial":   true,
		},
		"sessionManagement": gin.H{
			"sessionTimeout":   30,
			"maxLoginAttempts": 5,
		},
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSecuritySettings updates security settings
func UpdateSecuritySettings(c *gin.Context) {
	var settings map[string]interface{}
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID for audit trail
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Save settings to database
	for key, value := range settings {
		var config models.SystemConfig
		configKey := "security_" + key

		// Try to find existing setting
		err := db.DB.Where("key = ?", configKey).First(&config).Error
		if err != nil {
			// Create new setting
			config = models.SystemConfig{
				Key:         configKey,
				Category:    "security",
				Description: "Security setting: " + key,
				UpdatedBy:   userID.(*uint),
			}
		} else {
			// Update existing setting
			config.UpdatedBy = userID.(*uint)
		}

		config.SetValue(value)

		if err := db.DB.Save(&config).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save security settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Security settings updated successfully"})
}

// AdminGetNotificationTemplates retrieves notification templates for admin
func AdminGetNotificationTemplates(c *gin.Context) {
	var templates []models.NotificationTemplate
	if err := db.DB.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notification templates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": templates})
}

// AdminGetNotificationTemplate retrieves a specific notification template for admin
func AdminGetNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.NotificationTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// AdminCreateNotificationTemplate creates a new notification template for admin
func AdminCreateNotificationTemplate(c *gin.Context) {
	var template models.NotificationTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// AdminUpdateNotificationTemplate updates an existing notification template for admin
func AdminUpdateNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.NotificationTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification template not found"})
		return
	}

	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification template"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// AdminDeleteNotificationTemplate deletes a notification template for admin
func AdminDeleteNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	if err := db.DB.Where("id = ?", id).Delete(&models.NotificationTemplate{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification template deleted successfully"})
}

// AdminSendNotification sends a notification to users for admin
func AdminSendNotification(c *gin.Context) {
	var request struct {
		Target       string                 `json:"target"` // Changed from Recipients to Target for clarity
		Subject      string                 `json:"subject"`
		Message      string                 `json:"message"`
		Type         string                 `json:"type"`
		Template     string                 `json:"template,omitempty"`
		TemplateData map[string]interface{} `json:"templateData,omitempty"`
		Scheduled    bool                   `json:"scheduled,omitempty"`
		ScheduledFor string                 `json:"scheduledFor,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Implement actual notification sending logic
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get recipients based on target
	var recipients []models.User
	switch request.Target {
	case "all_visitors":
		if err := db.DB.Where("role = ?", "Visitor").Find(&recipients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch visitors"})
			return
		}
	case "all_volunteers":
		if err := db.DB.Where("role = ?", "Volunteer").Find(&recipients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch volunteers"})
			return
		}
	case "all_donors":
		if err := db.DB.Where("role = ?", "Donor").Find(&recipients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch donors"})
			return
		}
	case "all_users":
		if err := db.DB.Find(&recipients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}
	default:
		// For specific users, parse the target as user IDs
		// This is a simplified implementation - you might want to support email addresses too
		c.JSON(http.StatusBadRequest, gin.H{"error": "Specific user targeting not implemented yet"})
		return
	}

	sentCount := 0
	failedCount := 0

	// Create notification history record
	history := models.NotificationHistory{
		Subject:    request.Subject,
		Message:    request.Message,
		Type:       request.Type,
		Recipients: request.Target,
		SentBy:     *userID.(*uint),
		Status:     "pending",
	}
	if err := db.DB.Create(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification history"})
		return
	}

	// Send notifications to all recipients
	for _, recipient := range recipients {
		notificationData := notifications.NotificationData{
			To:               recipient.Email,
			Subject:          request.Subject,
			TemplateType:     notifications.TemplateType("custom"),
			TemplateData:     map[string]interface{}{"message": request.Message},
			NotificationType: notifications.NotificationType(request.Type),
		}

		if err := notifications.Service.SendNotification(notificationData, recipient); err != nil {
			log.Printf("Failed to send notification to %s: %v", recipient.Email, err)
			failedCount++
		} else {
			sentCount++
		}
	}

	// Update history with results
	history.Status = "sent"
	history.DeliveredTo = sentCount
	history.FailedTo = failedCount
	db.DB.Save(&history)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Notification sent successfully",
		"sent":       sentCount,
		"failed":     failedCount,
		"total":      len(recipients),
		"history_id": history.ID,
	})
}

// AdminGetNotificationHistory retrieves notification history for admin
func AdminGetNotificationHistory(c *gin.Context) {
	// Implement actual notification history retrieval
	var notifications []models.NotificationHistory

	// Add pagination support
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "50")

	var pageInt, limitInt int = 1, 50
	// Simple conversion - in production, add proper error handling
	if p, err := strconv.Atoi(page); err == nil && p > 0 {
		pageInt = p
	}
	if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
		limitInt = l
	}

	offset := (pageInt - 1) * limitInt

	// Get total count
	var total int64
	db.DB.Model(&models.NotificationHistory{}).Count(&total)

	// Get notifications with pagination
	if err := db.DB.Order("created_at DESC").
		Offset(offset).
		Limit(limitInt).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notification history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"total":         total,
		"pagination": gin.H{
			"page":  pageInt,
			"limit": limitInt,
			"pages": (total + int64(limitInt) - 1) / int64(limitInt),
		},
	})
}

// GetNotificationTemplate retrieves a specific notification template
func GetNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.NotificationTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification template not found"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// CreateNotificationTemplate creates a new notification template
func CreateNotificationTemplate(c *gin.Context) {
	var template models.NotificationTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create notification template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// UpdateNotificationTemplate updates an existing notification template
func UpdateNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.NotificationTemplate
	if err := db.DB.Where("id = ?", id).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification template not found"})
		return
	}

	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification template"})
		return
	}

	c.JSON(http.StatusOK, template)
}

// DeleteNotificationTemplate deletes a notification template
func DeleteNotificationTemplate(c *gin.Context) {
	id := c.Param("id")

	if err := db.DB.Where("id = ?", id).Delete(&models.NotificationTemplate{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification template deleted successfully"})
}

// SendNotification sends a notification to users
func SendNotification(c *gin.Context) {
	var request struct {
		Recipients   interface{}            `json:"recipients"`
		Subject      string                 `json:"subject"`
		Message      string                 `json:"message"`
		Type         string                 `json:"type"`
		Template     string                 `json:"template,omitempty"`
		TemplateData map[string]interface{} `json:"templateData,omitempty"`
		Scheduled    bool                   `json:"scheduled,omitempty"`
		ScheduledFor string                 `json:"scheduledFor,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Implement actual notification sending logic
	// This function is similar to AdminSendNotification but may have different permissions
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// For now, delegate to the admin function since the logic is the same
	// In a real implementation, you might want different permission checks
	AdminSendNotification(c)
}

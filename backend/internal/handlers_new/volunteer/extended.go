package volunteer

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// GetVolunteerProfile returns the volunteer's profile information
func GetVolunteerProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get volunteer application for additional profile info
	var application models.VolunteerApplication
	if err := db.DB.Where("email = ?", user.Email).First(&application).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"id":           user.ID,
			"user_id":      user.ID,
			"first_name":   user.FirstName,
			"last_name":    user.LastName,
			"email":        user.Email,
			"phone":        user.Phone,
			"skills":       application.Skills,
			"availability": application.Availability,
			"experience":   application.Experience,
			"status":       user.Status,
			"created_at":   user.CreatedAt,
		})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"id":         user.ID,
			"user_id":    user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"status":     user.Status,
			"created_at": user.CreatedAt,
		})
	}
}

// GetVolunteerTasks returns tasks assigned to the volunteer
func GetVolunteerTasks(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Parse query parameters
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Build query
	query := db.DB.Where("assigned_user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Get total count
	var total int64
	query.Model(&models.Task{}).Count(&total)

	// Get tasks
	var tasks []models.Task
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&tasks)

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// UpdateTaskStatus updates the status of a task
func UpdateTaskStatus(c *gin.Context) {
	taskID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending in_progress completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the task and verify ownership
	var task models.Task
	if err := db.DB.Where("id = ? AND assigned_user_id = ?", taskID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found or not assigned to you"})
		return
	}

	// Update the task status
	task.Status = req.Status
	if req.Status == "completed" {
		now := time.Now()
		task.CompletedAt = &now
	}

	if err := db.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task status updated successfully",
		"task":    task,
	})
}

// GetTrainingStatus returns the volunteer's training status
func GetTrainingStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get all training modules
	var allModules []models.TrainingModule
	db.DB.Find(&allModules)

	// Get user's completed training
	var completedTraining []models.UserTraining
	db.DB.Where("user_id = ?", userID).Find(&completedTraining)

	// Create a map for quick lookup
	completedMap := make(map[uint]models.UserTraining)
	for _, ct := range completedTraining {
		completedMap[ct.TrainingModuleID] = ct
	}

	// Build the response
	var trainings []gin.H
	completedCount := 0
	for _, module := range allModules {
		training := gin.H{
			"id":          module.ID,
			"name":        module.Name,
			"description": module.Description,
			"required":    module.Required,
			"completed":   false,
		}

		if completed, exists := completedMap[module.ID]; exists {
			training["completed"] = true
			training["completion_date"] = completed.CompletedAt
			if module.ExpiryMonths > 0 {
				expiryDate := completed.CompletedAt.AddDate(0, int(module.ExpiryMonths), 0)
				training["expires_at"] = expiryDate
			}
			completedCount++
		}

		trainings = append(trainings, training)
	}

	completionPercentage := 0
	if len(allModules) > 0 {
		completionPercentage = (completedCount * 100) / len(allModules)
	}

	c.JSON(http.StatusOK, gin.H{
		"completion_percentage": completionPercentage,
		"required_trainings":    trainings,
	})
}

// GetTrainingModules returns all available training modules
func GetTrainingModules(c *gin.Context) {
	var modules []models.TrainingModule
	if err := db.DB.Find(&modules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve training modules"})
		return
	}

	c.JSON(http.StatusOK, modules)
}

// CompleteTraining marks a training module as completed for the volunteer
func CompleteTraining(c *gin.Context) {
	moduleID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify module exists
	var module models.TrainingModule
	if err := db.DB.First(&module, moduleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Training module not found"})
		return
	}

	// Check if already completed
	var existing models.UserTraining
	if err := db.DB.Where("user_id = ? AND training_module_id = ?", userID, moduleID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Training already completed"})
		return
	}

	// Create completion record
	now := time.Now()
	completion := models.UserTraining{
		UserID:           userID.(uint),
		TrainingModuleID: module.ID,
		CompletedAt:      &now,
	}

	if err := db.DB.Create(&completion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record training completion"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Training completed successfully",
	})
}

// GetVolunteerAnnouncements returns announcements for volunteers
func GetVolunteerAnnouncements(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Get announcements targeted to volunteers or all users
	var announcements []models.Announcement
	var total int64

	query := db.DB.Where("target_role IN (?, ?)", "Volunteer", "All")
	query.Model(&models.Announcement{}).Count(&total)
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&announcements)

	// Count unread announcements
	userID, _ := c.Get("userID")
	var unreadCount int64
	if userID != nil {
		db.DB.Model(&models.Announcement{}).
			Where("target_role IN (?, ?) AND id NOT IN (SELECT announcement_id FROM announcement_reads WHERE user_id = ?)",
				"Volunteer", "All", userID).
			Count(&unreadCount)
	}

	// Add read status to announcements
	var announcementData []gin.H
	for _, announcement := range announcements {
		read := false
		if userID != nil {
			var readRecord models.AnnouncementRead
			if err := db.DB.Where("user_id = ? AND announcement_id = ?", userID, announcement.ID).First(&readRecord).Error; err == nil {
				read = true
			}
		}

		announcementData = append(announcementData, gin.H{
			"id":         announcement.ID,
			"title":      announcement.Title,
			"content":    announcement.Content,
			"priority":   announcement.Priority,
			"created_at": announcement.CreatedAt,
			"read":       read,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"announcements": announcementData,
		"total":         total,
		"unread_count":  unreadCount,
	})
}

// MarkAnnouncementAsRead marks an announcement as read
func MarkAnnouncementAsRead(c *gin.Context) {
	announcementID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Check if already read
	var existing models.AnnouncementRead
	if err := db.DB.Where("user_id = ? AND announcement_id = ?", userID, announcementID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Already marked as read"})
		return
	}

	// Create read record
	read := models.AnnouncementRead{
		UserID:         userID.(uint),
		AnnouncementID: mustParseUint(announcementID),
		ReadAt:         time.Now(),
	}

	if err := db.DB.Create(&read).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// GetVolunteerNotifications returns notifications for the volunteer
func GetVolunteerNotifications(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var notifications []models.Notification
	db.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&notifications)

	c.JSON(http.StatusOK, gin.H{
		"data": notifications,
	})
}

// DeleteNotification deletes a notification for a volunteer
func DeleteNotification(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get notification ID from URL parameter
	notificationIDStr := c.Param("id")
	notificationID, err := strconv.ParseUint(notificationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	// Delete the notification (only if it belongs to the authenticated user)
	result := db.DB.Where("id = ? AND user_id = ?", notificationID, userID).Delete(&models.Notification{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted successfully"})
}

// Helper function to parse uint
func mustParseUint(s string) uint {
	val, _ := strconv.ParseUint(s, 10, 32)
	return uint(val)
}

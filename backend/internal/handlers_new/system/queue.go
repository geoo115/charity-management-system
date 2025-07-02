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

// JoinQueue lets a visitor join the queue
// @Summary Join queue
// @Description Adds a visitor to the specified queue category
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param request body object true "Join queue request"
// @Success 200 {object} map[string]interface{} "Queue position"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/join [post]
func JoinQueue(c *gin.Context) {
	var req struct {
		Reference string `json:"reference" binding:"required"`
		Category  string `json:"category" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Verify reference exists
	var helpRequest models.HelpRequest
	if err := db.DB.Where("reference = ?", req.Reference).First(&helpRequest).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid reference code",
		})
		return
	}

	// Check visitor ID matches current user
	visitorID, exists := c.Get("userID")
	if !exists || visitorID.(uint) != helpRequest.VisitorID {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "You can only join queues for your own help requests",
		})
		return
	}

	// Verify help request status
	if helpRequest.Status != models.HelpRequestStatusTicketIssued {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Help request doesn't have a valid ticket",
		})
		return
	}

	// Check queue settings
	var settings models.QueueSettings
	if err := db.DB.Where("category = ? AND is_active = true", req.Category).First(&settings).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid or inactive queue category",
		})
		return
	}

	// Check if already in queue
	var existingEntry models.QueueEntry
	if err := db.DB.Where(
		"reference = ? AND category = ? AND status IN ?",
		req.Reference, req.Category, []string{"waiting", "called"},
	).First(&existingEntry).Error; err == nil {
		// Already in queue
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Already in queue",
			"data": gin.H{
				"position":         existingEntry.Position,
				"reference":        existingEntry.Reference,
				"status":           existingEntry.Status,
				"estimatedMinutes": existingEntry.EstimatedMinutes,
				"joinedAt":         existingEntry.JoinedAt,
			},
		})
		return
	}

	// Check queue hours
	now := time.Now()
	currentTime := now.Format("15:04")
	if currentTime < settings.StartTime || currentTime > settings.EndTime {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Queue is currently closed. Hours: " + settings.StartTime + " - " + settings.EndTime,
		})
		return
	}

	// Check daily limit
	var todayCount int64
	today := now.Format("2006-01-02")
	db.DB.Model(&models.QueueEntry{}).
		Where("category = ? AND DATE(joined_at) = ?", req.Category, today).
		Count(&todayCount)

	if int(todayCount) >= settings.DailyLimit {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Daily queue limit reached. Please try again tomorrow.",
		})
		return
	}

	// Count current waiting visitors to determine position
	var waitingCount int64
	db.DB.Model(&models.QueueEntry{}).
		Where("category = ? AND status = ?", req.Category, "waiting").
		Count(&waitingCount)

	position := int(waitingCount) + 1
	estimatedMinutes := position * settings.AverageServiceTime / settings.ConcurrentServiceDesks

	// Create queue entry
	queueEntry := models.QueueEntry{
		Reference:        req.Reference,
		VisitorID:        helpRequest.VisitorID,
		HelpRequestID:    helpRequest.ID,
		Category:         req.Category,
		Position:         position,
		EstimatedMinutes: estimatedMinutes,
		Status:           "waiting",
		JoinedAt:         now,
	}

	if err := db.DB.Create(&queueEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to join queue",
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "JoinQueue", "QueueEntry", uint(queueEntry.ID),
		"Joined "+req.Category+" queue with position "+strconv.Itoa(position))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Successfully joined queue",
		"data": gin.H{
			"position":         position,
			"reference":        req.Reference,
			"category":         req.Category,
			"estimatedMinutes": estimatedMinutes,
			"queueId":          queueEntry.ID,
		},
	})
}

// GetVisitorPosition retrieves a visitor's current position in queue
// @Summary Get visitor position
// @Description Returns the current queue position for a visitor
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param reference query string true "Help request reference code"
// @Param category query string true "Queue category"
// @Success 200 {object} map[string]interface{} "Queue position"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Not in queue"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/position [get]
func GetVisitorPosition(c *gin.Context) {
	reference := c.Query("reference")
	category := c.Query("category")

	if reference == "" || category == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Reference and category are required",
		})
		return
	}

	// Find queue entry
	var queueEntry models.QueueEntry
	if err := db.DB.Where(
		"reference = ? AND category = ? AND status IN ?",
		reference, category, []string{"waiting", "called"},
	).First(&queueEntry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Not currently in queue",
		})
		return
	}

	// Get settings for average time calculation
	var settings models.QueueSettings
	if err := db.DB.Where("category = ?", category).First(&settings).Error; err == nil {
		// Recalculate estimated time based on current position and settings
		queueEntry.EstimatedMinutes = queueEntry.Position * settings.AverageServiceTime / settings.ConcurrentServiceDesks
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"position":         queueEntry.Position,
			"reference":        queueEntry.Reference,
			"status":           queueEntry.Status,
			"estimatedMinutes": queueEntry.EstimatedMinutes,
			"joinedAt":         queueEntry.JoinedAt,
			"calledAt":         queueEntry.CalledAt,
		},
	})
}

// CancelQueuePosition removes a visitor from the queue
// @Summary Cancel queue position
// @Description Removes a visitor from the queue
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param request body object true "Cancel request"
// @Success 200 {object} map[string]interface{} "Cancellation confirmed"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not in queue"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/cancel [post]
func CancelQueuePosition(c *gin.Context) {
	var req struct {
		Reference string `json:"reference" binding:"required"`
		Category  string `json:"category" binding:"required"`
		Reason    string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Find queue entry
	var queueEntry models.QueueEntry
	if err := db.DB.Where(
		"reference = ? AND category = ? AND status IN ?",
		req.Reference, req.Category, []string{"waiting", "called"},
	).First(&queueEntry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Not currently in queue",
		})
		return
	}

	// Check visitor ID matches current user (unless admin)
	visitorID, exists := c.Get("userID")
	isAdmin := false
	role, roleExists := c.Get("userRole")
	if roleExists && (role == "admin" || role == "super_admin") {
		isAdmin = true
	}

	if !isAdmin && (!exists || visitorID.(uint) != queueEntry.VisitorID) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "You can only cancel your own queue position",
		})
		return
	}

	// Update queue entry
	now := time.Now()
	queueEntry.Status = "cancelled"
	queueEntry.CancelledAt = &now

	if err := db.DB.Save(&queueEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to cancel queue position",
		})
		return
	}

	// Create audit log
	actionBy := "visitor"
	if isAdmin {
		actionBy = "admin"
	}
	utils.CreateAuditLog(c, "CancelQueue", "QueueEntry", uint(queueEntry.ID),
		actionBy+" cancelled queue position for reference "+req.Reference)

	// Update queue positions for those behind
	db.DB.Exec(`
		UPDATE queue_entries 
		SET position = position - 1,
		    updated_at = ?
		WHERE category = ? 
		AND status = 'waiting'
		AND position > ?
	`, now, req.Category, queueEntry.Position)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Successfully cancelled queue position",
	})
}

// GetQueueSettings retrieves settings for a queue category
// @Summary Get queue settings
// @Description Returns configuration settings for a queue category
// @Tags Queue Management,Admin
// @Accept json
// @Produce json
// @Param category query string true "Queue category"
// @Success 200 {object} map[string]interface{} "Queue settings"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Category not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /admin/queue/settings [get]
func AdminGetQueueSettings(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Queue category is required",
		})
		return
	}

	var settings models.QueueSettings
	if err := db.DB.Where("category = ?", category).First(&settings).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Queue category not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    settings,
	})
}

// UpdateQueueSettings updates the settings for a queue category
// @Summary Update queue settings
// @Description Updates configuration settings for a queue category
// @Tags Queue Management,Admin
// @Accept json
// @Produce json
// @Param category path string true "Queue category"
// @Param settings body object true "Queue settings"
// @Success 200 {object} map[string]interface{} "Updated settings"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Category not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /admin/queue/settings/{category} [put]
func AdminUpdateQueueSettings(c *gin.Context) {
	category := c.Param("category")

	var settings models.QueueSettings
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid settings format",
		})
		return
	}

	// Find existing settings
	var existingSettings models.QueueSettings
	result := db.DB.Where("category = ?", category).First(&existingSettings)

	if result.Error != nil {
		// Create new settings
		settings.Category = category
		if err := db.DB.Create(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to create queue settings",
			})
			return
		}
	} else {
		// Update existing settings
		if err := db.DB.Model(&existingSettings).Updates(settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update queue settings",
			})
			return
		}
		settings = existingSettings
	}

	// Create audit log
	utils.CreateAuditLog(c, "UpdateQueueSettings", "QueueSettings", uint(settings.ID),
		"Updated settings for queue category "+category)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Queue settings updated successfully",
		"data":    settings,
	})
}

// GetQueuePosition gets queue position for a specific user
// @Summary Get queue position by user ID
// @Description Gets the current queue position for a user
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param userId path string true "User ID"
// @Success 200 {object} map[string]interface{} "Queue position data"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Not in queue"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/position/{userId} [get]
func GetQueuePosition(c *gin.Context) {
	userID := c.Param("userId")

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "User ID is required",
		})
		return
	}

	// Find queue entry for the user
	var queueEntry models.QueueEntry
	if err := db.DB.Where(
		"user_id = ? AND status IN ?",
		userID, []string{"waiting", "called"},
	).First(&queueEntry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not currently in queue",
		})
		return
	}

	// Get settings for average time calculation
	var settings models.QueueSettings
	if err := db.DB.Where("category = ?", queueEntry.Category).First(&settings).Error; err == nil {
		// Recalculate estimated time based on current position and settings (assume 1 service desk)
		queueEntry.EstimatedMinutes = queueEntry.Position * settings.AverageServiceTime
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"position":         queueEntry.Position,
			"reference":        queueEntry.Reference,
			"category":         queueEntry.Category,
			"status":           queueEntry.Status,
			"estimatedMinutes": queueEntry.EstimatedMinutes,
			"joinedAt":         queueEntry.JoinedAt,
			"calledAt":         queueEntry.CalledAt,
		},
	})
}

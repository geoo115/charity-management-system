package volunteer

import (
	"net/http"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// GetVolunteerActivity returns volunteer activity data
func GetVolunteerActivity(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get volunteer's recent activity
	var assignments []models.ShiftAssignment
	db.DB.Where("user_id = ?", userID).
		Preload("Shift").
		Order("created_at DESC").
		Limit(10).
		Find(&assignments)

	c.JSON(http.StatusOK, gin.H{
		"recent_shifts": assignments,
	})
}

// GetVolunteerAchievements returns volunteer achievements and stats
func GetVolunteerAchievements(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Calculate achievements
	var totalShifts int64
	var completedShifts int64
	var totalHours float64

	db.DB.Model(&models.ShiftAssignment{}).
		Where("user_id = ?", userID).
		Count(&totalShifts)

	db.DB.Model(&models.ShiftAssignment{}).
		Where("user_id = ? AND status = ?", userID, "Completed").
		Count(&completedShifts)

	// Calculate total hours (simplified)
	var shifts []models.Shift
	db.DB.Joins("JOIN shift_assignments ON shifts.id = shift_assignments.shift_id").
		Where("shift_assignments.user_id = ? AND shift_assignments.status = ?", userID, "Completed").
		Find(&shifts)

	for _, shift := range shifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		totalHours += duration.Hours()
	}

	// Calculate completion rate safely to avoid NaN
	completionRate := 0.0
	if totalShifts > 0 {
		completionRate = float64(completedShifts) / float64(totalShifts) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"total_shifts":     totalShifts,
		"completed_shifts": completedShifts,
		"total_hours":      totalHours,
		"completion_rate":  completionRate,
	})
}

// GetAssignedShifts returns assigned shifts for the volunteer
func GetAssignedShifts(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var shifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date >= ?", userID, time.Now()).
		Order("date ASC").
		Find(&shifts)

	c.JSON(http.StatusOK, shifts)
}

// GetShiftHistory returns shift history for the volunteer
func GetShiftHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var assignments []models.ShiftAssignment
	db.DB.Where("user_id = ?", userID).
		Preload("Shift").
		Order("created_at DESC").
		Find(&assignments)

	c.JSON(http.StatusOK, assignments)
}

// CancelShift allows volunteer to cancel their assigned shift
func CancelShift(c *gin.Context) {
	shiftID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find and update the shift assignment
	var assignment models.ShiftAssignment
	if err := db.DB.Where("shift_id = ? AND user_id = ?", shiftID, userID).
		First(&assignment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shift assignment not found"})
		return
	}

	// Calculate hours notice
	var shift models.Shift
	db.DB.First(&shift, shiftID)
	hoursNotice := time.Until(shift.StartTime).Hours()

	// Update assignment
	now := time.Now()
	assignment.Status = "Cancelled"
	assignment.CancelledAt = &now
	assignment.CancellationReason = req.Reason
	assignment.HoursNotice = hoursNotice

	if err := db.DB.Save(&assignment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel shift"})
		return
	}

	// Clear the volunteer assignment on the shift
	db.DB.Model(&shift).Update("assigned_volunteer_id", nil)

	c.JSON(http.StatusOK, gin.H{
		"message":      "Shift cancelled successfully",
		"hours_notice": hoursNotice,
	})
}

// ValidateShiftAvailability checks if volunteer can take a shift
func ValidateShiftAvailability(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	shiftID := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shift not found"})
		return
	}

	// Check if already assigned
	if shift.AssignedVolunteerID != nil {
		c.JSON(http.StatusConflict, gin.H{
			"available": false,
			"reason":    "Shift already assigned",
		})
		return
	}

	// Check for conflicts
	var conflictingShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date = ? AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))",
		userID, shift.Date, shift.EndTime, shift.StartTime, shift.EndTime, shift.StartTime).
		Find(&conflictingShifts)

	if len(conflictingShifts) > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"available": false,
			"reason":    "Time conflict with existing shift",
			"conflicts": conflictingShifts,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"available": true,
	})
}

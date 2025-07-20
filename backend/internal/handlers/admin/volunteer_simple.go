package admin

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// SimpleVolunteerAssignment represents basic volunteer assignment data
type SimpleVolunteerAssignment struct {
	VolunteerID uint   `json:"volunteerId" binding:"required"`
	ShiftID     uint   `json:"shiftId" binding:"required"`
	Notes       string `json:"notes"`
}

// SimpleVolunteerStats represents basic volunteer statistics
type SimpleVolunteerStats struct {
	TotalVolunteers   int64 `json:"totalVolunteers"`
	ActiveVolunteers  int64 `json:"activeVolunteers"`
	PendingVolunteers int64 `json:"pendingVolunteers"`
	TodayShifts       int64 `json:"todayShifts"`
}

// AdminAssignShift assigns a single shift to a volunteer
func AdminAssignShift(c *gin.Context) {
	var req SimpleVolunteerAssignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify volunteer exists and is active
	var volunteer models.User
	if err := db.DB.First(&volunteer, req.VolunteerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "volunteer not found"})
		return
	}

	if volunteer.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "volunteer is not active",
		})
		return
	}

	// Verify shift exists and is available
	var shift models.Shift
	if err := db.DB.First(&shift, req.ShiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	if shift.AssignedVolunteerID != nil && *shift.AssignedVolunteerID != 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "shift is already assigned",
		})
		return
	}

	// Check for time conflicts
	var conflictingShifts []models.Shift
	if err := db.DB.Where("assigned_volunteer_id = ? AND date = ? AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))",
		req.VolunteerID, shift.Date, shift.EndTime, shift.StartTime, shift.EndTime, shift.StartTime).
		Find(&conflictingShifts).Error; err == nil && len(conflictingShifts) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "volunteer has a time conflict",
		})
		return
	}

	// Assign the shift
	volunteerID := req.VolunteerID
	shift.AssignedVolunteerID = &volunteerID

	if err := db.DB.Save(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to assign shift",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Shift assigned successfully",
		"data": gin.H{
			"shiftId":     shift.ID,
			"volunteerId": volunteerID,
		},
	})
}

// AdminGetVolunteerStats returns basic volunteer statistics
func AdminGetVolunteerStats(c *gin.Context) {
	var stats SimpleVolunteerStats

	// Count volunteers by status
	db.DB.Model(&models.User{}).Where("role = ?", models.RoleVolunteer).Count(&stats.TotalVolunteers)
	db.DB.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "active").Count(&stats.ActiveVolunteers)
	db.DB.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "pending").Count(&stats.PendingVolunteers)

	// Count today's shifts
	today := time.Now().Format("2006-01-02")
	db.DB.Model(&models.Shift{}).Where("date = ?", today).Count(&stats.TodayShifts)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// AdminGetVolunteers returns a list of volunteers with basic filtering
func AdminGetVolunteers(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	query := db.DB.Model(&models.User{}).Where("role = ?", models.RoleVolunteer)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var volunteers []models.User
	var total int64

	query.Count(&total)
	query.Offset((page - 1) * limit).Limit(limit).Find(&volunteers)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"volunteers": volunteers,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}

// AdminGetVolunteerShifts returns shifts for a specific volunteer
func AdminGetVolunteerShifts(c *gin.Context) {
	volunteerID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	var shifts []models.Shift
	var total int64

	query := db.DB.Where("assigned_volunteer_id = ?", volunteerID)
	query.Count(&total)
	query.Offset((page - 1) * limit).Limit(limit).Order("date DESC").Find(&shifts)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"shifts": shifts,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
			},
		},
	})
}

// AdminUnassignShift unassigns a shift from a volunteer
func AdminUnassignShift(c *gin.Context) {
	shiftID := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	shift.AssignedVolunteerID = nil

	if err := db.DB.Save(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to unassign shift",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Shift unassigned successfully",
	})
}

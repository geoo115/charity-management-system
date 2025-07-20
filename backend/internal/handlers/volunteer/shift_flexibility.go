package volunteer

import (
	"fmt"
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// FlexibleShiftRequest represents a request to create a flexible shift
type FlexibleShiftRequest struct {
	Date               string   `json:"date" binding:"required"`
	StartTime          string   `json:"startTime" binding:"required"`
	EndTime            string   `json:"endTime" binding:"required"`
	Location           string   `json:"location" binding:"required"`
	Description        string   `json:"description" binding:"required"`
	Role               string   `json:"role" binding:"required"`
	RequiredSkills     string   `json:"requiredSkills"`
	FlexibleSlots      int      `json:"flexibleSlots" binding:"required,min=1"`
	MinimumHours       float64  `json:"minimumHours" binding:"required,min=0.5"`
	MaximumHours       float64  `json:"maximumHours" binding:"required"`
	TimeSlotInterval   int      `json:"timeSlotInterval" binding:"min=15,max=60"`
	BreakDuration      int      `json:"breakDuration"`
	Priority           string   `json:"priority"`
	Tags               []string `json:"tags"`
	Equipment          string   `json:"equipment"`
	AccessibilityNotes string   `json:"accessibilityNotes"`
}

// CreateFlexibleShift creates a new flexible shift with enhanced validation
func CreateFlexibleShift(c *gin.Context) {
	var req FlexibleShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid shift data",
			"details": err.Error(),
		})
		return
	}

	// Validate time constraints
	if req.MinimumHours > req.MaximumHours {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "minimum hours cannot be greater than maximum hours",
		})
		return
	}

	// Parse and validate date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid date format",
			"details": "Use YYYY-MM-DD",
		})
		return
	}

	// Check if date is in the past
	if date.Before(time.Now().Truncate(24 * time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Cannot create shifts for past dates",
		})
		return
	}

	// Parse times
	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid start time format",
			"details": "Use HH:MM format",
		})
		return
	}

	endTime, err := time.Parse("15:04", req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid end time format",
			"details": "Use HH:MM format",
		})
		return
	}

	// Validate time logic
	if !endTime.After(startTime) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "End time must be after start time",
		})
		return
	}

	// Calculate and validate shift duration
	duration := endTime.Sub(startTime)
	if duration < time.Duration(req.MinimumHours*float64(time.Hour)) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Shift duration is less than minimum hours requirement",
		})
		return
	}

	// Set defaults
	timeSlotInterval := req.TimeSlotInterval
	if timeSlotInterval == 0 {
		timeSlotInterval = 30 // Default 30-minute intervals
	}

	breakDuration := req.BreakDuration
	if breakDuration == 0 {
		breakDuration = 15 // Default 15-minute break
	}

	priority := req.Priority
	if priority == "" {
		priority = "normal"
	}

	// Create the flexible shift
	shift := models.Shift{
		Date:               date,
		StartTime:          startTime,
		EndTime:            endTime,
		Location:           req.Location,
		Description:        req.Description,
		Role:               req.Role,
		RequiredSkills:     req.RequiredSkills,
		Type:               "flexible",
		FlexibleSlots:      req.FlexibleSlots,
		FlexibleSlotsUsed:  0,
		MinimumHours:       &req.MinimumHours,
		MaximumHours:       &req.MaximumHours,
		TimeSlotInterval:   timeSlotInterval,
		BreakDuration:      breakDuration,
		Priority:           priority,
		Equipment:          req.Equipment,
		AccessibilityNotes: req.AccessibilityNotes,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Convert tags to JSON if provided
	if len(req.Tags) > 0 {
		// For simplicity, storing as comma-separated values
		// In production, you might want to use JSON
		for i, tag := range req.Tags {
			if i == 0 {
				shift.Tags = tag
			} else {
				shift.Tags += "," + tag
			}
		}
	}

	// Save to database
	if err := db.DB.Create(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to create flexible shift",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Flexible shift created successfully",
		"shift":   shift,
	})
}

// GetFlexibleShiftCapacity returns the current capacity status of a flexible shift
func GetFlexibleShiftCapacity(c *gin.Context) {
	shiftID := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	if shift.Type != "flexible" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not a flexible shift"})
		return
	}

	// Get current assignments
	var assignments []models.ShiftAssignment
	err := db.DB.Where("shift_id = ? AND status IN (?, ?)", shift.ID, "Confirmed", "Assigned").
		Preload("User").
		Find(&assignments).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load assignments"})
		return
	}

	// Calculate capacity information
	response := gin.H{
		"shift_id":             shift.ID,
		"total_flexible_slots": shift.FlexibleSlots,
		"used_flexible_slots":  len(assignments),
		"available_slots":      shift.FlexibleSlots - len(assignments),
		"capacity_percentage":  float64(len(assignments)) / float64(shift.FlexibleSlots) * 100,
		"minimum_hours":        shift.MinimumHours,
		"maximum_hours":        shift.MaximumHours,
		"current_assignments":  assignments,
	}

	c.JSON(http.StatusOK, response)
}

// GetFlexibleShiftTimeSlots returns available time slots for a flexible shift
func GetFlexibleShiftTimeSlots(c *gin.Context) {
	shiftID := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	if shift.Type != "flexible" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not a flexible shift"})
		return
	}

	// Generate time slots based on interval
	timeSlots := generateTimeSlots(shift.StartTime, shift.EndTime, shift.TimeSlotInterval)

	// Get existing assignments to mark busy times
	var assignments []models.ShiftAssignment
	db.DB.Where("shift_id = ? AND status IN (?, ?)", shift.ID, "Confirmed", "Assigned").
		Find(&assignments)

	// Mark occupied time slots
	for i := range timeSlots {
		timeSlots[i]["available"] = true
		for _, assignment := range assignments {
			if assignment.CustomStartTime != nil && assignment.CustomEndTime != nil {
				if timeSlotOverlaps(timeSlots[i], *assignment.CustomStartTime, *assignment.CustomEndTime) {
					timeSlots[i]["available"] = false
					timeSlots[i]["assigned_to"] = assignment.UserID
					break
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"shift_id":   shift.ID,
		"time_slots": timeSlots,
		"interval":   shift.TimeSlotInterval,
	})
}

// Helper function to generate time slots
func generateTimeSlots(startTime, endTime time.Time, intervalMinutes int) []map[string]interface{} {
	var slots []map[string]interface{}

	current := startTime
	interval := time.Duration(intervalMinutes) * time.Minute

	for current.Before(endTime) {
		slots = append(slots, map[string]interface{}{
			"start_time": current.Format("15:04"),
			"end_time":   current.Add(interval).Format("15:04"),
			"available":  true,
		})
		current = current.Add(interval)
	}

	return slots
}

// Helper function to check if a time slot overlaps with an assignment
func timeSlotOverlaps(slot map[string]interface{}, assignmentStart, assignmentEnd time.Time) bool {
	slotStart, _ := time.Parse("15:04", slot["start_time"].(string))
	slotEnd, _ := time.Parse("15:04", slot["end_time"].(string))

	return slotStart.Before(assignmentEnd) && assignmentStart.Before(slotEnd)
}

// UpdateFlexibleShiftCapacity allows updating the capacity of a flexible shift
func UpdateFlexibleShiftCapacity(c *gin.Context) {
	shiftID := c.Param("id")

	var req struct {
		FlexibleSlots int `json:"flexibleSlots" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	if shift.Type != "flexible" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "not a flexible shift"})
		return
	}

	// Check if new capacity is not less than current assignments
	if req.FlexibleSlots < shift.FlexibleSlotsUsed {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("cannot reduce capacity below current assignments (%d)", shift.FlexibleSlotsUsed),
		})
		return
	}

	// Update capacity
	if err := db.DB.Model(&shift).Update("flexible_slots", req.FlexibleSlots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update capacity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Capacity updated successfully",
		"new_capacity": req.FlexibleSlots,
	})
}

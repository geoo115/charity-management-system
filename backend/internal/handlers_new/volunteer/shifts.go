package volunteer

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
)

// ShiftRequest is the structure for incoming shift creation/update requests
type ShiftRequest struct {
	Date           string `json:"date" binding:"required"`
	StartTime      string `json:"startTime" binding:"required"`
	EndTime        string `json:"endTime" binding:"required"`
	Location       string `json:"location" binding:"required"`
	Description    string `json:"description" binding:"required"`
	Role           string `json:"role"`
	MaxVolunteers  int    `json:"maxVolunteers"`
	RequiredSkills string `json:"requiredSkills"`
	Type           string `json:"type"`      // "fixed", "flexible", "open"
	OpenEnded      bool   `json:"openEnded"` // true if open-ended
}

// CreateShift handles the creation of a new shift
func CreateShift(c *gin.Context) {
	var req ShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid shift data - JSON binding failed",
			"details": err.Error(),
		})
		return
	}

	// Debug: log the received data
	fmt.Printf("DEBUG: Received shift data: %+v\n", req)

	// Add debug logging
	c.Header("X-Debug-Data", "Processing shift creation")

	// Log the parsed request for debugging
	if req.Date == "" || req.StartTime == "" || req.EndTime == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "missing required fields",
			"received": gin.H{
				"date":        req.Date,
				"startTime":   req.StartTime,
				"endTime":     req.EndTime,
				"location":    req.Location,
				"description": req.Description,
			},
		})
		return
	}

	// Validate and sanitize input
	if strings.TrimSpace(req.Location) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Location is required"})
		return
	}

	if strings.TrimSpace(req.Description) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Description is required"})
		return
	}

	// Parse date with validation
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

	// Validate time format
	if len(req.StartTime) < 5 || len(req.EndTime) < 5 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid time format, use HH:MM",
		})
		return
	}

	// Parse start time
	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid start time format",
			"details": "Use HH:MM format",
		})
		return
	}

	// Parse end time
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

	// Validate shift duration (minimum 30 minutes, maximum 12 hours)
	duration := endTime.Sub(startTime)
	if duration < 30*time.Minute {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Shift must be at least 30 minutes long",
		})
		return
	}
	if duration > 12*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Shift cannot exceed 12 hours",
		})
		return
	}

	// Handle max volunteers default value
	maxVolunteers := req.MaxVolunteers
	if maxVolunteers <= 0 {
		maxVolunteers = 1
	}
	if maxVolunteers > 50 { // Reasonable upper limit
		maxVolunteers = 50
	}

	// Create the shift with the parsed values
	shift := models.Shift{
		Date:           date,
		StartTime:      startTime,
		EndTime:        endTime,
		Location:       strings.TrimSpace(req.Location),
		Description:    strings.TrimSpace(req.Description),
		Role:           strings.TrimSpace(req.Role),
		MaxVolunteers:  maxVolunteers,
		RequiredSkills: strings.TrimSpace(req.RequiredSkills),
		Type:           req.Type,
		OpenEnded:      req.OpenEnded,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Validate shift type
	validTypes := map[string]bool{
		"fixed":    true,
		"flexible": true,
		"open":     true,
	}
	if shift.Type != "" && !validTypes[shift.Type] {
		shift.Type = "fixed" // Default to fixed
	}

	// Create the shift in the database with transaction
	tx := db.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start transaction",
		})
		return
	}

	if err := tx.Create(&shift).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to create shift",
			"details": err.Error(),
		})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save shift",
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Create", "Shift", shift.ID, "Shift created")

	c.JSON(http.StatusCreated, shift)
}

// ListShifts returns all shifts with optional filtering
func ListShifts(c *gin.Context) {
	var shifts []models.Shift

	// Apply filters from query parameters
	query := db.DB

	if date := c.Query("date"); date != "" {
		query = query.Where("date = ?", date)
	}

	if location := c.Query("location"); location != "" {
		query = query.Where("location = ?", location)
	}

	if err := query.Find(&shifts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to retrieve shifts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, shifts)
}

// GetShift returns a specific shift by ID
func GetShift(c *gin.Context) {
	id := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "shift not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, shift)
}

// UpdateShift updates a shift
func UpdateShift(c *gin.Context) {
	id := c.Param("id")

	var shift models.Shift
	if err := db.DB.First(&shift, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "shift not found",
			"details": err.Error(),
		})
		return
	}

	var req ShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid shift data",
			"details": err.Error(),
		})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid date format",
			"details": "Use YYYY-MM-DD",
		})
		return
	}

	// Parse start time
	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid start time format",
			"details": err.Error(),
		})
		return
	}

	// Parse end time
	endTime, err := time.Parse("15:04", req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid end time format",
			"details": err.Error(),
		})
		return
	}

	// Update the shift
	shift.Date = date
	shift.StartTime = startTime
	shift.EndTime = endTime
	shift.Location = req.Location
	shift.Description = req.Description
	shift.MaxVolunteers = req.MaxVolunteers
	shift.RequiredSkills = req.RequiredSkills
	shift.Type = req.Type
	shift.OpenEnded = req.OpenEnded
	shift.UpdatedAt = time.Now()

	if err := db.DB.Save(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to update shift",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, shift)
}

// DeleteShift deletes a shift
func DeleteShift(c *gin.Context) {
	id := c.Param("id")

	if err := db.DB.Delete(&models.Shift{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to delete shift",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shift deleted successfully"})
}

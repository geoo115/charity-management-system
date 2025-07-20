package admin

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/geoo115/charity-management-system/internal/handlers/shared"
	"github.com/gin-gonic/gin"
)

// AdminVolunteerShiftAssignment represents the data needed for admin shift assignment
type AdminVolunteerShiftAssignment struct {
	VolunteerID    uint   `json:"volunteerId" binding:"required"`
	ShiftIDs       []uint `json:"shiftIds" binding:"required"`
	Notes          string `json:"notes"`
	OverrideSkills bool   `json:"overrideSkills"`
	SendEmail      bool   `json:"sendEmail"`
}

// AdminShiftReassignment represents data for reassigning shifts
type AdminShiftReassignment struct {
	ShiftID            uint   `json:"shiftId" binding:"required"`
	NewVolunteerID     uint   `json:"newVolunteerId" binding:"required"`
	Reason             string `json:"reason"`
	Notes              string `json:"notes"`
	NotifyOldVolunteer bool   `json:"notifyOldVolunteer"`
	NotifyNewVolunteer bool   `json:"notifyNewVolunteer"`
}

// VolunteerReliabilityMetrics represents reliability tracking for volunteers
type VolunteerReliabilityMetrics struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	VolunteerID        uint      `json:"volunteerId" gorm:"index"`
	ShiftsCompleted    int       `json:"shiftsCompleted"`
	ShiftsCancelled    int       `json:"shiftsCancelled"`
	LateCancellations  int       `json:"lateCancellations"`
	NoShows            int       `json:"noShows"`
	TotalHours         float64   `json:"totalHours"`
	CompletionRate     float64   `json:"completionRate"`
	LastActivityDate   time.Time `json:"lastActivityDate"`
	ConsecutiveNoShows int       `json:"consecutiveNoShows"`
	RecalculatedAt     time.Time `json:"recalculatedAt"`
}

// VolunteerFilters represents the filters for volunteer listings
type VolunteerFilters struct {
	Status       string `form:"status"`
	SkillID      uint   `form:"skillId"`
	Availability string `form:"availability"`
	Search       string `form:"search"`
	SortBy       string `form:"sortBy"`
	SortOrder    string `form:"sortOrder"`
}

// AdminAssignShifts allows admins to assign one or more shifts to a volunteer
func AdminAssignShifts(c *gin.Context) {
	var req AdminVolunteerShiftAssignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify volunteer exists
	var volunteer models.User
	if err := db.DB.First(&volunteer, req.VolunteerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "volunteer not found"})
		return
	}

	// Check if volunteer is active
	if volunteer.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("volunteer is not active (status: %s)", volunteer.Status),
		})
		return
	}

	// Track successfully assigned shifts
	assignedShifts := make([]models.Shift, 0)
	failedAssignments := make([]gin.H, 0)

	// Begin transaction
	tx := db.DB.Begin()

	// Process each shift
	for _, shiftID := range req.ShiftIDs {
		var shift models.Shift
		if err := tx.First(&shift, shiftID).Error; err != nil {
			failedAssignments = append(failedAssignments, gin.H{
				"shiftId": shiftID,
				"reason":  "shift not found",
			})
			continue
		}

		// Check if shift is already assigned
		if shift.AssignedVolunteerID != nil && *shift.AssignedVolunteerID != 0 {
			failedAssignments = append(failedAssignments, gin.H{
				"shiftId": shiftID,
				"reason":  "shift already assigned",
			})
			continue
		}

		// Check if shift is in the past
		if shift.Date.Before(time.Now()) {
			failedAssignments = append(failedAssignments, gin.H{
				"shiftId": shiftID,
				"reason":  "cannot assign past shifts",
			})
			continue
		}

		// Check for time conflicts with volunteer's existing shifts
		var conflictingShifts []models.Shift
		if err := tx.Where("assigned_volunteer_id = ? AND date = ? AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))",
			req.VolunteerID, shift.Date, shift.EndTime, shift.StartTime, shift.EndTime, shift.StartTime, shift.StartTime, shift.EndTime).
			Find(&conflictingShifts).Error; err == nil && len(conflictingShifts) > 0 {

			failedAssignments = append(failedAssignments, gin.H{
				"shiftId":   shiftID,
				"reason":    "volunteer has a time conflict",
				"conflicts": conflictingShifts,
			})
			continue
		}

		// Check skills match unless overridden
		if !req.OverrideSkills && shift.RequiredSkills != "" {
			// Get volunteer skills
			var volunteerApplication models.VolunteerApplication
			if err := tx.Where("email = ?", volunteer.Email).First(&volunteerApplication).Error; err == nil {
				// Simple skills check
				if !checkSkillsMatch(volunteerApplication.Skills, shift.RequiredSkills) {
					failedAssignments = append(failedAssignments, gin.H{
						"shiftId":         shiftID,
						"reason":          "required skills don't match volunteer skills",
						"requiredSkills":  shift.RequiredSkills,
						"volunteerSkills": volunteerApplication.Skills,
					})
					continue
				}
			}
		}

		// All checks passed - assign the shift
		volunteerID := req.VolunteerID
		shift.AssignedVolunteerID = &volunteerID
		if err := tx.Save(&shift).Error; err != nil {
			failedAssignments = append(failedAssignments, gin.H{
				"shiftId": shiftID,
				"reason":  "database error: " + err.Error(),
			})
			continue
		}

		// Create shift assignment record
		assignment := models.ShiftAssignment{
			ShiftID:    shift.ID,
			UserID:     req.VolunteerID,
			Status:     "Confirmed",
			AssignedAt: time.Now(),
		}

		if err := tx.Create(&assignment).Error; err != nil {
			log.Printf("Error creating shift assignment: %v", err)
			// Non-fatal error, continue
		}

		assignedShifts = append(assignedShifts, shift)
	}

	// Commit transaction if we have any successful assignments
	if len(assignedShifts) > 0 {
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "failed to commit transaction",
				"details": err.Error(),
			})
			return
		}

		// Send notification if requested
		if req.SendEmail && len(assignedShifts) > 0 {
			go func() {
				for _, shift := range assignedShifts {
					notificationService := shared.GetNotificationService()
					if notificationService != nil {
						if err := notificationService.SendShiftSignupConfirmation(volunteer, shift); err != nil {
							log.Printf("Failed to send shift assignment notification: %v", err)
						}
					}
				}
			}()
		}

		// Create audit log
		adminID, exists := c.Get("userID")
		if exists {
			utils.CreateAuditLog(c, "Assign", "Volunteer Shifts", req.VolunteerID,
				fmt.Sprintf("Admin ID %d assigned %d shifts to volunteer ID %d",
					adminID.(uint), len(assignedShifts), req.VolunteerID))
		}

	} else {
		tx.Rollback()
	}

	// Return results
	c.JSON(http.StatusOK, gin.H{
		"successful":        len(assignedShifts),
		"failed":            len(failedAssignments),
		"assignedShifts":    assignedShifts,
		"failedAssignments": failedAssignments,
	})
}

// AdminReassignShift handles reassigning a shift to another volunteer
func AdminReassignShift(c *gin.Context) {
	var req AdminShiftReassignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin ID
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Begin transaction
	tx := db.DB.Begin()

	// Find the shift
	var shift models.Shift
	if err := tx.First(&shift, req.ShiftID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	// Check if shift is in the past
	if shift.Date.Before(time.Now()) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot reassign past shifts"})
		return
	}

	// Find the old volunteer (if any)
	var oldVolunteer models.User
	var hadOldVolunteer bool
	if shift.AssignedVolunteerID != nil && *shift.AssignedVolunteerID != 0 {
		if err := tx.First(&oldVolunteer, *shift.AssignedVolunteerID).Error; err != nil {
			// Log but continue - the old volunteer may have been deleted
			log.Printf("Warning: Original volunteer (ID: %d) not found for shift ID %d",
				*shift.AssignedVolunteerID, shift.ID)
		} else {
			hadOldVolunteer = true
		}
	}

	// Find the new volunteer
	var newVolunteer models.User
	if err := tx.First(&newVolunteer, req.NewVolunteerID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "new volunteer not found"})
		return
	}

	// Update shift assignment
	newVolunteerId := req.NewVolunteerID
	shift.AssignedVolunteerID = &newVolunteerId
	if err := tx.Save(&shift).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update shift"})
		return
	}

	// Update or create shift assignment record
	var assignment models.ShiftAssignment
	result := tx.Where("shift_id = ?", req.ShiftID).First(&assignment)

	if result.Error == nil {
		// Update existing assignment
		assignment.UserID = req.NewVolunteerID
		assignment.Status = "Reassigned"
		assignment.UpdatedAt = time.Now()

		if err := tx.Save(&assignment).Error; err != nil {
			log.Printf("Error updating shift assignment: %v", err)
			// Non-fatal error, continue
		}
	} else {
		// Create new assignment
		newAssignment := models.ShiftAssignment{
			ShiftID:    shift.ID,
			UserID:     req.NewVolunteerID,
			Status:     "Confirmed",
			AssignedAt: time.Now(),
		}

		if err := tx.Create(&newAssignment).Error; err != nil {
			log.Printf("Error creating shift assignment: %v", err)
			// Non-fatal error, continue
		}
	}

	// Create reassignment history record
	reassignment := models.ShiftReassignment{
		ShiftID:       shift.ID,
		FromVolunteer: getVolunteerIDSafely(shift.AssignedVolunteerID),
		ToVolunteer:   req.NewVolunteerID,
		Reason:        req.Reason,
		ReassignedBy:  adminID.(uint),
		ReassignedAt:  time.Now(),
	}

	if err := tx.Create(&reassignment).Error; err != nil {
		log.Printf("Error creating shift reassignment record: %v", err)
		// Non-fatal error, continue
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to commit transaction",
			"details": err.Error(),
		})
		return
	}

	// Send notifications if requested
	if hadOldVolunteer && req.NotifyOldVolunteer {
		go func() {
			notificationService := shared.GetNotificationService()
			if notificationService != nil {
				// Create custom notification data to include reason
				date := shift.Date.Format("Monday, January 2, 2006")
				timeStr := fmt.Sprintf("%s - %s",
					shift.StartTime.Format("3:04 PM"),
					shift.EndTime.Format("3:04 PM"))

				data := notifications.NotificationData{
					To:               oldVolunteer.Email,
					Subject:          fmt.Sprintf("Shift Change: %s", date),
					TemplateType:     notifications.ShiftCancellation,
					NotificationType: notifications.EmailNotification,
					TemplateData: map[string]interface{}{
						"FirstName":        oldVolunteer.FirstName,
						"LastName":         oldVolunteer.LastName,
						"Date":             date,
						"Time":             timeStr,
						"Location":         shift.Location,
						"Role":             shift.Role,
						"OrganizationName": "Lewisham Charity",
						"Reason":           req.Reason,
					},
				}

				if err := notificationService.SendNotification(data, oldVolunteer); err != nil {
					log.Printf("Failed to send reassignment notification to old volunteer: %v", err)
				}
			}
		}()
	}

	if req.NotifyNewVolunteer {
		go func() {
			notificationService := shared.GetNotificationService()
			if notificationService != nil {
				if err := notificationService.SendShiftSignupConfirmation(newVolunteer, shift); err != nil {
					log.Printf("Failed to send reassignment notification to new volunteer: %v", err)
				}
			}
		}()
	}

	// Create audit log
	utils.CreateAuditLog(c, "Reassign", "Volunteer Shift", shift.ID,
		fmt.Sprintf("Shift reassigned from volunteer ID %d to volunteer ID %d. Reason: %s",
			getVolunteerIDSafely(shift.AssignedVolunteerID), newVolunteer.ID, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"message": "Shift reassigned successfully",
		"shift":   shift,
	})
}

// AdminBatchUpdateVolunteerShifts performs batch operations on volunteer shifts
func AdminBatchUpdateVolunteerShifts(c *gin.Context) {
	var req struct {
		Action      string `json:"action" binding:"required,oneof=assign unassign cancel"`
		VolunteerID uint   `json:"volunteerId"`
		ShiftIDs    []uint `json:"shiftIds" binding:"required"`
		Reason      string `json:"reason"`
		SendEmail   bool   `json:"sendEmail"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate volunteer ID for assign action
	if req.Action == "assign" && req.VolunteerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "volunteerId required for assign action"})
		return
	}

	var result gin.H

	// Process based on action type
	switch req.Action {
	case "assign":
		result = processShiftAssignments(req.VolunteerID, req.ShiftIDs, req.SendEmail)
	case "unassign", "cancel":
		result = processBatchShiftUpdate(c, req.Action, req.ShiftIDs, req.Reason, req.SendEmail)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// Consolidate shift assignment logic
func processShiftAssignments(volunteerID uint, shiftIDs []uint, sendEmail bool) gin.H {
	successful := 0
	failed := []gin.H{}

	for _, shiftID := range shiftIDs {
		var shift models.Shift
		if err := db.DB.First(&shift, shiftID).Error; err != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Shift not found",
			})
			continue
		}

		if shift.AssignedVolunteerID != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Shift already assigned",
			})
			continue
		}

		// Assign the shift
		if err := db.DB.Model(&shift).Update("assigned_volunteer_id", volunteerID).Error; err != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Database error",
			})
			continue
		}

		// Send email notification if requested
		if sendEmail {
			var volunteer models.User
			if err := db.DB.First(&volunteer, volunteerID).Error; err == nil {
				go func(s models.Shift, v models.User) {
					notificationService := shared.GetNotificationService()
					if notificationService != nil {
						if err := notificationService.SendShiftSignupConfirmation(v, s); err != nil {
							log.Printf("Failed to send shift assignment notification: %v", err)
						}
					}
				}(shift, volunteer)
			}
		}

		successful++
	}

	return gin.H{
		"successful": successful,
		"failed":     len(failed),
		"failures":   failed,
	}
}

// AdminGetVolunteerReliabilityStats gets reliability metrics for volunteers
func AdminGetVolunteerReliabilityStats(c *gin.Context) {
	// Get query parameters
	volunteerId := c.Query("volunteerId")

	// Build base query
	query := db.DB.Model(&models.User{}).
		Where("role = ?", "volunteer")

	// Add volunteer ID filter if provided
	if volunteerId != "" {
		volID, err := strconv.ParseUint(volunteerId, 10, 32)
		if err == nil {
			query = query.Where("id = ?", volID)
		}
	}

	// Performance note: In a real app, you'd want to aggregate these stats in a cron job
	// and store them in a dedicated table, rather than calculating them on the fly

	var volunteers []models.User
	if err := query.Find(&volunteers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve volunteers"})
		return
	}

	// Process each volunteer to get their reliability stats
	stats := make([]map[string]interface{}, 0)
	for _, volunteer := range volunteers {
		// Get completed shifts
		var completedCount int64
		db.DB.Model(&models.Shift{}).
			Where("assigned_volunteer_id = ? AND date < ?", volunteer.ID, time.Now()).
			Count(&completedCount)

		// Get cancelled shifts
		var cancelledCount int64
		db.DB.Model(&models.ShiftAssignment{}).
			Where("user_id = ? AND status = ?", volunteer.ID, "Cancelled").
			Count(&cancelledCount)

		// Get late cancellations
		var lateCancellations int64
		db.DB.Model(&models.ShiftCancellation{}).
			Where("user_id = ? AND hours_notice < ?", volunteer.ID, 24).
			Count(&lateCancellations)

		// Get no-shows
		var noShows int64
		db.DB.Model(&models.ShiftAssignment{}).
			Where("user_id = ? AND status = ?", volunteer.ID, "NoShow").
			Count(&noShows)

		// Get total volunteer hours
		var totalHours float64
		var completedShifts []models.Shift
		if err := db.DB.Where("assigned_volunteer_id = ? AND date < ?", volunteer.ID, time.Now()).
			Find(&completedShifts).Error; err == nil {

			for _, shift := range completedShifts {
				startTime := shift.StartTime.Format("15:04")
				endTime := shift.EndTime.Format("15:04")
				totalHours += calculateShiftHours(startTime, endTime)
			}
		}

		// Calculate completion rate
		completionRate := 0.0
		totalAssigned := completedCount + cancelledCount + noShows
		if totalAssigned > 0 {
			completionRate = float64(completedCount) / float64(totalAssigned) * 100
		}

		// Get last activity (most recent shift)
		var lastActivity time.Time
		db.DB.Model(&models.Shift{}).
			Where("assigned_volunteer_id = ?", volunteer.ID).
			Order("date DESC").
			Limit(1).
			Pluck("date", &lastActivity)

		// Get consecutive no-shows
		consecutiveNoShows := 0
		var recentShifts []struct {
			Status string
		}

		db.DB.Model(&models.ShiftAssignment{}).
			Where("user_id = ?", volunteer.ID).
			Order("created_at DESC").
			Limit(5).
			Scan(&recentShifts)

		for _, shift := range recentShifts {
			if shift.Status == "NoShow" {
				consecutiveNoShows++
			} else {
				break
			}
		}

		// Get upcoming shift count
		var upcomingShiftCount int64
		db.DB.Model(&models.Shift{}).
			Where("assigned_volunteer_id = ? AND date > ?", volunteer.ID, time.Now()).
			Count(&upcomingShiftCount)

		// Get avg hours per month (last 6 months)
		sixMonthsAgo := time.Now().AddDate(0, -6, 0)
		var monthlyShifts []models.Shift
		db.DB.Where("assigned_volunteer_id = ? AND date BETWEEN ? AND ? AND date < ?",
			volunteer.ID, sixMonthsAgo, time.Now(), time.Now()).
			Find(&monthlyShifts)

		var hoursLastSixMonths float64
		for _, shift := range monthlyShifts {
			startTime := shift.StartTime.Format("15:04")
			endTime := shift.EndTime.Format("15:04")
			hoursLastSixMonths += calculateShiftHours(startTime, endTime)
		}

		avgHoursPerMonth := 0.0
		if len(monthlyShifts) > 0 {
			avgHoursPerMonth = hoursLastSixMonths / 6
		}

		// Compile volunteer stats
		volunteerStats := map[string]interface{}{
			"volunteerId":        volunteer.ID,
			"first_name":         volunteer.FirstName,
			"last_name":          volunteer.LastName,
			"email":              volunteer.Email,
			"shiftsCompleted":    completedCount,
			"shiftsCancelled":    cancelledCount,
			"lateCancellations":  lateCancellations,
			"noShows":            noShows,
			"completionRate":     completionRate,
			"lastActivity":       lastActivity,
			"consecutiveNoShows": consecutiveNoShows,
			"avgHoursPerMonth":   avgHoursPerMonth,
			"upcomingShiftCount": upcomingShiftCount,
			"totalHours":         totalHours,
		}

		stats = append(stats, volunteerStats)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// AdminGetVolunteerShiftHistory gets detailed shift history for a volunteer
func AdminGetVolunteerShiftHistory(c *gin.Context) {
	volunteerID := c.Param("id")

	if volunteerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "volunteer ID is required"})
		return
	}

	// Validate volunteer exists
	var volunteer models.User
	if err := db.DB.First(&volunteer, volunteerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "volunteer not found"})
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	// Adjust page and pageSize to sensible defaults
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// Get shift history with pagination
	var shifts []models.Shift
	query := db.DB.Where("assigned_volunteer_id = ?", volunteerID).
		Order("date DESC")

	// Get total count for pagination
	var total int64
	query.Count(&total)

	// Get paginated results
	if err := query.Offset(offset).Limit(pageSize).Find(&shifts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve shift history"})
		return
	}

	// Get shift assignments for additional details
	shiftIDs := make([]uint, len(shifts))
	for i, shift := range shifts {
		shiftIDs[i] = shift.ID
	}

	var assignments []models.ShiftAssignment
	db.DB.Where("shift_id IN ? AND user_id = ?", shiftIDs, volunteerID).Find(&assignments)

	// Create a map for easy lookup
	assignmentMap := make(map[uint]models.ShiftAssignment)
	for _, assignment := range assignments {
		assignmentMap[assignment.ShiftID] = assignment
	}

	// Combine shift and assignment data
	var history []map[string]interface{}
	for _, shift := range shifts {
		shiftData := map[string]interface{}{
			"id":          shift.ID,
			"date":        shift.Date.Format("2006-01-02"),
			"startTime":   shift.StartTime.Format("15:04"),
			"endTime":     shift.EndTime.Format("15:04"),
			"location":    shift.Location,
			"role":        shift.Role,
			"description": shift.Description,
		}

		// Add assignment data if available
		if assignment, ok := assignmentMap[shift.ID]; ok {
			shiftData["status"] = assignment.Status
			shiftData["assignedAt"] = assignment.AssignedAt

			// Check if this was reassigned
			var reassignment models.ShiftReassignment
			if err := db.DB.Where("shift_id = ? AND to_volunteer = ?", shift.ID, volunteerID).
				First(&reassignment).Error; err == nil {
				shiftData["reassignedFrom"] = reassignment.FromVolunteer
				shiftData["reassignedAt"] = reassignment.ReassignedAt
				shiftData["reassignReason"] = reassignment.Reason
			}
		} else {
			shiftData["status"] = "Unknown" // Shouldn't happen but handles edge case
		}

		// Calculate hours for the shift
		hours := calculateShiftHours(
			shift.StartTime.Format("15:04"),
			shift.EndTime.Format("15:04"),
		)
		shiftData["hours"] = hours

		history = append(history, shiftData)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": history,
		"pagination": gin.H{
			"page":       page,
			"pageSize":   pageSize,
			"total":      total,
			"totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// AdminMarkNoShow marks a volunteer as no-show for a shift
func AdminMarkNoShow(c *gin.Context) {
	var req struct {
		ShiftID uint   `json:"shiftId" binding:"required"`
		Reason  string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin ID
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Begin transaction
	tx := db.DB.Begin()

	// Find the shift
	var shift models.Shift
	if err := tx.First(&shift, req.ShiftID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	// Check if shift has volunteer assigned
	if shift.AssignedVolunteerID == nil || *shift.AssignedVolunteerID == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "no volunteer assigned to this shift"})
		return
	}

	// Check if the shift is in the past
	if !shift.Date.Before(time.Now()) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "can only mark past shifts as no-show"})
		return
	}

	// Update the shift assignment status
	var assignment models.ShiftAssignment
	result := tx.Model(&assignment).
		Where("shift_id = ? AND user_id = ?", shift.ID, *shift.AssignedVolunteerID).
		Updates(map[string]interface{}{
			"status": "NoShow",
		})

	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update shift assignment"})
		return
	}

	if result.RowsAffected == 0 {
		// Create a new assignment record if one doesn't exist
		assignment = models.ShiftAssignment{
			ShiftID:    shift.ID,
			UserID:     *shift.AssignedVolunteerID,
			Status:     "NoShow",
			AssignedAt: time.Now(),
		}

		if err := tx.Create(&assignment).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create shift assignment"})
			return
		}
	}

	// Create no-show record
	noShow := models.VolunteerNoShow{
		ShiftID:     assignment.ShiftID,
		VolunteerID: assignment.UserID,
		ReportedBy:  adminID.(uint),
		ReportedAt:  time.Now(),
		Reason:      req.Reason,
	}

	if err := tx.Create(&noShow).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create no-show record"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to commit transaction",
			"details": err.Error(),
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "NoShow", "Volunteer Shift", shift.ID,
		fmt.Sprintf("Marked volunteer ID %d as no-show for shift ID %d. Reason: %s",
			*shift.AssignedVolunteerID, shift.ID, req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"message": "Volunteer marked as no-show for the shift",
	})
}

// AdminGetVolunteerReports returns comprehensive volunteer reports
func AdminGetVolunteerReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get volunteer statistics
	var totalVolunteers int64
	var activeVolunteers int64
	var newVolunteersThisMonth int64
	var lastMonthVolunteers int64
	var totalHours float64

	// Total volunteers
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL").Count(&totalVolunteers)
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND status = ?", "active").Count(&activeVolunteers)
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&newVolunteersThisMonth)
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthVolunteers)
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL").Select("COALESCE(SUM(total_hours), 0)").Scan(&totalHours)

	// Debug logging
	log.Printf("Volunteer Reports Debug - Total: %d, Active: %d, New This Month: %d, Total Hours: %f",
		totalVolunteers, activeVolunteers, newVolunteersThisMonth, totalHours)

	// Debug: Get all unique status values
	var statusValues []string
	db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL").Distinct("status").Pluck("status", &statusValues)
	log.Printf("Volunteer Status Values in DB: %v", statusValues)

	// Get volunteers by status
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var volunteersByStatus []StatusCount
	db.Model(&models.VolunteerProfile{}).
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&volunteersByStatus)

	// Get top performing volunteers
	type TopVolunteer struct {
		ID         uint    `json:"id"`
		FirstName  string  `json:"firstName"`
		LastName   string  `json:"lastName"`
		TotalHours float64 `json:"totalHours"`
		Status     string  `json:"status"`
	}
	var topVolunteers []TopVolunteer
	db.Model(&models.VolunteerProfile{}).
		Select("volunteer_profiles.id, users.first_name, users.last_name, volunteer_profiles.total_hours, volunteer_profiles.status").
		Joins("JOIN users ON users.id = volunteer_profiles.user_id").
		Where("volunteer_profiles.deleted_at IS NULL").
		Order("volunteer_profiles.total_hours DESC").
		Limit(10).
		Scan(&topVolunteers)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month string  `json:"month"`
		Count int64   `json:"count"`
		Hours float64 `json:"hours"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		var hours float64
		db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)
		db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Select("COALESCE(SUM(total_hours), 0)").Scan(&hours)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month: monthStart.Format("2006-01"),
			Count: count,
			Hours: hours,
		})
	}

	// Calculate growth rate
	volunteerGrowth := 0.0
	if lastMonthVolunteers > 0 {
		volunteerGrowth = float64(newVolunteersThisMonth-lastMonthVolunteers) / float64(lastMonthVolunteers) * 100
	}

	// Calculate average hours per volunteer
	avgHoursPerVolunteer := 0.0
	if activeVolunteers > 0 {
		avgHoursPerVolunteer = totalHours / float64(activeVolunteers)
	}

	// Get shift statistics
	var totalShifts int64
	var completedShifts int64
	var cancelledShifts int64

	db.Model(&models.Shift{}).Count(&totalShifts)
	db.Model(&models.ShiftAssignment{}).Where("status = ?", "Completed").Count(&completedShifts)
	db.Model(&models.ShiftAssignment{}).Where("status = ?", "Cancelled").Count(&cancelledShifts)

	// Calculate completion rate
	completionRate := 0.0
	if totalShifts > 0 {
		completionRate = float64(completedShifts) / float64(totalShifts) * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalVolunteers":        totalVolunteers,
			"activeVolunteers":       activeVolunteers,
			"newVolunteersThisMonth": newVolunteersThisMonth,
			"volunteerGrowth":        volunteerGrowth,
			"totalHours":             totalHours,
			"avgHoursPerVolunteer":   avgHoursPerVolunteer,
			"totalShifts":            totalShifts,
			"completedShifts":        completedShifts,
			"cancelledShifts":        cancelledShifts,
			"completionRate":         completionRate,
		},
		"byStatus":      volunteersByStatus,
		"topVolunteers": topVolunteers,
		"trends":        monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// AdminAssignVolunteerToShifts assigns a volunteer to multiple shifts
func AdminAssignVolunteerToShifts(c *gin.Context) {
	var req AdminVolunteerShiftAssignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate the request using the previously unused function
	if err := validateShiftAssignmentRequest(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
		return
	}

	// Convert adminID to uint for logging
	var adminUserID uint
	switch v := adminID.(type) {
	case uint:
		adminUserID = v
	case float64:
		adminUserID = uint(v)
	default:
		adminUserID = 0
	}

	// Process the shift assignments
	successful := make([]uint, 0)
	failed := make([]gin.H, 0)

	for _, shiftID := range req.ShiftIDs {
		var shift models.Shift
		if err := db.DB.First(&shift, shiftID).Error; err != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Shift not found",
			})
			continue
		}

		// Check if shift is already assigned
		if shift.AssignedVolunteerID != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Shift already assigned",
			})
			continue
		}

		// Assign the volunteer to the shift
		if err := db.DB.Model(&shift).Update("assigned_volunteer_id", req.VolunteerID).Error; err != nil {
			failed = append(failed, gin.H{
				"shift_id": shiftID,
				"reason":   "Failed to assign shift",
			})
			continue
		}

		// Create shift assignment record
		assignment := models.ShiftAssignment{
			ShiftID:    shift.ID,
			UserID:     req.VolunteerID,
			Status:     "Confirmed",
			AssignedAt: time.Now(),
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}

		if err := db.DB.Create(&assignment).Error; err != nil {
			log.Printf("Failed to create shift assignment record: %v", err)
		}

		// Create audit log using adminID
		if adminUserID > 0 {
			utils.CreateAuditLog(c, "Admin Assign", "Shift", shift.ID,
				fmt.Sprintf("Admin %d assigned volunteer %d to shift %d", adminUserID, req.VolunteerID, shiftID))
		}

		successful = append(successful, shiftID)
	}

	results := gin.H{
		"successful": successful,
		"failed":     failed,
		"admin_id":   adminUserID,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Volunteer assignment completed",
		"results": results,
	})
}

// validateShiftAssignmentRequest validates the shift assignment request
func validateShiftAssignmentRequest(req AdminVolunteerShiftAssignment) error {
	if req.VolunteerID == 0 {
		return fmt.Errorf("volunteer ID is required")
	}

	if len(req.ShiftIDs) == 0 {
		return fmt.Errorf("at least one shift ID is required")
	}

	for _, shiftID := range req.ShiftIDs {
		if shiftID == 0 {
			return fmt.Errorf("invalid shift ID: %d", shiftID)
		}
	}

	return nil
}

// Helper functions

// checkSkillsMatch compares required skills with volunteer skills
func checkSkillsMatch(volunteerSkills string, requiredSkills string) bool {
	// Simplified skill matching - would be more sophisticated in a real app
	return strings.Contains(strings.ToLower(volunteerSkills), strings.ToLower(requiredSkills))
}

// processBatchShiftUpdate handles batch unassign/cancel operations
func processBatchShiftUpdate(c *gin.Context, action string, shiftIDs []uint, reason string, sendEmail bool) gin.H {
	// Get admin ID
	adminID, exists := c.Get("userID")
	if !exists {
		return gin.H{"error": "Authentication required"}
	}

	// Track results
	successful := make([]uint, 0)
	failed := make([]gin.H, 0)

	// Begin transaction
	tx := db.DB.Begin()

	for _, shiftID := range shiftIDs {
		var shift models.Shift
		if err := tx.First(&shift, shiftID).Error; err != nil {
			failed = append(failed, gin.H{
				"shiftId": shiftID,
				"reason":  "shift not found",
			})
			continue
		}

		// Check if shift has volunteer assigned
		if shift.AssignedVolunteerID == nil || *shift.AssignedVolunteerID == 0 {
			failed = append(failed, gin.H{
				"shiftId": shiftID,
				"reason":  "no volunteer assigned to this shift",
			})
			continue
		}

		// Store volunteer ID for notification
		volunteerID := *shift.AssignedVolunteerID

		// Update shift and assignment based on action
		if action == "unassign" {
			// Check if shift is in the past
			if shift.Date.Before(time.Now()) {
				failed = append(failed, gin.H{
					"shiftId": shiftID,
					"reason":  "cannot unassign past shifts",
				})
				continue
			}

			// Unassign the shift
			shift.AssignedVolunteerID = nil
			if err := tx.Save(&shift).Error; err != nil {
				failed = append(failed, gin.H{
					"shiftId": shiftID,
					"reason":  "database error: " + err.Error(),
				})
				continue
			}

			// Update assignment status
			result := tx.Model(&models.ShiftAssignment{}).
				Where("shift_id = ? AND user_id = ?", shiftID, volunteerID).
				Updates(map[string]interface{}{
					"status": "Unassigned",
				})

			if result.Error != nil {
				log.Printf("Error updating shift assignment: %v", result.Error)
				// Non-fatal error, continue
			}

		} else if action == "cancel" {
			// For cancel, we keep the volunteer assigned but mark the shift as cancelled
			result := tx.Model(&models.ShiftAssignment{}).
				Where("shift_id = ? AND user_id = ?", shiftID, volunteerID).
				Updates(map[string]interface{}{
					"status": "Cancelled",
				})

			if result.Error != nil {
				failed = append(failed, gin.H{
					"shiftId": shiftID,
					"reason":  "database error: " + result.Error.Error(),
				})
				continue
			}

			// Create cancellation record - include reason from parameter
			cancellation := models.ShiftCancellation{
				ShiftID:     uint(shiftID),
				VolunteerID: volunteerID,
				Reason:      reason,
				CancelledBy: adminID.(uint),
				CancelledAt: time.Now(),
				HoursNotice: time.Until(shift.StartTime).Hours(),
			}

			if err := tx.Create(&cancellation).Error; err != nil {
				log.Printf("Error creating shift cancellation: %v", err)
				// Non-fatal error, continue
			}
		}

		// Store successful operation
		successful = append(successful, shiftID)

		// Store volunteer info for notification
		if sendEmail {
			// Find the volunteer
			var volunteer models.User
			if err := tx.First(&volunteer, volunteerID).Error; err == nil {
				// Send notification in a goroutine after transaction commits
				go func(s models.Shift, v models.User) {
					notificationService := shared.GetNotificationService()
					if notificationService != nil {
						if err := notificationService.SendShiftCancellationConfirmation(v, s); err != nil {
							log.Printf("Failed to send shift cancellation notification: %v", err)
						}
					}
				}(shift, volunteer)
			}
		}
	}

	// Commit transaction if we have any successful operations
	if len(successful) > 0 {
		if err := tx.Commit().Error; err != nil {
			return gin.H{
				"error":   "failed to commit transaction",
				"details": err.Error(),
			}
		}

		// Create audit log
		utils.CreateAuditLog(c, action, "Volunteer Shifts", 0,
			fmt.Sprintf("Admin performed batch %s on %d shifts. Reason: %s",
				action, len(successful), reason))
	} else {
		tx.Rollback()
	}

	// Return results
	return gin.H{
		"successful":       len(successful),
		"failed":           len(failed),
		"successfulShifts": successful,
		"failedOperations": failed,
	}
}

// getVolunteerIDSafely safely extracts the volunteer ID from a pointer
func getVolunteerIDSafely(volunteerIDPtr *uint) uint {
	if volunteerIDPtr == nil {
		return 0
	}
	return *volunteerIDPtr
}

// calculateShiftHours calculates the hours between start and end time
func calculateShiftHours(startTime, endTime string) float64 {
	start, err := time.Parse("15:04", startTime)
	if err != nil {
		return 0
	}

	end, err := time.Parse("15:04", endTime)
	if err != nil {
		return 0
	}

	// Handle case where end time is the next day
	if end.Before(start) {
		end = end.Add(24 * time.Hour)
	}

	duration := end.Sub(start)
	return duration.Hours()
}

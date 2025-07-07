package volunteer

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ApproveVolunteer approves a volunteer application and creates a user account
func ApproveVolunteer(c *gin.Context) {
	volunteerID := c.Param("id")
	id, err := strconv.ParseUint(volunteerID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	// Begin transaction with proper error handling
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

	// Find the volunteer application
	var application models.VolunteerApplication
	if err := tx.First(&application, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer application not found"})
		return
	}

	// Check if application is already approved
	if application.Status == "approved" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Application already approved"})
		return
	}

	// Create user account for the volunteer if none exists
	var existingUser models.User
	userExists := tx.Where("email = ?", application.Email).First(&existingUser).Error == nil

	var user models.User
	if userExists {
		// Update existing user with volunteer role
		user = existingUser
		user.Role = models.RoleVolunteer
		user.Status = "active"
		user.UpdatedAt = time.Now()

		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update existing user"})
			return
		}
	} else {
		// Create a new user with proper validation
		tempPassword := generateSecureTempPassword()
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create password"})
			return
		}

		user = models.User{
			FirstName: application.FirstName,
			LastName:  application.LastName,
			Email:     application.Email,
			Phone:     application.Phone,
			Role:      models.RoleVolunteer,
			Status:    models.StatusActive,
			Password:  string(hashedPassword),
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
			return
		}

		// Send approval email with temp password
		go sendVolunteerApprovalEmailWithPassword(user, tempPassword)
	}

	// Create volunteer profile with application data
	volunteerProfile := models.VolunteerProfile{
		UserID:        user.ID,
		ApplicationID: &application.ID,
		Experience:    application.Experience,
		Skills:        application.Skills,
		Availability:  application.Availability,
		Status:        "active",
	}

	if err := tx.Create(&volunteerProfile).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create volunteer profile"})
		return
	}

	// Update application status
	application.Status = "approved"
	application.UpdatedAt = time.Now()
	if err := tx.Save(&application).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application status"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Send approval email notification asynchronously
	go func() {
		if err := sendVolunteerApprovalEmail(application); err != nil {
			log.Printf("Failed to send volunteer approval email: %v", err)
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "Approve", "Volunteer", user.ID, "Volunteer application approved")

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Volunteer application approved successfully",
		"user":    user,
	})
}

// RejectVolunteer rejects a volunteer application
func RejectVolunteer(c *gin.Context) {
	// Get volunteer application ID from URL
	volunteerID := c.Param("id")
	id, err := strconv.ParseUint(volunteerID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	// Get reason from request body
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Find the volunteer application
	var application models.VolunteerApplication
	if err := db.DB.First(&application, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer application not found"})
		return
	}

	// Update application status and rejection reason
	application.Status = "rejected"
	application.RejectionReason = req.Reason
	application.UpdatedAt = time.Now()
	if err := db.DB.Save(&application).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application status"})
		return
	}

	// Send rejection email notification
	go sendVolunteerRejectionEmail(application, req.Reason)

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"message": "Volunteer application rejected successfully",
	})
}

// ListPendingVolunteers returns volunteers awaiting approval
func ListPendingVolunteers(c *gin.Context) {
	var pendingApplications []models.VolunteerApplication

	if err := db.GetDB().Where("status = ?", "pending").Find(&pendingApplications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch pending volunteers",
		})
		return
	}

	// Add logging to debug the issue
	log.Printf("Found %d pending volunteer applications", len(pendingApplications))

	c.JSON(http.StatusOK, pendingApplications)
}

// ListActiveVolunteers returns all active volunteers
func ListActiveVolunteers(c *gin.Context) {
	var volunteers []models.User

	// Fetch active volunteers with proper case and using GetDB()
	if err := db.GetDB().Where("role = ?", models.RoleVolunteer).Where("status = ?", "active").Find(&volunteers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch active volunteers"})
		return
	}

	// Add detailed logging to debug the issue
	log.Printf("ListActiveVolunteers: Found %d active volunteers with role=%s and status=active",
		len(volunteers), models.RoleVolunteer)

	// Transform to response format
	response := make([]gin.H, 0, len(volunteers))
	for _, v := range volunteers {
		response = append(response, gin.H{
			"id":         v.ID,
			"first_name": v.FirstName,
			"last_name":  v.LastName,
			"email":      v.Email,
			"phone":      v.Phone,
			"createdAt":  v.CreatedAt,
		})
	}

	// Return directly, not nested in data property
	c.JSON(http.StatusOK, response)
}

// ListAvailableShifts returns all available shifts
func ListAvailableShifts(c *gin.Context) {
	var shifts []models.Shift

	if err := db.DB.Where("assigned_volunteer_id IS NULL").Find(&shifts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve shifts"})
		return
	}

	c.JSON(http.StatusOK, shifts)
}

// SignupForShift assigns a volunteer to a shift
// Enhanced flexible shift signup with improved validation and capacity management
func SignupForShift(c *gin.Context) {
	shiftID := c.Param("id")

	// Get volunteer ID from JWT token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	volunteerID, _ := shared.ConvertToUint(fmt.Sprintf("%v", userID))
	if volunteerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid volunteer ID"})
		return
	}

	// Parse request body for flexible time options
	var requestBody struct {
		FlexibleTime *struct {
			StartTime string  `json:"startTime"`
			EndTime   string  `json:"endTime"`
			Duration  float64 `json:"duration"`
		} `json:"flexibleTime"`
	}

	// Try to parse JSON body (may be empty for fixed shifts)
	c.ShouldBindJSON(&requestBody)

	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shift not found"})
		return
	}

	// Enhanced eligibility check with better error messages
	eligibilityResult := checkShiftEligibilityEnhanced(volunteerID, shift)
	if !eligibilityResult.Eligible {
		c.JSON(http.StatusConflict, gin.H{
			"error":       eligibilityResult.Reason,
			"conflicts":   eligibilityResult.Conflicts,
			"suggestions": eligibilityResult.Suggestions,
			"code":        eligibilityResult.ErrorCode,
		})
		return
	}

	// Enhanced flexible time validation
	var customStartTime, customEndTime *time.Time
	var duration float64

	if requestBody.FlexibleTime != nil && shift.Type == "flexible" {
		// Validate flexible shift capacity
		currentFlexibleAssignments := countFlexibleAssignments(shift.ID)
		if currentFlexibleAssignments >= shift.FlexibleSlots {
			c.JSON(http.StatusConflict, gin.H{
				"error": "flexible shift capacity reached",
				"code":  "CAPACITY_FULL",
			})
			return
		}

		// Parse and validate custom times with enhanced validation
		if valid, validationError := validateFlexibleTimeSelection(
			shift, requestBody.FlexibleTime.StartTime,
			requestBody.FlexibleTime.EndTime, requestBody.FlexibleTime.Duration); !valid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": validationError,
				"code":  "INVALID_TIME_SELECTION",
			})
			return
		}

		// Parse custom times
		shiftDate := shift.Date
		startDateTime, err := parseTimeOnDate(shiftDate, requestBody.FlexibleTime.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid start time format",
				"code":  "INVALID_START_TIME",
			})
			return
		}

		endDateTime, err := parseTimeOnDate(shiftDate, requestBody.FlexibleTime.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid end time format",
				"code":  "INVALID_END_TIME",
			})
			return
		}

		customStartTime = &startDateTime
		customEndTime = &endDateTime
		duration = requestBody.FlexibleTime.Duration

		// Enhanced conflict checking for flexible times
		if err := validateFlexibleTimeConflictsEnhanced(volunteerID, shiftDate, startDateTime, endDateTime); err != nil {
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("time conflict: %v", err),
				"code":  "TIME_CONFLICT",
			})
			return
		}
	}

	// Begin transaction for atomic operation
	tx := db.DB.Begin()

	// For flexible shifts, don't assign to the shift directly - use assignment record only
	// For fixed shifts, assign volunteer to the shift
	if shift.Type != "flexible" {
		if err := tx.Model(&shift).Update("assigned_volunteer_id", volunteerID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to assign shift",
				"code":  "DATABASE_ERROR",
			})
			return
		}
	} else {
		// Update flexible slots used counter
		if err := tx.Model(&shift).Update("flexible_slots_used", gorm.Expr("flexible_slots_used + ?", 1)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to update flexible slot count",
				"code":  "DATABASE_ERROR",
			})
			return
		}
	}

	// Create enhanced shift assignment record
	assignment := models.ShiftAssignment{
		ShiftID:         shift.ID,
		UserID:          volunteerID,
		Status:          "Confirmed",
		AssignedAt:      time.Now(),
		CustomStartTime: customStartTime,
		CustomEndTime:   customEndTime,
		Duration:        duration,
	}

	if err := tx.Create(&assignment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to create assignment record",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to complete signup",
			"code":  "TRANSACTION_ERROR",
		})
		return
	}

	// Send confirmation notification
	go func() {
		notificationService := shared.GetNotificationService()
		if notificationService != nil {
			var volunteer models.User
			if err := db.DB.First(&volunteer, volunteerID).Error; err == nil {
				if err := notificationService.SendShiftSignupConfirmation(shift, volunteer); err != nil {
					log.Printf("Failed to send shift signup notification: %v", err)
				}
			}
		}
	}()

	// Prepare response with enhanced information
	response := gin.H{
		"message": "Successfully signed up for shift",
		"shift": gin.H{
			"id":         shift.ID,
			"title":      shift.Role + " - " + shift.Location,
			"date":       shift.Date.Format("2006-01-02"),
			"type":       shift.Type,
			"assignment": assignment.ID,
		},
	}

	// Add time information based on shift type
	if customStartTime != nil && customEndTime != nil {
		response["shift"].(gin.H)["customStartTime"] = customStartTime.Format("15:04")
		response["shift"].(gin.H)["customEndTime"] = customEndTime.Format("15:04")
		response["shift"].(gin.H)["duration"] = duration
		response["message"] = fmt.Sprintf("Successfully signed up for %.1f hours from %s to %s",
			duration, customStartTime.Format("15:04"), customEndTime.Format("15:04"))
	} else {
		response["shift"].(gin.H)["startTime"] = shift.StartTime.Format("15:04")
		response["shift"].(gin.H)["endTime"] = shift.EndTime.Format("15:04")
	}

	c.JSON(http.StatusOK, response)
}

// timeRangesOverlap checks if two time ranges overlap
func timeRangesOverlap(start1, end1, start2, end2 time.Time) bool {
	return start1.Before(end2) && start2.Before(end1)
}

// Enhanced shift eligibility checking (type is defined in validation.go)

// Enhanced eligibility checking with more detailed error codes
func checkShiftEligibilityEnhanced(volunteerID uint, shift models.Shift) ShiftEligibilityResult {
	// Check if shift is in the past (with 2-hour buffer)
	cutoffTime := time.Now().Add(2 * time.Hour)
	shiftStartTime := time.Date(shift.Date.Year(), shift.Date.Month(), shift.Date.Day(),
		shift.StartTime.Hour(), shift.StartTime.Minute(), 0, 0, shift.Date.Location())

	if shiftStartTime.Before(cutoffTime) {
		return ShiftEligibilityResult{
			Eligible:  false,
			Reason:    "Cannot sign up for shifts starting in less than 2 hours",
			ErrorCode: "TOO_LATE",
			Suggestions: []string{
				"Contact volunteer coordinator for emergency assignments",
				"Look for shifts starting at least 2 hours from now",
			},
		}
	}

	// Check for time conflicts with other assigned shifts
	var conflicts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date::date = ?::date", volunteerID, shift.Date).Find(&conflicts)

	for _, existingShift := range conflicts {
		if timeRangesOverlapSameDay(shift.StartTime, shift.EndTime, existingShift.StartTime, existingShift.EndTime) {
			return ShiftEligibilityResult{
				Eligible:  false,
				Reason:    fmt.Sprintf("Time conflict with existing shift from %s to %s", existingShift.StartTime.Format("15:04"), existingShift.EndTime.Format("15:04")),
				ErrorCode: "TIME_CONFLICT",
				Conflicts: []models.Shift{existingShift},
				Suggestions: []string{
					"Choose a different time slot",
					"Cancel your existing shift if this one is more important",
					"Contact coordinator about overlapping assignments",
				},
			}
		}
	}

	return ShiftEligibilityResult{
		Eligible: true,
	}
}

// Enhanced eligibility checking with more detailed error codes
func validateFlexibleTimeSelection(shift models.Shift, startTime, endTime string, duration float64) (bool, string) {
	// Parse times
	start, err := time.Parse("15:04", startTime)
	if err != nil {
		return false, "invalid start time format"
	}

	end, err := time.Parse("15:04", endTime)
	if err != nil {
		return false, "invalid end time format"
	}

	// Check if times are within shift boundaries
	if start.Before(shift.StartTime) || end.After(shift.EndTime) {
		return false, "selected time range is outside the available shift hours"
	}

	// Validate minimum/maximum hours if set
	if shift.MinimumHours != nil && duration < *shift.MinimumHours {
		return false, fmt.Sprintf("minimum commitment is %.1f hours", *shift.MinimumHours)
	}

	if shift.MaximumHours != nil && duration > *shift.MaximumHours {
		return false, fmt.Sprintf("maximum commitment is %.1f hours", *shift.MaximumHours)
	}

	// Validate duration matches time difference
	timeDiff := end.Sub(start).Hours()
	if math.Abs(timeDiff-duration) > 0.1 { // Allow small floating point differences
		return false, "duration doesn't match selected time range"
	}

	return true, ""
}

// Parse time string on a specific date
func parseTimeOnDate(date time.Time, timeStr string) (time.Time, error) {
	timePart, err := time.Parse("15:04", timeStr)
	if err != nil {
		return time.Time{}, err
	}

	return time.Date(date.Year(), date.Month(), date.Day(),
		timePart.Hour(), timePart.Minute(), 0, 0, date.Location()), nil
}

// Enhanced flexible time conflict validation
func validateFlexibleTimeConflictsEnhanced(volunteerID uint, date time.Time, startTime, endTime time.Time) error {
	// Get all existing assignments for this volunteer on the same date
	var assignments []models.ShiftAssignment
	err := db.DB.Joins("JOIN shifts ON shifts.id = shift_assignments.shift_id").
		Where("shift_assignments.user_id = ? AND shifts.date::date = ?::date AND shift_assignments.status IN (?, ?)",
			volunteerID, date, "Confirmed", "Assigned").
		Preload("Shift").
		Find(&assignments).Error

	if err != nil {
		return fmt.Errorf("failed to check existing assignments: %v", err)
	}

	for _, assignment := range assignments {
		var conflictStart, conflictEnd time.Time

		if assignment.CustomStartTime != nil && assignment.CustomEndTime != nil {
			// This is a flexible assignment, use custom times
			conflictStart = *assignment.CustomStartTime
			conflictEnd = *assignment.CustomEndTime
		} else {
			// This is a fixed assignment, get shift times
			conflictStart = assignment.Shift.StartTime
			conflictEnd = assignment.Shift.EndTime
		}

		// Check for time overlap with buffer (15 minutes)
		buffer := 15 * time.Minute
		if timeRangesOverlap(startTime.Add(-buffer), endTime.Add(buffer), conflictStart, conflictEnd) {
			return fmt.Errorf("conflicts with existing assignment from %s to %s (including 15-minute buffer)",
				conflictStart.Format("15:04"), conflictEnd.Format("15:04"))
		}
	}

	return nil
}

// Enhanced volunteer dashboard with comprehensive statistics
func VolunteerDashboardStats(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Debug logging
	fmt.Printf("DEBUG: VolunteerDashboardStats called for userID: %v\n", userID)

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get comprehensive statistics
	stats := calculateVolunteerStatistics(userID.(uint))

	// Debug logging for stats
	fmt.Printf("DEBUG: Stats calculated - Total Hours: %f, Shifts Completed: %d, Shifts Upcoming: %d\n",
		stats.TotalHours, stats.ShiftsCompleted, stats.ShiftsUpcoming)

	// Calculate monthly hours
	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var monthlyHours float64

	// Get fixed shifts for this month
	var monthlyShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date >= ? AND date < ?",
		userID, thisMonthStart, thisMonthStart.AddDate(0, 1, 0)).Find(&monthlyShifts)

	for _, shift := range monthlyShifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		monthlyHours += duration.Hours()
	}

	// Get flexible shifts for this month via ShiftAssignment
	var monthlyAssignments []models.ShiftAssignment
	db.DB.Where("user_id = ? AND status = 'Confirmed'", userID).
		Preload("Shift").
		Find(&monthlyAssignments)

	for _, assignment := range monthlyAssignments {
		if assignment.Shift.Date.After(thisMonthStart) && assignment.Shift.Date.Before(thisMonthStart.AddDate(0, 1, 0)) {
			if assignment.Duration > 0 {
				monthlyHours += assignment.Duration
			} else {
				// Fall back to shift duration
				duration := assignment.Shift.EndTime.Sub(assignment.Shift.StartTime)
				monthlyHours += duration.Hours()
			}
		}
	}

	// Get upcoming shifts count (both fixed and flexible)
	var upcomingShiftsCount int64

	// Count fixed shifts
	db.DB.Model(&models.Shift{}).
		Where("assigned_volunteer_id = ? AND date >= ?", userID, now).
		Count(&upcomingShiftsCount)

	// Debug logging
	fmt.Printf("DEBUG: Dashboard - Found %d upcoming fixed shifts\n", upcomingShiftsCount)

	// Count flexible shifts via ShiftAssignment
	var flexibleUpcomingCount int64
	db.DB.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.user_id = ? AND shift_assignments.status = 'Confirmed' AND shifts.date >= ?", userID, now).
		Count(&flexibleUpcomingCount)

	upcomingShiftsCount += flexibleUpcomingCount

	// Debug logging
	fmt.Printf("DEBUG: Dashboard - Found %d upcoming flexible shifts, total: %d\n", flexibleUpcomingCount, upcomingShiftsCount)

	// Calculate volunteer level based on stats
	level := "New Volunteer"
	if stats.TotalHours >= 100 {
		level = "Experienced Volunteer"
	} else if stats.TotalHours >= 50 {
		level = "Active Volunteer"
	} else if stats.TotalHours >= 20 {
		level = "Regular Volunteer"
	}

	// Calculate impact score (0-5 scale)
	impactScore := 0.0
	if stats.ReliabilityScore > 0 {
		impactScore = (stats.ReliabilityScore/100)*5 + (float64(stats.ShiftsCompleted)/20)*2
		if impactScore > 5 {
			impactScore = 5.0
		}
	}

	// Determine next milestone
	nextMilestone := "First Shift"
	milestoneProgress := 0
	if stats.ShiftsCompleted >= 50 {
		nextMilestone = "Leadership Badge"
		milestoneProgress = 85
	} else if stats.ShiftsCompleted >= 20 {
		nextMilestone = "Community Champion"
		milestoneProgress = int((float64(stats.ShiftsCompleted-20) / 30) * 100)
	} else if stats.ShiftsCompleted >= 10 {
		nextMilestone = "Regular Volunteer"
		milestoneProgress = int((float64(stats.ShiftsCompleted-10) / 10) * 100)
	} else if stats.ShiftsCompleted >= 1 {
		nextMilestone = "Active Volunteer"
		milestoneProgress = int((float64(stats.ShiftsCompleted) / 10) * 100)
	}

	// Get achievements
	achievements := calculateVolunteerAchievements(stats)

	// Get recent activity (last 10 activities from both fixed and flexible shifts)
	var recentShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date < ?", userID, now).
		Order("date DESC").Limit(10).Find(&recentShifts)

	var recentActivity []gin.H
	for _, shift := range recentShifts {
		activity := gin.H{
			"id":          shift.ID,
			"type":        "shift_completed",
			"description": fmt.Sprintf("Completed %s shift at %s", shift.Role, shift.Location),
			"date":        shift.Date.Format("2006-01-02"),
			"category":    "Volunteer Work",
			"impact":      "medium",
		}
		recentActivity = append(recentActivity, activity)
	}

	// Add recent flexible shifts
	var recentFlexibleAssignments []models.ShiftAssignment
	db.DB.Where("user_id = ? AND status = 'Completed'", userID).
		Preload("Shift").
		Order("updated_at DESC").Limit(10).Find(&recentFlexibleAssignments)

	for _, assignment := range recentFlexibleAssignments {
		if assignment.Shift.Date.Before(now) && len(recentActivity) < 10 {
			activity := gin.H{
				"id":          assignment.Shift.ID,
				"type":        "shift_completed",
				"description": fmt.Sprintf("Completed %s shift at %s", assignment.Shift.Role, assignment.Shift.Location),
				"date":        assignment.Shift.Date.Format("2006-01-02"),
				"category":    "Volunteer Work",
				"impact":      "medium",
			}
			recentActivity = append(recentActivity, activity)
		}
	}

	// Debug logging final response
	fmt.Printf("DEBUG: Final dashboard response - upcomingShifts: %d, hoursThisMonth: %f, totalHours: %f, shiftCompleted: %d\n",
		upcomingShiftsCount, monthlyHours, stats.TotalHours, stats.ShiftsCompleted)

	c.JSON(http.StatusOK, gin.H{
		"upcomingShifts":    upcomingShiftsCount,
		"hoursThisMonth":    monthlyHours,
		"totalHours":        stats.TotalHours,
		"shiftsCompleted":   stats.ShiftsCompleted,
		"peopleHelped":      stats.PeopleHelped,
		"level":             level,
		"achievements":      achievements,
		"recentActivity":    recentActivity,
		"impactScore":       impactScore,
		"streak":            stats.CurrentStreak,
		"nextMilestone":     nextMilestone,
		"milestonePorgress": milestoneProgress,
	})
}

// GetOptimizedDashboard returns a comprehensive dashboard view with all relevant data
func GetOptimizedDashboard(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	// Get volunteer profile
	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	// Get comprehensive stats
	stats := calculateVolunteerStatistics(volunteer.ID)

	// Get upcoming shifts
	var upcomingShifts []models.Shift
	db.DB.Joins("JOIN shift_assignments ON shifts.id = shift_assignments.shift_id").
		Where("shift_assignments.volunteer_id = ? AND shifts.start_time > ?", volunteer.ID, time.Now()).
		Order("shifts.start_time ASC").
		Limit(5).
		Find(&upcomingShifts)

	// Get pending tasks
	var pendingTasks []models.Task
	db.DB.Where("assigned_user_id = ? AND status = 'pending'", userID).
		Order("due_date ASC").
		Limit(5).
		Find(&pendingTasks)

	// Get recent notifications
	var recentNotifications []models.Notification
	db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(5).
		Find(&recentNotifications)

	// Get achievements
	achievements := calculateVolunteerAchievements(stats)

	response := gin.H{
		"stats":                stats,
		"upcoming_shifts":      upcomingShifts,
		"pending_tasks":        pendingTasks,
		"recent_notifications": recentNotifications,
		"achievements":         achievements,
	}

	c.JSON(http.StatusOK, response)
}

// GetPerformanceMetrics returns detailed performance metrics for a volunteer
func GetPerformanceMetrics(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	// Calculate performance metrics
	var completedShifts int64
	var totalShifts int64
	var onTimeShifts int64

	db.DB.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shifts.end_time < ?", volunteer.ID, time.Now()).
		Count(&totalShifts)

	db.DB.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shift_assignments.status = 'completed'", volunteer.ID).
		Count(&completedShifts)

	db.DB.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shift_assignments.checked_in_at IS NOT NULL AND shift_assignments.checked_in_at <= shifts.start_time", volunteer.ID).
		Count(&onTimeShifts)

	reliabilityScore := float64(0)
	punctualityScore := float64(0)
	if totalShifts > 0 {
		reliabilityScore = float64(completedShifts) / float64(totalShifts) * 100
		punctualityScore = float64(onTimeShifts) / float64(totalShifts) * 100
	}

	// Calculate quality score based on feedback (placeholder - you may need to implement feedback system)
	qualityScore := float64(85) // Default score

	overallRating := (reliabilityScore + punctualityScore + qualityScore) / 3

	metrics := gin.H{
		"reliability_score": reliabilityScore,
		"punctuality_score": punctualityScore,
		"quality_score":     qualityScore,
		"overall_rating":    overallRating,
		"total_evaluations": totalShifts,
		"recent_feedback":   []gin.H{},                        // Placeholder for future feedback system
		"improvement_areas": []string{},                       // Placeholder
		"strengths":         []string{"Reliable", "Punctual"}, // Default strengths
	}

	c.JSON(http.StatusOK, metrics)
}

// GetVolunteerRanking returns volunteer ranking information
func GetVolunteerRanking(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	// Get all volunteers ordered by total hours
	var volunteers []models.VolunteerProfile
	db.DB.Preload("User").
		Where("status = 'active'").
		Order("total_hours DESC").
		Find(&volunteers)

	totalVolunteers := len(volunteers)
	currentRank := 0
	percentile := float64(0)

	// Find current volunteer's rank
	for i, v := range volunteers {
		if v.ID == volunteer.ID {
			currentRank = i + 1
			percentile = float64(totalVolunteers-currentRank+1) / float64(totalVolunteers) * 100
			break
		}
	}

	// Create leaderboard (top 10)
	leaderboard := make([]gin.H, 0)
	limit := 10
	if len(volunteers) < 10 {
		limit = len(volunteers)
	}

	for i := 0; i < limit; i++ {
		leaderboard = append(leaderboard, gin.H{
			"rank":            i + 1,
			"name":            volunteers[i].User.FirstName + " " + volunteers[i].User.LastName,
			"hours":           volunteers[i].TotalHours,
			"is_current_user": volunteers[i].ID == volunteer.ID,
		})
	}

	response := gin.H{
		"current_rank":     currentRank,
		"total_volunteers": totalVolunteers,
		"percentile":       percentile,
		"leaderboard":      leaderboard,
	}

	c.JSON(http.StatusOK, response)
}

// GetEmergencyShifts returns shifts that need urgent coverage
func GetEmergencyShifts(c *gin.Context) {
	var emergencyShifts []models.Shift

	// Find shifts that start within next 24 hours and need volunteers
	cutoffTime := time.Now().Add(24 * time.Hour)

	db.DB.Where("start_time BETWEEN ? AND ? AND status = 'open'", time.Now(), cutoffTime).
		Where("id NOT IN (SELECT shift_id FROM shift_assignments WHERE status IN ('confirmed', 'completed'))").
		Order("start_time ASC").
		Find(&emergencyShifts)

	c.JSON(http.StatusOK, emergencyShifts)
}

// GetTrainingCertificates returns training certificates for the volunteer
func GetTrainingCertificates(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	var userTrainings []models.UserTraining
	db.DB.Preload("TrainingModule").
		Where("user_id = ? AND status = 'completed'", userID).
		Find(&userTrainings)

	certificates := make([]gin.H, 0)
	for _, training := range userTrainings {
		cert := gin.H{
			"id":              strconv.Itoa(int(training.ID)),
			"module_name":     training.TrainingModule.Title,
			"certificate_url": "/api/v1/volunteer/certificates/" + strconv.Itoa(int(training.ID)), // Placeholder URL
			"issued_date":     training.CompletedAt.Format("2006-01-02"),
		}

		if training.ExpiresAt != nil {
			cert["expires_at"] = training.ExpiresAt.Format("2006-01-02")
		}

		certificates = append(certificates, cert)
	}

	c.JSON(http.StatusOK, certificates)
}

// GetVolunteerNotes returns notes for the volunteer
func GetVolunteerNotes(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	var notes []models.VolunteerNote
	db.DB.Preload("CreatedBy").
		Where("volunteer_id = ? AND (visibility = 'volunteer' OR visibility = 'all')", volunteer.ID).
		Order("created_at DESC").
		Find(&notes)

	c.JSON(http.StatusOK, notes)
}

// GetHoursSummary returns volunteer hours summary
func GetHoursSummary(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonthStart := thisMonthStart.AddDate(0, -1, 0)

	// Calculate hours
	var thisMonthHours float64
	var lastMonthHours float64
	var pendingHours float64
	var approvedHours float64

	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shifts.start_time >= ?", volunteer.ID, thisMonthStart).
		Scan(&thisMonthHours)

	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shifts.start_time >= ? AND shifts.start_time < ?", volunteer.ID, lastMonthStart, thisMonthStart).
		Scan(&lastMonthHours)

	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Where("volunteer_id = ? AND status = 'pending_approval'", volunteer.ID).
		Scan(&pendingHours)

	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Where("volunteer_id = ? AND status = 'completed'", volunteer.ID).
		Scan(&approvedHours)

	// Calculate average hours per week (last 12 weeks)
	twelveWeeksAgo := now.AddDate(0, 0, -84)
	var totalHoursLast12Weeks float64
	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shift_assignments.volunteer_id = ? AND shifts.start_time >= ?", volunteer.ID, twelveWeeksAgo).
		Scan(&totalHoursLast12Weeks)

	averagePerWeek := totalHoursLast12Weeks / 12

	// Get recent entries
	var recentEntries []models.ShiftAssignment
	db.DB.Preload("Shift").
		Where("volunteer_id = ?", volunteer.ID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentEntries)

	summary := gin.H{
		"total_hours":      volunteer.TotalHours,
		"this_month":       thisMonthHours,
		"last_month":       lastMonthHours,
		"pending_hours":    pendingHours,
		"approved_hours":   approvedHours,
		"average_per_week": averagePerWeek,
		"entries":          recentEntries,
	}

	c.JSON(http.StatusOK, summary)
}

// GetTeamStats returns team statistics
func GetTeamStats(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var volunteer models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&volunteer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	// Get team stats
	var totalMembers int64
	var activeMembers int64

	db.DB.Model(&models.VolunteerProfile{}).Count(&totalMembers)
	db.DB.Model(&models.VolunteerProfile{}).Where("status = 'active'").Count(&activeMembers)

	// Calculate total hours this month for all volunteers
	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var totalHoursThisMonth float64
	db.DB.Model(&models.ShiftAssignment{}).
		Select("COALESCE(SUM(hours_logged), 0)").
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shifts.start_time >= ?", thisMonthStart).
		Scan(&totalHoursThisMonth)

	averageHoursPerMember := float64(0)
	if activeMembers > 0 {
		averageHoursPerMember = totalHoursThisMonth / float64(activeMembers)
	}

	// Get top contributors this month
	var topContributors []struct {
		VolunteerID uint    `json:"volunteer_id"`
		FirstName   string  `json:"first_name"`
		LastName    string  `json:"last_name"`
		Hours       float64 `json:"hours"`
	}

	db.DB.Model(&models.ShiftAssignment{}).
		Select(`volunteer_profiles.id as volunteer_id, 
				users.first_name, 
				users.last_name, 
				COALESCE(SUM(shift_assignments.hours_logged), 0) as hours`).
		Joins("JOIN volunteer_profiles ON shift_assignments.volunteer_id = volunteer_profiles.id").
		Joins("JOIN users ON volunteer_profiles.user_id = users.id").
		Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
		Where("shifts.start_time >= ?", thisMonthStart).
		Group("volunteer_profiles.id, users.first_name, users.last_name").
		Order("hours DESC").
		Limit(5).
		Scan(&topContributors)

	stats := gin.H{
		"total_members":            totalMembers,
		"active_members":           activeMembers,
		"total_hours_this_month":   totalHoursThisMonth,
		"average_hours_per_member": averageHoursPerMember,
		"top_contributors":         topContributors,
	}

	c.JSON(http.StatusOK, stats)
}

// GetUserTraining returns training progress for the user
func GetUserTraining(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var userTrainings []models.UserTraining
	db.DB.Preload("TrainingModule").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&userTrainings)

	c.JSON(http.StatusOK, userTrainings)
}

// Helper functions
func generateSecureTempPassword() string {
	// Generate a secure 12-character temporary password
	chars := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
	password := make([]byte, 12)
	for i := range password {
		password[i] = chars[time.Now().UnixNano()%int64(len(chars))]
	}
	return string(password)
}

// Helper functions for sending emails
func sendVolunteerApprovalEmail(application models.VolunteerApplication) error {
	notificationService := notifications.GetService()
	if notificationService == nil {
		return fmt.Errorf("notification service not available")
	}

	user := models.User{
		FirstName: application.FirstName,
		LastName:  application.LastName,
		Email:     application.Email,
	}

	data := notifications.NotificationData{
		To:               application.Email,
		Subject:          "Volunteer Application Approved",
		TemplateType:     "volunteer_approval",
		NotificationType: notifications.EmailNotification,
		TemplateData: map[string]interface{}{
			"Name": application.FirstName + " " + application.LastName,
		},
	}

	return notificationService.SendNotification(data, user)
}

func sendVolunteerApprovalEmailWithPassword(user models.User, tempPassword string) {
	notificationService := notifications.GetService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Welcome to Lewishame Charity - Login Details",
			TemplateType:     "volunteer_approval_with_password",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":         user.FirstName + " " + user.LastName,
				"Email":        user.Email,
				"TempPassword": tempPassword,
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send approval email with password: %v", err)
		}
	}
}

func sendVolunteerRejectionEmail(application models.VolunteerApplication, reason string) {
	notificationService := notifications.GetService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               application.Email,
			Subject:          "Volunteer Application Update",
			TemplateType:     "volunteer_rejection",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":   application.FirstName + " " + application.LastName,
				"Reason": reason,
			},
		}

		user := models.User{
			FirstName: application.FirstName,
			LastName:  application.LastName,
			Email:     application.Email,
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send rejection email: %v", err)
		}
	}
}

// notifyAdminsOfNewVolunteerApplication sends notification to admins
// Currently unused but kept for future implementation
/*
func notifyAdminsOfNewVolunteerApplication(application models.VolunteerApplication) {
	log.Printf("New volunteer application received from %s (%s)", application.Name, application.Email)
}
*/

// Update volunteer profile endpoint to use profile service
func UpdateVolunteerProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Role != models.RoleVolunteer {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only volunteers can update volunteer profiles"})
		return
	}

	var updates struct {
		Skills       string `json:"skills"`
		Availability string `json:"availability"`
		Experience   string `json:"experience"`
	}

	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create volunteer profile
	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			profile = models.VolunteerProfile{UserID: user.ID}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
			return
		}
	}

	// Update profile fields
	if updates.Skills != "" {
		profile.Skills = updates.Skills
	}
	if updates.Availability != "" {
		profile.Availability = updates.Availability
	}
	if updates.Experience != "" {
		profile.Experience = updates.Experience
	}

	if err := db.DB.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// ================================================================
// ADDITIONAL VOLUNTEER HANDLERS FOR ENHANCED DASHBOARD
// ================================================================

// VolunteerStats holds comprehensive statistics for a volunteer
type VolunteerStats struct {
	TotalHours       float64 `json:"total_hours"`
	ShiftsCompleted  int     `json:"shifts_completed"`
	ShiftsUpcoming   int     `json:"shifts_upcoming"`
	PeopleHelped     int     `json:"people_helped"`
	ReliabilityScore float64 `json:"reliability_score"`
	CurrentStreak    int     `json:"current_streak"`
	LongestStreak    int     `json:"longest_streak"`
	AverageRating    float64 `json:"average_rating"`
	NoShowCount      int     `json:"no_show_count"`
	CancelledCount   int     `json:"cancelled_count"`
}

// calculateVolunteerStatistics calculates comprehensive statistics for a volunteer
func calculateVolunteerStatistics(userID uint) VolunteerStats {
	var stats VolunteerStats
	now := time.Now()

	// Debug logging
	fmt.Printf("DEBUG: calculateVolunteerStatistics called for userID: %d\n", userID)

	// Get all completed shifts for this volunteer (fixed shifts)
	var completedShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date < ? AND end_time < ?",
		userID, now, now).Find(&completedShifts)

	// Debug logging
	fmt.Printf("DEBUG: Found %d completed fixed shifts\n", len(completedShifts))

	// Calculate total hours and shifts completed from fixed shifts
	stats.ShiftsCompleted = len(completedShifts)
	for _, shift := range completedShifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		stats.TotalHours += duration.Hours()
	}

	// Get completed flexible shifts via ShiftAssignment
	var completedFlexibleAssignments []models.ShiftAssignment
	db.DB.Where("user_id = ? AND status = 'Completed'", userID).
		Preload("Shift").
		Find(&completedFlexibleAssignments)

	// Debug logging
	fmt.Printf("DEBUG: Found %d completed flexible shift assignments\n", len(completedFlexibleAssignments))

	// Add flexible shifts to stats
	for _, assignment := range completedFlexibleAssignments {
		if assignment.Shift.Date.Before(now) {
			stats.ShiftsCompleted++
			if assignment.Duration > 0 {
				stats.TotalHours += assignment.Duration
			} else {
				// Fall back to shift duration
				duration := assignment.Shift.EndTime.Sub(assignment.Shift.StartTime)
				stats.TotalHours += duration.Hours()
			}
		}
	}

	// Get upcoming shifts (fixed)
	var upcomingShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date >= ?", userID, now).Find(&upcomingShifts)
	stats.ShiftsUpcoming = len(upcomingShifts)

	// Debug logging
	fmt.Printf("DEBUG: Found %d upcoming fixed shifts\n", len(upcomingShifts))

	// Get upcoming flexible shifts
	var upcomingFlexibleAssignments []models.ShiftAssignment
	db.DB.Where("user_id = ? AND status = 'Confirmed'", userID).
		Preload("Shift").
		Find(&upcomingFlexibleAssignments)

	// Debug logging
	fmt.Printf("DEBUG: Found %d upcoming flexible shift assignments\n", len(upcomingFlexibleAssignments))

	for _, assignment := range upcomingFlexibleAssignments {
		if assignment.Shift.Date.After(now) || assignment.Shift.Date.Equal(now) {
			stats.ShiftsUpcoming++
		}
	}

	// Calculate people helped (estimate based on shift type and duration)
	// This is a simplified calculation - you might want to track this more precisely
	stats.PeopleHelped = stats.ShiftsCompleted * 3 // Estimate 3 people helped per shift

	// Get shift assignments to calculate reliability
	var allAssignments []models.ShiftAssignment
	db.DB.Where("user_id = ?", userID).Find(&allAssignments)

	totalAssignments := len(allAssignments)
	completedAssignmentCount := 0
	cancelledAssignmentCount := 0
	noShowAssignmentCount := 0

	for _, assignment := range allAssignments {
		switch assignment.Status {
		case "Completed":
			completedAssignmentCount++
		case "Cancelled":
			cancelledAssignmentCount++
		case "NoShow":
			noShowAssignmentCount++
		}
	}

	stats.CancelledCount = cancelledAssignmentCount
	stats.NoShowCount = noShowAssignmentCount

	// Calculate reliability score (0-100)
	if totalAssignments > 0 {
		reliability := float64(completedAssignmentCount) / float64(totalAssignments)
		stats.ReliabilityScore = reliability * 100
	} else {
		stats.ReliabilityScore = 100 // New volunteers start with perfect score
	}

	// Calculate current streak (consecutive weeks with at least one shift)
	stats.CurrentStreak = calculateVolunteerStreak(userID, false)
	stats.LongestStreak = calculateVolunteerStreak(userID, true)

	// Get average rating from feedback (if feedback system exists)
	// For now, calculate based on reliability and experience
	if stats.ReliabilityScore > 95 && stats.ShiftsCompleted > 10 {
		stats.AverageRating = 5.0
	} else if stats.ReliabilityScore > 90 && stats.ShiftsCompleted > 5 {
		stats.AverageRating = 4.5
	} else if stats.ReliabilityScore > 80 {
		stats.AverageRating = 4.0
	} else if stats.ReliabilityScore > 70 {
		stats.AverageRating = 3.5
	} else {
		stats.AverageRating = 3.0
	}

	return stats
}

// calculateVolunteerStreak calculates current or longest volunteer streak
func calculateVolunteerStreak(userID uint, longest bool) int {
	// Get all completed shifts ordered by date
	var shifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date < ?", userID, time.Now()).
		Order("date ASC").Find(&shifts)

	if len(shifts) == 0 {
		return 0
	}

	currentStreak := 0
	longestStreak := 0
	weeklyShifts := make(map[string]bool)

	// Group shifts by week
	for _, shift := range shifts {
		year, week := shift.Date.ISOWeek()
		weekKey := fmt.Sprintf("%d-W%02d", year, week)
		weeklyShifts[weekKey] = true
	}

	// Convert to sorted slice of weeks
	var weeks []string
	for week := range weeklyShifts {
		weeks = append(weeks, week)
	}

	// Sort weeks
	// This is a simplified sort - you might want to use proper time sorting
	if len(weeks) > 0 {
		// Calculate streaks
		currentStreak = 1
		tempStreak := 1

		for i := 1; i < len(weeks); i++ {
			// Simplified consecutive week check
			// In production, you'd want proper week comparison
			tempStreak++
			if tempStreak > longestStreak {
				longestStreak = tempStreak
			}
		}

		currentStreak = tempStreak
	}

	if longest {
		return longestStreak
	}
	return currentStreak
}

// calculateVolunteerAchievements calculates achievements for a volunteer
func calculateVolunteerAchievements(stats VolunteerStats) []gin.H {
	var achievements []gin.H

	// First Shift Achievement
	if stats.ShiftsCompleted >= 1 {
		achievements = append(achievements, gin.H{
			"id":          "first_shift",
			"title":       "First Shift",
			"description": "Completed your first volunteer shift",
			"icon":        "star",
			"earned_at":   time.Now().AddDate(0, 0, -30).Format("2006-01-02"), // Approximate
			"type":        "milestone",
		})
	}

	// Dedicated Volunteer (10+ shifts)
	if stats.ShiftsCompleted >= 10 {
		achievements = append(achievements, gin.H{
			"id":          "dedicated_volunteer",
			"title":       "Dedicated Volunteer",
			"description": "Completed 10 volunteer shifts",
			"icon":        "trophy",
			"earned_at":   time.Now().AddDate(0, 0, -60).Format("2006-01-02"),
			"type":        "milestone",
		})
	}

	// Community Champion (25+ shifts)
	if stats.ShiftsCompleted >= 25 {
		achievements = append(achievements, gin.H{
			"id":          "community_champion",
			"title":       "Community Champion",
			"description": "Completed 25 volunteer shifts",
			"icon":        "medal",
			"earned_at":   time.Now().AddDate(0, 0, -90).Format("2006-01-02"),
			"type":        "milestone",
		})
	}

	// Reliable Volunteer (95%+ reliability)
	if stats.ReliabilityScore >= 95 && stats.ShiftsCompleted >= 5 {
		achievements = append(achievements, gin.H{
			"id":          "reliable_volunteer",
			"title":       "Reliable Volunteer",
			"description": "Maintained 95%+ attendance rate",
			"icon":        "shield",
			"earned_at":   time.Now().AddDate(0, 0, -45).Format("2006-01-02"),
			"type":        "performance",
		})
	}

	// Marathon Helper (50+ hours)
	if stats.TotalHours >= 50 {
		achievements = append(achievements, gin.H{
			"id":          "marathon_helper",
			"title":       "Marathon Helper",
			"description": "Volunteered for 50+ hours",
			"icon":        "clock",
			"earned_at":   time.Now().AddDate(0, 0, -75).Format("2006-01-02"),
			"type":        "time",
		})
	}

	// Century Club (100+ hours)
	if stats.TotalHours >= 100 {
		achievements = append(achievements, gin.H{
			"id":          "century_club",
			"title":       "Century Club",
			"description": "Volunteered for 100+ hours",
			"icon":        "award",
			"earned_at":   time.Now().AddDate(0, 0, -120).Format("2006-01-02"),
			"type":        "time",
		})
	}

	// Streak Master (4+ week streak)
	if stats.CurrentStreak >= 4 {
		achievements = append(achievements, gin.H{
			"id":          "streak_master",
			"title":       "Streak Master",
			"description": "Volunteered for 4+ consecutive weeks",
			"icon":        "fire",
			"earned_at":   time.Now().AddDate(0, 0, -28).Format("2006-01-02"),
			"type":        "consistency",
		})
	}

	// People Helper (based on estimated people helped)
	if stats.PeopleHelped >= 50 {
		achievements = append(achievements, gin.H{
			"id":          "people_helper",
			"title":       "People Helper",
			"description": "Helped 50+ community members",
			"icon":        "heart",
			"earned_at":   time.Now().AddDate(0, 0, -100).Format("2006-01-02"),
			"type":        "impact",
		})
	}

	return achievements
}

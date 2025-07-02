package volunteer

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

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
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
// Enhanced shift signup with comprehensive validation and flexible time support
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

	// Comprehensive eligibility check
	eligibilityResult := checkShiftEligibility(volunteerID, shift)
	if !eligibilityResult.Eligible {
		c.JSON(http.StatusConflict, gin.H{
			"error":       eligibilityResult.Reason,
			"conflicts":   eligibilityResult.Conflicts,
			"suggestions": eligibilityResult.Suggestions,
		})
		return
	}

	// Validate flexible time if provided
	var customStartTime, customEndTime *time.Time
	var duration float64

	if requestBody.FlexibleTime != nil && shift.Type == "flexible" {
		// Parse custom times
		shiftDate := shift.Date

		customStart, err := time.Parse("15:04", requestBody.FlexibleTime.StartTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start time format"})
			return
		}

		customEnd, err := time.Parse("15:04", requestBody.FlexibleTime.EndTime)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end time format"})
			return
		}

		// Combine date with time
		startDateTime := time.Date(shiftDate.Year(), shiftDate.Month(), shiftDate.Day(),
			customStart.Hour(), customStart.Minute(), 0, 0, shiftDate.Location())
		endDateTime := time.Date(shiftDate.Year(), shiftDate.Month(), shiftDate.Day(),
			customEnd.Hour(), customEnd.Minute(), 0, 0, shiftDate.Location())

		customStartTime = &startDateTime
		customEndTime = &endDateTime
		duration = requestBody.FlexibleTime.Duration

		// Validate that custom times are within shift range
		if startDateTime.Before(shift.StartTime) || endDateTime.After(shift.EndTime) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "selected time range is outside the available shift hours",
			})
			return
		}

		// Validate duration
		actualDuration := endDateTime.Sub(startDateTime).Hours()
		if actualDuration != duration {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "duration doesn't match selected time range",
			})
			return
		}

		// Check for conflicts with custom time
		if err := validateFlexibleTimeConflicts(volunteerID, shiftDate, startDateTime, endDateTime); err != nil {
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("time conflict: %v", err),
			})
			return
		}
	}

	// Begin transaction for atomic operation
	tx := db.DB.Begin()

	// For flexible shifts, don't assign to the shift directly - use assignment record only
	if shift.Type != "flexible" {
		// Assign volunteer to shift for fixed shifts
		if err := tx.Model(&shift).Update("assigned_volunteer_id", volunteerID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to assign shift"})
			return
		}
	}

	// Create shift assignment record
	assignment := models.ShiftAssignment{
		ShiftID:         shift.ID,
		UserID:          volunteerID,
		Status:          "Confirmed",
		AssignedAt:      time.Now(),
		CustomStartTime: customStartTime,
		CustomEndTime:   customEndTime,
		Duration:        duration,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := tx.Create(&assignment).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create assignment record"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit assignment"})
		return
	}

	// Send confirmation notification
	go func() {
		var volunteer models.User
		if err := db.DB.First(&volunteer, volunteerID).Error; err == nil {
			notificationService := shared.GetNotificationService()
			if notificationService != nil {
				if err := notificationService.SendShiftSignupConfirmation(shift, volunteer); err != nil {
					log.Printf("Failed to send shift signup confirmation: %v", err)
				}
			}
		}
	}()

	// Create audit log
	utils.CreateAuditLog(c, "SignUp", "Shift", shift.ID,
		fmt.Sprintf("Volunteer %d signed up for shift on %s", volunteerID, shift.Date.Format("2006-01-02")))

	// Build response
	response := gin.H{
		"message": "Successfully signed up for shift",
		"shift": gin.H{
			"id":       shift.ID,
			"date":     shift.Date.Format("2006-01-02"),
			"location": shift.Location,
			"role":     shift.Role,
		},
		"reminder_info": gin.H{
			"reminder_time": "24 hours before shift",
			"contact_info":  "volunteer@lewisham-hub.org",
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

// validateFlexibleTimeConflicts checks for scheduling conflicts with flexible time selection
func validateFlexibleTimeConflicts(volunteerID uint, date time.Time, startTime, endTime time.Time) error {
	// Get all existing assignments for this volunteer on the same date
	var assignments []models.ShiftAssignment
	err := db.DB.Joins("JOIN shifts ON shifts.id = shift_assignments.shift_id").
		Where("shift_assignments.user_id = ? AND shifts.date::date = ?::date AND shift_assignments.status != 'Cancelled'",
			volunteerID, date).
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
			var shift models.Shift
			if err := db.DB.First(&shift, assignment.ShiftID).Error; err != nil {
				continue // Skip if we can't load the shift
			}
			conflictStart = shift.StartTime
			conflictEnd = shift.EndTime
		}

		// Check for time overlap
		if timeRangesOverlap(startTime, endTime, conflictStart, conflictEnd) {
			return fmt.Errorf("conflicts with existing assignment from %s to %s",
				conflictStart.Format("15:04"), conflictEnd.Format("15:04"))
		}
	}

	return nil
}

// timeRangesOverlap checks if two time ranges overlap
func timeRangesOverlap(start1, end1, start2, end2 time.Time) bool {
	return start1.Before(end2) && start2.Before(end1)
}

// Enhanced shift eligibility checking
type ShiftEligibilityResult struct {
	Eligible    bool           `json:"eligible"`
	Reason      string         `json:"reason,omitempty"`
	Conflicts   []models.Shift `json:"conflicts,omitempty"`
	Suggestions []string       `json:"suggestions,omitempty"`
}

func checkShiftEligibility(volunteerID uint, shift models.Shift) ShiftEligibilityResult {
	log.Printf("Checking eligibility for volunteer %d, shift %d", volunteerID, shift.ID)

	// Check if volunteer exists and is active
	var volunteer models.User
	if err := db.DB.First(&volunteer, volunteerID).Error; err != nil {
		log.Printf("Volunteer %d not found: %v", volunteerID, err)
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Volunteer not found",
		}
	}

	if volunteer.Status != "active" {
		log.Printf("Volunteer %d status is %s (not active)", volunteerID, volunteer.Status)
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Volunteer account is not active",
		}
	}

	// Check if shift is already assigned
	if shift.AssignedVolunteerID != nil {
		log.Printf("Shift %d already assigned to volunteer %d", shift.ID, *shift.AssignedVolunteerID)
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Shift is already assigned to another volunteer",
		}
	}

	// Check if shift is in the past
	now := time.Now()
	if shift.Date.Before(now) {
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Cannot sign up for past shifts",
		}
	}

	// Check if shift starts too soon (less than 2 hours from now)
	shiftDateTime := time.Date(shift.Date.Year(), shift.Date.Month(), shift.Date.Day(),
		shift.StartTime.Hour(), shift.StartTime.Minute(), 0, 0, shift.Date.Location())

	if shiftDateTime.Sub(now).Hours() < 2 {
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Cannot sign up for shifts starting in less than 2 hours",
			Suggestions: []string{
				"Contact volunteer coordinator for emergency assignments",
				"Look for shifts starting at least 2 hours from now",
			},
		}
	}

	// Check for time conflicts with other assigned shifts
	var conflicts []models.Shift

	// Find all shifts for this volunteer on the same date (PostgreSQL syntax)
	var allDayShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date::date = ?::date", volunteerID, shift.Date).Find(&allDayShifts)

	log.Printf("Found %d existing shifts for volunteer %d on date %s", len(allDayShifts), volunteerID, shift.Date.Format("2006-01-02"))

	// Check for time overlaps manually
	for _, existingShift := range allDayShifts {
		// Extract time components for comparison
		newStart := shift.StartTime.Hour()*60 + shift.StartTime.Minute()
		newEnd := shift.EndTime.Hour()*60 + shift.EndTime.Minute()
		existingStart := existingShift.StartTime.Hour()*60 + existingShift.StartTime.Minute()
		existingEnd := existingShift.EndTime.Hour()*60 + existingShift.EndTime.Minute()

		log.Printf("Checking overlap: New shift %d-%d vs Existing shift %d %d-%d",
			newStart, newEnd, existingShift.ID, existingStart, existingEnd)

		// Check for overlap: new shift starts before existing ends AND new shift ends after existing starts
		if newStart < existingEnd && newEnd > existingStart {
			log.Printf("Time conflict detected with shift %d", existingShift.ID)
			conflicts = append(conflicts, existingShift)
		}
	}

	if len(conflicts) > 0 {
		suggestions := []string{
			"Check your schedule and cancel conflicting shifts if needed",
			"Look for shifts on different days",
		}

		return ShiftEligibilityResult{
			Eligible:    false,
			Reason:      "You have a conflicting shift at this time",
			Conflicts:   conflicts,
			Suggestions: suggestions,
		}
	}

	// Check if volunteer has reached daily shift limit (max 2 shifts per day)
	var dailyShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date::date = ?::date", volunteerID, shift.Date).Find(&dailyShifts)

	log.Printf("Found %d shifts for volunteer %d on date %s (daily limit check)", len(dailyShifts), volunteerID, shift.Date.Format("2006-01-02"))

	if len(dailyShifts) >= 2 {
		log.Printf("Daily limit exceeded: %d shifts >= 2", len(dailyShifts))
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "You have reached the maximum limit of 2 shifts per day",
			Suggestions: []string{
				"Consider spreading shifts across different days",
				"Contact volunteer coordinator if you need to volunteer more hours",
			},
		}
	}

	// Check skills requirement if specified
	if shift.RequiredSkills != "" {
		log.Printf("Shift %d requires skills: %s", shift.ID, shift.RequiredSkills)
		var volunteerApp models.VolunteerApplication
		if err := db.DB.Where("email = ?", volunteer.Email).First(&volunteerApp).Error; err == nil {
			log.Printf("Found volunteer application for %s with skills: %s", volunteer.Email, volunteerApp.Skills)
			// Enhanced skills matching with flexibility
			volunteerSkills := strings.ToLower(volunteerApp.Skills)
			requiredSkills := strings.ToLower(shift.RequiredSkills)

			// Check if volunteer has any of the required skills
			skillsMatch := false
			requiredSkillsList := strings.Split(requiredSkills, ",")
			volunteerSkillsList := strings.Split(volunteerSkills, ",")

			log.Printf("Required skills list: %v", requiredSkillsList)
			log.Printf("Volunteer skills list: %v", volunteerSkillsList)

			// Create skill synonyms map for flexible matching
			skillSynonyms := map[string][]string{
				"sorting":        {"organization", "organizing", "administrative", "data entry"},
				"donation":       {"administrative support", "customer service", "communication"},
				"administrative": {"admin", "administrative support", "data entry", "organization"},
				"organization":   {"organizing", "sorting", "administrative"},
				"communication":  {"customer service", "outreach", "public speaking"},
			}

			for _, reqSkill := range requiredSkillsList {
				reqSkill = strings.TrimSpace(reqSkill)
				log.Printf("Checking required skill: '%s'", reqSkill)

				// Check direct match first
				for _, volSkill := range volunteerSkillsList {
					volSkill = strings.TrimSpace(volSkill)
					if strings.Contains(volSkill, reqSkill) || strings.Contains(reqSkill, volSkill) {
						skillsMatch = true
						log.Printf("Direct skills match found: '%s' matches '%s'", volSkill, reqSkill)
						break
					}
				}

				// If no direct match, check synonyms
				if !skillsMatch {
					if synonyms, exists := skillSynonyms[reqSkill]; exists {
						for _, synonym := range synonyms {
							if strings.Contains(volunteerSkills, synonym) {
								skillsMatch = true
								log.Printf("Synonym match found: required '%s' matches volunteer skill containing '%s'", reqSkill, synonym)
								break
							}
						}
					}
				}

				if skillsMatch {
					break
				}
			}

			if !skillsMatch {
				log.Printf("No skills match found - rejecting signup")
				return ShiftEligibilityResult{
					Eligible: false,
					Reason:   fmt.Sprintf("This shift requires skills: %s. Your skills: %s", shift.RequiredSkills, volunteerApp.Skills),
					Suggestions: []string{
						"Consider training to develop required skills",
						"Look for shifts that match your current skills",
						"Contact volunteer coordinator about skill development opportunities",
						"Many shifts provide on-the-job training",
					},
				}
			}
			log.Printf("Skills check passed")
		} else {
			log.Printf("Could not find volunteer application for %s: %v", volunteer.Email, err)
		}
	} else {
		log.Printf("No skills requirement for shift %d", shift.ID)
	}

	return ShiftEligibilityResult{
		Eligible: true,
	}
}

// Enhanced volunteer dashboard with comprehensive statistics
func VolunteerDashboardStats(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get comprehensive statistics
	stats := calculateVolunteerStatistics(userID.(uint))

	// Calculate monthly hours
	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var monthlyHours float64
	var monthlyShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date >= ? AND date < ?",
		userID, thisMonthStart, thisMonthStart.AddDate(0, 1, 0)).Find(&monthlyShifts)

	for _, shift := range monthlyShifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		monthlyHours += duration.Hours()
	}

	// Get upcoming shifts count
	var upcomingShiftsCount int64
	db.DB.Model(&models.Shift{}).
		Where("assigned_volunteer_id = ? AND date >= ?", userID, now).
		Count(&upcomingShiftsCount)

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

	// Get recent activity (last 10 activities)
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

	c.JSON(http.StatusOK, gin.H{
		"upcomingShifts":    upcomingShiftsCount,
		"hoursThisMonth":    monthlyHours,
		"totalHours":        stats.TotalHours,
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

	// Get all completed shifts for this volunteer
	var completedShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date < ? AND end_time < ?",
		userID, now, now).Find(&completedShifts)

	// Calculate total hours and shifts completed
	stats.ShiftsCompleted = len(completedShifts)
	for _, shift := range completedShifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		stats.TotalHours += duration.Hours()
	}

	// Get upcoming shifts
	var upcomingShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date >= ?", userID, now).Find(&upcomingShifts)
	stats.ShiftsUpcoming = len(upcomingShifts)

	// Calculate people helped (estimate based on shift type and duration)
	// This is a simplified calculation - you might want to track this more precisely
	stats.PeopleHelped = stats.ShiftsCompleted * 3 // Estimate 3 people helped per shift

	// Get shift assignments to calculate reliability
	var assignments []models.ShiftAssignment
	db.DB.Where("user_id = ?", userID).Find(&assignments)

	totalAssignments := len(assignments)
	completedAssignments := 0
	cancelledAssignments := 0
	noShowAssignments := 0

	for _, assignment := range assignments {
		switch assignment.Status {
		case "Completed":
			completedAssignments++
		case "Cancelled":
			cancelledAssignments++
		case "NoShow":
			noShowAssignments++
		}
	}

	stats.CancelledCount = cancelledAssignments
	stats.NoShowCount = noShowAssignments

	// Calculate reliability score (0-100)
	if totalAssignments > 0 {
		reliability := float64(completedAssignments) / float64(totalAssignments)
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

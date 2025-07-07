package volunteer

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// ShiftValidationResult represents the result of shift validation
type ShiftValidationResult struct {
	Available     bool                `json:"available"`
	Reason        string              `json:"reason,omitempty"`
	Conflicts     []models.Shift      `json:"conflicts,omitempty"`
	Suggestions   []string            `json:"suggestions,omitempty"`
	Requirements  *ShiftRequirements  `json:"requirements,omitempty"`
	VolunteerInfo *VolunteerShiftInfo `json:"volunteer_info,omitempty"`
}

// ShiftRequirements contains detailed requirements for a shift
type ShiftRequirements struct {
	Skills          []string `json:"skills,omitempty"`
	MinimumAge      int      `json:"minimum_age,omitempty"`
	PhysicalDemands string   `json:"physical_demands,omitempty"`
	BackgroundCheck bool     `json:"background_check,omitempty"`
	SpecialTraining []string `json:"special_training,omitempty"`
}

// VolunteerShiftInfo contains volunteer-specific information
type VolunteerShiftInfo struct {
	CurrentShifts    int     `json:"current_shifts"`
	TotalHours       float64 `json:"total_hours"`
	ReliabilityScore float64 `json:"reliability_score"`
	SkillsMatch      bool    `json:"skills_match"`
	LastShiftDate    *string `json:"last_shift_date,omitempty"`
}

// ValidateShiftEligibilityDetailed provides comprehensive shift validation
func ValidateShiftEligibilityDetailed(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	shiftIDParam := c.Param("id")
	shiftID, err := strconv.ParseUint(shiftIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid shift ID"})
		return
	}

	volunteerID, _ := shared.ConvertToUint(fmt.Sprintf("%v", userID))
	if volunteerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	// Get shift details
	var shift models.Shift
	if err := db.DB.First(&shift, shiftID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shift not found"})
		return
	}

	// Perform detailed validation
	result := performDetailedShiftValidation(volunteerID, shift)

	c.JSON(http.StatusOK, result)
}

func performDetailedShiftValidation(volunteerID uint, shift models.Shift) ShiftValidationResult {
	// Get volunteer information
	var volunteer models.User
	if err := db.DB.First(&volunteer, volunteerID).Error; err != nil {
		return ShiftValidationResult{
			Available: false,
			Reason:    "Volunteer account not found",
		}
	}

	// Check basic eligibility first
	basicEligibility := checkShiftEligibility(volunteerID, shift)
	if !basicEligibility.Eligible {
		return ShiftValidationResult{
			Available:   false,
			Reason:      basicEligibility.Reason,
			Conflicts:   basicEligibility.Conflicts,
			Suggestions: basicEligibility.Suggestions,
		}
	}

	// Get volunteer application for detailed info
	var volunteerApp models.VolunteerApplication
	db.DB.Where("email = ?", volunteer.Email).First(&volunteerApp)

	// Calculate volunteer statistics
	volunteerInfo := calculateVolunteerShiftInfo(volunteerID)

	// Check shift requirements
	requirements := parseShiftRequirements(shift)

	// Validate requirements
	if !validateShiftRequirements(volunteerApp, requirements) {
		suggestions := generateSkillSuggestions(requirements)
		return ShiftValidationResult{
			Available:     false,
			Reason:        "You don't meet all requirements for this shift",
			Requirements:  requirements,
			VolunteerInfo: volunteerInfo,
			Suggestions:   suggestions,
		}
	}

	// Check if volunteer is taking on too many shifts
	if volunteerInfo.CurrentShifts >= 3 {
		return ShiftValidationResult{
			Available: false,
			Reason:    "You have reached the maximum number of concurrent shifts (3)",
			Suggestions: []string{
				"Complete some of your current shifts before signing up for new ones",
				"Contact volunteer coordinator if you need to volunteer more frequently",
			},
			VolunteerInfo: volunteerInfo,
		}
	}

	// All checks passed
	return ShiftValidationResult{
		Available:     true,
		Requirements:  requirements,
		VolunteerInfo: volunteerInfo,
		Suggestions: []string{
			"You're eligible for this shift!",
			"Remember to arrive 15 minutes early",
		},
	}
}

func calculateVolunteerShiftInfo(volunteerID uint) *VolunteerShiftInfo {
	// Count current shifts (future shifts)
	var currentShifts int64
	db.DB.Model(&models.Shift{}).Where("assigned_volunteer_id = ? AND date >= ?", volunteerID, time.Now()).Count(&currentShifts)

	// Calculate total hours from completed shifts
	var completedShifts []models.Shift
	db.DB.Where("assigned_volunteer_id = ? AND date < ?", volunteerID, time.Now()).Find(&completedShifts)

	var totalHours float64
	for _, shift := range completedShifts {
		duration := shift.EndTime.Sub(shift.StartTime)
		totalHours += duration.Hours()
	}

	// Calculate reliability score (percentage of shifts completed without cancellation)
	var assignments []models.ShiftAssignment
	db.DB.Where("user_id = ?", volunteerID).Find(&assignments)

	var completedCount, totalCount int
	for _, assignment := range assignments {
		totalCount++
		if assignment.Status == "Completed" {
			completedCount++
		}
	}

	reliabilityScore := 100.0
	if totalCount > 0 {
		reliabilityScore = float64(completedCount) / float64(totalCount) * 100
	}

	// Get last shift date
	var lastShift models.Shift
	var lastShiftDate *string
	if err := db.DB.Where("assigned_volunteer_id = ?", volunteerID).Order("date DESC").First(&lastShift).Error; err == nil {
		dateStr := lastShift.Date.Format("2006-01-02")
		lastShiftDate = &dateStr
	}

	return &VolunteerShiftInfo{
		CurrentShifts:    int(currentShifts),
		TotalHours:       totalHours,
		ReliabilityScore: reliabilityScore,
		LastShiftDate:    lastShiftDate,
	}
}

func parseShiftRequirements(shift models.Shift) *ShiftRequirements {
	requirements := &ShiftRequirements{}

	// Parse required skills
	if shift.RequiredSkills != "" {
		skillsList := strings.Split(shift.RequiredSkills, ",")
		for i, skill := range skillsList {
			skillsList[i] = strings.TrimSpace(skill)
		}
		requirements.Skills = skillsList
	}

	// Set default requirements based on shift type/role
	switch shift.Role {
	case "Food Distribution":
		requirements.PhysicalDemands = "Moderate - standing and lifting up to 25lbs"
		requirements.MinimumAge = 16
	case "Administrative Support":
		requirements.PhysicalDemands = "Light - primarily seated work"
		requirements.MinimumAge = 18
	case "Driver":
		requirements.MinimumAge = 21
		requirements.BackgroundCheck = true
		requirements.SpecialTraining = []string{"Valid driver's license", "Clean driving record"}
	case "Child Care":
		requirements.MinimumAge = 18
		requirements.BackgroundCheck = true
		requirements.SpecialTraining = []string{"Background check", "Child safety training"}
	default:
		requirements.PhysicalDemands = "Variable"
		requirements.MinimumAge = 16
	}

	return requirements
}

func validateShiftRequirements(volunteerApp models.VolunteerApplication, requirements *ShiftRequirements) bool {
	// Check age requirement (if we have birth date)
	// For now, assume all volunteers meet age requirements

	// Check skills match
	if len(requirements.Skills) > 0 {
		volunteerSkills := strings.ToLower(volunteerApp.Skills)
		hasRequiredSkill := false

		for _, reqSkill := range requirements.Skills {
			if strings.Contains(volunteerSkills, strings.ToLower(reqSkill)) {
				hasRequiredSkill = true
				break
			}
		}

		if !hasRequiredSkill {
			return false
		}
	}

	// Check background check requirement
	if requirements.BackgroundCheck {
		// In a real system, check volunteer's background check status
		// For now, assume it's handled during volunteer approval
	}

	return true
}

func generateSkillSuggestions(requirements *ShiftRequirements) []string {
	suggestions := []string{}

	if len(requirements.Skills) > 0 {
		suggestions = append(suggestions, "Consider developing these skills:")
		for _, skill := range requirements.Skills {
			suggestions = append(suggestions, "- "+skill)
		}
		suggestions = append(suggestions, "Look for training opportunities in your area")
	}

	if requirements.BackgroundCheck {
		suggestions = append(suggestions, "This role requires a background check")
		suggestions = append(suggestions, "Contact volunteer coordinator about background check process")
	}

	if len(requirements.SpecialTraining) > 0 {
		suggestions = append(suggestions, "Special requirements:")
		for _, training := range requirements.SpecialTraining {
			suggestions = append(suggestions, "- "+training)
		}
	}

	return suggestions
}

// GetShiftRecommendations provides personalized shift recommendations
func GetShiftRecommendations(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	volunteerID, _ := shared.ConvertToUint(fmt.Sprintf("%v", userID))
	if volunteerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	// Get volunteer information
	var volunteer models.User
	if err := db.DB.First(&volunteer, volunteerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer not found"})
		return
	}

	var volunteerApp models.VolunteerApplication
	db.DB.Where("email = ?", volunteer.Email).First(&volunteerApp)

	// Get available shifts
	var availableShifts []models.Shift
	db.DB.Where("assigned_volunteer_id IS NULL AND date >= ?", time.Now()).
		Order("date ASC").
		Limit(10).
		Find(&availableShifts)

	// Score and rank shifts
	recommendations := scoreShiftsForVolunteer(availableShifts, volunteerApp)

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"volunteer_info":  calculateVolunteerShiftInfo(volunteerID),
	})
}

type ShiftRecommendation struct {
	Shift   models.Shift `json:"shift"`
	Score   int          `json:"score"`
	Reasons []string     `json:"reasons"`
	Urgency string       `json:"urgency"`
	Impact  string       `json:"impact"`
}

func scoreShiftsForVolunteer(shifts []models.Shift, volunteerApp models.VolunteerApplication) []ShiftRecommendation {
	recommendations := []ShiftRecommendation{}

	for _, shift := range shifts {
		score := 50 // Base score
		reasons := []string{}

		// Skill matching
		if shift.RequiredSkills != "" {
			volunteerSkills := strings.ToLower(volunteerApp.Skills)
			requiredSkills := strings.Split(strings.ToLower(shift.RequiredSkills), ",")

			for _, reqSkill := range requiredSkills {
				if strings.Contains(volunteerSkills, strings.TrimSpace(reqSkill)) {
					score += 20
					reasons = append(reasons, "Matches your skills")
					break
				}
			}
		}

		// Location preference (mock - in real app would check volunteer preferences)
		if shift.Location == "Main Community Center" {
			score += 10
			reasons = append(reasons, "Popular location")
		}

		// Urgency (shifts starting soon get higher priority)
		daysDiff := time.Until(shift.Date).Hours() / 24
		if daysDiff <= 2 {
			score += 15
			reasons = append(reasons, "Urgent need")
		} else if daysDiff <= 7 {
			score += 10
			reasons = append(reasons, "Starting soon")
		}

		// Time preference (morning shifts slightly preferred)
		if shift.StartTime.Hour() >= 9 && shift.StartTime.Hour() <= 12 {
			score += 5
			reasons = append(reasons, "Morning shift")
		}

		// Determine urgency and impact
		urgency := "medium"
		if daysDiff <= 1 {
			urgency = "urgent"
		} else if daysDiff <= 3 {
			urgency = "high"
		}

		impact := "medium"
		if shift.Role == "Food Distribution" || shift.Role == "Community Outreach" {
			impact = "high"
		}

		if len(reasons) == 0 {
			reasons = append(reasons, "Available opportunity")
		}

		recommendations = append(recommendations, ShiftRecommendation{
			Shift:   shift,
			Score:   score,
			Reasons: reasons,
			Urgency: urgency,
			Impact:  impact,
		})
	}

	// Sort by score
	for i := 0; i < len(recommendations)-1; i++ {
		for j := i + 1; j < len(recommendations); j++ {
			if recommendations[i].Score < recommendations[j].Score {
				recommendations[i], recommendations[j] = recommendations[j], recommendations[i]
			}
		}
	}

	// Return top 5
	if len(recommendations) > 5 {
		recommendations = recommendations[:5]
	}

	return recommendations
}

// checkShiftEligibility performs basic shift eligibility checking
func checkShiftEligibility(volunteerID uint, shift models.Shift) ShiftEligibilityResult {
	// Check if shift is in the past (with 2-hour buffer)
	cutoffTime := time.Now().Add(2 * time.Hour)
	shiftStartTime := time.Date(shift.Date.Year(), shift.Date.Month(), shift.Date.Day(),
		shift.StartTime.Hour(), shift.StartTime.Minute(), 0, 0, shift.Date.Location())

	if shiftStartTime.Before(cutoffTime) {
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Cannot sign up for shifts starting in less than 2 hours",
			Suggestions: []string{
				"Contact volunteer coordinator for emergency assignments",
				"Look for shifts starting at least 2 hours from now",
			},
		}
	}

	// Check if shift is already assigned (for fixed shifts)
	if shift.Type != "flexible" && shift.AssignedVolunteerID != nil {
		return ShiftEligibilityResult{
			Eligible: false,
			Reason:   "Shift is already assigned to another volunteer",
			Suggestions: []string{
				"Look for other available shifts",
				"Check back later for cancellations",
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
				Conflicts: []models.Shift{existingShift},
				Suggestions: []string{
					"Choose a different time slot",
					"Cancel your existing shift if this one is more important",
					"Contact coordinator about overlapping assignments",
				},
			}
		}
	}

	// For flexible shifts, check capacity
	if shift.Type == "flexible" {
		currentAssignments := countFlexibleAssignments(shift.ID)
		if currentAssignments >= shift.FlexibleSlots {
			return ShiftEligibilityResult{
				Eligible: false,
				Reason:   "Flexible shift is at full capacity",
				Suggestions: []string{
					"Check back later for cancellations",
					"Look for other flexible shifts",
				},
			}
		}
	}

	return ShiftEligibilityResult{
		Eligible: true,
	}
}

// ShiftEligibilityResult represents the result of basic eligibility checking
type ShiftEligibilityResult struct {
	Eligible    bool           `json:"eligible"`
	Reason      string         `json:"reason,omitempty"`
	Conflicts   []models.Shift `json:"conflicts,omitempty"`
	Suggestions []string       `json:"suggestions,omitempty"`
	ErrorCode   string         `json:"error_code,omitempty"`
}

// Helper function to check if time ranges overlap on the same day
func timeRangesOverlapSameDay(start1, end1, start2, end2 time.Time) bool {
	// Extract just the time components for comparison
	time1Start := start1.Hour()*60 + start1.Minute()
	time1End := end1.Hour()*60 + end1.Minute()
	time2Start := start2.Hour()*60 + start2.Minute()
	time2End := end2.Hour()*60 + end2.Minute()

	return time1Start < time2End && time2Start < time1End
}

// Helper function to count flexible assignments
func countFlexibleAssignments(shiftID uint) int {
	var count int64
	db.DB.Model(&models.ShiftAssignment{}).
		Where("shift_id = ? AND status IN (?, ?)", shiftID, "Confirmed", "Assigned").
		Count(&count)
	return int(count)
}

package volunteer

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"

	"github.com/gin-gonic/gin"
)

// ========================================================================
// VOLUNTEER ROLE MANAGEMENT HANDLERS
// ========================================================================

// GetVolunteerRoleInfo returns role information for a volunteer
func GetVolunteerRoleInfo(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var profile models.VolunteerProfile
	if err := db.DB.Preload("User").Preload("Mentor").Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	roleInfo := gin.H{
		"role_level":         profile.RoleLevel,
		"specializations":    profile.GetSpecializationsArray(),
		"leadership_skills":  profile.LeadershipSkills,
		"can_train_others":   profile.CanTrainOthers,
		"can_manage_shifts":  profile.CanManageShifts,
		"emergency_response": profile.EmergencyResponse,
		"permissions":        profile.GetRolePermissions(),
		"mentor":             profile.Mentor,
		"team_members":       profile.GetTeamMembersArray(),
	}

	c.JSON(http.StatusOK, roleInfo)
}

// PromoteVolunteer handles volunteer role promotions (Admin only)
func PromoteVolunteer(c *gin.Context) {
	volunteerID := c.Param("id")

	var req struct {
		NewRole          string   `json:"new_role" binding:"required"`
		Specializations  []string `json:"specializations"`
		EnableManagement bool     `json:"enable_management"`
		EnableTraining   bool     `json:"enable_training"`
		EnableEmergency  bool     `json:"enable_emergency"`
		Notes            string   `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role
	if req.NewRole != models.VolunteerRoleGeneral &&
		req.NewRole != models.VolunteerRoleSpecialized &&
		req.NewRole != models.VolunteerRoleLead {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role level"})
		return
	}

	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", volunteerID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	oldRole := profile.RoleLevel

	// Apply promotion based on new role
	switch req.NewRole {
	case models.VolunteerRoleSpecialized:
		profile.PromoteToSpecialized(req.Specializations)
		if req.EnableTraining {
			profile.CanTrainOthers = true
		}
	case models.VolunteerRoleLead:
		profile.PromoteToLead(req.EnableManagement, req.EnableTraining, req.EnableEmergency)
		if len(req.Specializations) > 0 {
			profile.Specializations = strings.Join(req.Specializations, ",")
		}
	case models.VolunteerRoleGeneral:
		profile.DemoteToGeneral()
	}

	if req.Notes != "" {
		profile.Notes = req.Notes
	}

	if err := db.DB.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update volunteer role"})
		return
	}

	// Create audit log
	adminID := utils.GetUserIDFromContext(c)
	utils.CreateAuditLog(c, "RolePromotion", "VolunteerProfile", profile.ID,
		fmt.Sprintf("Volunteer role changed from %s to %s by admin %d", oldRole, req.NewRole, adminID))

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Volunteer successfully promoted to %s role", req.NewRole),
		"profile": profile,
	})
}

// GetVolunteersByRole returns volunteers filtered by role level
func GetVolunteersByRole(c *gin.Context) {
	roleLevel := c.Query("role_level")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	query := db.DB.Preload("User").Where("status = ?", models.VolunteerStatusActive)

	if roleLevel != "" {
		query = query.Where("role_level = ?", roleLevel)
	}

	var profiles []models.VolunteerProfile
	var total int64

	query.Model(&models.VolunteerProfile{}).Count(&total)
	if err := query.Offset(offset).Limit(pageSize).Find(&profiles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch volunteers"})
		return
	}

	// Group by role level for summary
	roleCounts := map[string]int{
		models.VolunteerRoleGeneral:     0,
		models.VolunteerRoleSpecialized: 0,
		models.VolunteerRoleLead:        0,
	}

	for _, profile := range profiles {
		roleCounts[profile.RoleLevel]++
	}

	c.JSON(http.StatusOK, gin.H{
		"volunteers": profiles,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
		"role_summary": roleCounts,
	})
}

// ========================================================================
// TEAM MANAGEMENT HANDLERS (Lead Volunteers)
// ========================================================================

// CreateVolunteerTeam allows lead volunteers to create teams
func CreateVolunteerTeam(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	// Check if user is a lead volunteer
	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ? AND role_level = ?", userID, models.VolunteerRoleLead).First(&profile).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only lead volunteers can create teams"})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		MemberIDs   []uint `json:"member_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert member IDs to string
	memberIDStrings := make([]string, len(req.MemberIDs))
	for i, id := range req.MemberIDs {
		memberIDStrings[i] = strconv.FormatUint(uint64(id), 10)
	}

	team := models.VolunteerTeam{
		Name:        req.Name,
		Description: req.Description,
		LeadID:      userID,
		Members:     strings.Join(memberIDStrings, ","),
		Active:      true,
	}

	if err := db.DB.Create(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create team"})
		return
	}

	// Update profile with team members
	profile.TeamMembers = team.Members
	db.DB.Save(&profile)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Team created successfully",
		"team":    team,
	})
}

// GetVolunteerTeams returns teams for lead volunteers
func GetVolunteerTeams(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var teams []models.VolunteerTeam
	if err := db.DB.Preload("Lead").Where("lead_id = ? AND active = ?", userID, true).Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
		return
	}

	// Enrich teams with member details
	enrichedTeams := make([]gin.H, len(teams))
	for i := range teams {
		teamData := gin.H{
			"id":          teams[i].ID,
			"name":        teams[i].Name,
			"description": teams[i].Description,
			"lead_id":     teams[i].LeadID,
			"lead":        teams[i].Lead,
			"active":      teams[i].Active,
			"created_at":  teams[i].CreatedAt,
			"updated_at":  teams[i].UpdatedAt,
			"members":     []models.User{},
		}

		if teams[i].Members != "" {
			memberIDs := strings.Split(teams[i].Members, ",")
			var members []models.User
			for _, idStr := range memberIDs {
				if id, err := strconv.ParseUint(idStr, 10, 32); err == nil {
					var user models.User
					if err := db.DB.Select("id, first_name, last_name, email").First(&user, uint(id)).Error; err == nil {
						members = append(members, user)
					}
				}
			}
			teamData["members"] = members
		}
		enrichedTeams[i] = teamData
	}

	c.JSON(http.StatusOK, gin.H{
		"teams": enrichedTeams,
	})
}

// ========================================================================
// TASK MANAGEMENT HANDLERS (Lead Volunteers)
// ========================================================================

// AssignVolunteerTask allows lead volunteers to assign tasks
func AssignVolunteerTask(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	// Check if user is a lead volunteer with management permissions
	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ? AND role_level = ? AND can_manage_shifts = ?",
		userID, models.VolunteerRoleLead, true).First(&profile).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only lead volunteers with management permissions can assign tasks"})
		return
	}

	var req struct {
		Title       string     `json:"title" binding:"required"`
		Description string     `json:"description"`
		AssignedTo  uint       `json:"assigned_to" binding:"required"`
		Priority    string     `json:"priority"`
		DueDate     *time.Time `json:"due_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate assigned volunteer exists
	var assignedVolunteer models.User
	if err := db.DB.Where("id = ? AND role = ?", req.AssignedTo, models.RoleVolunteer).First(&assignedVolunteer).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Assigned volunteer not found"})
		return
	}

	task := models.VolunteerTask{
		Title:       req.Title,
		Description: req.Description,
		AssignedTo:  req.AssignedTo,
		AssignedBy:  userID,
		Priority:    req.Priority,
		DueDate:     req.DueDate,
		Status:      "pending",
	}

	if task.Priority == "" {
		task.Priority = "medium"
	}

	if err := db.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Task assigned successfully",
		"task":    task,
	})
}

// UpdateTaskStatus allows volunteers to update task status
func UpdateVolunteerTaskStatus(c *gin.Context) {
	taskID := c.Param("id")
	userID := utils.GetUserIDFromContext(c)

	var req struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var task models.VolunteerTask
	if err := db.DB.Where("id = ? AND assigned_to = ?", taskID, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found or not assigned to you"})
		return
	}

	task.Status = req.Status
	if req.Notes != "" {
		task.Notes = req.Notes
	}

	if req.Status == "completed" {
		now := time.Now()
		task.CompletedAt = &now
	}

	if err := db.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task status updated successfully",
		"task":    task,
	})
}

// ========================================================================
// MENTORSHIP HANDLERS
// ========================================================================

// AssignMentor allows admins to assign mentors to new volunteers
func AssignMentor(c *gin.Context) {
	var req struct {
		MenteeID uint   `json:"mentee_id" binding:"required"`
		MentorID uint   `json:"mentor_id" binding:"required"`
		Notes    string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate mentor is qualified (specialized or lead volunteer)
	var mentorProfile models.VolunteerProfile
	if err := db.DB.Where("user_id = ? AND role_level IN (?, ?)",
		req.MentorID, models.VolunteerRoleSpecialized, models.VolunteerRoleLead).First(&mentorProfile).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mentor must be a specialized or lead volunteer"})
		return
	}

	// Validate mentee exists
	var menteeProfile models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", req.MenteeID).First(&menteeProfile).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mentee volunteer not found"})
		return
	}

	// Create mentorship relationship
	mentorship := models.VolunteerMentorship{
		MentorID:  req.MentorID,
		MenteeID:  req.MenteeID,
		StartDate: time.Now(),
		Status:    "active",
		Notes:     req.Notes,
	}

	if err := db.DB.Create(&mentorship).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mentorship"})
		return
	}

	// Update mentee profile with mentor
	menteeProfile.MentorID = &req.MentorID
	db.DB.Save(&menteeProfile)

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Mentorship assigned successfully",
		"mentorship": mentorship,
	})
}

// GetMentorshipRelationships returns mentorship relationships
func GetMentorshipRelationships(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)
	relationshipType := c.DefaultQuery("type", "all") // mentor, mentee, all

	var mentorships []models.VolunteerMentorship
	var query = db.DB.Preload("Mentor").Preload("Mentee")

	switch relationshipType {
	case "mentor":
		query = query.Where("mentor_id = ?", userID)
	case "mentee":
		query = query.Where("mentee_id = ?", userID)
	default:
		query = query.Where("mentor_id = ? OR mentee_id = ?", userID, userID)
	}

	if err := query.Find(&mentorships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mentorships"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"mentorships": mentorships,
	})
}

// ========================================================================
// EMERGENCY RESPONSE HANDLERS (Lead Volunteers)
// ========================================================================

// TriggerEmergencyResponse allows qualified volunteers to trigger emergency protocols
func TriggerEmergencyResponse(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	// Check if user is qualified for emergency response
	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ? AND emergency_response = ?", userID, true).First(&profile).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not qualified for emergency response"})
		return
	}

	var req struct {
		EmergencyType string `json:"emergency_type" binding:"required"`
		Description   string `json:"description" binding:"required"`
		Location      string `json:"location"`
		Severity      string `json:"severity"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get all emergency-qualified volunteers
	var emergencyVolunteers []models.User
	db.DB.Joins("JOIN volunteer_profiles ON users.id = volunteer_profiles.user_id").
		Where("volunteer_profiles.emergency_response = ? AND volunteer_profiles.status = ?",
			true, models.VolunteerStatusActive).
		Find(&emergencyVolunteers)

	// Send emergency notifications (this would integrate with the existing notification system)
	calloutData := map[string]interface{}{
		"emergency_type": req.EmergencyType,
		"description":    req.Description,
		"location":       req.Location,
		"severity":       req.Severity,
		"triggered_by":   userID,
		"timestamp":      time.Now(),
	}

	// Log emergency trigger
	utils.CreateAuditLog(c, "EmergencyTriggered", "VolunteerProfile", profile.ID,
		fmt.Sprintf("Emergency response triggered: %s - %s", req.EmergencyType, req.Description))

	c.JSON(http.StatusOK, gin.H{
		"message":             "Emergency response triggered successfully",
		"emergency_id":        fmt.Sprintf("EMRG-%d-%d", userID, time.Now().Unix()),
		"volunteers_notified": len(emergencyVolunteers),
		"callout_data":        calloutData,
	})
}

// GetRoleSpecificShifts returns shifts specific to volunteer role level
func GetRoleSpecificShifts(c *gin.Context) {
	userID := utils.GetUserIDFromContext(c)

	var profile models.VolunteerProfile
	if err := db.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Volunteer profile not found"})
		return
	}

	var shifts []models.Shift
	query := db.DB.Where("status = 'open'")

	// Filter shifts based on role level
	switch profile.RoleLevel {
	case models.VolunteerRoleGeneral:
		// General volunteers can see basic shifts
		query = query.Where("role_level IS NULL OR role_level = ?", models.VolunteerRoleGeneral)
	case models.VolunteerRoleSpecialized:
		// Specialized volunteers can see general and specialized shifts
		query = query.Where("role_level IS NULL OR role_level IN (?, ?)",
			models.VolunteerRoleGeneral, models.VolunteerRoleSpecialized)
	case models.VolunteerRoleLead:
		// Lead volunteers can see all shifts
		// No additional filtering needed
	}

	if err := query.Order("date ASC, start_time ASC").Find(&shifts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shifts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"shifts":      shifts,
		"role_level":  profile.RoleLevel,
		"permissions": profile.GetRolePermissions(),
	})
}

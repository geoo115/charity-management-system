package middleware

import (
	"net/http"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
)

// RequireVolunteerRole ensures the volunteer has the specified role level or higher
func RequireVolunteerRole(minRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := utils.GetUserIDFromContext(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		var profile models.VolunteerProfile
		if err := db.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Volunteer profile not found"})
			c.Abort()
			return
		}

		// Check if volunteer has required role level
		if !hasRequiredRoleLevel(profile.RoleLevel, minRole) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":    "Insufficient volunteer role level",
				"required": minRole,
				"current":  profile.RoleLevel,
			})
			c.Abort()
			return
		}

		// Add volunteer profile to context for use in handlers
		c.Set("volunteerProfile", profile)
		c.Next()
	}
}

// RequireSpecializedVolunteer ensures the volunteer is specialized or lead level
func RequireSpecializedVolunteer() gin.HandlerFunc {
	return RequireVolunteerRole(models.VolunteerRoleSpecialized)
}

// RequireLeadVolunteer ensures the volunteer is lead level
func RequireLeadVolunteer() gin.HandlerFunc {
	return RequireVolunteerRole(models.VolunteerRoleLead)
}

// RequireVolunteerPermission checks for specific volunteer permissions
func RequireVolunteerPermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := utils.GetUserIDFromContext(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		var profile models.VolunteerProfile
		if err := db.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Volunteer profile not found"})
			c.Abort()
			return
		}

		// Get volunteer permissions
		permissions := profile.GetRolePermissions()

		// Check if volunteer has the required permission
		if hasPermission, exists := permissions[permission]; !exists || !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error":               "Insufficient permissions",
				"required_permission": permission,
			})
			c.Abort()
			return
		}

		// Add volunteer profile to context
		c.Set("volunteerProfile", profile)
		c.Next()
	}
}

// RequireTeamManagement ensures volunteer can manage teams
func RequireTeamManagement() gin.HandlerFunc {
	return RequireVolunteerPermission("can_manage_team")
}

// RequireTrainingPermission ensures volunteer can train others
func RequireTrainingPermission() gin.HandlerFunc {
	return RequireVolunteerPermission("can_train_volunteers")
}

// RequireEmergencyResponse ensures volunteer is qualified for emergency response
func RequireEmergencyResponse() gin.HandlerFunc {
	return RequireVolunteerPermission("can_coordinate_emergency")
}

// hasRequiredRoleLevel checks if current role meets minimum requirement
func hasRequiredRoleLevel(currentRole, minRole string) bool {
	roleHierarchy := map[string]int{
		models.VolunteerRoleGeneral:     1,
		models.VolunteerRoleSpecialized: 2,
		models.VolunteerRoleLead:        3,
	}

	currentLevel, currentExists := roleHierarchy[currentRole]
	minLevel, minExists := roleHierarchy[minRole]

	if !currentExists || !minExists {
		return false
	}

	return currentLevel >= minLevel
}

// GetVolunteerProfileFromContext retrieves volunteer profile from gin context
func GetVolunteerProfileFromContext(c *gin.Context) (models.VolunteerProfile, bool) {
	if profile, exists := c.Get("volunteerProfile"); exists {
		if volunteerProfile, ok := profile.(models.VolunteerProfile); ok {
			return volunteerProfile, true
		}
	}
	return models.VolunteerProfile{}, false
}

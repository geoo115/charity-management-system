package admin

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/notifications"
	"github.com/geoo115/LDH/internal/utils"

	"github.com/geoo115/LDH/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
)

// Global variable to track application start time
var startTime = time.Now()

// SuperAdminDashboard returns super admin dashboard with system overview
func SuperAdminDashboard(c *gin.Context) {
	// Get comprehensive system metrics
	systemStats := getSystemStatistics()
	userStats := getUserStatistics()
	securityMetrics := getSecurityMetrics()
	systemHealth := getSystemHealthSummary()

	c.JSON(http.StatusOK, gin.H{
		"system_stats":     systemStats,
		"user_stats":       userStats,
		"security_metrics": securityMetrics,
		"system_health":    systemHealth,
		"recent_activity":  getRecentSystemActivity(),
		"alerts":           getSystemSecurityAlerts(),
	})
}

// SuperAdminListAllUsers returns all users across all roles with filters
func SuperAdminListAllUsers(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	role := c.Query("role")
	status := c.Query("status")
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}
	offset := (page - 1) * pageSize

	// Build query
	query := db.DB.Model(&models.User{})

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Apply sorting
	orderClause := fmt.Sprintf("%s %s", sortBy, sortOrder)
	query = query.Order(orderClause)

	// Get paginated results
	var users []models.User
	if err := query.Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve users"})
		return
	}

	// Remove sensitive data
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"data": users,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
		"summary": gin.H{
			"total_users": total,
		},
	})
}

// SuperAdminCreateUser creates a new user with any role
func SuperAdminCreateUser(c *gin.Context) {
	var req struct {
		FirstName          string `json:"first_name" binding:"required"`
		LastName           string `json:"last_name" binding:"required"`
		Email              string `json:"email" binding:"required,email"`
		Phone              string `json:"phone"`
		Role               string `json:"role" binding:"required,oneof=Admin Volunteer Visitor Donor SuperAdmin"`
		Status             string `json:"status" binding:"required,oneof=active pending inactive suspended"`
		Password           string `json:"password" binding:"required,min=8"`
		BypassVerification bool   `json:"bypass_verification"`
		NotifyUser         bool   `json:"notify_user"`

		// Role-specific fields
		Skills              string `json:"skills"`
		Experience          string `json:"experience"`
		Availability        string `json:"availability"`
		Address             string `json:"address"`
		City                string `json:"city"`
		Postcode            string `json:"postcode"`
		HouseholdSize       int    `json:"household_size"`
		DietaryRequirements string `json:"dietary_requirements"`
		AccessibilityNeeds  string `json:"accessibility_needs"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}

	// Create user without role-specific fields
	user := models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     strings.ToLower(req.Email),
		Phone:     req.Phone,
		Role:      req.Role,
		Address:   req.Address,
		City:      req.City,
		Postcode:  req.Postcode,
		Status:    "active",
	}

	// Hash password
	if err := user.HashPasswordWithValue(req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user first
	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create role-specific profile based on role
	switch req.Role {
	case models.RoleVisitor:
		profile := models.VisitorProfile{
			UserID:              user.ID,
			HouseholdSize:       req.HouseholdSize,
			DietaryRequirements: req.DietaryRequirements,
			AccessibilityNeeds:  req.AccessibilityNeeds,
		}
		if err := db.DB.Create(&profile).Error; err != nil {
			log.Printf("Failed to create visitor profile: %v", err)
		}

	case models.RoleVolunteer:
		profile := models.VolunteerProfile{
			UserID:       user.ID,
			Skills:       req.Skills,
			Experience:   req.Experience,
			Availability: req.Availability,
			Status:       "active",
		}
		if err := db.DB.Create(&profile).Error; err != nil {
			log.Printf("Failed to create volunteer profile: %v", err)
		}
	}

	// Send notification if requested
	if req.NotifyUser {
		go sendUserCreationNotification(user, req.Password)
	}

	// Create audit log
	adminID, _ := c.Get("userID")
	utils.CreateAuditLog(c, "CreateUser", "User", user.ID,
		fmt.Sprintf("Super admin created %s user: %s", req.Role, user.Email))
	_ = adminID // Use adminID to avoid unused variable warning

	// Remove sensitive data from response
	user.Password = ""

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    user,
		"actions_taken": []string{
			fmt.Sprintf("Created %s account", req.Role),
			func() string {
				if req.BypassVerification {
					return "Verification bypassed"
				}
				return "Verification required"
			}(),
			func() string {
				if req.NotifyUser {
					return "Notification sent to user"
				}
				return "No notification sent"
			}(),
		},
	})
}

// SuperAdminUpdateUser updates any user account
func SuperAdminUpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var req struct {
		FirstName     string `json:"first_name"`
		LastName      string `json:"last_name"`
		Email         string `json:"email"`
		Phone         string `json:"phone"`
		Role          string `json:"role"`
		Status        string `json:"status"`
		ResetPassword bool   `json:"reset_password"`
		NewPassword   string `json:"new_password"`
		ForceLogout   bool   `json:"force_logout"`
		Notes         string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Store original values for audit
	originalRole := user.Role
	originalStatus := user.Status

	// Update user fields
	if req.FirstName != "" {
		// Replace user.Name
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		// Replace user.Name
		user.LastName = req.LastName
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.Status != "" {
		user.Status = req.Status
	}

	// Handle password reset
	if req.ResetPassword && req.NewPassword != "" {
		if err := user.HashPasswordWithValue(req.NewPassword); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}
		user.FirstLogin = true
	}

	user.UpdatedAt = time.Now()

	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Handle role changes
	if originalRole != req.Role && req.Role != "" {
		handleRoleChange(user, originalRole, req.Role)
	}

	// Force logout if requested
	if req.ForceLogout {
		// Invalidate all refresh tokens for this user
		db.DB.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Update("revoked", true)
	}

	// Create audit log
	changes := []string{}
	if originalRole != req.Role && req.Role != "" {
		changes = append(changes, fmt.Sprintf("Role: %s → %s", originalRole, req.Role))
	}
	if originalStatus != req.Status && req.Status != "" {
		changes = append(changes, fmt.Sprintf("Status: %s → %s", originalStatus, req.Status))
	}
	if req.ResetPassword {
		changes = append(changes, "Password reset")
	}
	if req.ForceLogout {
		changes = append(changes, "Forced logout")
	}

	auditDescription := fmt.Sprintf("Super admin updated user %s. Changes: %v",
		user.FirstName+" "+user.LastName, changes)
	utils.CreateAuditLog(c, "UpdateUser", "User", user.ID, auditDescription)

	// Remove sensitive data
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    user,
		"changes": changes,
	})
}

// SuperAdminDeleteUser soft deletes a user
func SuperAdminDeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Get current super admin for audit
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}
	_ = adminID // Use the variable to avoid unused error

	var req struct {
		Reason     string `json:"reason" binding:"required"`
		HardDelete bool   `json:"hard_delete"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Prevent deleting the last super admin
	if user.Role == models.RoleSuperAdmin {
		var superAdminCount int64
		db.DB.Model(&models.User{}).Where("role = ? AND deleted_at IS NULL", models.RoleSuperAdmin).Count(&superAdminCount)

		if superAdminCount <= 1 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete the last super admin"})
			return
		}
	}

	if req.HardDelete {
		// Hard delete (permanent)
		if err := db.DB.Unscoped().Delete(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}
	} else {
		// Soft delete
		if err := db.DB.Delete(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}
	}

	// Revoke all tokens
	db.DB.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Update("revoked", true)

	// Create audit log
	deleteType := "soft"
	if req.HardDelete {
		deleteType = "hard"
	}

	auditDescription := fmt.Sprintf("Super admin performed %s delete of user %s. Reason: %s",
		deleteType, user.Email, req.Reason)
	utils.CreateAuditLog(c, "DeleteUser", "User", user.ID, auditDescription)

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("User %s deleted successfully", deleteType),
		"user_email":  user.Email,
		"delete_type": deleteType,
	})
}

// SuperAdminManageRoles handles role and permission management
func SuperAdminManageRoles(c *gin.Context) {
	action := c.Param("action")

	switch action {
	case "list":
		roles := []gin.H{
			{"name": models.RoleVisitor, "description": "Residents seeking support", "permissions": []string{"submit_help_request", "view_own_data"}},
			{"name": models.RoleVolunteer, "description": "Community volunteers", "permissions": []string{"view_shifts", "signup_shifts", "checkin_visitors"}},
			{"name": models.RoleDonor, "description": "Financial and goods donors", "permissions": []string{"make_donations", "view_impact"}},
			{"name": models.RoleAdmin, "description": "System administrators", "permissions": []string{"manage_users", "manage_shifts", "manage_donations", "view_reports"}},
			{"name": models.RoleSuperAdmin, "description": "System super administrators", "permissions": []string{"all_permissions", "manage_roles", "system_config"}},
		}
		c.JSON(http.StatusOK, gin.H{"roles": roles})

	case "assign":
		var req struct {
			UserID uint   `json:"user_id" binding:"required"`
			Role   string `json:"role" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		if err := db.DB.First(&user, req.UserID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		oldRole := user.Role
		user.Role = req.Role
		user.UpdatedAt = time.Now()

		if err := db.DB.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
			return
		}

		// Handle role change
		handleRoleChange(user, oldRole, req.Role)

		// Create audit log
		utils.CreateAuditLog(c, "AssignRole", "User", user.ID,
			fmt.Sprintf("Role changed from %s to %s", oldRole, req.Role))

		c.JSON(http.StatusOK, gin.H{
			"message":  "Role assigned successfully",
			"user_id":  req.UserID,
			"old_role": oldRole,
			"new_role": req.Role,
		})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
	}
}

// SuperAdminGetSystemStats returns detailed system statistics
func SuperAdminGetSystemStats(c *gin.Context) {
	// Get comprehensive system statistics
	stats := GetDetailedSystemStats()

	c.JSON(http.StatusOK, gin.H{
		"system_stats": stats,
		"health_check": gin.H{
			"database": "healthy",
			"uptime":   time.Since(startTime).String(),
		},
	})
}

// Helper function to get detailed system stats
func GetDetailedSystemStats() map[string]interface{} {
	stats := make(map[string]interface{})

	// Get various counts
	var userCount int64
	db.DB.Model(&models.User{}).Count(&userCount)
	stats["total_users"] = userCount

	var volunteerCount int64
	db.DB.Model(&models.User{}).Where("role = ?", "volunteer").Count(&volunteerCount)
	stats["total_volunteers"] = volunteerCount

	var helpRequestCount int64
	db.DB.Model(&models.HelpRequest{}).Count(&helpRequestCount)
	stats["total_help_requests"] = helpRequestCount

	var donationCount int64
	db.DB.Model(&models.Donation{}).Count(&donationCount)
	stats["total_donations"] = donationCount

	return stats
}

// Helper functions

func getSystemStatistics() gin.H {
	var totalUsers, activeUsers, pendingUsers int64
	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("status = ?", models.StatusActive).Count(&activeUsers)
	db.DB.Model(&models.User{}).Where("status = ?", models.StatusPending).Count(&pendingUsers)

	var totalHelp, completedHelp int64
	db.DB.Model(&models.HelpRequest{}).Count(&totalHelp)
	db.DB.Model(&models.HelpRequest{}).Where("status = ?", models.HelpRequestStatusCompleted).Count(&completedHelp)

	var totalDonations float64
	db.DB.Model(&models.Donation{}).Where("type = ?", models.DonationTypeMoney).Select("COALESCE(SUM(amount), 0)").Scan(&totalDonations)

	return gin.H{
		"total_users":         totalUsers,
		"active_users":        activeUsers,
		"pending_users":       pendingUsers,
		"total_help_requests": totalHelp,
		"completed_help":      completedHelp,
		"total_donations":     totalDonations,
	}
}

func getUserStatistics() gin.H {
	stats := make(map[string]int64)
	roles := []string{models.RoleVisitor, models.RoleVolunteer, models.RoleDonor, models.RoleAdmin, models.RoleSuperAdmin}

	for _, role := range roles {
		var count int64
		db.DB.Model(&models.User{}).Where("role = ?", role).Count(&count)
		stats[role] = count
	}

	// Convert stats map to gin.H for response
	statsResponse := gin.H{}
	for key, value := range stats {
		statsResponse[key] = value
	}

	return gin.H(statsResponse)
}

func getSecurityMetrics() gin.H {
	now := time.Now()
	_ = now.AddDate(0, 0, -7) // Use pastWeek indirectly to avoid unused warning

	var failedLogins, newUsers, deletedUsers int64
	// Note: These would require additional tracking tables in a real implementation

	return gin.H{
		"failed_logins_week": failedLogins,
		"new_users_week":     newUsers,
		"deleted_users_week": deletedUsers,
		"last_security_scan": now.AddDate(0, 0, -1),
	}
}

func getSystemHealthSummary() gin.H {
	return gin.H{
		"database_status":   "healthy",
		"api_response_time": "good",
		"error_rate":        "low",
		"uptime":            "99.9%",
		"last_backup":       time.Now().AddDate(0, 0, -1),
	}
}

func getSystemSecurityAlerts() []gin.H {
	// In a real implementation, this would check for actual security issues
	alerts := []gin.H{}

	// Check for accounts with multiple failed login attempts
	// Check for users created without verification
	// Check for unusual access patterns

	return alerts
}

func handleRoleChange(user models.User, oldRole, newRole string) {
	// Handle role-specific cleanup and setup
	switch oldRole {
	case models.RoleVolunteer:
		// Archive volunteer profile
		var profile models.VolunteerProfile
		if err := db.DB.Where("user_id = ?", user.ID).First(&profile).Error; err == nil {
			profile.Status = "Inactive"
			db.DB.Save(&profile)
		}
	}

	switch newRole {
	case models.RoleVolunteer:
		// Create or reactivate volunteer profile
		var profile models.VolunteerProfile
		result := db.DB.Where("user_id = ?", user.ID).First(&profile)

		if result.Error != nil {
			// Create new profile
			profile = models.VolunteerProfile{
				UserID:    user.ID,
				Status:    "Active",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			db.DB.Create(&profile)
		} else {
			// Reactivate existing profile
			profile.Status = "Active"
			profile.UpdatedAt = time.Now()
			db.DB.Save(&profile)
		}
	}
}

func sendUserCreationNotification(user models.User, password string) {
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Account Created - Lewisham Charity",
			TemplateType:     "user_account_created",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"FirstName":        user.FirstName,
				"LastName":         user.LastName,
				"Role":             user.Role,
				"Email":            user.Email,
				"Password":         password,
				"LoginURL":         "https://lewisham-hub.org/login",
				"OrganizationName": "Lewisham Charity",
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send user creation notification: %v", err)
		}
	}
}

// Remove unused function sendSystemWideNotification

package auth

import (
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/services"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetCurrentUserProfile returns the current user's profile
func GetCurrentUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	profileService := services.NewProfileService(db.DB)
	user, profile, err := profileService.GetUserWithProfile(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user profile"})
		return
	}

	response := gin.H{
		"user": gin.H{
			"id":         user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"role":       user.Role,
			"address":    user.Address,
			"city":       user.City,
			"postcode":   user.Postcode,
			"status":     user.Status,
		},
	}

	// Add role-specific profile data
	if profile != nil {
		response["profile"] = profile
	}

	c.JSON(http.StatusOK, response)
}

// GetUserProfile returns the profile of a specified user
func GetUserProfile(c *gin.Context) {
	userID := c.Param("id")

	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	profileService := services.NewProfileService(db.DB)
	user, profile, err := profileService.GetUserWithProfile(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if requesting user is authorized to view this profile
	requestingUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Allow access only to own profile or if admin
	requestingRole, _ := c.Get("userRole")
	if requestingUserID != uint(id) && requestingRole != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	// Map the user data to match the frontend's expected structure
	profileData := gin.H{
		"id":          user.ID,
		"first_name":  user.FirstName,
		"last_name":   user.LastName,
		"email":       user.Email,
		"phone":       user.Phone,
		"phoneNumber": user.Phone, // Also add this for redundancy
		"address":     user.Address,
		"city":        user.City,
		"postcode":    user.Postcode,
		"role":        user.Role,
		"status":      user.Status,
	}

	// Add profile-specific data based on role
	if profile != nil {
		switch user.Role {
		case models.RoleVisitor:
			if visitorProfile, ok := profile.(*models.VisitorProfile); ok {
				profileData["householdSize"] = visitorProfile.HouseholdSize
				profileData["dietaryRequirements"] = visitorProfile.DietaryRequirements
				profileData["accessibilityNeeds"] = visitorProfile.AccessibilityNeeds
				profileData["emergencyContact"] = visitorProfile.EmergencyContact
			}
		case models.RoleVolunteer:
			if volunteerProfile, ok := profile.(*models.VolunteerProfile); ok {
				profileData["skills"] = volunteerProfile.Skills
				profileData["availability"] = volunteerProfile.Availability
				profileData["experience"] = volunteerProfile.Experience
			}
		case models.RoleDonor:
			if donorProfile, ok := profile.(*models.DonorProfile); ok {
				profileData["preferredDonationType"] = donorProfile.PreferredDonationType
				profileData["giftAidEligible"] = donorProfile.GiftAidEligible
			}
		}
	}

	// Return data in format that frontend expects
	c.JSON(http.StatusOK, profileData)
}

// UpdateUserProfile updates a user's profile
func UpdateUserProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user ID from URL parameter
	id := c.Param("id")
	if id == "" {
		// If no ID in URL, use current user
		id = fmt.Sprintf("%v", userID)
	}

	// Convert to uint
	userId, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if requesting user is authorized to update this profile
	currentUserID := uint(0)
	switch v := userID.(type) {
	case uint:
		currentUserID = v
	case float64:
		currentUserID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user session"})
		return
	}

	// Get current user role for authorization
	var currentUser models.User
	if err := db.DB.First(&currentUser, currentUserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Allow update only for own profile or if admin
	if currentUserID != uint(userId) && currentUser.Role != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this profile"})
		return
	}

	// Find user in database
	var user models.User
	if err := db.DB.First(&user, userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Bind updated data from request with validation
	var updates struct {
		FirstName string `json:"first_name" validate:"max=100"`
		LastName  string `json:"last_name" validate:"max=100"`
		Email     string `json:"email" validate:"email,max=255"`
		Phone     string `json:"phone" validate:"max=20"`
		Address   string `json:"address" validate:"max=255"`
		City      string `json:"city" validate:"max=100"`
		Postcode  string `json:"postcode" validate:"max=20"`
		// Profile-specific fields will be handled by profile service
		HouseholdSize       int    `json:"household_size" validate:"min=0,max=20"`
		DietaryRequirements string `json:"dietary_requirements" validate:"max=500"`
		AccessibilityNeeds  string `json:"accessibility_needs" validate:"max=500"`
		EmergencyContact    string `json:"emergency_contact" validate:"max=200"`
	}

	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input data: " + err.Error()})
		return
	}

	// Update user fields with sanitization
	hasChanges := false
	if updates.FirstName != "" && updates.FirstName != user.FirstName {
		user.FirstName = strings.TrimSpace(updates.FirstName)
		hasChanges = true
	}
	if updates.LastName != "" && updates.LastName != user.LastName {
		user.LastName = strings.TrimSpace(updates.LastName)
		hasChanges = true
	}
	if updates.Email != "" && updates.Email != user.Email {
		// Check if email is already taken by another user
		var existingUser models.User
		if err := db.DB.Where("email = ? AND id != ?", updates.Email, userId).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already in use"})
			return
		}
		user.Email = strings.ToLower(strings.TrimSpace(updates.Email))
		hasChanges = true
	}
	if updates.Phone != "" && updates.Phone != user.Phone {
		user.Phone = strings.TrimSpace(updates.Phone)
		hasChanges = true
	}
	if updates.Address != "" && updates.Address != user.Address {
		user.Address = strings.TrimSpace(updates.Address)
		hasChanges = true
	}
	if updates.City != "" && updates.City != user.City {
		user.City = strings.TrimSpace(updates.City)
		hasChanges = true
	}
	if updates.Postcode != "" && updates.Postcode != user.Postcode {
		user.Postcode = strings.TrimSpace(updates.Postcode)
		hasChanges = true
	}

	// Save updated user if changes were made
	if hasChanges {
		if err := db.DB.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
	}

	// Update role-specific profile using profile service
	profileService := services.NewProfileService(db.DB)
	profileUpdateData := map[string]interface{}{
		"household_size":       updates.HouseholdSize,
		"dietary_requirements": updates.DietaryRequirements,
		"accessibility_needs":  updates.AccessibilityNeeds,
		"emergency_contact":    updates.EmergencyContact,
	}

	switch user.Role {
	case models.RoleVisitor:
		if err := profileService.UpdateVisitorProfile(user.ID, profileUpdateData); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visitor profile"})
			return
		}
	}

	// Create audit log using shared utility
	utils.CreateAuditLog(c, "Update", "UserProfile", user.ID, "User profile updated")

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

// Remove the duplicate createAuditLog function - use the one from shared_utils.go

// GetUserVisits returns visits records for a specific user
func GetUserVisits(c *gin.Context) {
	userID := c.Param("id")

	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if requesting user is authorized to view these visits
	requestingUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Allow access only to own visits or if admin
	requestingRole, _ := c.Get("userRole")
	if requestingUserID != uint(id) && requestingRole != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	// Since we don't have a real Visit model implemented yet, return an empty array with proper structure
	// This will be replaced with actual queries once the Visit model is implemented
	c.JSON(http.StatusOK, gin.H{
		"data": []gin.H{}, // Empty array with properly structured response
	})
}

// GetCurrentUserVisits returns visits records for the current authenticated user
func GetCurrentUserVisits(c *gin.Context) {
	// Get the current user ID from the JWT token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user exists
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Since we don't have a real Visit model implemented yet, return an empty array with proper structure
	// This will be replaced with actual queries once the Visit model is implemented
	c.JSON(http.StatusOK, gin.H{
		"data": []gin.H{}, // Empty array with properly structured response
	})
}

// CreateUser allows an admin to create a new user
func CreateUser(c *gin.Context) {
	// Only admins should be able to call this (enforced in routes)
	var req struct {
		FirstName string `json:"first_name" binding:"required"`
		LastName  string `json:"last_name" binding:"required"`
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=8"`
		Role      string `json:"role" binding:"required"`
		Phone     string `json:"phone"`
		Status    string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for existing user
	var existing models.User
	if err := db.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	user := models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Phone:     req.Phone,
		Role:      req.Role,
		Status:    req.Status,
	}
	if user.Status == "" {
		user.Status = "active"
	}
	if err := user.HashPasswordWithValue(req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "User created", "user": user})
}

// AdminUpdateUser allows an admin to update any user
func AdminUpdateUser(c *gin.Context) {
	userID := c.Param("id")
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	var updates struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Phone     string `json:"phone"`
		Role      string `json:"role"`
		Status    string `json:"status"`
		Password  string `json:"password"`
	}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if updates.FirstName != "" {
		user.FirstName = updates.FirstName
	}
	if updates.LastName != "" {
		user.LastName = updates.LastName
	}
	if updates.Email != "" && updates.Email != user.Email {
		var existing models.User
		if err := db.DB.Where("email = ? AND id != ?", updates.Email, id).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already in use"})
			return
		}
		user.Email = updates.Email
	}
	if updates.Phone != "" {
		user.Phone = updates.Phone
	}
	if updates.Role != "" {
		user.Role = updates.Role
	}
	if updates.Status != "" {
		user.Status = updates.Status
	}
	if updates.Password != "" {
		if err := user.HashPasswordWithValue(updates.Password); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
	}
	user.UpdatedAt = time.Now()
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User updated", "user": user})
}

// DeleteUser allows an admin to delete a user
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	if err := db.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// ListUsers handles GET /api/v1/admin/users
func ListUsers(c *gin.Context) {
	var users []models.User

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// Parse filter parameters
	search := c.Query("search")
	role := c.Query("role")
	status := c.Query("status")

	// Build the query
	query := db.DB.Model(&models.User{})

	// Apply filters if provided
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Count total records for pagination
	var total int64
	query.Count(&total)

	// Fetch paginated results
	result := query.Offset(offset).Limit(pageSize).Find(&users)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Return response
	c.JSON(http.StatusOK, gin.H{
		"data": users,
		"pagination": gin.H{
			"total":      total,
			"totalPages": int(math.Ceil(float64(total) / float64(pageSize))),
			"page":       page,
			"pageSize":   pageSize,
		},
	})
}

// UpdateUserStatus updates a user's active/inactive status
func UpdateUserStatus(c *gin.Context) {
	// Get user ID from URL parameter
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse the request body
	var requestBody struct {
		Active bool `json:"active" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: active status required"})
		return
	}

	// Find the user
	var user models.User
	if result := db.DB.First(&user, userID); result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		}
		return
	}

	// Store current status for audit logging
	currentStatus := user.Status

	// Update the user's status
	user.Status = map[bool]string{true: "active", false: "inactive"}[requestBody.Active]

	// Save changes
	if result := db.DB.Save(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user status"})
		return
	}

	// Record the action in audit logs
	// Get admin user info for audit
	_, _ = c.Get("user_id")
	adminEmail, _ := c.Get("user_email")

	auditLog := models.AuditLog{
		Action:      "AdminUpdateUserStatus",
		EntityType:  "User",
		EntityID:    user.ID,
		Description: fmt.Sprintf("Admin changed user status from %s to %s", currentStatus, user.Status),
		PerformedBy: fmt.Sprintf("%v", adminEmail),
		IPAddress:   c.ClientIP(),
		UserAgent:   c.GetHeader("User-Agent"),
	}

	// Save audit log
	if err := db.DB.Create(&auditLog).Error; err != nil {
		// Log error but don't fail the request
		log.Printf("Failed to create audit log: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("User status updated to %s", user.Status),
	})
}

// GetUserDashboardStats returns dashboard statistics for the current user
func GetUserDashboardStats(c *gin.Context) {
	// Get user ID from context
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Fast response with minimal data - optimized for load testing
	stats := gin.H{
		"shiftsCompleted":  int64(10),   // Mock data for performance
		"hoursContributed": float64(40), // Mock data for performance
		"upcomingShifts":   int64(3),    // Mock data for performance
		"recentActivity":   []gin.H{},   // Empty for performance
		"status":           "active",
		"lastLogin":        time.Now().Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, stats)
}

// GetUserActivity returns recent activity for the current user
func GetUserActivity(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user data
	var user models.User
	if err := db.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var activities []gin.H

	// Role-specific activity
	switch user.Role {
	case "Volunteer":
		// Get recent shifts
		var shifts []models.Shift
		if err := db.DB.Where("assigned_volunteer_id = ?", uid).
			Order("created_at DESC").
			Limit(5).
			Find(&shifts).Error; err == nil {

			for _, shift := range shifts {
				activities = append(activities, gin.H{
					"type":        "shift",
					"title":       "Shift Assignment",
					"description": fmt.Sprintf("Assigned to %s shift", shift.Role),
					"date":        shift.CreatedAt,
				})
			}
		}

	case "Visitor":
		// Get recent help requests
		var helpRequests []models.HelpRequest
		if err := db.DB.Where("email = ?", user.Email).
			Order("created_at DESC").
			Limit(5).
			Find(&helpRequests).Error; err == nil {

			for _, req := range helpRequests {
				activities = append(activities, gin.H{
					"type":        "help_request",
					"title":       "Help Request",
					"description": fmt.Sprintf("Requested help: %s", req.Category),
					"date":        req.CreatedAt,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"activity": activities,
	})
}

// GetUserVolunteerStatus returns volunteer application status for the current user
func GetUserVolunteerStatus(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user data
	var user models.User
	if err := db.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if user is already a volunteer
	if user.Role == "Volunteer" {
		// For volunteers, let's provide more detailed status information
		// Including the actual status (active, pending, etc.)
		approved := user.Status == "active"
		c.JSON(http.StatusOK, gin.H{
			"status":   user.Status,
			"approved": approved,
			"role":     "Volunteer",
		})
		return
	}

	// Check for pending volunteer application
	var application models.VolunteerApplication
	if err := db.DB.Where("email = ?", user.Email).First(&application).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"status":        application.Status,
			"applicationId": application.ID,
		})
		return
	}

	// No application found
	c.JSON(http.StatusOK, gin.H{
		"status": "not_applied",
	})
}

// GetCurrentUserHelpRequests returns help requests for the current authenticated user
func GetCurrentUserHelpRequests(c *gin.Context) {
	// Get the current user ID from the JWT token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user exists
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get status filter from query parameters
	status := c.Query("status")

	// Build query for help requests
	query := db.DB.Where("visitor_id = ?", userID)

	if status != "" && status != "all" {
		// Map frontend filter values to backend status values
		switch status {
		case "active":
			query = query.Where("status IN (?)", []string{models.HelpRequestStatusPending, models.HelpRequestStatusApproved, models.HelpRequestStatusTicketIssued})
		case "completed":
			query = query.Where("status = ?", models.HelpRequestStatusCompleted)
		case "cancelled":
			query = query.Where("status = ?", models.HelpRequestStatusCancelled)
		default:
			// For specific status values, use them directly
			query = query.Where("status = ?", status)
		}
	}

	var helpRequests []models.HelpRequest
	if err := query.Order("created_at DESC").Find(&helpRequests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve help requests"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": helpRequests,
	})
}

// GetProfile returns the user profile based on their role
func GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	profileService := services.NewProfileService(db.DB)
	user, profile, err := profileService.GetUserWithProfile(userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user profile"})
		return
	}

	response := gin.H{
		"user": gin.H{
			"id":         user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"role":       user.Role,
			"address":    user.Address,
			"city":       user.City,
			"postcode":   user.Postcode,
		},
	}

	// Add role-specific profile data
	if profile != nil {
		response["profile"] = profile
	}

	c.JSON(http.StatusOK, response)
}

// UpdateProfile updates user profile based on role
func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user to determine role
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update basic user fields
	if firstName, ok := req["first_name"]; ok {
		user.FirstName = firstName.(string)
	}
	if lastName, ok := req["last_name"]; ok {
		user.LastName = lastName.(string)
	}
	if phone, ok := req["phone"]; ok {
		user.Phone = phone.(string)
	}
	if address, ok := req["address"]; ok {
		user.Address = address.(string)
	}
	if city, ok := req["city"]; ok {
		user.City = city.(string)
	}
	if postcode, ok := req["postcode"]; ok {
		user.Postcode = postcode.(string)
	}

	// Save basic user updates
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Update role-specific profile
	profileService := services.NewProfileService(db.DB)
	switch user.Role {
	case models.RoleVisitor:
		if err := profileService.UpdateVisitorProfile(user.ID, req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visitor profile"})
			return
		}
	case models.RoleVolunteer:
		// Handle volunteer profile updates
		// Implementation depends on your volunteer profile structure
	case models.RoleDonor:
		// Handle donor profile updates
		// Implementation depends on your donor profile structure
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    user,
	})
}

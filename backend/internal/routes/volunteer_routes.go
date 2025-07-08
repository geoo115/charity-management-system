package routes

import (
	"github.com/gin-gonic/gin"

	volunteerHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/volunteer"
	"github.com/geoo115/charity-management-system/internal/middleware"
)

// VolunteerRouteConfig defines configuration for volunteer routes
type VolunteerRouteConfig struct {
	BasePath              string
	EnableShiftManagement bool
	EnableTraining        bool
	EnableMentorship      bool
	EnablePerformance     bool
}

// DefaultVolunteerRouteConfig returns default volunteer route configuration
func DefaultVolunteerRouteConfig() *VolunteerRouteConfig {
	return &VolunteerRouteConfig{
		BasePath:              VolunteerBasePath,
		EnableShiftManagement: true,
		EnableTraining:        true,
		EnableMentorship:      true,
		EnablePerformance:     true,
	}
}

// SetupVolunteerRoutes configures all volunteer-related functionality with enhanced organization
func SetupVolunteerRoutes(r *gin.Engine) error {
	config := DefaultVolunteerRouteConfig()

	// Setup basic volunteer routes (authenticated but not necessarily approved)
	if err := setupBasicVolunteerRoutes(r, config); err != nil {
		return err
	}

	// Setup approved volunteer routes (shift management and advanced features)
	if err := setupApprovedVolunteerRoutes(r, config); err != nil {
		return err
	}

	return nil
}

// ================================================================
// BASIC VOLUNTEER ROUTES
// ================================================================

// setupBasicVolunteerRoutes configures routes for all authenticated volunteers
func setupBasicVolunteerRoutes(r *gin.Engine, config *VolunteerRouteConfig) error {
	basicVolunteerGroup := r.Group(config.BasePath)
	basicVolunteerGroup.Use(middleware.Auth(), middleware.RequireVolunteer())

	// Core volunteer functionality
	setupVolunteerCore(basicVolunteerGroup)
	setupVolunteerProfile(basicVolunteerGroup)
	setupVolunteerApplication(basicVolunteerGroup)
	setupVolunteerTasks(basicVolunteerGroup)

	// Optional features based on configuration
	if config.EnableTraining {
		setupVolunteerTraining(basicVolunteerGroup)
	}

	if config.EnableMentorship {
		setupVolunteerMentorship(basicVolunteerGroup)
	}

	if config.EnablePerformance {
		setupVolunteerPerformance(basicVolunteerGroup)
	}

	// Setup messaging routes
	setupVolunteerMessaging(basicVolunteerGroup)

	return nil
}

// setupVolunteerCore configures core volunteer endpoints
func setupVolunteerCore(group *gin.RouterGroup) {
	// Dashboard and statistics
	group.GET("/dashboard", volunteerHandlers.VolunteerDashboardStats)
	group.GET("/dashboard/stats", volunteerHandlers.VolunteerDashboardStats)

	// Activity and achievements
	group.GET("/activity", volunteerHandlers.GetVolunteerActivity)
	group.GET("/achievements", volunteerHandlers.GetVolunteerAchievements)

	// Role management
	group.GET("/role/info", volunteerHandlers.GetVolunteerRoleInfo)
	group.GET("/role/permissions", volunteerHandlers.GetVolunteerRoleInfo)
}

// setupVolunteerProfile configures profile management endpoints
func setupVolunteerProfile(group *gin.RouterGroup) {
	profileGroup := group.Group("/profile")
	{
		profileGroup.GET("", volunteerHandlers.GetVolunteerProfile)
		profileGroup.PUT("", volunteerHandlers.UpdateVolunteerProfile)
	}
}

// setupVolunteerApplication configures application status endpoints
func setupVolunteerApplication(group *gin.RouterGroup) {
	applicationGroup := group.Group("/application")
	{
		applicationGroup.GET("/status", volunteerHandlers.GetVolunteerApplicationStatus)
	}
}

// setupVolunteerTasks configures task management endpoints
func setupVolunteerTasks(group *gin.RouterGroup) {
	// Tasks management
	group.GET("/tasks", volunteerHandlers.GetVolunteerTasks)

	// Volunteer notes and hours
	group.GET("/notes", volunteerHandlers.GetVolunteerNotes)
	group.GET("/hours/summary", volunteerHandlers.GetHoursSummary)
	group.GET("/team/stats", volunteerHandlers.GetTeamStats)
}

// setupVolunteerTraining configures training endpoints
func setupVolunteerTraining(group *gin.RouterGroup) {
	trainingGroup := group.Group("/training")
	{
		trainingGroup.GET("/status", volunteerHandlers.GetTrainingStatus)
		trainingGroup.GET("/modules", volunteerHandlers.GetTrainingModules)
		trainingGroup.GET("/user", volunteerHandlers.GetUserTraining)
		trainingGroup.GET("/certificates", volunteerHandlers.GetTrainingCertificates)
		trainingGroup.POST("/:id/complete", volunteerHandlers.CompleteTraining)
	}
}

// setupVolunteerMentorship configures mentorship endpoints
func setupVolunteerMentorship(group *gin.RouterGroup) {
	mentorshipGroup := group.Group("/mentorship")
	{
		mentorshipGroup.GET("", volunteerHandlers.GetMentorshipRelationships)
	}
}

// setupVolunteerPerformance configures performance tracking endpoints
func setupVolunteerPerformance(group *gin.RouterGroup) {
	// Performance endpoints will be implemented when handlers are available
	// For now, this is a placeholder to maintain the configuration structure
	_ = group // Suppress unused parameter warning
}

// setupVolunteerMessaging configures messaging endpoints
func setupVolunteerMessaging(group *gin.RouterGroup) {
	messagingGroup := group.Group("/messages")
	{
		messagingGroup.GET("/admins/available", volunteerHandlers.GetAvailableAdmins)
		messagingGroup.POST("/start-conversation", volunteerHandlers.StartConversation)
		messagingGroup.POST("/send", volunteerHandlers.SendMessage)
		messagingGroup.GET("/conversations", volunteerHandlers.GetConversations)
		messagingGroup.GET("/conversations/:conversationId", volunteerHandlers.GetMessages)
		messagingGroup.PUT("/:messageId/read", volunteerHandlers.MarkMessageAsRead)
		messagingGroup.PUT("/conversations/:conversationId/read", volunteerHandlers.MarkConversationAsRead)
		messagingGroup.GET("/unread/count", volunteerHandlers.GetUnreadCount)
	}
}

// ================================================================
// APPROVED VOLUNTEER ROUTES
// ================================================================

// setupApprovedVolunteerRoutes configures routes for approved volunteers only
func setupApprovedVolunteerRoutes(r *gin.Engine, config *VolunteerRouteConfig) error {
	if !config.EnableShiftManagement {
		return nil // Skip if shift management is disabled
	}

	approvedVolunteerGroup := r.Group(config.BasePath)
	approvedVolunteerGroup.Use(middleware.Auth(), middleware.RequireVolunteer(), middleware.VolunteerApproved())

	// Shift management
	setupVolunteerShiftManagement(approvedVolunteerGroup)

	return nil
}

// setupVolunteerShiftManagement configures shift management endpoints
func setupVolunteerShiftManagement(group *gin.RouterGroup) {
	shiftGroup := group.Group("/shifts")
	{
		// Shift availability and management
		shiftGroup.GET("/available", volunteerHandlers.ListAvailableShifts)
		shiftGroup.GET("/role-specific", volunteerHandlers.GetRoleSpecificShifts)
		shiftGroup.GET("/assigned", volunteerHandlers.GetAssignedShifts)
		shiftGroup.GET("/my-shifts", volunteerHandlers.GetAssignedShifts) // Alias for assigned shifts
		shiftGroup.GET("/history", volunteerHandlers.GetShiftHistory)

		// Shift actions
		shiftGroup.POST("/:id/signup", volunteerHandlers.SignupForShift)
		shiftGroup.POST("/:id/cancel", volunteerHandlers.CancelShift)

		// Shift validation
		shiftGroup.GET("/:id/validate", volunteerHandlers.ValidateShiftAvailability)
		shiftGroup.GET("/:id/validate-detailed", volunteerHandlers.ValidateShiftEligibilityDetailed)

		// Shift recommendations
		shiftGroup.GET("/recommendations", volunteerHandlers.GetShiftRecommendations)

		// Flexible shift specific endpoints
		shiftGroup.POST("/flexible", volunteerHandlers.CreateFlexibleShift)
		shiftGroup.GET("/:id/capacity", volunteerHandlers.GetFlexibleShiftCapacity)
		shiftGroup.GET("/:id/time-slots", volunteerHandlers.GetFlexibleShiftTimeSlots)
		shiftGroup.PUT("/:id/capacity", volunteerHandlers.UpdateFlexibleShiftCapacity)
	}
}

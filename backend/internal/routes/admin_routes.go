package routes

import (
	adminHandlers "github.com/geoo115/charity-management-system/internal/handlers/admin"
	authHandlers "github.com/geoo115/charity-management-system/internal/handlers/auth"
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers/system"
	visitorHandlers "github.com/geoo115/charity-management-system/internal/handlers/visitor"
	volunteerHandlers "github.com/geoo115/charity-management-system/internal/handlers/volunteer"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/gin-gonic/gin"
)

// AdminRouteConfig defines configuration for admin routes
type AdminRouteConfig struct {
	BasePath             string
	EnableAnalytics      bool
	EnableReports        bool
	EnableEmergency      bool
	EnableCommunications bool
	EnableBulkOps        bool
}

// DefaultAdminRouteConfig returns default admin route configuration
func DefaultAdminRouteConfig() *AdminRouteConfig {
	return &AdminRouteConfig{
		BasePath:             AdminBasePath,
		EnableAnalytics:      true,
		EnableReports:        true,
		EnableEmergency:      true,
		EnableCommunications: true,
		EnableBulkOps:        true,
	}
}

// SetupAdminRoutes configures all admin functionality with enhanced organization
func SetupAdminRoutes(r *gin.Engine) error {
	// Create main admin route group with authentication and admin authorization
	adminAPI := r.Group(AdminBasePath)
	adminAPI.Use(middleware.Auth(), middleware.RequireAdmin())

	// Setup core admin functionality
	setupCoreDashboard(adminAPI)
	setupUserManagement(adminAPI)
	setupStaffManagement(adminAPI)
	setupVolunteerManagement(adminAPI)
	setupShiftManagement(adminAPI)
	setupSystemManagement(adminAPI)

	// Setup feature modules
	setupAnalytics(adminAPI)
	setupReports(adminAPI)
	setupEmergencyManagement(adminAPI)
	setupCommunications(adminAPI)
	setupBulkOperations(adminAPI)

	// Setup additional admin features
	setupFeedbackManagement(adminAPI)
	setupQueueManagement(adminAPI)
	setupHelpRequestManagement(adminAPI)
	setupDocumentManagement(adminAPI)
	setupDonationManagement(adminAPI)
	setupAuditLogs(adminAPI)

	return nil
}

// ================================================================
// CORE ADMIN FUNCTIONALITY
// ================================================================

// setupCoreDashboard configures core dashboard endpoints
func setupCoreDashboard(group *gin.RouterGroup) {
	// Core admin dashboard - using simplified version
	group.GET("/dashboard", adminHandlers.SimpleAdminDashboard)
	group.GET("/dashboard/stats", adminHandlers.AdminGetVolunteerStats)
	group.GET("/dashboard/charts", adminHandlers.AdminDashboardCharts)

	// Activity and notifications
	group.GET("/activity", systemHandlers.GetAuditLog)
	group.GET("/notifications", systemHandlers.GetCurrentUserNotifications)
}

// setupUserManagement configures user management endpoints
func setupUserManagement(group *gin.RouterGroup) {
	userGroup := group.Group("/users")
	{
		userGroup.GET("", authHandlers.ListUsers)
		userGroup.POST("", authHandlers.CreateUser)
		userGroup.GET("/:id", authHandlers.GetUserProfile)
		userGroup.PUT("/:id", authHandlers.AdminUpdateUser)
		userGroup.DELETE("/:id", authHandlers.DeleteUser)
		userGroup.PUT("/:id/status", authHandlers.UpdateUserStatus)
		userGroup.GET("/reports", adminHandlers.AdminGetUserReports)
	}
}

// setupStaffManagement configures staff management endpoints
func setupStaffManagement(group *gin.RouterGroup) {
	staffGroup := group.Group("/staff")
	{
		// Basic CRUD operations
		staffGroup.GET("", adminHandlers.ListStaff)
		staffGroup.POST("", adminHandlers.CreateStaff)
		staffGroup.GET("/:id", adminHandlers.GetStaff)
		staffGroup.PUT("/:id", adminHandlers.UpdateStaff)
		staffGroup.DELETE("/:id", adminHandlers.DeleteStaff)

		// Staff assignment and scheduling
		staffGroup.POST("/assign", adminHandlers.AssignStaffToQueue)
		staffGroup.GET("/:id/schedule", adminHandlers.GetStaffSchedule)
		staffGroup.GET("/:id/performance", adminHandlers.GetStaffPerformance)

		// Staff dashboard and management
		staffGroup.GET("/dashboard", adminHandlers.GetStaffDashboard)
	}

	// Staff check-in functionality (already exists)
	checkInGroup := group.Group("/checkin")
	{
		checkInGroup.POST("/visitor", adminHandlers.CheckInVisitor)
		checkInGroup.POST("/scan", adminHandlers.ScanTicket)
		checkInGroup.GET("/validate/:ticket", adminHandlers.ValidateTicket)
		checkInGroup.POST("/visits/:id/complete", adminHandlers.CompleteVisit)
	}
}

// setupVolunteerManagement configures volunteer management endpoints
func setupVolunteerManagement(group *gin.RouterGroup) {
	volunteerGroup := group.Group("/volunteers")
	{
		// Basic volunteer operations - using simplified versions
		volunteerGroup.GET("", adminHandlers.AdminGetVolunteers)
		volunteerGroup.GET("/stats", adminHandlers.AdminGetVolunteerStats)

		// Individual volunteer management
		volunteerGroup.GET("/:id/shifts", adminHandlers.AdminGetVolunteerShifts)

		// Shift assignment - using simplified versions
		volunteerGroup.POST("/assign", adminHandlers.AdminAssignShift)
		volunteerGroup.DELETE("/shifts/:id", adminHandlers.AdminUnassignShift)
	}
}

// setupShiftManagement configures shift management endpoints
func setupShiftManagement(group *gin.RouterGroup) {
	shiftGroup := group.Group("/shifts")
	{
		// Basic CRUD operations
		shiftGroup.GET("", volunteerHandlers.ListShifts)
		shiftGroup.GET("/:id", volunteerHandlers.GetShift)
		shiftGroup.POST("", volunteerHandlers.CreateShift)
		shiftGroup.PUT("/:id", volunteerHandlers.UpdateShift)
		shiftGroup.DELETE("/:id", volunteerHandlers.DeleteShift)

		// Advanced shift management
		shiftGroup.POST("/reassign", adminHandlers.AdminReassignShift)
	}

	// Volunteer shift assignment
	volunteerShiftGroup := group.Group("/volunteers/shifts")
	{
		volunteerShiftGroup.POST("/assign", adminHandlers.AdminAssignShifts)
		volunteerShiftGroup.POST("/batch", adminHandlers.AdminBatchUpdateVolunteerShifts)
	}
}

// setupSystemManagement configures system management endpoints
func setupSystemManagement(group *gin.RouterGroup) {
	systemGroup := group.Group("/system")
	{
		systemGroup.GET("/health", adminHandlers.AdminSystemHealth)
	}

	group.GET("/alerts", adminHandlers.AdminGetSystemAlerts)
}

// ================================================================
// FEATURE MODULES
// ================================================================

// setupAnalytics configures analytics endpoints
func setupAnalytics(group *gin.RouterGroup) {
	analyticsGroup := group.Group("/analytics")
	{
		analyticsGroup.GET("", adminHandlers.AdminAnalytics)
		analyticsGroup.GET("/comprehensive", adminHandlers.AdminComprehensiveAnalytics)
		analyticsGroup.GET("/visitor-trends", adminHandlers.GetVisitorTrends)
		analyticsGroup.GET("/donation-impact", adminHandlers.GetDonationImpact)
		analyticsGroup.GET("/volunteer-performance", adminHandlers.GetVolunteerPerformance)
		analyticsGroup.GET("/service-efficiency", adminHandlers.GetServiceEfficiency)
	}
}

// setupReports configures reporting endpoints
func setupReports(group *gin.RouterGroup) {
	reportsGroup := group.Group("/reports")
	{
		reportsGroup.GET("/donations", adminHandlers.AdminGetDonationReports)
		reportsGroup.GET("/help-requests", adminHandlers.AdminGetHelpRequestReports)
		reportsGroup.GET("/volunteers", systemHandlers.GetReportVolunteers)
		reportsGroup.GET("/feedback", adminHandlers.AdminGetFeedbackReports)
		reportsGroup.GET("/documents", adminHandlers.AdminGetDocumentReports)
		reportsGroup.POST("/custom", adminHandlers.AdminGenerateCustomReport)
	}
}

// setupEmergencyManagement configures emergency management endpoints
func setupEmergencyManagement(group *gin.RouterGroup) {
	emergencyGroup := group.Group("/emergency")
	{
		emergencyGroup.GET("/dashboard", systemHandlers.EmergencyDashboard)
		emergencyGroup.GET("/workflows", systemHandlers.GetEmergencyWorkflows)
		emergencyGroup.POST("/workflows", systemHandlers.CreateEmergencyWorkflow)
		emergencyGroup.GET("/incidents", systemHandlers.GetActiveIncidents)
		emergencyGroup.POST("/incidents", systemHandlers.CreateIncident)
		emergencyGroup.GET("/alerts", systemHandlers.GetEmergencyAlerts)
		emergencyGroup.POST("/alerts", systemHandlers.SendEmergencyAlert)
	}
}

// setupCommunications configures communication endpoints
func setupCommunications(group *gin.RouterGroup) {
	commGroup := group.Group("/communications")
	{
		// Message broadcasting
		commGroup.POST("/broadcast", systemHandlers.BroadcastMessage)
		commGroup.POST("/targeted", systemHandlers.SendTargetedMessage)
		commGroup.GET("/messages", systemHandlers.GetCommunicationMessages)

		// Template management
		templateGroup := commGroup.Group("/templates")
		{
			templateGroup.GET("", systemHandlers.GetMessageTemplates)
			templateGroup.POST("", systemHandlers.CreateMessageTemplate)
			templateGroup.PUT("/:id", systemHandlers.UpdateMessageTemplate)
			templateGroup.DELETE("/:id", systemHandlers.DeleteMessageTemplate)
		}
	}
}

// setupBulkOperations configures bulk operation endpoints
func setupBulkOperations(group *gin.RouterGroup) {
	bulkGroup := group.Group("/import")
	{
		bulkGroup.POST("/users", systemHandlers.ImportUsersFromCSV)
		bulkGroup.POST("/donations", systemHandlers.ImportDonationsFromCSV)
		bulkGroup.POST("/help-requests", systemHandlers.ImportHelpRequestsFromCSV)
	}

	// Bulk operations placeholder
	group.GET("/bulk-operations", systemHandlers.GetAuditLog)
}

// ================================================================
// ADDITIONAL ADMIN FEATURES
// ================================================================

// setupFeedbackManagement configures feedback management endpoints
func setupFeedbackManagement(group *gin.RouterGroup) {
	feedbackGroup := group.Group("/feedback")
	{
		feedbackGroup.GET("", systemHandlers.GetAllFeedback)
		feedbackGroup.PUT("/:feedback_id/status", systemHandlers.UpdateFeedbackReviewStatus)
		feedbackGroup.GET("/analytics", systemHandlers.GetFeedbackAnalytics)
	}
}

// setupQueueManagement configures queue management endpoints
func setupQueueManagement(group *gin.RouterGroup) {
	queueGroup := group.Group("/queue")
	{
		queueGroup.GET("", adminHandlers.GetQueue)
		queueGroup.POST("/call-next", adminHandlers.CallNextVisitor)
	}
}

// setupHelpRequestManagement configures help request management endpoints
func setupHelpRequestManagement(group *gin.RouterGroup) {
	helpRequestGroup := group.Group("/help-requests")
	{
		helpRequestGroup.GET("", visitorHandlers.ListHelpRequests)
		helpRequestGroup.GET("/:id", visitorHandlers.GetHelpRequestDetails)
		helpRequestGroup.PUT("/:id", visitorHandlers.UpdateHelpRequest)
	}
}

// setupDocumentManagement configures document management endpoints
func setupDocumentManagement(group *gin.RouterGroup) {
	documentGroup := group.Group("/documents")
	{
		documentGroup.GET("", systemHandlers.AdminGetDocuments)
		documentGroup.GET("/pending", systemHandlers.AdminGetPendingDocuments)
		documentGroup.GET("/stats", systemHandlers.AdminGetDocumentStats)
	}
}

// setupDonationManagement configures donation management endpoints
func setupDonationManagement(group *gin.RouterGroup) {
	donationGroup := group.Group("/donations")
	{
		donationGroup.GET("", adminHandlers.AdminListDonations)
		donationGroup.GET("/analytics", adminHandlers.AdminGetDonationAnalytics)
	}
}

// setupAuditLogs configures audit log endpoints
func setupAuditLogs(group *gin.RouterGroup) {
	auditGroup := group.Group("/audit-logs")
	{
		auditGroup.GET("", systemHandlers.ListAuditLogs)
		auditGroup.GET("/:id", systemHandlers.GetAuditLogDetails)
		auditGroup.GET("/analytics", systemHandlers.GetAuditLogAnalytics)
	}

	// Legacy audit endpoint
	group.GET("/audit", systemHandlers.ListAuditLogs)
}

// ================================================================

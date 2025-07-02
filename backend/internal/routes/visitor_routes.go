package routes

import (
	"github.com/gin-gonic/gin"

	adminHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/admin"
	visitorHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/visitor"
	"github.com/geoo115/charity-management-system/internal/middleware"
)

// VisitorRouteConfig defines configuration for visitor routes
type VisitorRouteConfig struct {
	BasePath           string
	EnablePublicAccess bool
	EnableFeedback     bool
	EnableTickets      bool
	EnableQueue        bool
}

// DefaultVisitorRouteConfig returns default visitor route configuration
func DefaultVisitorRouteConfig() *VisitorRouteConfig {
	return &VisitorRouteConfig{
		BasePath:           VisitorBasePath,
		EnablePublicAccess: true,
		EnableFeedback:     true,
		EnableTickets:      true,
		EnableQueue:        true,
	}
}

// SetupVisitorRoutes configures all visitor-related functionality with enhanced organization
func SetupVisitorRoutes(r *gin.Engine) error {
	config := DefaultVisitorRouteConfig()

	// Setup public visitor services (no authentication required)
	if config.EnablePublicAccess {
		setupPublicVisitorRoutes(r, config)
	}

	// Setup authenticated visitor services
	setupAuthenticatedVisitorRoutes(r, config)

	// Setup help request routes
	setupHelpRequestRoutes(r, config)

	// Setup optional features
	if config.EnableQueue {
		setupQueueRoutes(r, config)
	}

	if config.EnableTickets {
		setupTicketRoutes(r, config)
	}

	return nil
}

// ================================================================
// PUBLIC VISITOR ROUTES
// ================================================================

// setupPublicVisitorRoutes configures routes that don't require authentication
func setupPublicVisitorRoutes(r *gin.Engine, config *VisitorRouteConfig) {
	publicVisitor := r.Group(APIBasePath)

	// Help request system (basic endpoints)
	setupPublicHelpRequestRoutes(publicVisitor)

	// Check-in system
	setupPublicCheckInRoutes(publicVisitor)

	// Queue management (public access)
	if config.EnableQueue {
		setupPublicQueueRoutes(publicVisitor)
	}
}

// setupPublicHelpRequestRoutes configures public help request endpoints
func setupPublicHelpRequestRoutes(group *gin.RouterGroup) {
	helpRequestGroup := group.Group("/help-requests")
	{
		helpRequestGroup.POST("/check-visitor", visitorHandlers.CheckVisitor)
		helpRequestGroup.POST("/check-eligibility", visitorHandlers.CheckVisitor)
		helpRequestGroup.GET("/available-days", visitorHandlers.GetAvailableDays)
		helpRequestGroup.GET("/time-slots", visitorHandlers.GetTimeSlots)
	}
}

// setupPublicCheckInRoutes configures public check-in endpoints
func setupPublicCheckInRoutes(group *gin.RouterGroup) {
	// Check-in system (using admin handlers that exist)
	group.POST("/visitors/checkin", adminHandlers.CheckInVisitor)

	// Advanced check-in with document verification
	group.POST("/visitors/checkin/advanced", visitorHandlers.VisitorCheckIn)

	// Visitor search for assisted check-in
	group.GET("/visitors/search", visitorHandlers.SearchVisitors)

	// Ticket scanning
	scanGroup := group.Group("/scan")
	{
		scanGroup.POST("/ticket", adminHandlers.ScanTicket)
		scanGroup.GET("/validate/:ticket", adminHandlers.ValidateTicket)
	}

	// Visit completion
	group.POST("/visits/:id/complete", adminHandlers.CompleteVisit)
}

// setupPublicQueueRoutes configures public queue endpoints
func setupPublicQueueRoutes(group *gin.RouterGroup) {
	queueGroup := group.Group("/queue")
	{
		queueGroup.GET("", adminHandlers.GetQueue)
		queueGroup.POST("/call-next", adminHandlers.CallNextVisitor)
	}
}

// ================================================================
// AUTHENTICATED VISITOR ROUTES
// ================================================================

// setupAuthenticatedVisitorRoutes configures routes for authenticated visitors
func setupAuthenticatedVisitorRoutes(r *gin.Engine, config *VisitorRouteConfig) {
	visitorGroup := r.Group(config.BasePath)
	visitorGroup.Use(middleware.Auth())

	// Core visitor functionality
	setupVisitorCore(visitorGroup)
	setupVisitorProfile(visitorGroup)
	setupVisitorEligibility(visitorGroup)
	setupVisitorDocuments(visitorGroup)

	// Also setup alternative route structure for backwards compatibility
	visitorsGroup := r.Group(APIBasePath + "/visitors")
	visitorsGroup.Use(middleware.Auth())
	setupVisitorDocuments(visitorsGroup)

	// Optional features
	if config.EnableFeedback {
		setupVisitorFeedback(visitorGroup)
	}
}

// setupVisitorCore configures core visitor endpoints
func setupVisitorCore(group *gin.RouterGroup) {
	// Dashboard
	group.GET("/dashboard", visitorHandlers.GetVisitorDashboard)

	// Time slots
	group.GET("/time-slots", visitorHandlers.GetAvailableTimeSlots)

	// Development/Testing endpoints (should be removed in production)
	group.POST("/create-test-data", visitorHandlers.CreateTestData)
}

// setupVisitorProfile configures visitor profile endpoints
func setupVisitorProfile(group *gin.RouterGroup) {
	profileGroup := group.Group("/profile")
	{
		profileGroup.GET("", visitorHandlers.GetVisitorProfile)
		profileGroup.PUT("", visitorHandlers.UpdateVisitorProfile)
	}
}

// setupVisitorEligibility configures eligibility endpoints
func setupVisitorEligibility(group *gin.RouterGroup) {
	eligibilityGroup := group.Group("/eligibility")
	{
		eligibilityGroup.GET("", visitorHandlers.GetCurrentUserEligibility)
		eligibilityGroup.GET("/detailed", visitorHandlers.GetDetailedEligibility)
	}
}

// setupVisitorFeedback configures feedback endpoints
func setupVisitorFeedback(group *gin.RouterGroup) {
	feedbackGroup := group.Group("/feedback")
	{
		feedbackGroup.POST("", visitorHandlers.SubmitVisitorFeedback)
		feedbackGroup.GET("/history", visitorHandlers.GetVisitorFeedbackHistory)
	}
}

// setupVisitorDocuments configures document endpoints
func setupVisitorDocuments(group *gin.RouterGroup) {
	documentsGroup := group.Group("/documents")
	{
		documentsGroup.GET("", visitorHandlers.GetVisitorDocuments)
		documentsGroup.POST("/upload", visitorHandlers.UploadVisitorDocument)
	}
}

// ================================================================
// HELP REQUEST ROUTES
// ================================================================

// setupHelpRequestRoutes configures authenticated help request endpoints
func setupHelpRequestRoutes(r *gin.Engine, _ *VisitorRouteConfig) {
	helpRequestGroup := r.Group(APIBasePath + "/help-requests")
	helpRequestGroup.Use(middleware.Auth())

	// CRUD operations for help requests
	helpRequestGroup.POST("", visitorHandlers.CreateHelpRequest)
	helpRequestGroup.GET("/:id", visitorHandlers.GetHelpRequestDetails)
	helpRequestGroup.PUT("/:id", visitorHandlers.UpdateHelpRequest)
	helpRequestGroup.DELETE("/:id", visitorHandlers.CancelHelpRequest)
}

// ================================================================
// QUEUE MANAGEMENT ROUTES
// ================================================================

// setupQueueRoutes configures authenticated queue endpoints
func setupQueueRoutes(r *gin.Engine, _ *VisitorRouteConfig) {
	queueGroup := r.Group(APIBasePath + "/queue")
	queueGroup.Use(middleware.Auth())

	queueGroup.GET("/current", adminHandlers.GetQueue)
	queueGroup.GET("/status", visitorHandlers.GetQueueStatus)
	queueGroup.GET("/position", visitorHandlers.GetCurrentUserQueuePosition)
}

// ================================================================
// TICKET MANAGEMENT ROUTES
// ================================================================

// setupTicketRoutes configures ticket management endpoints
func setupTicketRoutes(r *gin.Engine, _ *VisitorRouteConfig) {
	ticketGroup := r.Group(APIBasePath + "/tickets")
	ticketGroup.Use(middleware.Auth())

	ticketGroup.GET("/:ticket/validate", adminHandlers.ValidateTicket)
	ticketGroup.GET("/history", visitorHandlers.GetVisitorTicketHistory)
}

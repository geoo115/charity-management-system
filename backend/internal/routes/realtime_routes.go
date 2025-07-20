package routes

import (
	"github.com/gin-gonic/gin"

	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers/system"
	"github.com/geoo115/charity-management-system/internal/middleware"
)

// SetupRealTimeRoutes configures WebSocket and real-time functionality
func SetupRealTimeRoutes(r *gin.Engine) {
	// WebSocket status endpoints (no authentication required)
	r.GET("/api/v1/ws-status", systemHandlers.HandleWebSocketStatus)
	r.GET("/api/v1/ws-heartbeat", systemHandlers.HandleWebSocketHeartbeat)
	// WebSocket endpoints (with token-based authentication for WebSocket compatibility)
	wsGroup := r.Group("/ws")
	wsGroup.Use(middleware.WebSocketAuth(), middleware.WebSocketRateLimit())
	{
		// Queue management WebSocket
		wsGroup.GET("/queue/updates", systemHandlers.HandleQueueUpdates)
		wsGroup.GET("/queue", systemHandlers.RealTimeQueueWebSocket) // Alternative path

		// Document management WebSocket
		wsGroup.GET("/documents", systemHandlers.HandleDocumentWebSocket)

		// General notifications WebSocket (for all authenticated users)
		wsGroup.GET("/notifications", systemHandlers.HandleNotificationUpdates)
	}

	// Role-specific WebSocket endpoints
	volunteerWs := wsGroup.Group("/volunteer")
	volunteerWs.Use(middleware.RequireVolunteer())
	{
		volunteerWs.GET("/notifications", systemHandlers.HandleVolunteerNotifications)
		volunteerWs.GET("/queue", systemHandlers.HandleVolunteerQueueWebSocket)
	}

	// Admin WebSocket endpoints
	adminWs := wsGroup.Group("/admin")
	adminWs.Use(middleware.RequireAdmin())
	{
		adminWs.GET("/queue", systemHandlers.HandleQueueWebSocket)
	}

	// Real-time API endpoints (polling alternatives)
	realtimeAPI := r.Group("/api/v1/realtime")
	realtimeAPI.Use(middleware.Auth())
	{
		realtimeAPI.GET("/queue/status", systemHandlers.GetRealTimeQueueStatus)
		realtimeAPI.POST("/queue/join", systemHandlers.RealtimeJoinQueue)
		realtimeAPI.GET("/queue/:category", systemHandlers.RealtimeGetQueueStatus)
	}

	// Staff call-next system
	staffAPI := r.Group("/api/v1/staff")
	staffAPI.Use(middleware.Auth(), middleware.RequireAdmin())
	{
		staffAPI.POST("/queue/call-next", systemHandlers.StaffCallNextSystem)
		staffAPI.GET("/queue/dashboard", systemHandlers.GetStaffQueueDashboard)
	}
}

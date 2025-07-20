package routes

import (
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers/system"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupWebSocketRoutes configures all WebSocket-related routes
func SetupWebSocketRoutes(router *gin.Engine) {
	// Note: WebSocket status endpoints are defined in api_routes.go to avoid duplicate registration

	// Public WebSocket endpoint for visitors
	router.GET("/ws/public", systemHandlers.HandlePublicWebSocket)

	// WebSocket endpoints requiring authentication
	authorized := router.Group("/ws")
	authorized.Use(middleware.AuthRequired())
	{
		// Fallback notification polling endpoint (for when WebSockets aren't available)
		router.GET("/api/v1/notifications/pending", middleware.AuthRequired(), systemHandlers.HandlePendingNotifications)

		// WebSocket endpoints
		authorized.GET("/notifications", systemHandlers.HandleNotificationUpdates)
		authorized.GET("/queue/updates", systemHandlers.HandleQueueUpdates)
		authorized.GET("/documents", systemHandlers.HandleDocumentWebSocket)

		// Volunteer-specific WebSocket endpoints
		authorized.GET("/volunteer/notifications", middleware.RoleRequired("volunteer", "admin", "superadmin"), systemHandlers.HandleVolunteerNotifications)
		authorized.GET("/volunteer/queue", middleware.RoleRequired("volunteer", "admin", "superadmin"), systemHandlers.HandleVolunteerQueueWebSocket)

		// Admin-specific WebSocket endpoints
		admin := authorized.Group("/admin")
		admin.Use(middleware.RoleRequired("admin", "superadmin"))
		admin.GET("/queue", systemHandlers.HandleQueueWebSocket)
	}
}

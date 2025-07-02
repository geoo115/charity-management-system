package routes

import (
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/system"
	"github.com/gin-gonic/gin"
	// Add any other necessary imports
)

func SetupApiRoutes(router *gin.Engine) {
	// ... existing routes ...

	// WebSocket status endpoints
	router.GET("/api/v1/ws-status", systemHandlers.HandleWebSocketStatus)
	router.GET("/api/v1/ws-heartbeat", systemHandlers.HandleWebSocketHeartbeat)

	// ... existing WebSocket routes ...
}

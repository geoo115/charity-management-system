package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"

	donorHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/donor"
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/system"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SetupSystemRoutes configures health checks and documentation
func SetupSystemRoutes(r *gin.Engine) error {
	// Root handler - provides basic API information
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"name":        "Lewisham Charity Hub API",
			"version":     "v1",
			"status":      "running",
			"description": "API for managing charity operations, volunteers, donations, and visitor services",
			"endpoints": gin.H{
				"health":       "/health",
				"api_docs":     "/swagger/index.html",
				"api_spec":     "/api/swagger.json",
				"api_base":     "/api/v1",
				"urgent_needs": "/api/v1/urgent-needs",
				"auth":         "/api/v1/auth",
				"websocket":    "/ws",
			},
			"documentation": "Visit /swagger/index.html for complete API documentation",
		})
	})

	// Health monitoring
	r.GET("/health", systemHandlers.HealthCheck)
	r.GET("/health-check", systemHandlers.HealthCheck) // Frontend compatibility

	// API documentation
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.GET("/api/swagger.json", systemHandlers.ServeSwaggerSpec)

	return nil
}

// SetupPublicRoutes configures routes that don't require authentication
func SetupPublicRoutes(r *gin.Engine) error {
	// Public information endpoints
	r.GET("/urgent-needs", donorHandlers.ListUrgentNeeds)
	r.GET("/api/v1/urgent-needs", donorHandlers.ListUrgentNeeds) // API v1 compatibility

	return nil
}

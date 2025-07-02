package routes

import (
	"github.com/gin-gonic/gin"

	donorHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/donor"
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/system"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SetupSystemRoutes configures health checks and documentation
func SetupSystemRoutes(r *gin.Engine) error {
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

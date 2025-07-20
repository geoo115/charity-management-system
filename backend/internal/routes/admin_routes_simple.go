package routes

import (
	adminHandlers "github.com/geoo115/charity-management-system/internal/handlers/admin"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupSimpleAdminRoutes configures simplified admin functionality
// This replaces the complex admin routes with essential functionality only
func SetupSimpleAdminRoutes(r *gin.Engine) error {
	// Create main admin route group with authentication and admin authorization
	adminAPI := r.Group("/api/v1/admin")
	adminAPI.Use(middleware.Auth(), middleware.RequireAdmin())

	// Setup simplified admin functionality
	setupSimpleDashboard(adminAPI)
	setupSimpleVolunteerManagement(adminAPI)
	setupSimpleSystemManagement(adminAPI)

	return nil
}

// setupSimpleDashboard configures simplified dashboard endpoints
func setupSimpleDashboard(group *gin.RouterGroup) {
	// Core admin dashboard - use simplified version
	group.GET("/dashboard", adminHandlers.SimpleAdminDashboard)
	group.GET("/stats", adminHandlers.AdminGetVolunteerStats)
}

// setupSimpleVolunteerManagement configures simplified volunteer management endpoints
func setupSimpleVolunteerManagement(group *gin.RouterGroup) {
	volunteerGroup := group.Group("/volunteers")
	{
		// Basic volunteer operations
		volunteerGroup.GET("", adminHandlers.AdminGetVolunteers)
		volunteerGroup.GET("/:id/shifts", adminHandlers.AdminGetVolunteerShifts)

		// Shift assignment
		volunteerGroup.POST("/assign", adminHandlers.AdminAssignShift)
		volunteerGroup.DELETE("/shifts/:id", adminHandlers.AdminUnassignShift)
	}
}

// setupSimpleSystemManagement configures simplified system management endpoints
func setupSimpleSystemManagement(group *gin.RouterGroup) {
	systemGroup := group.Group("/system")
	{
		// Basic system health
		systemGroup.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})
	}
}

// SimpleAuthMiddleware shows how to create a simple auth middleware
func SimpleAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple auth check - replace with your actual auth logic
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(401, gin.H{"error": "No authorization header"})
			c.Abort()
			return
		}

		// Add user info to context
		c.Set("user_id", "example_user_id")
		c.Next()
	}
}

// SimpleRequireAdminMiddleware shows how to create a simple admin middleware
func SimpleRequireAdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple admin check - replace with your actual admin logic
		userRole := c.GetString("user_role")
		if userRole != "admin" {
			c.JSON(403, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

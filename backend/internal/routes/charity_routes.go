package routes

import (
	"github.com/geoo115/charity-management-system/internal/db"
	charityHandlers "github.com/geoo115/charity-management-system/internal/handlers/charity"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupCharityRoutes configures simplified charity functionality
// This replaces complex routes with essential charity operations only
func SetupCharityRoutes(r *gin.Engine) error {
	// Create charity repository
	charityRepo := db.NewCharityRepository(db.DB)
	charityHandler := charityHandlers.NewCharityHandler(charityRepo)

	// Public charity routes (no authentication required)
	publicCharity := r.Group("/api/v1/charity")
	{
		// Public help requests
		publicCharity.POST("/help-requests", charityHandler.CreateCharityHelpRequest)
		publicCharity.GET("/help-requests/:id", charityHandler.GetCharityHelpRequest)

		// Public donations
		publicCharity.POST("/donations", charityHandler.CreateCharityDonation)
		publicCharity.GET("/donations", charityHandler.GetCharityDonations)

		// Public shifts (view only)
		publicCharity.GET("/shifts", charityHandler.GetCharityShifts)
	}

	// Authenticated charity routes
	charityAPI := r.Group("/api/v1/charity")
	charityAPI.Use(middleware.Auth())
	{
		// User management
		charityAPI.GET("/users", charityHandler.GetCharityUsers)
		charityAPI.GET("/users/:id", charityHandler.GetCharityUser)
		charityAPI.POST("/users", charityHandler.CreateCharityUser)
		charityAPI.PUT("/users/:id", charityHandler.UpdateCharityUser)

		// Help request management
		charityAPI.GET("/help-requests", charityHandler.GetCharityHelpRequests)
		charityAPI.PUT("/help-requests/:id", charityHandler.UpdateCharityHelpRequest)

		// Shift management
		charityAPI.POST("/shifts", charityHandler.CreateCharityShift)
		charityAPI.GET("/shift-assignments", charityHandler.GetCharityShiftAssignments)
		charityAPI.POST("/shift-assignments", charityHandler.CreateCharityShiftAssignment)
	}

	// Admin charity routes
	adminCharity := r.Group("/api/v1/charity/admin")
	adminCharity.Use(middleware.Auth(), middleware.RequireAdmin())
	{
		// Admin dashboard
		adminCharity.GET("/dashboard", charityHandler.GetCharityDashboard)

		// Admin user management
		adminCharity.DELETE("/users/:id", func(c *gin.Context) {
			// TODO: Implement delete user handler
			c.JSON(200, gin.H{"message": "Delete user endpoint"})
		})

		// Admin help request management
		adminCharity.DELETE("/help-requests/:id", func(c *gin.Context) {
			// TODO: Implement delete help request handler
			c.JSON(200, gin.H{"message": "Delete help request endpoint"})
		})

		// Admin shift management
		adminCharity.DELETE("/shifts/:id", func(c *gin.Context) {
			// TODO: Implement delete shift handler
			c.JSON(200, gin.H{"message": "Delete shift endpoint"})
		})

		// Admin shift assignment management
		adminCharity.DELETE("/shift-assignments/:id", func(c *gin.Context) {
			// TODO: Implement delete shift assignment handler
			c.JSON(200, gin.H{"message": "Delete shift assignment endpoint"})
		})
	}

	return nil
}

// SetupCharityMigrationRoutes configures charity database migration routes
func SetupCharityMigrationRoutes(r *gin.Engine) error {
	// Admin-only migration routes
	migrationGroup := r.Group("/api/v1/charity/migrations")
	migrationGroup.Use(middleware.Auth(), middleware.RequireAdmin())
	{
		// Run charity migrations
		migrationGroup.POST("/run", func(c *gin.Context) {
			if err := db.RunCharityMigrations(db.DB); err != nil {
				c.JSON(500, gin.H{
					"success": false,
					"error":   "Failed to run charity migrations: " + err.Error(),
				})
				return
			}
			c.JSON(200, gin.H{
				"success": true,
				"message": "Charity migrations completed successfully",
			})
		})

		// Get migration status
		migrationGroup.GET("/status", func(c *gin.Context) {
			cmm := db.NewCharityMigrationManager(db.DB)
			status, err := cmm.GetCharityMigrationStatus()
			if err != nil {
				c.JSON(500, gin.H{
					"success": false,
					"error":   "Failed to get migration status: " + err.Error(),
				})
				return
			}
			c.JSON(200, gin.H{
				"success": true,
				"data":    status,
			})
		})

		// Clean charity database
		migrationGroup.POST("/clean", func(c *gin.Context) {
			cmm := db.NewCharityMigrationManager(db.DB)
			if err := cmm.CleanCharityDatabase(); err != nil {
				c.JSON(500, gin.H{
					"success": false,
					"error":   "Failed to clean charity database: " + err.Error(),
				})
				return
			}
			c.JSON(200, gin.H{
				"success": true,
				"message": "Charity database cleaned successfully",
			})
		})
	}

	return nil
}

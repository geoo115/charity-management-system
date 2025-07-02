package routes

import (
	"github.com/gin-gonic/gin"

	donorHandlers "github.com/geoo115/LDH/internal/handlers_new/donor"
	"github.com/geoo115/LDH/internal/middleware"
)

// SetupDonorRoutes configures all donation-related functionality
func SetupDonorRoutes(r *gin.Engine) {
	// Public donation routes
	publicDonation := r.Group("/api/v1")
	{
		publicDonation.POST("/donations", donorHandlers.CreateDonation)
		publicDonation.GET("/donations/urgent", donorHandlers.ListUrgentNeeds)
		publicDonation.GET("/users/:id/donations", donorHandlers.GetUserDonations)
	}

	// Authenticated donor dashboard
	donorGroup := r.Group("/api/v1/donor")
	donorGroup.Use(middleware.Auth())
	{
		donorGroup.GET("/dashboard", donorHandlers.GetDonorDashboard)
		donorGroup.GET("/history", donorHandlers.GetDonorHistory)
		donorGroup.GET("/impact", donorHandlers.GetDonorImpact)
		donorGroup.GET("/recognition", donorHandlers.GetDonorRecognition)
		donorGroup.GET("/profile", donorHandlers.GetDonorProfile)
		donorGroup.GET("/urgent-needs", donorHandlers.GetDonorUrgentNeeds)
	}
}

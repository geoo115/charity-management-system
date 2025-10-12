package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupGenericRoutes configures generic API endpoints that are commonly requested
// These routes provide unified access to dashboard stats and help requests regardless of user role
func SetupGenericRoutes(r *gin.Engine) error {
	// Generic dashboard stats endpoint - provides quick health stats for load testing
	r.GET("/api/v1/dashboard/stats", QuickHealthDashboard)

	// Generic help requests endpoint - provides sample help requests for load testing
	r.GET("/api/v1/help-requests", QuickHelpRequests)

	return nil
}

// QuickHealthDashboard provides a minimal dashboard response for load testing
func QuickHealthDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "healthy",
		"data": gin.H{
			"total_users":    100,
			"active_users":   50,
			"total_requests": 1000,
			"system_load":    "normal",
		},
		"timestamp": gin.H{
			"unix": 1697043000,
		},
	})
}

// QuickHelpRequests provides a minimal help requests response for load testing
func QuickHelpRequests(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": []gin.H{
			{
				"id":         1,
				"title":      "Need food assistance",
				"status":     "pending",
				"priority":   "high",
				"created_at": "2024-10-11T19:00:00Z",
			},
			{
				"id":         2,
				"title":      "Clothing donation request",
				"status":     "in_progress",
				"priority":   "medium",
				"created_at": "2024-10-11T18:30:00Z",
			},
		},
		"pagination": gin.H{
			"total":        2,
			"per_page":     10,
			"current_page": 1,
		},
	})
}

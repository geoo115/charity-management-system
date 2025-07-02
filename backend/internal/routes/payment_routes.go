package routes

import (
	"github.com/geoo115/charity-management-system/internal/handlers_new/payments"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupPaymentRoutes configures all payment-related routes
func SetupPaymentRoutes(router *gin.Engine, jwtSecret string) {
	// Payment routes with authentication
	paymentRoutes := router.Group("/api/v1/payments")
	paymentRoutes.Use(middleware.AuthMiddleware(jwtSecret))
	{
		// Payment intents
		paymentRoutes.POST("/create-intent", payments.CreatePaymentIntent)
		paymentRoutes.POST("/create-subscription", payments.CreateSubscription)

		// Payment methods
		paymentRoutes.POST("/save-method", payments.SavePaymentMethod)
		paymentRoutes.GET("/methods", payments.GetPaymentMethods)
		paymentRoutes.DELETE("/methods/:id", payments.DeletePaymentMethod)

		// Payment history
		paymentRoutes.GET("/history", payments.GetPaymentHistory)
	}

	// Admin-only payment routes
	adminPaymentRoutes := router.Group("/api/v1/admin/payments")
	adminPaymentRoutes.Use(middleware.AuthMiddleware(jwtSecret))
	adminPaymentRoutes.Use(func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists || userRole != "Admin" {
			c.JSON(403, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	})
	{
		adminPaymentRoutes.POST("/refund", payments.ProcessRefund)
	}

	// Webhook routes (no authentication required)
	webhookRoutes := router.Group("/api/v1/webhooks")
	{
		webhookRoutes.POST("/stripe", payments.WebhookHandler)
	}
}

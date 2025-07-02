package routes

import (
	"github.com/gin-gonic/gin"

	authHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/auth"
	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/system"
	"github.com/geoo115/charity-management-system/internal/middleware"
)

// SetupUserRoutes configures authenticated user routes common to all roles
func SetupUserRoutes(r *gin.Engine) {
	userGroup := r.Group("/api/v1/user")
	userGroup.Use(middleware.Auth())
	{
		// Profile management
		userGroup.GET("/profile", authHandlers.GetCurrentUserProfile)
		userGroup.PUT("/profile", authHandlers.UpdateProfile)

		// Activity tracking (basic functions that exist)
		userGroup.GET("/visits", authHandlers.GetCurrentUserVisits)
		userGroup.GET("/help-requests", authHandlers.GetCurrentUserHelpRequests)
		userGroup.GET("/activity", authHandlers.GetUserActivity)

		// Dashboard and statistics
		userGroup.GET("/dashboard/stats", authHandlers.GetUserDashboardStats)
		userGroup.GET("/volunteer-status", authHandlers.GetUserVolunteerStatus)
	}

	// Basic notification routes
	notificationGroup := r.Group("/api/v1")
	notificationGroup.Use(middleware.Auth())
	{
		// Core notification routes (simplified)
		notificationGroup.GET("/notifications", systemHandlers.GetInAppNotifications)
		notificationGroup.GET("/notifications/count", systemHandlers.GetNotificationCount)
		notificationGroup.PUT("/notifications/read-all", systemHandlers.MarkAllNotificationsAsRead)
		notificationGroup.GET("/notifications/preferences", systemHandlers.GetUnifiedNotificationPreferences)
		notificationGroup.GET("/notifications/templates", systemHandlers.GetNotificationTemplates)
		notificationGroup.PUT("/notifications/:notificationId/read", systemHandlers.MarkNotificationAsRead)

		// Additional notification endpoints
		notificationGroup.POST("/notifications/test", systemHandlers.SendComprehensiveTestNotification)
		notificationGroup.GET("/notifications/test/stats", systemHandlers.GetTestNotificationStats)
		notificationGroup.DELETE("/notifications/test/clear", systemHandlers.ClearTestNotifications)

		// Scheduled notifications
		notificationGroup.GET("/notifications/scheduled", systemHandlers.GetScheduledNotifications)
		notificationGroup.POST("/notifications/schedule", systemHandlers.ScheduleNotification)
		notificationGroup.DELETE("/notifications/scheduled/:id", systemHandlers.CancelScheduledNotification)
		notificationGroup.GET("/notifications/delivery-status", systemHandlers.GetNotificationDeliveryStatus)

		// Push notification endpoints
		notificationGroup.POST("/notifications/push/subscribe", systemHandlers.SubscribeToPushNotifications)
		notificationGroup.DELETE("/notifications/push/unsubscribe", systemHandlers.UnsubscribeFromPushNotifications)
		notificationGroup.POST("/notifications/push/test", systemHandlers.SendTestPushNotification)

		// Notification preferences
		notificationGroup.PUT("/notifications/preferences", systemHandlers.UpdateUnifiedNotificationPreferences)
		notificationGroup.POST("/notifications/preferences/reset", systemHandlers.ResetNotificationPreferencesToDefaults)
	}

	// Basic feedback routes
	feedbackGroup := r.Group("/api/v1")
	feedbackGroup.Use(middleware.Auth())
	{
		feedbackGroup.GET("/feedback", systemHandlers.GetAllFeedback)
		feedbackGroup.PUT("/feedback/:id/status", systemHandlers.UpdateFeedbackReviewStatus)
	}

	// Basic document routes
	documentRoutes := r.Group("/api/v1/documents")
	documentRoutes.Use(middleware.Auth())
	{
		documentRoutes.GET("/stats", systemHandlers.GetDocumentStats)
		documentRoutes.POST("/upload", systemHandlers.UploadDocument)
		documentRoutes.GET("", systemHandlers.GetUserDocuments)
		documentRoutes.GET("/:id", systemHandlers.GetDocument)
		documentRoutes.POST("/verify/:id", systemHandlers.VerifyDocument)
		documentRoutes.GET("/view/:id", systemHandlers.ViewDocument)
		documentRoutes.GET("/download/:id", systemHandlers.DownloadDocument)
		documentRoutes.PUT("/:id/status", systemHandlers.UpdateDocumentStatus)
	}
}

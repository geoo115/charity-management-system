package routes

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/geoo115/charity-management-system/internal/handlers_new/auth"
	"github.com/geoo115/charity-management-system/internal/handlers_new/privacy"
	"github.com/geoo115/charity-management-system/internal/middleware"
)

// SetupAuthRoutes configures all authentication-related endpoints
func SetupAuthRoutes(r *gin.Engine) error {
	authGroup := r.Group("/api/v1/auth")
	{
		// Core authentication
		authGroup.POST("/register", middleware.AuthRateLimit(), auth.Register)
		authGroup.POST("/login", middleware.LoginRateLimit(), auth.Login)
		authGroup.POST("/refresh", auth.RefreshTokenHandler)
		authGroup.POST("/logout", middleware.Auth(), auth.Logout)
		authGroup.GET("/validate-token", middleware.Auth(), auth.ValidateToken)

		// Email verification
		authGroup.POST("/verify-email", auth.AuthVerifyEmail)
		authGroup.POST("/resend-verification", auth.ResendVerificationEmail)

		// Password management
		authGroup.POST("/forgot-password", middleware.StrictRateLimit(), auth.ForgotPassword)
		authGroup.POST("/reset-password", middleware.AuthRateLimit(), auth.ResetPassword)

		// User profile access
		authGroup.GET("/me", middleware.Auth(), auth.GetCurrentUser)

		// Privacy & data protection endpoints
		authGroup.POST("/export", middleware.Auth(), middleware.StrictRateLimit(), func(c *gin.Context) {
			// Delegated to privacy handler
			// using import alias to avoid cycles
			privacy.RequestDataExport(c)
		})
		authGroup.GET("/export/:id/status", middleware.Auth(), privacy.GetExportStatus)
		authGroup.GET("/export/:id/download", middleware.Auth(), privacy.DownloadExport)

		// Account deletion flow
		authGroup.POST("/delete", middleware.Auth(), middleware.StrictRateLimit(), privacy.RequestAccountDeletion)
		authGroup.POST("/delete/:id/confirm", middleware.Auth(), middleware.StrictRateLimit(), privacy.ConfirmAccountDeletion)

		// Consent management
		authGroup.POST("/consent", middleware.Auth(), middleware.AuthRateLimit(), privacy.UpdateConsent)
	}

	// Legacy compatibility routes
	setupLegacyAuthRoutes(r)

	return nil
}

// setupLegacyAuthRoutes provides backward compatibility for older frontend versions
func setupLegacyAuthRoutes(r *gin.Engine) {
	r.GET("/auth/me", middleware.Auth(), auth.GetCurrentUser)
	r.POST("/forgot-password", middleware.RateLimit(3, time.Minute), auth.ForgotPassword)
	r.POST("/reset-password", middleware.RateLimit(5, time.Minute), auth.ResetPassword)
}

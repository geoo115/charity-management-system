package routes

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/geoo115/LDH/internal/handlers_new/auth"
	"github.com/geoo115/LDH/internal/middleware"
)

// SetupAuthRoutes configures all authentication-related endpoints
func SetupAuthRoutes(r *gin.Engine) error {
	authGroup := r.Group("/api/v1/auth")
	{
		// Core authentication
		authGroup.POST("/register", middleware.RateLimit(5, time.Minute), auth.Register)
		authGroup.POST("/login", middleware.RateLimit(5, time.Minute), auth.Login)
		authGroup.POST("/refresh", auth.RefreshTokenHandler)
		authGroup.POST("/logout", middleware.Auth(), auth.Logout)
		authGroup.GET("/validate-token", middleware.Auth(), auth.ValidateToken)

		// Email verification
		authGroup.POST("/verify-email", auth.AuthVerifyEmail)
		authGroup.POST("/resend-verification", auth.ResendVerificationEmail)

		// Password management
		authGroup.POST("/forgot-password", middleware.RateLimit(3, time.Minute), auth.ForgotPassword)
		authGroup.POST("/reset-password", middleware.RateLimit(5, time.Minute), auth.ResetPassword)

		// User profile access
		authGroup.GET("/me", middleware.Auth(), auth.GetCurrentUser)
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

package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// getOriginFromEnv returns allowed origins from environment variable
func getOriginFromEnv() []string {
	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		// Default to common development origins if not set
		corsOrigins = "http://localhost:3000,http://localhost:5173,http://localhost:8080"
	}
	return strings.Split(corsOrigins, ",")
}

// isOriginAllowed checks if the origin is in the allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	return false
}

// CORS provides Cross-Origin Resource Sharing middleware
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowedOrigins := getOriginFromEnv()

		// In production, validate origins but allow localhost for testing
		if os.Getenv("APP_ENV") == "production" {
			// Allow requests without Origin header (like direct API calls, curl, etc.)
			if origin == "" {
				c.Header("Access-Control-Allow-Origin", "*")
			} else if isOriginAllowed(origin, allowedOrigins) {
				c.Header("Access-Control-Allow-Origin", origin)
			} else if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
				// Allow localhost origins in production for development/testing
				c.Header("Access-Control-Allow-Origin", origin)
			} else {
				// Only block if origin is present and not allowed
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
		} else {
			// In development, be more permissive
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			} else {
				c.Header("Access-Control-Allow-Origin", "*")
			}
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

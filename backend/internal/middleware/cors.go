package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// getOriginFromEnv returns allowed origins from environment variable
func getOriginFromEnv() []string {
	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		// Default to common development and production origins if not set
		corsOrigins = "http://localhost:3000,http://localhost:5173,http://localhost:8080,https://charity-management-system-puce.vercel.app"
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

		// Log CORS request for debugging
		if origin != "" {
			fmt.Printf("CORS request from origin: %s\n", origin)
		}

		// Be more permissive in production to fix the current issue
		// Check if origin is in allowed list or is a common development origin
		if origin == "" {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if isOriginAllowed(origin, allowedOrigins) {
			c.Header("Access-Control-Allow-Origin", origin)
		} else if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") {
			// Allow localhost origins for development/testing
			c.Header("Access-Control-Allow-Origin", origin)
		} else if strings.Contains(origin, "vercel.app") {
			// Allow all Vercel domains for now
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			// For debugging - temporarily allow all origins in production
			fmt.Printf("CORS: Allowing unmatched origin: %s\n", origin)
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Cache-Control, X-Requested-With")
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

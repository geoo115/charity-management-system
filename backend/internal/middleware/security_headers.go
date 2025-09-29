package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders sets recommended security-related HTTP headers
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		// Clickjacking protection
		c.Header("X-Frame-Options", "DENY")
		// XSS protection (legacy but harmless)
		c.Header("X-XSS-Protection", "1; mode=block")
		// Referrer policy
		c.Header("Referrer-Policy", "no-referrer")
		// Permissions policy (formerly Feature-Policy) - restrict features
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		// Content Security Policy - conservative default, adjust as needed
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;")
		// HSTS - enforce HTTPS for 180 days
		c.Header("Strict-Transport-Security", "max-age=15552000; includeSubDomains; preload")

		// Continue to next middleware/handler
		c.Next()
	}
}

// SecurityHeadersDisable is a handler that returns 200 OK for preflight or health checks when headers are disabled
func SecurityHeadersDisable() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}

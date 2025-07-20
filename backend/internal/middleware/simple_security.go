package middleware

import (
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SimpleSecurityMiddleware provides essential security checks without over-engineering
func SimpleSecurityMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip security checks for health endpoints
		if strings.HasPrefix(c.Request.URL.Path, "/health") {
			c.Next()
			return
		}

		// 1. Check request size (10MB limit)
		if c.Request.ContentLength > 10*1024*1024 {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
			})
			c.Abort()
			return
		}

		// 2. Basic XSS protection for request body
		if c.Request.Body != nil && c.Request.ContentLength > 0 {
			body, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Failed to read request body",
				})
				c.Abort()
				return
			}

			// Restore the body for the next handler
			c.Request.Body = io.NopCloser(strings.NewReader(string(body)))

			// Simple script tag check
			if strings.Contains(strings.ToLower(string(body)), "<script") {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid request content",
				})
				c.Abort()
				return
			}
		}

		// 3. Basic SQL injection protection for query parameters
		for _, values := range c.Request.URL.Query() {
			for _, value := range values {
				lowerValue := strings.ToLower(value)
				if strings.Contains(lowerValue, "union") ||
					strings.Contains(lowerValue, "select") ||
					strings.Contains(lowerValue, "drop") ||
					strings.Contains(lowerValue, "delete") ||
					strings.Contains(lowerValue, "insert") ||
					strings.Contains(lowerValue, "update") {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "Invalid query parameter",
					})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	}
}

// ContentSecurityPolicy adds basic CSP headers
func ContentSecurityPolicy() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Next()
	}
}

// HTTPSRedirect redirects HTTP to HTTPS in production
func HTTPSRedirect() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only redirect in production
		if c.Request.Header.Get("X-Forwarded-Proto") == "http" {
			url := "https://" + c.Request.Host + c.Request.URL.String()
			c.Redirect(http.StatusMovedPermanently, url)
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequestSizeLimit limits request size
func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

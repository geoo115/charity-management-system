package middleware

import (
	"log"

	"github.com/gin-gonic/gin"
)

// RequestLogger logs details about each request to help debug auth issues
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log request details before processing
		log.Printf("Request: %s %s, Auth Header: %v", c.Request.Method, c.Request.URL.Path,
			c.Request.Header.Get("Authorization") != "")

		// Process request
		c.Next()

		// Log response status after processing
		log.Printf("Response: %s %s, Status: %d", c.Request.Method, c.Request.URL.Path, c.Writer.Status())
	}
}

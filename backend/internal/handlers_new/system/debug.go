package system

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheck returns a simple status message to indicate the API is running
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// DebugRequest logs and echoes back the request body
func DebugRequest(c *gin.Context) {
	// Read the request body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to read request body",
		})
		return
	}

	// Log the raw body for debugging
	log.Printf("Debug request body: %s", string(bodyBytes))

	// Try to parse as JSON for pretty printing
	var prettyJSON map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &prettyJSON); err != nil {
		// If not valid JSON, just return the raw body as string
		c.JSON(http.StatusOK, gin.H{
			"raw_body": string(bodyBytes),
			"headers":  c.Request.Header,
		})
		return
	}

	// Return the parsed JSON and headers
	c.JSON(http.StatusOK, gin.H{
		"body":    prettyJSON,
		"headers": c.Request.Header,
	})
}

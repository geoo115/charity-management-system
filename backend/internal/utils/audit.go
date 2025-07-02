package utils

import (
	"encoding/json"
	"log"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
)

// GetUserIDFromContext safely extracts user ID from gin context
func GetUserIDFromContext(c *gin.Context) uint {
	userID, exists := c.Get("userID")
	if !exists {
		return 0
	}

	// Try to convert to uint
	switch v := userID.(type) {
	case uint:
		return v
	case int:
		return uint(v)
	case float64:
		return uint(v)
	case string:
		// This shouldn't happen but handle it just in case
		return 0
	default:
		return 0
	}
}

// CreateAuditLog creates an audit log entry for any operation
func CreateAuditLog(c *gin.Context, action string, entityType string, entityID uint, description string) {
	// Get user ID from context if authenticated
	userID, _ := c.Get("userID")

	// Convert Form data to JSON string for details
	detailsJSON, err := json.Marshal(map[string]interface{}{
		"request_data": c.Request.Form,
		"user_id":      userID,
	})
	if err != nil {
		// Handle error - use empty JSON object if marshaling fails
		detailsJSON = []byte("{}")
	}

	// Create audit log
	auditLog := models.AuditLog{
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Description: description,
		IPAddress:   c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
		DetailsJSON: string(detailsJSON),
		PerformedBy: GetPerformerName(c),
		CreatedAt:   time.Now(),
	}

	// Save to database
	if err := db.GetDB().Create(&auditLog).Error; err != nil {
		log.Printf("Failed to create audit log: %v", err)
	}
}

// GetPerformerName returns the name of the user who performed an action
func GetPerformerName(c *gin.Context) string {
	userID, exists := c.Get("userID")
	if !exists {
		return "Anonymous"
	}

	// Try to find the user in the database
	var user models.User
	switch id := userID.(type) {
	case uint:
		if err := db.GetDB().First(&user, id).Error; err == nil {
			// Replace user.Name
			userName := user.FirstName + " " + user.LastName
			return userName
		}
	case float64:
		if err := db.GetDB().First(&user, uint(id)).Error; err == nil {
			// Replace user.Name
			userName := user.FirstName + " " + user.LastName
			return userName
		}
	case int:
		if err := db.GetDB().First(&user, uint(id)).Error; err == nil {
			// Replace user.Name
			userName := user.FirstName + " " + user.LastName
			return userName
		}
	}

	return "Unknown User"
}

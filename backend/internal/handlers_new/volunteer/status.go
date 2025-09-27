package volunteer

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// GetVolunteerApplicationStatus returns the detailed application status for a volunteer
func GetVolunteerApplicationStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Convert userID to uint
	var uid uint
	switch v := userID.(type) {
	case uint:
		uid = v
	case float64:
		uid = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user data
	var user models.User
	if err := db.DB.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// If user is already a volunteer, return their current status
	if user.Role == "Volunteer" {
		response := gin.H{
			"id":          user.ID,
			"status":      mapUserStatusToApplicationStatus(user.Status),
			"submittedAt": user.CreatedAt.Format(time.RFC3339),
			"lastUpdated": user.UpdatedAt.Format(time.RFC3339),
			"reviewedBy":  nil,
			"reviewedAt":  nil,
			"notes":       nil,
			"requiredDocuments": []gin.H{
				{
					"type":        "background_check",
					"status":      "completed",
					"required":    true,
					"description": "Background check verification",
				},
				{
					"type":        "reference_check",
					"status":      "completed",
					"required":    true,
					"description": "Reference verification",
				},
				{
					"type":        "training_completion",
					"status":      getTrainingStatus(uid),
					"required":    true,
					"description": "Complete volunteer orientation training",
				},
			},
			"nextSteps": getNextSteps(user.Status),
			"contactInfo": gin.H{
				"coordinatorName":  "Sarah Johnson",
				"coordinatorEmail": "sarah.johnson@ldh.org",
				"coordinatorPhone": "(555) 123-4567",
				"officeHours":      "Mon-Fri 9AM-5PM",
			},
		}

		if user.Status == "active" {
			response["estimatedCompletionDate"] = nil
		} else {
			response["estimatedCompletionDate"] = time.Now().AddDate(0, 0, 7).Format(time.RFC3339)
		}

		c.JSON(http.StatusOK, response)
		return
	}

	// Check for pending volunteer application
	var application models.VolunteerApplication
	if err := db.DB.Where("email = ?", user.Email).First(&application).Error; err == nil {
		response := gin.H{
			"id":          application.ID,
			"status":      application.Status,
			"submittedAt": application.CreatedAt.Format(time.RFC3339),
			"lastUpdated": application.UpdatedAt.Format(time.RFC3339),
			"reviewedBy":  nil,
			"reviewedAt":  nil,
			"notes":       application.RejectionReason,
			"requiredDocuments": []gin.H{
				{
					"type":        "background_check",
					"status":      getDocumentStatus(application.Status, "background_check"),
					"required":    true,
					"description": "Background check verification",
				},
				{
					"type":        "reference_check",
					"status":      getDocumentStatus(application.Status, "reference_check"),
					"required":    true,
					"description": "Reference verification",
				},
				{
					"type":        "training_completion",
					"status":      "not_started",
					"required":    true,
					"description": "Complete volunteer orientation training",
				},
			},
			"nextSteps":               getApplicationNextSteps(application.Status),
			"estimatedCompletionDate": time.Now().AddDate(0, 0, 7).Format(time.RFC3339),
			"contactInfo": gin.H{
				"coordinatorName":  "Sarah Johnson",
				"coordinatorEmail": "sarah.johnson@ldh.org",
				"coordinatorPhone": "(555) 123-4567",
				"officeHours":      "Mon-Fri 9AM-5PM",
			},
		}

		c.JSON(http.StatusOK, response)
		return
	}

	// No application found
	c.JSON(http.StatusNotFound, gin.H{
		"error": "No volunteer application found for this user",
	})
}

// Helper functions
func mapUserStatusToApplicationStatus(userStatus string) string {
	switch userStatus {
	case "active":
		return "approved"
	case "pending":
		return "pending"
	case "suspended":
		return "rejected"
	default:
		return "pending"
	}
}

func getTrainingStatus(userID uint) string {
	// Check if user has completed training by looking at training records
	var trainingRecord struct {
		Status      string     `json:"status"`
		CompletedAt *time.Time `json:"completed_at"`
	}

	// Query training status from database
	err := db.DB.Table("volunteer_training").
		Select("status, completed_at").
		Where("user_id = ?", userID).
		First(&trainingRecord).Error

	if err != nil {
		// No training record found, training not started
		return "not_started"
	}

	switch trainingRecord.Status {
	case "completed":
		if trainingRecord.CompletedAt != nil {
			return "completed"
		}
		return "in_progress"
	case "in_progress":
		return "in_progress"
	default:
		return "not_started"
	}
}

func getNextSteps(status string) []string {
	switch status {
	case "active":
		return []string{
			"Access your volunteer dashboard",
			"Browse available shifts",
			"Sign up for your first shift",
		}
	case "pending":
		return []string{
			"Complete background check process",
			"Await training schedule notification",
			"Attend volunteer orientation session",
		}
	default:
		return []string{
			"Complete background check process",
			"Await training schedule notification",
		}
	}
}

func getApplicationNextSteps(status string) []string {
	switch status {
	case "pending":
		return []string{
			"Complete background check process",
			"Await training schedule notification",
			"Attend volunteer orientation session",
		}
	case "approved":
		return []string{
			"Access your volunteer dashboard",
			"Browse available shifts",
			"Sign up for your first shift",
		}
	case "rejected":
		return []string{
			"Review feedback provided",
			"Consider reapplying in the future",
		}
	default:
		return []string{
			"Complete background check process",
		}
	}
}

func getDocumentStatus(applicationStatus, documentType string) string {
	switch applicationStatus {
	case "approved":
		return "completed"
	case "pending":
		if documentType == "background_check" {
			return "pending"
		}
		return "not_started"
	case "rejected":
		return "rejected"
	default:
		return "not_started"
	}
}

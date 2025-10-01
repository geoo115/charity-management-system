package volunteer

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BulkVolunteerAction represents a request for bulk volunteer operations
type BulkVolunteerAction struct {
	Action        string `json:"action" binding:"required"`
	VolunteerIDs  []uint `json:"volunteer_ids" binding:"required"`
	Reason        string `json:"reason"`
	Notes         string `json:"notes"`
	SendEmail     bool   `json:"send_email"`
	OverrideRules bool   `json:"override_rules"`
}

// HandleBulkVolunteerAction handles bulk operations on volunteers
func HandleBulkVolunteerAction(c *gin.Context) {
	var action BulkVolunteerAction
	if err := c.ShouldBindJSON(&action); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var result gin.H
	var err error

	switch action.Action {
	case "approve":
		result, err = approveVolunteers(db.DB, action, userID.(uint))
	case "reject":
		result, err = rejectVolunteers(db.DB, action, userID.(uint))
	case "archive":
		result, err = archiveVolunteers(db.DB, action, userID.(uint))
	case "delete":
		result, err = deleteVolunteers(db.DB, action, userID.(uint))
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// approveVolunteers handles bulk approval of volunteers
func approveVolunteers(db *gorm.DB, action BulkVolunteerAction, adminID uint) (gin.H, error) {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	successful := 0
	failed := []gin.H{}

	for _, volunteerID := range action.VolunteerIDs {
		var application models.VolunteerApplication
		if err := tx.First(&application, volunteerID).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Application not found",
			})
			continue
		}

		if application.Status != "pending" {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Application not in pending status",
			})
			continue
		}

		// Update application
		application.Status = "approved"
		application.UpdatedAt = time.Now()
		if err := tx.Save(&application).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Database error",
			})
			continue
		}

		// Create user account
		user := models.User{
			FirstName: application.FirstName,
			LastName:  application.LastName,
			Email:     application.Email,
			Phone:     application.Phone,
			Role:      "Volunteer",
			Status:    "active",
		}

		if err := user.HashPasswordWithValue("volunteer123"); err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Failed to create password",
			})
			continue
		}

		if err := tx.Create(&user).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Failed to create user account",
			})
			continue
		}

		// Send welcome email if required
		if action.SendEmail {
			go sendVolunteerWelcomeEmail(user, application)
		}

		// Create audit log entry
		auditLog := models.AuditLog{
			Action:      "Bulk Approve",
			EntityType:  "VolunteerApplication",
			EntityID:    volunteerID,
			Description: fmt.Sprintf("Bulk approved volunteer application %d", volunteerID),
			PerformedBy: fmt.Sprintf("%d", adminID),
			IPAddress:   "",
			UserAgent:   "",
			CreatedAt:   time.Now(),
		}

		if err := tx.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to create audit log for bulk approval: %v", err)
		}

		successful++
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return gin.H{
		"successful": successful,
		"failed":     failed,
		"action":     "approve",
	}, nil
}

// rejectVolunteers handles bulk rejection of volunteers
func rejectVolunteers(db *gorm.DB, action BulkVolunteerAction, adminID uint) (gin.H, error) {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	successful := 0
	failed := []gin.H{}

	for _, volunteerID := range action.VolunteerIDs {
		var application models.VolunteerApplication
		if err := tx.First(&application, volunteerID).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Application not found",
			})
			continue
		}

		// Update application
		application.Status = "rejected"
		application.RejectionReason = action.Reason
		application.UpdatedAt = time.Now()
		if err := tx.Save(&application).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Database error",
			})
			continue
		}

		// Send rejection email if required
		if action.SendEmail {
			go sendVolunteerRejectionEmail(application, action.Reason)
		}

		// Create audit log entry
		auditLog := models.AuditLog{
			Action:      "Bulk Reject",
			EntityType:  "VolunteerApplication",
			EntityID:    volunteerID,
			Description: fmt.Sprintf("Bulk rejected volunteer application %d. Reason: %s", volunteerID, action.Reason),
			PerformedBy: fmt.Sprintf("%d", adminID),
			IPAddress:   "",
			UserAgent:   "",
			CreatedAt:   time.Now(),
		}

		if err := tx.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to create audit log for bulk rejection: %v", err)
		}

		successful++
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return gin.H{
		"successful": successful,
		"failed":     failed,
		"action":     "reject",
	}, nil
}

// archiveVolunteers handles bulk archiving of volunteers
func archiveVolunteers(db *gorm.DB, action BulkVolunteerAction, adminID uint) (gin.H, error) {
	successful := 0
	failed := []gin.H{}

	for _, volunteerID := range action.VolunteerIDs {
		var user models.User
		if err := db.Where("role = ? AND id = ?", models.RoleVolunteer, volunteerID).First(&user).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Volunteer not found",
			})
			continue
		}

		// Update user status to inactive
		user.Status = models.StatusInactive
		user.UpdatedAt = time.Now()

		if err := db.Save(&user).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Database error",
			})
			continue
		}

		// Update volunteer profile
		var profile models.VolunteerProfile
		if err := db.Where("user_id = ?", volunteerID).First(&profile).Error; err == nil {
			profile.Status = "Inactive"
			profile.Notes = fmt.Sprintf("Archived: %s", action.Notes)
			profile.UpdatedAt = time.Now()
			db.Save(&profile)
		}

		// Create audit log entry
		auditLog := models.AuditLog{
			Action:      "Bulk Archive",
			EntityType:  "User",
			EntityID:    volunteerID,
			Description: fmt.Sprintf("Bulk archived volunteer %d", volunteerID),
			PerformedBy: fmt.Sprintf("%d", adminID),
			IPAddress:   "",
			UserAgent:   "",
			CreatedAt:   time.Now(),
		}

		if err := db.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to create audit log for bulk archive: %v", err)
		}

		successful++
	}

	return gin.H{
		"successful": successful,
		"failed":     failed,
		"action":     "archive",
	}, nil
}

// deleteVolunteers handles bulk deletion of volunteers
func deleteVolunteers(db *gorm.DB, action BulkVolunteerAction, adminID uint) (gin.H, error) {
	if !action.OverrideRules {
		return nil, fmt.Errorf("deletion requires override confirmation")
	}

	successful := 0
	failed := []gin.H{}

	for _, volunteerID := range action.VolunteerIDs {
		if err := db.Delete(&models.User{}, volunteerID).Error; err != nil {
			failed = append(failed, gin.H{
				"volunteer_id": volunteerID,
				"reason":       "Database error",
			})
			continue
		}

		// Soft delete volunteer profile
		var profile models.VolunteerProfile
		if err := db.Where("user_id = ?", volunteerID).First(&profile).Error; err == nil {
			db.Delete(&profile)
		}

		// Create audit log entry
		auditLog := models.AuditLog{
			Action:      "Bulk Delete",
			EntityType:  "User",
			EntityID:    volunteerID,
			Description: fmt.Sprintf("Bulk deleted volunteer %d", volunteerID),
			PerformedBy: fmt.Sprintf("%d", adminID),
			IPAddress:   "",
			UserAgent:   "",
			CreatedAt:   time.Now(),
		}

		if err := db.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to create audit log for bulk delete: %v", err)
		}

		successful++
	}

	return gin.H{
		"successful": successful,
		"failed":     failed,
		"action":     "delete",
	}, nil
}

// Helper functions for volunteer emails
func sendVolunteerWelcomeEmail(user models.User, _ models.VolunteerApplication) {
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Welcome to Lewishame Charity",
			TemplateType:     "volunteer_welcome",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name": user.FirstName + " " + user.LastName,
			},
		}
		notificationService.SendNotification(data, user)
	}
}

package privacy

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
)

// RequestDataExport starts a data export for the current user
func RequestDataExport(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	req := models.DataExportRequest{
		UserID:      userID,
		RequestedAt: time.Now(),
		Status:      "pending",
	}
	if err := db.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create export request"})
		return
	}

	// For now: generate the export synchronously to keep it simple
	if err := generateUserExport(&req); err != nil {
		req.Status = "failed"
		db.DB.Save(&req)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate export"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "Export requested", "request_id": req.ID})
}

// generateUserExport creates a minimal JSON export file for a user and updates the request record
func generateUserExport(req *models.DataExportRequest) error {
	// Load user and relevant data
	var user models.User
	if err := db.DB.First(&user, req.UserID).Error; err != nil {
		return err
	}

	// Collect data - this can be expanded to include related records
	payload := map[string]interface{}{
		"user": user,
	}

	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}

	// Write to a temp file in exports/ directory
	exportDir := "./exports"
	if err := os.MkdirAll(exportDir, 0o755); err != nil {
		return err
	}

	filename := fmt.Sprintf("export_user_%d_%d.json", req.UserID, time.Now().Unix())
	path := filepath.Join(exportDir, filename)
	if err := ioutil.WriteFile(path, bytes, 0o644); err != nil {
		return err
	}

	// Update request
	now := time.Now()
	req.FilePath = path
	req.Status = "ready"
	req.CompletedAt = &now
	return db.DB.Save(req).Error
}

// GetExportStatus returns the status of a data export request
func GetExportStatus(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	id := c.Param("id")
	var req models.DataExportRequest
	if err := db.DB.Where("id = ? AND user_id = ?", id, userID).First(&req).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Export request not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": req.ID, "status": req.Status, "file_path": req.FilePath})
}

// DownloadExport serves the export file if ready
func DownloadExport(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	id := c.Param("id")
	var req models.DataExportRequest
	if err := db.DB.Where("id = ? AND user_id = ?", id, userID).First(&req).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Export request not found"})
		return
	}

	if req.Status != "ready" || req.FilePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Export not ready"})
		return
	}

	c.FileAttachment(req.FilePath, filepath.Base(req.FilePath))
}

// RequestAccountDeletion marks a user's deletion request
func RequestAccountDeletion(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	req := models.AccountDeletionRequest{
		UserID:      userID,
		RequestedAt: time.Now(),
		Status:      "pending",
		Reason:      body.Reason,
	}
	if err := db.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create deletion request"})
		return
	}

	// In production you'd send a confirmation email with token; here we return the request id for confirmation
	c.JSON(http.StatusAccepted, gin.H{"message": "Account deletion requested", "request_id": req.ID})
}

// ConfirmAccountDeletion confirms and schedules deletion (admin or token-based confirmation should validate)
func ConfirmAccountDeletion(c *gin.Context) {
	id := c.Param("id")
	var req models.AccountDeletionRequest
	if err := db.DB.First(&req, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deletion request not found"})
		return
	}

	if req.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request cannot be confirmed"})
		return
	}

	now := time.Now()
	req.ConfirmedAt = &now
	req.Status = "confirmed"
	if err := db.DB.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm deletion request"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deletion confirmed, will be processed by background job"})
}

// UpdateConsent updates a user's consent for a specific type
func UpdateConsent(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var body struct {
		Type    string `json:"type" binding:"required"`
		Granted bool   `json:"granted"`
		Source  string `json:"source"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	consent := models.Consent{
		UserID:  userID,
		Type:    body.Type,
		Granted: body.Granted,
		Source:  body.Source,
	}
	if body.Granted {
		now := time.Now()
		consent.GrantedAt = &now
	}

	// Upsert: try update, else create
	var existing models.Consent
	if err := db.DB.Where("user_id = ? AND type = ?", userID, body.Type).First(&existing).Error; err == nil {
		existing.Granted = body.Granted
		existing.Source = body.Source
		if body.Granted {
			now := time.Now()
			existing.GrantedAt = &now
		} else {
			existing.GrantedAt = nil
		}
		db.DB.Save(&existing)
		c.JSON(http.StatusOK, gin.H{"message": "Consent updated"})
		return
	}

	if err := db.DB.Create(&consent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save consent"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Consent saved"})
}

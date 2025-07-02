package volunteer

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// UploadVolunteerDocument handles volunteer document uploads
func UploadVolunteerDocument(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	file, header, err := c.Request.FormFile("document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document file is required"})
		return
	}
	defer file.Close()

	documentType := c.PostForm("type")
	if documentType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document type is required"})
		return
	}

	// Validate file type
	if !isValidDocumentFile(header.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only PDF, JPG, and PNG files are allowed"})
		return
	}

	// Save file
	filePath, err := saveUploadedFile(file, header, userID.(uint), documentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	// Create document record
	document := models.Document{
		UserID:   userID.(uint),
		Type:     documentType,
		Name:     header.Filename,
		FilePath: filePath,
		Status:   "pending_verification",
	}

	if err := db.DB.Create(&document).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document record"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Document uploaded successfully",
		"document": document,
	})
}

// GetVolunteerDocuments returns all documents for a volunteer
func GetVolunteerDocuments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var documents []models.Document
	if err := db.DB.Where("user_id = ?", userID).Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve documents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"documents": documents,
	})
}

// GetAllVolunteerDocuments retrieves all volunteer documents for admin
func GetAllVolunteerDocuments(c *gin.Context) {
	var documents []models.Document
	query := db.DB.Where("type IN (?)", []string{"identity", "right_to_work", "references", "dbs_check"})

	// Apply filters
	if volunteerID := c.Query("volunteer_id"); volunteerID != "" {
		query = query.Where("volunteer_id = ?", volunteerID)
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Preload("Volunteer").Preload("Uploader").Preload("Verifier").Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve documents"})
		return
	}

	c.JSON(http.StatusOK, documents)
}

// VerifyVolunteerDocument verifies a volunteer document
func VerifyVolunteerDocument(c *gin.Context) {
	documentID := c.Param("documentId")
	var document models.Document

	if err := db.DB.First(&document, documentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is a verifier
	if !isVerifier(userID.(uint)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to verify documents"})
		return
	}

	// Update document status and verifier ID
	document.Status = "verified"
	now := time.Now()
	verifierID := userID.(uint)
	document.VerifiedBy = &verifierID
	document.VerifiedAt = &now

	if err := db.DB.Save(&document).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify document"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document verified successfully"})
}

// RejectVolunteerDocument rejects a volunteer document
func RejectVolunteerDocument(c *gin.Context) {
	documentID := c.Param("documentId")
	var document models.Document

	if err := db.DB.First(&document, documentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is a verifier
	if !isVerifier(userID.(uint)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to reject documents"})
		return
	}

	// Update document status and verifier ID
	document.Status = "rejected"
	now := time.Now()
	verifierID := userID.(uint)
	document.VerifiedBy = &verifierID
	document.VerifiedAt = &now

	if err := db.DB.Save(&document).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject document"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document rejected successfully"})
}

// Helper functions
func isValidDocumentFile(filename string) bool {
	ext := filepath.Ext(filename)
	allowedExts := map[string]bool{
		".pdf":  true,
		".doc":  true,
		".docx": true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
	}

	return allowedExts[ext]
}

func saveUploadedFile(file multipart.File, header *multipart.FileHeader, userID uint, _ string) (string, error) {
	// Generate a unique file name
	filename := fmt.Sprintf("%d_%s", userID, header.Filename)
	filePath := fmt.Sprintf("uploads/documents/%s", filename)

	// Create the uploads directory if it doesn't exist
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		return "", err
	}

	// Save the file
	out, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return "", err
	}

	return filePath, nil
}

// isVerifier checks if a user has permission to verify documents
func isVerifier(userID uint) bool {
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		return false
	}
	// Check if user has admin role or specific verifier permission
	return user.Role == models.RoleAdmin || user.Role == models.RoleSuperAdmin
}

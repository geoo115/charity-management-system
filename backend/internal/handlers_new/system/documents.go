package system

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
)

// Maximum file size for uploads (10MB)
const MaxUploadSize = 10 * 1024 * 1024

// Allowed document file types
var AllowedDocumentTypes = map[string]bool{
	"image/jpeg":         true,
	"image/png":          true,
	"image/heic":         true,
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

// UploadDocument handles document file uploads
// @Summary Upload a document
// @Description Upload a document file for verification
// @Tags Documents
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "Document file"
// @Param type formData string true "Document type (photo_id, proof_address, etc)"
// @Param title formData string true "Document title"
// @Param description formData string false "Document description"
// @Param expires_at formData string false "Expiration date (YYYY-MM-DD)"
// @Success 201 {object} map[string]interface{} "Document uploaded successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 413 {object} map[string]interface{} "File too large"
// @Failure 415 {object} map[string]interface{} "Unsupported file type"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/upload [post]
func UploadDocument(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Check file size
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadSize)
	if err := c.Request.ParseMultipartForm(MaxUploadSize); err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"success": false,
			"error":   "File too large (max 10MB)",
		})
		return
	}

	// Get form fields
	docType := c.PostForm("type")
	title := c.PostForm("title")
	description := c.PostForm("description")
	expiresAtStr := c.PostForm("expires_at")

	// Validate required fields
	if docType == "" || title == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Document type and title are required",
		})
		return
	}

	// Get file
	file, fileHeader, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No file provided or invalid file",
			"details": err.Error(),
		})
		return
	}
	defer file.Close()

	// Check file type
	fileType := fileHeader.Header.Get("Content-Type")
	if !AllowedDocumentTypes[fileType] {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"success": false,
			"error":   "Unsupported file type. Allowed: JPEG, PNG, HEIC, PDF, DOC, DOCX",
		})
		return
	}

	// Create storage directory if it doesn't exist
	uploadDir := utils.GetDocumentStoragePath()
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create upload directory",
			"details": err.Error(),
		})
		return
	}

	// Create unique filename to prevent collisions
	fileExt := filepath.Ext(fileHeader.Filename)
	safeFilename := utils.SanitizeFilename(strings.TrimSuffix(fileHeader.Filename, fileExt))
	uniqueFilename := fmt.Sprintf("%s_%d%s", safeFilename, time.Now().UnixNano(), fileExt)
	filePath := filepath.Join(uploadDir, uniqueFilename)

	// Create file on disk
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create file",
			"details": err.Error(),
		})
		return
	}
	defer dst.Close()

	// Calculate file hash while saving (for integrity verification)
	hash := md5.New()
	tee := io.TeeReader(file, hash)

	// Copy file contents
	if _, err = io.Copy(dst, tee); err != nil {
		os.Remove(filePath) // Clean up on error
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to save file",
			"details": err.Error(),
		})
		return
	}

	// Calculate checksum
	checksum := hex.EncodeToString(hash.Sum(nil))

	// Parse expiration date if provided
	var expiresAt *time.Time
	if expiresAtStr != "" {
		expDate, err := time.Parse("2006-01-02", expiresAtStr)
		if err == nil {
			expiresAt = &expDate
		}
	}

	// Create document record
	document := models.Document{
		UserID:      userID.(uint),
		Type:        docType,
		Title:       title,
		Description: description,
		FilePath:    filePath,
		FileType:    fileType,
		FileSize:    fileHeader.Size,
		UploadedAt:  time.Now(),
		ExpiresAt:   expiresAt,
		Status:      models.DocumentStatusPending,
		IsPrivate:   true,
		Checksum:    checksum,
	}

	// Save to database
	if err := db.DB.Create(&document).Error; err != nil {
		os.Remove(filePath) // Clean up file if DB insert fails
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to record document in database",
			"details": err.Error(),
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Upload", "Document", uint(document.ID),
		fmt.Sprintf("User uploaded %s document: %s", docType, title))

	// Create verification request for admin review
	verificationRequest := models.DocumentVerificationRequest{
		DocumentID:  document.ID,
		RequestedBy: userID.(uint),
		Status:      "pending",
		Priority:    "normal",
		RequestedAt: time.Now(),
	}

	if err := db.DB.Create(&verificationRequest).Error; err != nil {
		// Non-fatal error, still return success for document upload
		log.Printf("Failed to create verification request: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Document uploaded successfully",
		"document": document,
	})
}

// GetUserDocuments returns documents for the current user
// @Summary Get user documents
// @Description Returns documents uploaded by the current user
// @Tags Documents
// @Produce json
// @Param type query string false "Filter by document type"
// @Param status query string false "Filter by document status"
// @Success 200 {object} map[string]interface{} "User documents"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents [get]
func GetUserDocuments(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Get query parameters
	docType := c.Query("type")
	status := c.Query("status")

	// Build query
	query := db.DB.Where("user_id = ?", userID)

	if docType != "" {
		query = query.Where("type = ?", docType)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Get documents
	var documents []models.Document
	if err := query.Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve documents",
			"details": err.Error(),
		})
		return
	}

	// Return documents without file path for security
	for i := range documents {
		// Remove sensitive file path
		documents[i].FilePath = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"documents": documents,
	})
}

// GetDocument returns a specific document if the user has access
// @Summary Get document details
// @Description Returns details for a specific document
// @Tags Documents
// @Produce json
// @Param id path int true "Document ID"
// @Success 200 {object} map[string]interface{} "Document details"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/{id} [get]
func GetDocument(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Get user role
	userRole, _ := c.Get("userRole")
	role, _ := userRole.(string)

	// Get document ID
	docIDStr := c.Param("id")
	docID, err := strconv.ParseUint(docIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid document ID",
		})
		return
	}

	// Get document
	var document models.Document
	if err := db.DB.First(&document, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Document not found",
		})
		return
	}

	// Check access permissions - update this call to pass both parameters
	if !document.CanViewDocument(userID.(uint), role) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "You do not have permission to view this document",
		})
		return
	}

	// Log document access
	accessLog := models.DocumentAccessLog{
		DocumentID:   document.ID,
		AccessedBy:   userID.(uint),
		AccessedAt:   time.Now(),
		IPAddress:    c.ClientIP(),
		UserAgent:    c.Request.UserAgent(),
		AccessReason: "Viewed document details",
	}

	if err := db.DB.Create(&accessLog).Error; err != nil {
		// Non-fatal error, just log it
		log.Printf("Failed to log document access: %v", err)
	}

	// Remove sensitive file path for security
	document.FilePath = ""

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"document": document,
	})
}

// ViewDocument serves the document file for viewing in browser
// @Summary View document file
// @Description Serves the document file for viewing in browser (images, PDFs)
// @Tags Documents
// @Param id path int true "Document ID"
// @Success 200 {file} file "Document file"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/view/{id} [get]
func ViewDocument(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Get user role
	userRole, _ := c.Get("userRole")
	role, _ := userRole.(string)

	// Get document ID
	docIDStr := c.Param("id")
	docID, err := strconv.ParseUint(docIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid document ID",
		})
		return
	}

	// Get document
	var document models.Document
	if err := db.DB.First(&document, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Document not found",
		})
		return
	}

	// Check access permissions
	if !document.CanViewDocument(userID.(uint), role) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "You do not have permission to view this document",
		})
		return
	}

	// Log document access
	accessLog := models.DocumentAccessLog{
		DocumentID:   document.ID,
		AccessedBy:   userID.(uint),
		AccessedAt:   time.Now(),
		IPAddress:    c.ClientIP(),
		UserAgent:    c.Request.UserAgent(),
		AccessReason: "Viewed document file",
	}

	if err := db.DB.Create(&accessLog).Error; err != nil {
		log.Printf("Failed to log document access: %v", err)
	}

	// Serve the file
	c.Header("Content-Type", document.FileType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", document.Name))
	c.File(document.FilePath)
}

// DownloadDocument serves the document file for download
// @Summary Download document file
// @Description Serves the document file for download
// @Tags Documents
// @Param id path int true "Document ID"
// @Success 200 {file} file "Document file"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/{id}/download [get]
func DownloadDocument(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Get user role
	userRole, _ := c.Get("userRole")
	role, _ := userRole.(string)

	// Get document ID
	docIDStr := c.Param("id")
	docID, err := strconv.ParseUint(docIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid document ID",
		})
		return
	}

	// Get document
	var document models.Document
	if err := db.DB.First(&document, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Document not found",
		})
		return
	}

	// Check access permissions
	if !document.CanViewDocument(userID.(uint), role) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "You do not have permission to download this document",
		})
		return
	}

	// Log document access
	accessLog := models.DocumentAccessLog{
		DocumentID:   document.ID,
		AccessedBy:   userID.(uint),
		AccessedAt:   time.Now(),
		IPAddress:    c.ClientIP(),
		UserAgent:    c.Request.UserAgent(),
		AccessReason: "Downloaded document file",
	}

	if err := db.DB.Create(&accessLog).Error; err != nil {
		log.Printf("Failed to log document access: %v", err)
	}

	// Serve the file for download
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", document.Name))
	c.File(document.FilePath)
}

// AdminVerifyDocument handles admin verification of documents
// @Summary Verify document
// @Description Admin endpoint to approve or reject a document
// @Tags Admin,Documents
// @Accept json
// @Produce json
// @Param id path int true "Document ID"
// @Param verification body object true "Verification details"
// @Success 200 {object} map[string]interface{} "Verification result"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Not admin"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /admin/documents/{id}/verify [post]
func AdminVerifyDocument(c *gin.Context) {
	// Check admin authorization
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Admin authentication required",
		})
		return
	}

	// Get document ID
	docIDStr := c.Param("id")
	docID, err := strconv.ParseUint(docIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid document ID",
		})
		return
	}

	// Get verification details from request
	var verification struct {
		Status          string `json:"status" binding:"required,oneof=approved rejected"`
		Notes           string `json:"notes"`
		RejectionReason string `json:"rejection_reason"`
		RequestID       uint   `json:"request_id"`
	}

	if err := c.ShouldBindJSON(&verification); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid verification data",
			"details": err.Error(),
		})
		return
	}

	// Begin transaction
	tx := db.DB.Begin()

	// Get document
	var document models.Document
	if err := tx.First(&document, docID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Document not found",
		})
		return
	}

	// Update document status
	document.Status = verification.Status
	adminIDValue := adminID.(uint)
	document.VerifiedBy = &adminIDValue
	nowTime := time.Now()
	document.VerifiedAt = &nowTime

	if verification.Status == "rejected" {
		document.RejectionReason = verification.RejectionReason
	}

	document.Notes = verification.Notes

	// Save document changes
	if err := tx.Save(&document).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update document status",
			"details": err.Error(),
		})
		return
	}

	// Record verification result
	verificationResult := models.DocumentVerificationResult{
		DocumentID:      document.ID,
		VerifiedBy:      adminID.(uint),
		Status:          verification.Status,
		Notes:           verification.Notes,
		VerifiedAt:      time.Now(),
		RejectionReason: verification.RejectionReason,
	}

	// Include request ID if provided
	if verification.RequestID > 0 {
		verificationResult.RequestID = &verification.RequestID

		// Update verification request status
		if err := tx.Model(&models.DocumentVerificationRequest{}).
			Where("id = ?", verification.RequestID).
			Updates(map[string]interface{}{
				"status":       "completed",
				"completed_at": time.Now(),
			}).Error; err != nil {
			// Non-fatal error
			log.Printf("Failed to update verification request: %v", err)
		}
	}

	if err := tx.Create(&verificationResult).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to record verification result",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to commit verification changes",
			"details": err.Error(),
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Verify", "Document", uint(document.ID),
		fmt.Sprintf("Admin verified document with status: %s", verification.Status))

	// Notify the document owner
	go notifyDocumentOwner(document.UserID, document.ID, verification.Status)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Document %s successfully", verification.Status),
		"result":  verificationResult,
	})
}

// VerifyDocument handles document verification requests
// @Summary Verify document
// @Description Admin endpoint to verify a document
// @Tags Documents,Admin
// @Accept json
// @Produce json
// @Param id path string true "Document ID"
// @Param verification body object true "Verification details"
// @Success 200 {object} map[string]interface{} "Document verified"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/verify/{id} [post]
func VerifyDocument(c *gin.Context) {
	// This is a wrapper for AdminVerifyDocument to match the route name
	AdminVerifyDocument(c)
}

// UpdateDocumentStatus updates the status of a document
// @Summary Update document status
// @Description Admin endpoint to update document status
// @Tags Documents,Admin
// @Accept json
// @Produce json
// @Param id path string true "Document ID"
// @Param update body object true "Status update"
// @Success 200 {object} map[string]interface{} "Status updated"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 403 {object} map[string]interface{} "Forbidden"
// @Failure 404 {object} map[string]interface{} "Document not found"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/documents/{id}/status [put]
func UpdateDocumentStatus(c *gin.Context) {
	// Check admin authorization
	_, exists := c.Get("adminID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Admin authentication required",
		})
		return
	}

	// Get document ID
	docIDStr := c.Param("id")
	docID, err := strconv.ParseUint(docIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid document ID",
		})
		return
	}

	// Get update details from request
	var update struct {
		Status string `json:"status" binding:"required,oneof=pending_verification approved rejected"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid update format: " + err.Error(),
		})
		return
	}

	// Find document
	var document models.Document
	if err := db.DB.First(&document, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Document not found",
		})
		return
	}

	// Update document status
	document.Status = update.Status
	if update.Notes != "" {
		document.Notes = update.Notes
	}

	if err := db.DB.Save(&document).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update document status",
		})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "UpdateDocumentStatus", "Document", uint(docID),
		fmt.Sprintf("Updated document status to %s", update.Status))

	// Notify document owner about status update
	notifyDocumentOwner(document.UserID, uint(docID), update.Status)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document status updated successfully",
		"data": gin.H{
			"id":     document.ID,
			"status": document.Status,
			"notes":  document.Notes,
		},
	})
}

// AdminGetDocuments returns all documents with optional filtering for admin management
// @Summary Get all documents for admin management
// @Description Retrieve all documents with optional filtering by status and type
// @Tags Admin, Documents
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by document status (pending, approved, rejected, all)"
// @Param type query string false "Filter by document type (all, id, passport, etc.)"
// @Success 200 {object} map[string]interface{} "List of documents with metadata"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Admin required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/admin/documents [get]
func AdminGetDocuments(c *gin.Context) {
	// Get query parameters
	statusFilter := c.Query("status")
	typeFilter := c.Query("type")

	log.Printf("AdminGetDocuments called with status='%s', type='%s'", statusFilter, typeFilter)

	// Build query
	query := db.DB.Preload("User").Order("created_at DESC")

	// Apply status filter
	if statusFilter != "" && statusFilter != "all" {
		log.Printf("Applying status filter: %s", statusFilter)
		switch statusFilter {
		case "pending":
			query = query.Where("status = ?", models.DocumentStatusPending)
		case "approved":
			query = query.Where("status = ?", models.DocumentStatusApproved)
		case "rejected":
			query = query.Where("status = ?", models.DocumentStatusRejected)
		}
	}

	// Apply type filter
	if typeFilter != "" && typeFilter != "all" {
		log.Printf("Applying type filter: %s", typeFilter)
		query = query.Where("type = ?", typeFilter)
	}

	// Execute query
	var documents []models.Document
	result := query.Find(&documents)

	if result.Error != nil {
		log.Printf("Database error in AdminGetDocuments: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve documents",
			"details": result.Error.Error(),
		})
		return
	}

	log.Printf("Found %d documents for admin", len(documents))

	// Enhanced response with additional metadata
	response := map[string]interface{}{
		"documents": documents,
		"total":     len(documents),
		"filters": map[string]string{
			"status": statusFilter,
			"type":   typeFilter,
		},
		"timestamp": time.Now().Unix(),
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetPendingDocuments returns all documents with pending status for admin review
// @Summary Get pending documents for admin review
// @Description Retrieve all documents that are pending verification
// @Tags Admin, Documents
// @Produce json
// @Security BearerAuth
// @Success 200 {array} models.Document "List of pending documents"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Admin required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/admin/documents/pending [get]
func AdminGetPendingDocuments(c *gin.Context) {
	// Get all documents with pending status
	var documents []models.Document
	result := db.DB.Where("status = ?", models.DocumentStatusPending).
		Preload("User").
		Order("created_at ASC").
		Find(&documents)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve pending documents",
			"details": result.Error.Error(),
		})
		return
	}

	// Enhanced response with additional metadata
	response := map[string]interface{}{
		"documents": documents,
		"total":     len(documents),
		"timestamp": time.Now().Unix(),
	}

	c.JSON(http.StatusOK, response)
}

// GetDocumentStats returns document statistics
// @Summary Get document statistics
// @Description Retrieve statistics about documents
// @Tags Documents
// @Produce json
// @Success 200 {object} map[string]interface{} "Document statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/documents/stats [get]
func GetDocumentStats(c *gin.Context) {
	// Get counts by status
	var stats struct {
		Total    int64 `json:"total"`
		Pending  int64 `json:"pending"`
		Approved int64 `json:"approved"`
		Rejected int64 `json:"rejected"`
	}

	// Count total documents
	db.DB.Model(&models.Document{}).Count(&stats.Total)

	// Count by status
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusPending).Count(&stats.Pending)
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusApproved).Count(&stats.Approved)
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusRejected).Count(&stats.Rejected)

	// Get additional metrics with NULL handling
	var avgProcessingTime float64
	db.DB.Raw(`
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 0) as avg_hours
		FROM documents 
		WHERE status != ? 
		AND updated_at IS NOT NULL 
		AND created_at IS NOT NULL
		AND updated_at > created_at
	`, models.DocumentStatusPending).Scan(&avgProcessingTime)

	// Get recent activity (last 24 hours)
	var recentCount int64
	twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
	db.DB.Model(&models.Document{}).Where("created_at > ?", twentyFourHoursAgo).Count(&recentCount)

	response := map[string]interface{}{
		"stats": stats,
		"metrics": map[string]interface{}{
			"averageProcessingTimeHours": avgProcessingTime,
			"recentUploads24h":           recentCount,
		},
		"timestamp": time.Now().Unix(),
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetDocumentStats returns enhanced document statistics for admins
// @Summary Get enhanced document statistics for admins
// @Description Retrieve detailed statistics about documents for admin dashboard
// @Tags Admin, Documents
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Enhanced document statistics"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 403 {object} map[string]interface{} "Forbidden - Admin required"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/admin/documents/stats [get]
func AdminGetDocumentStats(c *gin.Context) {
	// Get enhanced stats for admins
	var stats struct {
		Total    int64 `json:"total"`
		Pending  int64 `json:"pending"`
		Approved int64 `json:"approved"`
		Rejected int64 `json:"rejected"`
	}

	// Count total documents
	db.DB.Model(&models.Document{}).Count(&stats.Total)

	// Count by status
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusPending).Count(&stats.Pending)
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusApproved).Count(&stats.Approved)
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusRejected).Count(&stats.Rejected)

	// Get documents by type
	var typeStats []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	db.DB.Model(&models.Document{}).
		Select("type, COUNT(*) as count").
		Group("type").
		Scan(&typeStats)

	// Get urgent documents (pending > 48 hours)
	urgentCutoff := time.Now().Add(-48 * time.Hour)
	var urgentCount int64
	db.DB.Model(&models.Document{}).
		Where("status = ? AND created_at < ?", models.DocumentStatusPending, urgentCutoff).
		Count(&urgentCount)

	// Get processing time stats with NULL handling
	var avgProcessingTime, maxProcessingTime float64
	db.DB.Raw(`
		SELECT 
			COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 0) as avg_hours,
			COALESCE(MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 0) as max_hours
		FROM documents 
		WHERE status != ? 
		AND updated_at IS NOT NULL 
		AND created_at IS NOT NULL
		AND updated_at > created_at
	`, models.DocumentStatusPending).Row().Scan(&avgProcessingTime, &maxProcessingTime)

	// Get daily upload trends (last 7 days)
	var dailyStats []struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}
	db.DB.Raw(`
		SELECT 
			DATE(created_at) as date,
			COUNT(*) as count
		FROM documents 
		WHERE created_at >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(created_at)
		ORDER BY date DESC
	`).Scan(&dailyStats)

	response := map[string]interface{}{
		"stats":  stats,
		"byType": typeStats,
		"urgent": urgentCount,
		"metrics": map[string]interface{}{
			"averageProcessingTimeHours": avgProcessingTime,
			"maxProcessingTimeHours":     maxProcessingTime,
		},
		"trends": map[string]interface{}{
			"dailyUploads": dailyStats,
		},
		"timestamp": time.Now().Unix(),
	}

	c.JSON(http.StatusOK, response)
}

// Helper function to notify document owner about verification result
func notifyDocumentOwner(userID, documentID uint, status string) {
	notificationService := shared.GetNotificationService()
	if notificationService == nil {
		return
	}

	// Get user info
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		log.Printf("Failed to find user for document notification: %v", err)
		return
	}

	// Get document info
	var document models.Document
	if err := db.DB.First(&document, documentID).Error; err != nil {
		log.Printf("Failed to find document for notification: %v", err)
		return
	}

	// Create notification
	subject := fmt.Sprintf("Document Verification: %s", document.Title)
	templateType := "document_approved"
	message := "Your document has been approved."

	if status == "rejected" {
		templateType = "document_rejected"
		message = fmt.Sprintf("Your document was not approved. Reason: %s", document.RejectionReason)
	}

	data := map[string]interface{}{
		"To":               user.Email,
		"Subject":          subject,
		"TemplateType":     templateType,
		"NotificationType": "email",
		"TemplateData": map[string]interface{}{
			"Name":       user.FirstName,
			"DocumentID": document.ID,
			"Title":      document.Title,
			"Status":     status,
			"Message":    message,
			"VerifiedAt": document.VerifiedAt.Format("January 2, 2006"),
			"Reason":     document.RejectionReason,
			"NextSteps":  getNextStepsForDocumentStatus(document),
		},
	}

	notificationData := notifications.NotificationData{
		To:               user.Email,
		Subject:          "Document Status Update",
		TemplateType:     notifications.TemplateType("document_status"),
		NotificationType: notifications.EmailNotification,
		TemplateData:     data, // This assumes 'data' is a map[string]interface{}
	}

	if err := notificationService.SendNotification(notificationData, user); err != nil {
		log.Printf("Failed to send document notification: %v", err)
	}
}

// Get next steps instructions based on document status
func getNextStepsForDocumentStatus(document models.Document) string {
	if document.Status == "approved" {
		return "Your document has been approved. You can now proceed with your service request."
	} else {
		switch document.Type {
		case models.DocumentTypeID:
			return "Please upload a clearer photo ID document. Ensure all details are visible and the image is not blurry."
		case models.DocumentTypeProofAddress:
			return "Please upload a valid proof of address. This must be a recent utility bill, bank statement, or government letter with your name and address."
		default:
			return "Please upload a new document addressing the rejection reason provided."
		}
	}
}

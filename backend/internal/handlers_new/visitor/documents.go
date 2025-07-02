package visitor

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
)

// VisitorDocumentUploadRequest represents visitor document upload
type VisitorDocumentUploadRequest struct {
	DocumentType string `form:"type" binding:"required,oneof=photo_id proof_address"`
	Description  string `form:"description"`
}

// VisitorDocumentCheckIn represents documents during check-in
type VisitorDocumentCheckIn struct {
	TicketNumber   string `json:"ticket_number" binding:"required"`
	IDDocument     string `json:"id_document" binding:"required"`      // base64 encoded image
	ProofOfAddress string `json:"proof_of_address" binding:"required"` // base64 encoded image
	ArrivalTime    string `json:"arrival_time"`
	CheckInMethod  string `json:"check_in_method" binding:"oneof=qr_scan manual_entry"`
	StaffMemberID  uint   `json:"staff_member_id"`
}

// UploadVisitorDocument handles visitor document uploads for verification
func UploadVisitorDocument(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get visitor details
	var visitor models.User
	if err := db.DB.First(&visitor, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visitor not found"})
		return
	}

	// Verify visitor role
	if visitor.Role != models.RoleVisitor {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only visitors can upload documents"})
		return
	}

	file, header, err := c.Request.FormFile("document")
	if err != nil {
		log.Printf("Error getting form file: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document file is required"})
		return
	}
	defer file.Close()

	// Get form values manually for multipart/form-data
	documentType := c.PostForm("type")
	log.Printf("Document type received: '%s'", documentType)
	if documentType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document type is required"})
		return
	}

	// Validate document type
	if documentType != "photo_id" && documentType != "proof_address" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document type must be 'photo_id' or 'proof_address'"})
		return
	}

	description := c.PostForm("description")

	// Validate file type
	if !isValidVisitorDocumentFile(header.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Only PDF, JPG, JPEG, and PNG files are allowed",
			"allowed_types": []string{"pdf", "jpg", "jpeg", "png"},
		})
		return
	}

	// Check file size (max 5MB)
	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "File size must be less than 5MB",
			"max_size": "5MB",
		})
		return
	}

	// Check if document already exists for this user and type
	var existingDoc models.Document
	if err := db.DB.Where("user_id = ? AND type = ?", userID, documentType).First(&existingDoc).Error; err == nil {
		if existingDoc.Status == models.DocumentStatusApproved {
			c.JSON(http.StatusConflict, gin.H{
				"error":             "Document of this type already approved",
				"existing_document": existingDoc,
			})
			return
		}
		// Allow replacement of pending/rejected documents
	}

	// Save file
	filePath, err := saveVisitorDocumentFile(file, header, userID.(uint), documentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	// Create or update document record
	now := time.Now()
	document := models.Document{
		UserID:      userID.(uint),
		Type:        documentType,
		Name:        header.Filename, // Use Name instead of Filename
		FilePath:    filePath,
		Status:      models.DocumentStatusPending,
		Description: description,
		UploadedAt:  now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// If updating existing document, preserve ID
	if existingDoc.ID != 0 {
		document.ID = existingDoc.ID
		if err := db.DB.Save(&document).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document record"})
			return
		}
	} else {
		if err := db.DB.Create(&document).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document record"})
			return
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "Upload", "Document", document.ID,
		fmt.Sprintf("Visitor document uploaded: %s (%s)", documentType, header.Filename))

	// Check if all required documents are now uploaded
	var documentCount int64
	db.DB.Model(&models.Document{}).
		Where("user_id = ? AND type IN ? AND status != ?",
			userID, []string{models.DocumentTypeID, models.DocumentTypeProofAddress}, models.DocumentStatusRejected).
		Count(&documentCount)

	nextSteps := []string{
		"Document uploaded successfully",
		"Admin verification in progress (2-3 business days)",
	}

	if documentCount >= 2 {
		nextSteps = append(nextSteps, "All required documents uploaded - faster verification expected")
	} else {
		remainingTypes := getRemainingRequiredDocuments(userID.(uint))
		if len(remainingTypes) > 0 {
			nextSteps = append(nextSteps, fmt.Sprintf("Still need: %s", strings.Join(remainingTypes, ", ")))
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Document uploaded successfully",
		"document": gin.H{
			"id":          document.ID,
			"type":        document.Type,
			"name":        document.Name, // Use Name instead of Filename
			"status":      document.Status,
			"uploaded_at": document.UploadedAt,
		},
		"next_steps":            nextSteps,
		"verification_timeline": "2-3 business days",
	})
}

// VisitorCheckIn handles advanced check-in process with document verification
func VisitorCheckIn(c *gin.Context) {
	var req VisitorDocumentCheckIn
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find ticket
	var ticket models.Ticket
	if err := db.DB.Preload("Visitor").Where("ticket_number = ?", req.TicketNumber).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":         "Invalid ticket number",
			"ticket_number": req.TicketNumber,
		})
		return
	}

	// Validate ticket
	if !ticket.CanBeUsed() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Ticket cannot be used",
			"ticket_status": ticket.Status,
			"visit_date":    ticket.VisitDate.Format("2006-01-02"),
			"valid":         false,
		})
		return
	}

	// Begin transaction for check-in process
	tx := db.DB.Begin()

	// Process document photos (store for verification)
	now := time.Now()
	if req.IDDocument != "" {
		// Save ID document photo for check-in verification
		idDoc := models.Document{
			UserID:      ticket.VisitorID,
			Type:        "checkin_id",
			Name:        fmt.Sprintf("checkin_id_%s_%d.jpg", req.TicketNumber, now.Unix()), // Use Name instead of Filename
			FilePath:    "",                                                                // Would store base64 or save to file
			Status:      models.DocumentStatusPending,
			Description: "ID document provided at check-in",
			UploadedAt:  now,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := tx.Create(&idDoc).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process ID document"})
			return
		}
	}

	if req.ProofOfAddress != "" {
		// Save proof of address photo for check-in verification
		addressDoc := models.Document{
			UserID:      ticket.VisitorID,
			Type:        "checkin_address",
			Name:        fmt.Sprintf("checkin_address_%s_%d.jpg", req.TicketNumber, now.Unix()), // Use Name instead of Filename
			FilePath:    "",                                                                     // Would store base64 or save to file
			Status:      models.DocumentStatusPending,
			Description: "Proof of address provided at check-in",
			UploadedAt:  now,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := tx.Create(&addressDoc).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process address document"})
			return
		}
	}

	// Create visit record
	visit := models.Visit{
		VisitorID:     ticket.VisitorID,
		TicketID:      ticket.ID,
		CheckInTime:   now,
		CheckInMethod: req.CheckInMethod,
		Status:        "checked_in",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if req.StaffMemberID > 0 {
		visit.CheckedInBy = &req.StaffMemberID
	}

	if err := tx.Create(&visit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create visit record"})
		return
	}

	// Update ticket status
	ticket.Status = models.TicketStatusUsed
	ticket.UsedAt = &now
	if req.StaffMemberID > 0 {
		ticket.UsedBy = &req.StaffMemberID
	}
	ticket.UpdatedAt = now

	if err := tx.Save(&ticket).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	// Add to queue
	queuePosition := calculateVisitorQueuePosition(ticket.Category)
	queue := models.QueueEntry{
		VisitorID:        ticket.VisitorID,
		HelpRequestID:    ticket.HelpRequestID, // Use HelpRequestID instead of VisitID
		Reference:        ticket.TicketNumber,  // Use Reference field instead of TicketNumber
		Category:         ticket.Category,
		Position:         queuePosition,
		Status:           "waiting",
		JoinedAt:         now,
		CreatedAt:        now,
		UpdatedAt:        now,
		EstimatedMinutes: calculateEstimatedMinutes(queuePosition, ticket.Category), // Add estimated waiting time
	}

	if err := tx.Create(&queue).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to queue"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete check-in"})
		return
	}

	// Calculate wait time estimate
	estimatedWaitTime := calculateVisitorEstimatedWaitTime(queuePosition, ticket.Category)

	// Create audit log
	utils.CreateAuditLog(c, "CheckIn", "Visit", visit.ID,
		fmt.Sprintf("Visitor checked in: %s (Position: %d)", req.TicketNumber, queuePosition))

	c.JSON(http.StatusOK, gin.H{
		"message": "Check-in successful",
		"visit": gin.H{
			"id":            visit.ID,
			"ticket_number": ticket.TicketNumber,
			"check_in_time": visit.CheckInTime,
			"status":        visit.Status,
		},
		"queue": gin.H{
			"position":            queuePosition,
			"estimated_wait_time": estimatedWaitTime,
			"category":            ticket.Category,
			"status":              queue.Status,
		},
		"next_steps": []string{
			"You are now in the queue",
			"Please wait for your number to be called",
			"Estimated wait time: " + estimatedWaitTime,
		},
	})
}

// Helper functions

func saveVisitorDocumentFile(file multipart.File, header *multipart.FileHeader, userID uint, docType string) (string, error) {
	// Create upload directory
	uploadDir := fmt.Sprintf("uploads/visitor_documents/%d", userID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", err
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%d%s", docType, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	return filePath, nil
}

func isValidVisitorDocumentFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	allowedExts := []string{".pdf", ".jpg", ".jpeg", ".png"}

	for _, allowed := range allowedExts {
		if ext == allowed {
			return true
		}
	}
	return false
}

func getRemainingRequiredDocuments(userID uint) []string {
	var existingTypes []string
	var documents []models.Document

	db.DB.Where("user_id = ? AND status != ?", userID, models.DocumentStatusRejected).Find(&documents)

	for _, doc := range documents {
		existingTypes = append(existingTypes, doc.Type)
	}

	required := []string{models.DocumentTypeID, models.DocumentTypeProofAddress}
	var remaining []string

	for _, req := range required {
		found := false
		for _, existing := range existingTypes {
			if req == existing {
				found = true
				break
			}
		}
		if !found {
			remaining = append(remaining, req)
		}
	}

	return remaining
}

func calculateVisitorQueuePosition(category string) int {
	var count int64
	now := time.Now().Format("2006-01-02")

	db.DB.Model(&models.QueueEntry{}).
		Where("DATE(created_at) = ? AND category = ? AND status IN ?",
			now, category, []string{"waiting", "called"}).
		Count(&count)

	return int(count) + 1
}

func calculateVisitorEstimatedWaitTime(position int, category string) string {
	// Base service time estimates
	baseMinutes := 8 // minutes per person
	switch category {
	case "emergency":
		baseMinutes = 5
	case "food":
		baseMinutes = 10
	}

	estimatedMinutes := position * baseMinutes

	if estimatedMinutes < 60 {
		return fmt.Sprintf("%d minutes", estimatedMinutes)
	}

	hours := estimatedMinutes / 60
	minutes := estimatedMinutes % 60

	if minutes == 0 {
		return fmt.Sprintf("%d hour(s)", hours)
	}

	return fmt.Sprintf("%d hour(s) %d minutes", hours, minutes)
}

// Calculate estimated minutes based on queue position and category
func calculateEstimatedMinutes(position int, category string) int {
	// Base service time estimates in minutes
	baseMinutes := 8
	switch category {
	case "emergency":
		baseMinutes = 5
	case "food":
		baseMinutes = 10
	}

	return position * baseMinutes
}

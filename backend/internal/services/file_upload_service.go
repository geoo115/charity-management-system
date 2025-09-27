package services

import (
	"crypto/md5"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"gorm.io/gorm"
)

// FileUploadService handles file uploads and document management
type FileUploadService struct {
	db                          *gorm.DB
	uploadDir                   string
	maxFileSize                 int64 // in bytes
	allowedExtensions           map[string]bool
	allowedMimeTypes            map[string]bool
	realtimeNotificationService *RealtimeNotificationService
}

// UploadedFile represents an uploaded file
type UploadedFile struct {
	ID           uint      `json:"id"`
	OriginalName string    `json:"original_name"`
	FileName     string    `json:"file_name"`
	FilePath     string    `json:"file_path"`
	FileSize     int64     `json:"file_size"`
	MimeType     string    `json:"mime_type"`
	Extension    string    `json:"extension"`
	MD5Hash      string    `json:"md5_hash"`
	UploadedBy   uint      `json:"uploaded_by"`
	UploadedAt   time.Time `json:"uploaded_at"`
	Category     string    `json:"category"` // "document", "profile_picture", "verification", "report"
	Status       string    `json:"status"`   // "uploaded", "processing", "verified", "rejected"
	URL          string    `json:"url"`
}

// FileValidationResult represents file validation results
type FileValidationResult struct {
	IsValid bool     `json:"is_valid"`
	Errors  []string `json:"errors"`
	Size    int64    `json:"size"`
	Type    string   `json:"type"`
}

// NewFileUploadService creates a new file upload service
func NewFileUploadService() *FileUploadService {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Warning: Failed to create upload directory: %v", err)
	}

	// Create subdirectories
	subdirs := []string{"documents", "profiles", "verification", "reports", "temp"}
	for _, subdir := range subdirs {
		if err := os.MkdirAll(filepath.Join(uploadDir, subdir), 0755); err != nil {
			log.Printf("Warning: Failed to create subdirectory %s: %v", subdir, err)
		}
	}

	return &FileUploadService{
		db:          db.DB,
		uploadDir:   uploadDir,
		maxFileSize: 10 * 1024 * 1024, // 10MB default
		allowedExtensions: map[string]bool{
			".pdf":  true,
			".doc":  true,
			".docx": true,
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".gif":  true,
			".txt":  true,
			".csv":  true,
			".xlsx": true,
			".xls":  true,
		},
		allowedMimeTypes: map[string]bool{
			"application/pdf":    true,
			"application/msword": true,
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
			"image/jpeg":               true,
			"image/jpg":                true,
			"image/png":                true,
			"image/gif":                true,
			"text/plain":               true,
			"text/csv":                 true,
			"application/vnd.ms-excel": true,
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
		},
		realtimeNotificationService: GetGlobalRealtimeNotificationService(),
	}
}

// ValidateFile validates an uploaded file
func (fus *FileUploadService) ValidateFile(file *multipart.FileHeader) *FileValidationResult {
	result := &FileValidationResult{
		IsValid: true,
		Errors:  []string{},
		Size:    file.Size,
		Type:    file.Header.Get("Content-Type"),
	}

	// Check file size
	if file.Size > fus.maxFileSize {
		result.IsValid = false
		result.Errors = append(result.Errors, fmt.Sprintf("File size exceeds maximum allowed size of %d MB", fus.maxFileSize/(1024*1024)))
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !fus.allowedExtensions[ext] {
		result.IsValid = false
		result.Errors = append(result.Errors, fmt.Sprintf("File extension %s is not allowed", ext))
	}

	// Check MIME type
	mimeType := file.Header.Get("Content-Type")
	if !fus.allowedMimeTypes[mimeType] {
		result.IsValid = false
		result.Errors = append(result.Errors, fmt.Sprintf("File type %s is not allowed", mimeType))
	}

	// Check filename for security
	if strings.Contains(file.Filename, "..") || strings.Contains(file.Filename, "/") || strings.Contains(file.Filename, "\\") {
		result.IsValid = false
		result.Errors = append(result.Errors, "Invalid filename detected")
	}

	return result
}

// UploadFile uploads a file and saves it to the filesystem and database
func (fus *FileUploadService) UploadFile(file *multipart.FileHeader, userID uint, category string) (*UploadedFile, error) {
	// Validate file
	validation := fus.ValidateFile(file)
	if !validation.IsValid {
		return nil, fmt.Errorf("file validation failed: %s", strings.Join(validation.Errors, ", "))
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Calculate MD5 hash
	hash := md5.New()
	if _, err := io.Copy(hash, src); err != nil {
		return nil, fmt.Errorf("failed to calculate file hash: %w", err)
	}
	md5Hash := fmt.Sprintf("%x", hash.Sum(nil))

	// Reset file reader
	src.Close()
	src, err = file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to reopen uploaded file: %w", err)
	}
	defer src.Close()

	// Check for duplicate files
	var existingDoc models.Document
	if err := fus.db.Where("md5_hash = ?", md5Hash).First(&existingDoc).Error; err == nil {
		return nil, fmt.Errorf("file already exists (duplicate detected)")
	}

	// Generate unique filename
	ext := strings.ToLower(filepath.Ext(file.Filename))
	timestamp := time.Now().Format("20060102_150405")
	uniqueFileName := fmt.Sprintf("%d_%s_%s%s", userID, timestamp, generateRandomString(8), ext)

	// Determine subdirectory based on category
	subdir := fus.getCategorySubdir(category)
	fullPath := filepath.Join(fus.uploadDir, subdir, uniqueFileName)

	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(fullPath) // Clean up on error
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Create database record
	document := models.Document{
		UserID:     userID,
		Name:       file.Filename,
		Type:       category,
		FilePath:   fullPath,
		FileType:   file.Header.Get("Content-Type"),
		FileSize:   file.Size,
		Status:     "uploaded",
		UploadedAt: time.Now(),
		Checksum:   md5Hash,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := fus.db.Create(&document).Error; err != nil {
		os.Remove(fullPath) // Clean up on error
		return nil, fmt.Errorf("failed to save file record: %w", err)
	}

	// Generate file URL
	fileURL := fmt.Sprintf("/api/v1/files/%d", document.ID)

	uploadedFile := &UploadedFile{
		ID:           document.ID,
		OriginalName: file.Filename,
		FileName:     uniqueFileName,
		FilePath:     fullPath,
		FileSize:     file.Size,
		MimeType:     file.Header.Get("Content-Type"),
		Extension:    ext,
		MD5Hash:      md5Hash,
		UploadedBy:   userID,
		UploadedAt:   document.UploadedAt,
		Category:     category,
		Status:       "uploaded",
		URL:          fileURL,
	}

	// Send notification for document uploads
	if category == "document" || category == "verification" {
		fus.realtimeNotificationService.SendDocumentStatusUpdate(userID, file.Filename, "uploaded")
	}

	log.Printf("File uploaded successfully: %s (ID: %d, User: %d)", file.Filename, document.ID, userID)
	return uploadedFile, nil
}

// GetFile retrieves file information by ID
func (fus *FileUploadService) GetFile(fileID uint) (*UploadedFile, error) {
	var document models.Document
	if err := fus.db.First(&document, fileID).Error; err != nil {
		return nil, fmt.Errorf("file not found")
	}

	fileURL := fmt.Sprintf("/api/v1/files/%d", document.ID)

	return &UploadedFile{
		ID:           document.ID,
		OriginalName: document.Name,
		FileName:     filepath.Base(document.FilePath),
		FilePath:     document.FilePath,
		FileSize:     document.FileSize,
		MimeType:     document.FileType,
		Extension:    strings.ToLower(filepath.Ext(document.Name)),
		MD5Hash:      document.Checksum,
		UploadedBy:   document.UserID,
		UploadedAt:   document.UploadedAt,
		Category:     document.Type,
		Status:       document.Status,
		URL:          fileURL,
	}, nil
}

// GetUserFiles retrieves all files uploaded by a user
func (fus *FileUploadService) GetUserFiles(userID uint, category string) ([]*UploadedFile, error) {
	var documents []models.Document
	query := fus.db.Where("user_id = ?", userID)

	if category != "" {
		query = query.Where("type = ?", category)
	}

	if err := query.Order("uploaded_at DESC").Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to get user files: %w", err)
	}

	var files []*UploadedFile
	for _, doc := range documents {
		fileURL := fmt.Sprintf("/api/v1/files/%d", doc.ID)

		files = append(files, &UploadedFile{
			ID:           doc.ID,
			OriginalName: doc.Name,
			FileName:     filepath.Base(doc.FilePath),
			FilePath:     doc.FilePath,
			FileSize:     doc.FileSize,
			MimeType:     doc.FileType,
			Extension:    strings.ToLower(filepath.Ext(doc.Name)),
			MD5Hash:      doc.Checksum,
			UploadedBy:   doc.UserID,
			UploadedAt:   doc.UploadedAt,
			Category:     doc.Type,
			Status:       doc.Status,
			URL:          fileURL,
		})
	}

	return files, nil
}

// UpdateFileStatus updates the status of a file (for verification workflow)
func (fus *FileUploadService) UpdateFileStatus(fileID uint, status string, adminUserID uint, notes string) error {
	var document models.Document
	if err := fus.db.First(&document, fileID).Error; err != nil {
		return fmt.Errorf("file not found")
	}

	oldStatus := document.Status
	document.Status = status

	if err := fus.db.Save(&document).Error; err != nil {
		return fmt.Errorf("failed to update file status: %w", err)
	}

	// Create verification result record
	verificationResult := models.DocumentVerificationResult{
		DocumentID: document.ID,
		VerifiedBy: adminUserID,
		Status:     status,
		Notes:      notes,
		VerifiedAt: time.Now(),
	}

	if err := fus.db.Create(&verificationResult).Error; err != nil {
		log.Printf("Failed to create verification result: %v", err)
	}

	// Send notification to user about status change
	if oldStatus != status {
		fus.realtimeNotificationService.SendDocumentStatusUpdate(document.UserID, document.Name, status)
	}

	log.Printf("File status updated: ID %d, Status: %s -> %s", fileID, oldStatus, status)
	return nil
}

// DeleteFile deletes a file from both filesystem and database
func (fus *FileUploadService) DeleteFile(fileID uint, userID uint) error {
	var document models.Document
	if err := fus.db.First(&document, fileID).Error; err != nil {
		return fmt.Errorf("file not found")
	}

	// Check if user owns the file or is admin
	if document.UserID != userID {
		// Check if user has admin role
		var user models.User
		if err := fus.db.Select("role").Where("id = ?", userID).First(&user).Error; err != nil {
			return fmt.Errorf("failed to verify user permissions")
		}

		if user.Role != "Admin" {
			return fmt.Errorf("unauthorized to delete this file")
		}
	}

	// Delete physical file
	if err := os.Remove(document.FilePath); err != nil {
		log.Printf("Warning: Failed to delete physical file %s: %v", document.FilePath, err)
	}

	// Delete database record
	if err := fus.db.Delete(&document).Error; err != nil {
		return fmt.Errorf("failed to delete file record: %w", err)
	}

	log.Printf("File deleted: ID %d, Path: %s", fileID, document.FilePath)
	return nil
}

// GetFileContent returns the file content for download
func (fus *FileUploadService) GetFileContent(fileID uint) (*os.File, *UploadedFile, error) {
	fileInfo, err := fus.GetFile(fileID)
	if err != nil {
		return nil, nil, err
	}

	file, err := os.Open(fileInfo.FilePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open file: %w", err)
	}

	return file, fileInfo, nil
}

// CleanupOldFiles removes old temporary files and orphaned files
func (fus *FileUploadService) CleanupOldFiles() error {
	// Clean up files older than 30 days in temp directory
	tempDir := filepath.Join(fus.uploadDir, "temp")
	cutoffTime := time.Now().AddDate(0, 0, -30)

	err := filepath.Walk(tempDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && info.ModTime().Before(cutoffTime) {
			if err := os.Remove(path); err != nil {
				log.Printf("Failed to remove old temp file %s: %v", path, err)
			} else {
				log.Printf("Removed old temp file: %s", path)
			}
		}

		return nil
	})

	if err != nil {
		log.Printf("Error during temp file cleanup: %v", err)
	}

	// Clean up orphaned database records (files that don't exist on disk)
	var documents []models.Document
	if err := fus.db.Find(&documents).Error; err != nil {
		return fmt.Errorf("failed to get documents for cleanup: %w", err)
	}

	for _, doc := range documents {
		if _, err := os.Stat(doc.FilePath); os.IsNotExist(err) {
			log.Printf("Removing orphaned database record for missing file: %s", doc.FilePath)
			fus.db.Delete(&doc)
		}
	}

	return nil
}

// GetStorageStats returns storage usage statistics
func (fus *FileUploadService) GetStorageStats() (map[string]interface{}, error) {
	stats := map[string]interface{}{
		"total_files": 0,
		"total_size":  int64(0),
		"by_category": map[string]int{},
		"by_status":   map[string]int{},
		"by_type":     map[string]int{},
	}

	var documents []models.Document
	if err := fus.db.Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to get documents for stats: %w", err)
	}

	stats["total_files"] = len(documents)

	var totalSize int64
	categoryCount := make(map[string]int)
	statusCount := make(map[string]int)
	typeCount := make(map[string]int)

	for _, doc := range documents {
		totalSize += doc.FileSize
		categoryCount[doc.Type]++
		statusCount[doc.Status]++

		ext := strings.ToLower(filepath.Ext(doc.Name))
		typeCount[ext]++
	}

	stats["total_size"] = totalSize
	stats["by_category"] = categoryCount
	stats["by_status"] = statusCount
	stats["by_type"] = typeCount

	return stats, nil
}

// getCategorySubdir returns the subdirectory for a file category
func (fus *FileUploadService) getCategorySubdir(category string) string {
	switch category {
	case "profile_picture":
		return "profiles"
	case "verification":
		return "verification"
	case "report":
		return "reports"
	case "document":
		return "documents"
	default:
		return "documents"
	}
}

// generateRandomString generates a random string for unique filenames
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := range result {
		result[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(result)
}

// GetGlobalFileUploadService returns the global file upload service instance
var globalFileUploadService *FileUploadService

func GetGlobalFileUploadService() *FileUploadService {
	if globalFileUploadService == nil {
		globalFileUploadService = NewFileUploadService()
	}
	return globalFileUploadService
}

package volunteer

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// HandleGetVolunteerNotes retrieves all notes for a volunteer
func HandleGetVolunteerNotes(c *gin.Context) {
	volunteerID := c.Param("volunteerId")

	var notes []models.UserNote
	if err := db.DB.Where("user_id = ? AND type = ?", volunteerID, "volunteer").
		Preload("Author").
		Order("created_at DESC").
		Find(&notes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": notes})
}

// HandleCreateVolunteerNote creates a new note for a volunteer
func HandleCreateVolunteerNote(c *gin.Context) {
	volunteerID := c.Param("volunteerId")

	var req struct {
		Content   string `json:"content" binding:"required"`
		Category  string `json:"category"`
		IsPrivate bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Convert volunteerID string to uint
	volunteerIDUint, err := strconv.ParseUint(volunteerID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	note := models.UserNote{
		UserID:    uint(volunteerIDUint),
		AuthorID:  userID.(uint),
		Content:   req.Content,
		Type:      "volunteer",
		Category:  req.Category,
		IsPrivate: req.IsPrivate,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := db.DB.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Note created successfully", "note": note})
}

// HandleUpdateVolunteerNote updates an existing note
func HandleUpdateVolunteerNote(c *gin.Context) {
	noteID := c.Param("noteId")

	var req struct {
		Content   string `json:"content"`
		Category  string `json:"category"`
		IsPrivate bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var note models.UserNote
	if err := db.DB.First(&note, noteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if note.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this note"})
		return
	}

	note.Content = req.Content
	note.Category = req.Category
	note.IsPrivate = req.IsPrivate
	note.UpdatedAt = time.Now()

	if err := db.DB.Save(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note updated successfully", "note": note})
}

// HandleDeleteVolunteerNote deletes a note
func HandleDeleteVolunteerNote(c *gin.Context) {
	noteID := c.Param("noteId")
	var note models.UserNote

	if err := db.DB.First(&note, noteID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
		return
	}

	// Get user ID from context - use consistent key
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user is the author of the note
	if note.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this note"})
		return
	}

	if err := db.DB.Delete(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// AddVolunteerNote creates a new note for a volunteer
func AddVolunteerNote(c *gin.Context) {
	// Get volunteer ID from URL parameter
	volunteerIDParam := c.Param("volunteer_id")
	volunteerIDUint, err := strconv.ParseUint(volunteerIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}
	volunteerID := uint(volunteerIDUint)

	var req struct {
		Content   string `json:"content" binding:"required"`
		Category  string `json:"category"`
		IsPrivate bool   `json:"is_private"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	note := models.UserNote{
		UserID:    volunteerID,
		AuthorID:  userID.(uint),
		Content:   req.Content,
		Type:      "volunteer",
		Category:  req.Category,
		IsPrivate: req.IsPrivate,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := db.DB.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Note created successfully", "note": note})
}

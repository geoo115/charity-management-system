package donor

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
)

// AdminUrgentNeedRequest represents the request body for creating or updating an urgent need by admin
type AdminUrgentNeedRequest struct {
	Name         string `json:"name" binding:"required"`               // Item name (e.g., "Phones", "Laptops")
	Category     string `json:"category" binding:"required"`           // General category for grouping
	Description  string `json:"description,omitempty"`                 // Detailed description
	CurrentStock int    `json:"current_stock" binding:"min=0"`         // Current inventory level
	TargetStock  int    `json:"target_stock" binding:"required,min=1"` // Target inventory level
	Urgency      string `json:"urgency,omitempty"`                     // Low, Medium, High, Critical
	Status       string `json:"status,omitempty"`
	DueDate      string `json:"due_date,omitempty"`
	Notes        string `json:"notes,omitempty"`
	IsPublic     bool   `json:"is_public"` // Whether to show on public website
	AssignedTo   *uint  `json:"assigned_to,omitempty"`
}

// UrgentNeedResponse represents the enhanced response structure for inventory tracking
type UrgentNeedResponse struct {
	ID              uint       `json:"id"`
	Name            string     `json:"name"`             // Item name (e.g., "Phones", "Laptops")
	Category        string     `json:"category"`         // General category
	Description     string     `json:"description"`      // Detailed description
	CurrentStock    int        `json:"current_stock"`    // Current inventory level
	TargetStock     int        `json:"target_stock"`     // Target inventory level
	QuantityNeeded  int        `json:"quantity_needed"`  // Calculated: target - current
	StockPercentage float64    `json:"stock_percentage"` // Calculated: (current/target) * 100
	Urgency         string     `json:"urgency"`          // Low, Medium, High, Critical
	Status          string     `json:"status"`
	DueDate         *time.Time `json:"due_date"`
	Notes           string     `json:"notes"`
	IsPublic        bool       `json:"is_public"`
	LastUpdated     time.Time  `json:"last_updated"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	RequestedBy     uint       `json:"requested_by"`
	AssignedTo      *uint      `json:"assigned_to"`
}

// ListUrgentNeeds returns all active urgent needs (public endpoint)
func ListUrgentNeeds(c *gin.Context) {
	var urgentNeeds []models.UrgentNeed
	query := db.DB.Where("status = ?", "active")

	// Filter by urgency if specified
	if urgency := c.Query("urgency"); urgency != "" {
		query = query.Where("urgency = ?", urgency)
	}

	// Filter by category if specified
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Order by urgency: Critical > High > Medium > Low
	query = query.Order(
		"CASE urgency " +
			"WHEN 'Critical' THEN 1 " +
			"WHEN 'High' THEN 2 " +
			"WHEN 'Medium' THEN 3 " +
			"WHEN 'Low' THEN 4 " +
			"ELSE 5 END")

	if err := query.Find(&urgentNeeds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve urgent needs",
		})
		return
	}

	// Transform for response
	response := make([]gin.H, len(urgentNeeds))
	for i, need := range urgentNeeds {
		response[i] = gin.H{
			"id":            need.ID,
			"name":          need.Name,
			"category":      need.Category,
			"description":   need.Description,
			"current_stock": need.CurrentStock,
			"target_stock":  need.TargetStock,
			"urgency":       need.Urgency,
			"status":        need.Status,
			"due_date":      need.DueDate,
			"notes":         need.Notes,
			"is_public":     need.IsPublic,
			"last_updated":  need.LastUpdated,
			"created_at":    need.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, response)
}

// AdminListUrgentNeeds returns all urgent needs for admin management
func AdminListUrgentNeeds(c *gin.Context) {
	var urgentNeeds []models.UrgentNeed

	// Admin can see all urgent needs regardless of status or visibility
	query := db.GetDB().Preload("RequestedByUser").Preload("AssignedToUser").Preload("FulfilledByUser")

	// Apply filters from query parameters
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	urgency := c.Query("urgency")
	if urgency != "" {
		query = query.Where("urgency = ?", urgency)
	}

	category := c.Query("category")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Order("created_at DESC").Find(&urgentNeeds).Error; err != nil {
		utils.CreateAuditLog(c, "ListUrgentNeeds", "UrgentNeed", 0, "Failed to fetch urgent needs")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch urgent needs"})
		return
	}

	// Log the admin access
	utils.CreateAuditLog(c, "ListUrgentNeeds", "UrgentNeed", 0, fmt.Sprintf("Admin viewed %d urgent needs", len(urgentNeeds)))

	c.JSON(http.StatusOK, gin.H{
		"data":  urgentNeeds,
		"count": len(urgentNeeds),
	})
}

// GetUrgentNeed returns a specific urgent need by ID (public endpoint)
func GetUrgentNeed(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var urgentNeed models.UrgentNeed
	// Only show active, public urgent needs
	if err := db.GetDB().Where("status = ? AND is_public = ?", "active", true).First(&urgentNeed, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Urgent need not found"})
		return
	}

	response := UrgentNeedResponse{
		ID:              urgentNeed.ID,
		Name:            urgentNeed.Name,
		Category:        urgentNeed.Category,
		Description:     urgentNeed.Description,
		CurrentStock:    urgentNeed.CurrentStock,
		TargetStock:     urgentNeed.TargetStock,
		QuantityNeeded:  urgentNeed.GetQuantityNeeded(),
		StockPercentage: urgentNeed.GetStockPercentage(),
		Urgency:         urgentNeed.Urgency,
		Status:          urgentNeed.Status,
		DueDate:         urgentNeed.DueDate,
		Notes:           urgentNeed.Notes,
		IsPublic:        urgentNeed.IsPublic,
		LastUpdated:     urgentNeed.LastUpdated,
		CreatedAt:       urgentNeed.CreatedAt,
		UpdatedAt:       urgentNeed.UpdatedAt,
		RequestedBy:     urgentNeed.RequestedBy,
		AssignedTo:      urgentNeed.AssignedTo,
	}

	c.JSON(http.StatusOK, gin.H{
		"data": response,
	})
}

// AdminGetUrgentNeed returns a specific urgent need by ID for admin management
func AdminGetUrgentNeed(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var urgentNeed models.UrgentNeed
	if err := db.GetDB().Preload("RequestedByUser").Preload("AssignedToUser").Preload("FulfilledByUser").First(&urgentNeed, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Urgent need not found"})
		return
	}

	// Log admin access
	utils.CreateAuditLog(c, "GetUrgentNeed", "UrgentNeed", urgentNeed.ID, "Admin viewed urgent need details")

	c.JSON(http.StatusOK, urgentNeed)
}

// AdminCreateUrgentNeed creates a new urgent need (admin only)
func AdminCreateUrgentNeed(c *gin.Context) {
	var req AdminUrgentNeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Create urgent need with enhanced inventory management
	urgentNeed := models.UrgentNeed{
		Name:         req.Name,
		Category:     req.Category,
		Description:  req.Description,
		CurrentStock: req.CurrentStock,
		TargetStock:  req.TargetStock,
		Status:       "active",
		IsPublic:     req.IsPublic,
		RequestedBy:  userID.(uint),
		AssignedTo:   req.AssignedTo,
		Notes:        req.Notes,
	}

	// Auto-calculate urgency from stock levels if not provided
	if req.Urgency == "" {
		urgentNeed.UpdateUrgencyFromStock()
	} else {
		urgentNeed.Urgency = req.Urgency
	}

	// Set status from request if provided, otherwise default to active
	if req.Status != "" {
		urgentNeed.Status = req.Status
	}

	// Parse due date if provided
	if req.DueDate != "" {
		dueDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due date format. Use YYYY-MM-DD"})
			return
		}
		urgentNeed.DueDate = &dueDate
	}

	// Validate urgency levels
	validUrgencies := map[string]bool{
		"Low":      true,
		"Medium":   true,
		"High":     true,
		"Critical": true,
	}
	if req.Urgency != "" && !validUrgencies[req.Urgency] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid urgency. Must be one of: Low, Medium, High, Critical"})
		return
	}

	// Validate category (simplified categories)
	validCategories := map[string]bool{
		"Electronics": true,
		"Clothing":    true,
		"Food":        true,
		"Medical":     true,
		"Education":   true,
		"Household":   true,
		"Other":       true,
	}
	if !validCategories[req.Category] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category. Must be one of: Electronics, Clothing, Food, Medical, Education, Household, Other"})
		return
	}

	// Save to database
	if err := db.GetDB().Create(&urgentNeed).Error; err != nil {
		utils.CreateAuditLog(c, "CreateUrgentNeed", "UrgentNeed", 0, "Failed to create urgent need")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create urgent need"})
		return
	}

	// Log successful creation
	utils.CreateAuditLog(c, "CreateUrgentNeed", "UrgentNeed", urgentNeed.ID, fmt.Sprintf("Admin created urgent need: %s", urgentNeed.Name))

	// Return created urgent need with preloaded relationships
	var createdUrgentNeed models.UrgentNeed
	db.GetDB().Preload("RequestedByUser").Preload("AssignedToUser").First(&createdUrgentNeed, urgentNeed.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Urgent need created successfully",
		"data":    createdUrgentNeed,
	})
}

// AdminUpdateUrgentNeed updates an existing urgent need (admin only)
func AdminUpdateUrgentNeed(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req AdminUrgentNeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var urgentNeed models.UrgentNeed
	if err := db.GetDB().First(&urgentNeed, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Urgent need not found"})
		return
	}

	// Validate urgency if provided
	if req.Urgency != "" {
		validUrgencies := map[string]bool{
			"Low":      true,
			"Medium":   true,
			"High":     true,
			"Critical": true,
		}
		if !validUrgencies[req.Urgency] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid urgency. Must be one of: Low, Medium, High, Critical"})
			return
		}
	}

	// Update fields - only update non-empty values
	if req.Name != "" {
		urgentNeed.Name = req.Name
	}
	if req.Category != "" {
		urgentNeed.Category = req.Category
	}
	if req.Description != "" {
		urgentNeed.Description = req.Description
	}
	if req.CurrentStock >= 0 {
		urgentNeed.CurrentStock = req.CurrentStock
	}
	if req.TargetStock > 0 {
		urgentNeed.TargetStock = req.TargetStock
	}
	// Auto-update urgency when stock levels change
	if req.CurrentStock >= 0 || req.TargetStock > 0 {
		urgentNeed.UpdateUrgencyFromStock()
	}
	if req.Urgency != "" {
		urgentNeed.Urgency = req.Urgency
	}
	if req.Status != "" {
		urgentNeed.Status = req.Status
		// Handle fulfilled status
		if req.Status == "fulfilled" {
			now := time.Now()
			urgentNeed.FulfilledAt = &now
			userID, _ := c.Get("userID")
			if userID != nil {
				uid := userID.(uint)
				urgentNeed.FulfilledBy = &uid
			}
		}
	}
	if req.AssignedTo != nil {
		urgentNeed.AssignedTo = req.AssignedTo
	}
	if req.DueDate != "" {
		dueDate, err := time.Parse("2006-01-02", req.DueDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due date format. Use YYYY-MM-DD"})
			return
		}
		urgentNeed.DueDate = &dueDate
	}
	if req.Notes != "" {
		urgentNeed.Notes = req.Notes
	}
	// Update IsPublic (boolean field)
	urgentNeed.IsPublic = req.IsPublic

	// Save changes
	if err := db.GetDB().Save(&urgentNeed).Error; err != nil {
		utils.CreateAuditLog(c, "UpdateUrgentNeed", "UrgentNeed", urgentNeed.ID, "Failed to update urgent need")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update urgent need"})
		return
	}

	// Log successful update
	utils.CreateAuditLog(c, "UpdateUrgentNeed", "UrgentNeed", urgentNeed.ID, fmt.Sprintf("Admin updated urgent need: %s", urgentNeed.Name))

	// Return updated urgent need with preloaded relationships
	var updatedUrgentNeed models.UrgentNeed
	db.GetDB().Preload("RequestedByUser").Preload("AssignedToUser").Preload("FulfilledByUser").First(&updatedUrgentNeed, urgentNeed.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Urgent need updated successfully",
		"data":    updatedUrgentNeed,
	})
}

// AdminDeleteUrgentNeed deletes an urgent need (admin only)
func AdminDeleteUrgentNeed(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var urgentNeed models.UrgentNeed
	if err := db.GetDB().First(&urgentNeed, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Urgent need not found"})
		return
	}

	// Store info for audit log before deletion
	category := urgentNeed.Category
	urgentNeedID := urgentNeed.ID

	if err := db.GetDB().Delete(&urgentNeed).Error; err != nil {
		utils.CreateAuditLog(c, "DeleteUrgentNeed", "UrgentNeed", urgentNeedID, "Failed to delete urgent need")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete urgent need"})
		return
	}

	// Log successful deletion
	utils.CreateAuditLog(c, "DeleteUrgentNeed", "UrgentNeed", urgentNeedID, fmt.Sprintf("Admin deleted urgent need: %s", category))

	c.JSON(http.StatusOK, gin.H{"message": "Urgent need deleted successfully"})
}

// GetVisitorRelevantUrgentNeeds is simplified - just returns public urgent needs
// This endpoint is kept for backward compatibility but simplified
func GetVisitorRelevantUrgentNeeds(c *gin.Context) {
	var urgentNeeds []models.UrgentNeed
	query := db.GetDB().Where("status = ? AND is_public = ?", "active", true)

	// Filter by category if specified
	category := c.Query("category")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Order("urgency DESC, created_at DESC").Limit(10).Find(&urgentNeeds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch urgent needs"})
		return
	}

	// Convert to response format
	var response []UrgentNeedResponse
	for _, need := range urgentNeeds {
		response = append(response, UrgentNeedResponse{
			ID:              need.ID,
			Name:            need.Name,
			Category:        need.Category,
			Description:     need.Description,
			CurrentStock:    need.CurrentStock,
			TargetStock:     need.TargetStock,
			QuantityNeeded:  need.GetQuantityNeeded(),
			StockPercentage: need.GetStockPercentage(),
			Urgency:         need.Urgency,
			Status:          need.Status,
			DueDate:         need.DueDate,
			Notes:           need.Notes,
			IsPublic:        need.IsPublic,
			LastUpdated:     need.LastUpdated,
			CreatedAt:       need.CreatedAt,
			UpdatedAt:       need.UpdatedAt,
			RequestedBy:     need.RequestedBy,
			AssignedTo:      need.AssignedTo,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  response,
		"count": len(response),
	})
}

package admin

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// SupportTicketResponse represents a support ticket response
type SupportTicketResponse struct {
	ID          uint                     `json:"id"`
	UserID      uint                     `json:"user_id"`
	Subject     string                   `json:"subject"`
	Description string                   `json:"description"`
	Priority    string                   `json:"priority"`
	Status      string                   `json:"status"`
	Category    string                   `json:"category"`
	AssignedTo  *uint                    `json:"assigned_to"`
	CreatedAt   string                   `json:"created_at"`
	UpdatedAt   string                   `json:"updated_at"`
	ClosedAt    *string                  `json:"closed_at"`
	Messages    []SupportMessageResponse `json:"messages,omitempty"`
}

// SupportMessageResponse represents a support ticket message response
type SupportMessageResponse struct {
	ID         uint   `json:"id"`
	TicketID   uint   `json:"ticket_id"`
	UserID     uint   `json:"user_id"`
	UserName   string `json:"user_name"`
	Content    string `json:"content"`
	IsInternal bool   `json:"is_internal"`
	CreatedAt  string `json:"created_at"`
}

// AdminUpdateTicketRequest represents admin ticket update request
type AdminUpdateTicketRequest struct {
	Status     *string `json:"status"`
	Priority   *string `json:"priority"`
	AssignedTo *uint   `json:"assigned_to"`
}

// AdminTicketMessageRequest represents admin ticket message request
type AdminTicketMessageRequest struct {
	Content    string `json:"content" binding:"required,min=1"`
	IsInternal bool   `json:"is_internal"`
}

// GetAllSupportTickets handles getting all support tickets for admin
func GetAllSupportTickets(c *gin.Context) {
	adminIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var adminID uint
	switch v := adminIDInterface.(type) {
	case uint:
		adminID = v
	case float64:
		adminID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}
	_ = adminID // Admin access verified, but ID not needed for this operation

	// Parse query parameters
	status := c.Query("status")
	priority := c.Query("priority")
	category := c.Query("category")

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	database := db.GetDB()

	// Build query with filters
	query := database.Model(&models.SupportTicket{}).
		Preload("Volunteer").
		Preload("AssignedUser").
		Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var tickets []models.SupportTicket
	if err := query.Limit(limit).Offset(offset).Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get support tickets"})
		return
	}

	// Convert to response format
	response := make([]SupportTicketResponse, len(tickets))
	for i, ticket := range tickets {
		response[i] = SupportTicketResponse{
			ID:          ticket.ID,
			UserID:      ticket.UserID,
			Subject:     ticket.Subject,
			Description: ticket.Description,
			Priority:    ticket.Priority,
			Status:      ticket.Status,
			Category:    ticket.Category,
			AssignedTo:  ticket.AssignedTo,
			CreatedAt:   ticket.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:   ticket.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if ticket.ClosedAt != nil {
			closedAt := ticket.ClosedAt.Format("2006-01-02T15:04:05Z07:00")
			response[i].ClosedAt = &closedAt
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": response,
		"total":   len(response),
	})
}

// GetSupportTicket handles getting a specific support ticket for admin
func GetSupportTicket(c *gin.Context) {
	adminIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var adminID uint
	switch v := adminIDInterface.(type) {
	case uint:
		adminID = v
	case float64:
		adminID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}
	_ = adminID // Admin access verified, but ID not needed for this operation

	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	database := db.GetDB()
	var ticket models.SupportTicket

	if err := database.Preload("User").
		Preload("AssignedUser").
		Preload("Messages").
		Preload("Messages.User").
		First(&ticket, uint(ticketID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// Convert to response format
	response := SupportTicketResponse{
		ID:          ticket.ID,
		UserID:      ticket.UserID,
		Subject:     ticket.Subject,
		Description: ticket.Description,
		Priority:    ticket.Priority,
		Status:      ticket.Status,
		Category:    ticket.Category,
		AssignedTo:  ticket.AssignedTo,
		CreatedAt:   ticket.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   ticket.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if ticket.ClosedAt != nil {
		closedAt := ticket.ClosedAt.Format("2006-01-02T15:04:05Z07:00")
		response.ClosedAt = &closedAt
	}

	// Add messages if they exist
	for _, msg := range ticket.Messages {
		messageResponse := SupportMessageResponse{
			ID:         msg.ID,
			TicketID:   msg.TicketID,
			UserID:     msg.UserID,
			Content:    msg.Content,
			IsInternal: msg.IsInternal,
			CreatedAt:  msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		// Add user name if available
		if msg.User != nil {
			messageResponse.UserName = msg.User.FirstName + " " + msg.User.LastName
		}

		response.Messages = append(response.Messages, messageResponse)
	}

	c.JSON(http.StatusOK, gin.H{
		"ticket": response,
	})
}

// UpdateSupportTicket handles updating a support ticket (admin only)
func UpdateSupportTicket(c *gin.Context) {
	adminIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var adminID uint
	switch v := adminIDInterface.(type) {
	case uint:
		adminID = v
	case float64:
		adminID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}
	_ = adminID // Admin access verified, but ID not needed for this operation

	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var req AdminUpdateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database := db.GetDB()

	// Build update data
	updateData := make(map[string]interface{})
	if req.Status != nil {
		updateData["status"] = *req.Status
		if *req.Status == "closed" || *req.Status == "resolved" {
			now := time.Now()
			if *req.Status == "resolved" {
				updateData["resolved_at"] = &now
			}
			if *req.Status == "closed" {
				updateData["closed_at"] = &now
			}
		}
	}
	if req.Priority != nil {
		updateData["priority"] = *req.Priority
	}
	if req.AssignedTo != nil {
		updateData["assigned_to"] = *req.AssignedTo
	}

	// Update the ticket
	if err := database.Model(&models.SupportTicket{}).
		Where("id = ?", uint(ticketID)).
		Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	// Get the updated ticket
	var ticket models.SupportTicket
	if err := database.Preload("User").
		Preload("AssignedUser").
		First(&ticket, uint(ticketID)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated ticket"})
		return
	}

	// Convert to response format
	response := SupportTicketResponse{
		ID:          ticket.ID,
		UserID:      ticket.UserID,
		Subject:     ticket.Subject,
		Description: ticket.Description,
		Priority:    ticket.Priority,
		Status:      ticket.Status,
		Category:    ticket.Category,
		AssignedTo:  ticket.AssignedTo,
		CreatedAt:   ticket.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   ticket.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if ticket.ClosedAt != nil {
		closedAt := ticket.ClosedAt.Format("2006-01-02T15:04:05Z07:00")
		response.ClosedAt = &closedAt
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Ticket updated successfully",
		"ticket":  response,
	})
}

// AddMessageToTicket handles adding a message to a support ticket (admin)
func AddMessageToTicket(c *gin.Context) {
	adminIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var adminID uint
	switch v := adminIDInterface.(type) {
	case uint:
		adminID = v
	case float64:
		adminID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}

	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var req AdminTicketMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database := db.GetDB()

	// Create new ticket message
	message := models.TicketMessage{
		TicketID:   uint(ticketID),
		UserID:     adminID,
		Content:    req.Content,
		IsInternal: req.IsInternal,
	}

	if err := database.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add message"})
		return
	}

	// Load the user information
	if err := database.Preload("User").First(&message, message.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load message details"})
		return
	}

	// Convert to response format
	response := SupportMessageResponse{
		ID:         message.ID,
		TicketID:   message.TicketID,
		UserID:     message.UserID,
		Content:    message.Content,
		IsInternal: message.IsInternal,
		CreatedAt:  message.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if message.User != nil {
		response.UserName = message.User.FirstName + " " + message.User.LastName
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Message added successfully",
		"data":    response,
	})
}

// AssignSupportTicket handles assigning a support ticket to an admin
func AssignSupportTicket(c *gin.Context) {
	adminIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var adminID uint
	switch v := adminIDInterface.(type) {
	case uint:
		adminID = v
	case float64:
		adminID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}
	_ = adminID // Admin access verified, but ID not needed for this operation

	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var req struct {
		AssignedTo uint `json:"assigned_to" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database := db.GetDB()
	updateData := map[string]interface{}{
		"assigned_to": req.AssignedTo,
		"status":      "assigned", // Auto-update status when assigning
	}

	if err := database.Model(&models.SupportTicket{}).
		Where("id = ?", uint(ticketID)).
		Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Ticket assigned successfully",
		"ticket_id":   uint(ticketID),
		"assigned_to": req.AssignedTo,
	})
}

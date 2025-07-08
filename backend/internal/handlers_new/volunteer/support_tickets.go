package volunteer

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// SupportTicketRequest represents a support ticket creation request
type SupportTicketRequest struct {
	Subject        string `json:"subject" binding:"required,min=1,max=200"`
	Description    string `json:"description" binding:"required,min=1"`
	Category       string `json:"category" binding:"required"`
	Priority       string `json:"priority"`
	AttachmentURL  string `json:"attachment_url"`
	AttachmentName string `json:"attachment_name"`
}

// SupportTicketResponse represents a support ticket response
type SupportTicketResponse struct {
	ID             uint                       `json:"id"`
	TicketNumber   string                     `json:"ticket_number"`
	Subject        string                     `json:"subject"`
	Description    string                     `json:"description"`
	Category       string                     `json:"category"`
	Priority       string                     `json:"priority"`
	Status         string                     `json:"status"`
	RequesterID    uint                       `json:"requester_id"`
	RequesterName  string                     `json:"requester_name"`
	AssigneeID     *uint                      `json:"assignee_id"`
	AssigneeName   string                     `json:"assignee_name"`
	AttachmentURL  string                     `json:"attachment_url"`
	AttachmentName string                     `json:"attachment_name"`
	Messages       []SupportTicketMessageResp `json:"messages"`
	CreatedAt      string                     `json:"created_at"`
	UpdatedAt      string                     `json:"updated_at"`
	ResolvedAt     string                     `json:"resolved_at"`
}

// SupportTicketMessageResp represents a support ticket message response
type SupportTicketMessageResp struct {
	ID             uint   `json:"id"`
	AuthorID       uint   `json:"author_id"`
	AuthorName     string `json:"author_name"`
	AuthorRole     string `json:"author_role"`
	Content        string `json:"content"`
	MessageType    string `json:"message_type"`
	AttachmentURL  string `json:"attachment_url"`
	AttachmentName string `json:"attachment_name"`
	IsInternal     bool   `json:"is_internal"`
	CreatedAt      string `json:"created_at"`
}

// CreateSupportTicket handles creating a new support ticket
func CreateSupportTicket(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	var req SupportTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default priority if not provided
	if req.Priority == "" {
		req.Priority = models.TicketPriorityMedium
	}

	// Generate ticket number
	var count int64
	db.DB.Model(&models.SupportTicket{}).Count(&count)
	ticketNumber := fmt.Sprintf("TICKET-%06d", count+1)

	// Create ticket
	ticket := &models.SupportTicket{
		TicketNo:    ticketNumber,
		Subject:     req.Subject,
		Description: req.Description,
		Category:    req.Category,
		Priority:    req.Priority,
		Status:      models.TicketStatusOpen,
		UserID:      userID,
	}

	if err := db.DB.Create(ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create support ticket"})
		return
	}

	// Create initial message with the description
	initialMessage := &models.TicketMessage{
		TicketID:    ticket.ID,
		UserID:      userID,
		Content:     req.Description,
		IsInternal:  false,
		IsSystemMsg: false,
	}

	if err := db.DB.Create(initialMessage).Error; err != nil {
		// Log error but don't fail the ticket creation
		log.Printf("Failed to create initial ticket message: %v", err)
	}

	// Load the created ticket with user information
	db.DB.Preload("User").
		Preload("AssignedUser").
		Preload("Messages.User").
		First(ticket, ticket.ID)

	// Convert to response format
	response := convertTicketToResponse(ticket)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Support ticket created successfully",
		"data":    response,
	})
}

// GetSupportTickets handles getting user's support tickets
func GetSupportTickets(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse pagination and filtering parameters
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	status := c.Query("status")
	category := c.Query("category")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	// Build query
	query := db.DB.Where("user_id = ?", userID).
		Preload("User").
		Preload("AssignedUser").
		Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	var tickets []models.SupportTicket
	var total int64

	// Get total count
	query.Model(&models.SupportTicket{}).Count(&total)

	// Get tickets with pagination
	if err := query.Limit(limit).Offset(offset).Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get support tickets"})
		return
	}

	// Convert to response format
	response := make([]SupportTicketResponse, len(tickets))
	for i, ticket := range tickets {
		response[i] = convertTicketToResponse(&ticket)
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": response,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetSupportTicket handles getting a specific support ticket
func GetSupportTicket(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	ticketIDStr := c.Param("ticketId")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var ticket models.SupportTicket
	if err := db.DB.Where("id = ? AND user_id = ?", ticketID, userID).
		Preload("User").
		Preload("AssignedUser").
		Preload("Messages.User").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Support ticket not found"})
		return
	}

	// Convert to response format
	response := convertTicketToResponse(&ticket)

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// AddSupportTicketMessage handles adding a message to a support ticket
func AddSupportTicketMessage(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case int:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	ticketIDStr := c.Param("ticketId")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var req struct {
		Content        string `json:"content" binding:"required,min=1"`
		MessageType    string `json:"message_type"`
		AttachmentURL  string `json:"attachment_url"`
		AttachmentName string `json:"attachment_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify the ticket exists and belongs to the user
	var ticket models.SupportTicket
	if err := db.DB.Where("id = ? AND user_id = ?", ticketID, userID).
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Support ticket not found"})
		return
	}

	// Default message type if not provided
	if req.MessageType == "" {
		req.MessageType = "reply"
	}

	// Create message
	message := &models.TicketMessage{
		TicketID:    uint(ticketID),
		UserID:      userID,
		Content:     req.Content,
		IsInternal:  false,
		IsSystemMsg: false,
	}

	if err := db.DB.Create(message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add message"})
		return
	}

	// Update ticket status if it was resolved
	if ticket.Status == models.TicketStatusResolved {
		db.DB.Model(&ticket).Update("status", models.TicketStatusOpen)
	}

	// Load the created message with user information
	db.DB.Preload("User").First(message, message.ID)

	// Convert to response format
	response := SupportTicketMessageResp{
		ID:         message.ID,
		AuthorID:   message.UserID,
		Content:    message.Content,
		IsInternal: message.IsInternal,
		CreatedAt:  message.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if message.User != nil {
		response.AuthorName = message.User.FirstName + " " + message.User.LastName
		response.AuthorRole = "volunteer"
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Message added successfully",
		"data":    response,
	})
}

// convertTicketToResponse converts a ticket model to response format
func convertTicketToResponse(ticket *models.SupportTicket) SupportTicketResponse {
	response := SupportTicketResponse{
		ID:           ticket.ID,
		TicketNumber: ticket.TicketNo,
		Subject:      ticket.Subject,
		Description:  ticket.Description,
		Category:     ticket.Category,
		Priority:     ticket.Priority,
		Status:       ticket.Status,
		RequesterID:  ticket.UserID,
		AssigneeID:   ticket.AssignedTo,
		CreatedAt:    ticket.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:    ticket.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if ticket.User != nil {
		response.RequesterName = ticket.User.FirstName + " " + ticket.User.LastName
	}

	if ticket.AssignedUser != nil {
		response.AssigneeName = ticket.AssignedUser.FirstName + " " + ticket.AssignedUser.LastName
	}

	if ticket.ResolvedAt != nil {
		response.ResolvedAt = ticket.ResolvedAt.Format("2006-01-02T15:04:05Z07:00")
	}

	// Convert messages
	for _, msg := range ticket.Messages {
		msgResp := SupportTicketMessageResp{
			ID:         msg.ID,
			AuthorID:   msg.UserID,
			Content:    msg.Content,
			IsInternal: msg.IsInternal,
			CreatedAt:  msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if msg.User != nil {
			msgResp.AuthorName = msg.User.FirstName + " " + msg.User.LastName
			// Determine role based on context
			if msg.UserID == ticket.UserID {
				msgResp.AuthorRole = "volunteer"
			} else {
				msgResp.AuthorRole = "admin"
			}
		}

		response.Messages = append(response.Messages, msgResp)
	}

	return response
}

package admin

import (
	"net/http"
	"strconv"

	"github.com/geoo115/charity-management-system/internal/services"
	"github.com/gin-gonic/gin"
)

// AdminMessageRequest represents an admin message request
type AdminMessageRequest struct {
	VolunteerID    uint   `json:"volunteer_id" binding:"required"`
	Content        string `json:"content" binding:"required,min=1"`
	MessageType    string `json:"message_type"`
	AttachmentURL  string `json:"attachment_url"`
	AttachmentName string `json:"attachment_name"`
	ReplyToID      *uint  `json:"reply_to_id"`
}

// MessageResponse represents a message response
type MessageResponse struct {
	ID             uint   `json:"id"`
	ConversationID uint   `json:"conversation_id"`
	SenderID       uint   `json:"sender_id"`
	SenderName     string `json:"sender_name"`
	RecipientID    uint   `json:"recipient_id"`
	Content        string `json:"content"`
	MessageType    string `json:"message_type"`
	AttachmentURL  string `json:"attachment_url"`
	AttachmentName string `json:"attachment_name"`
	IsRead         bool   `json:"is_read"`
	ReadAt         string `json:"read_at"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

// ConversationResponse represents a conversation response
type ConversationResponse struct {
	ID           uint              `json:"id"`
	Type         string            `json:"type"`
	Participants []ParticipantInfo `json:"participants"`
	LastMessage  *MessageResponse  `json:"last_message"`
	CreatedAt    string            `json:"created_at"`
	UpdatedAt    string            `json:"updated_at"`
}

// ParticipantInfo represents participant information
type ParticipantInfo struct {
	UserID    uint   `json:"user_id"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url"`
}

// SendMessageToVolunteer handles admin sending a message to a volunteer
func SendMessageToVolunteer(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var userID uint
	switch v := userIDInterface.(type) {
	case uint:
		userID = v
	case float64:
		userID = uint(v)
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID format"})
		return
	}

	var req AdminMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default message type if not provided
	if req.MessageType == "" {
		req.MessageType = "text"
	}

	messagingService := services.NewMessagingService()
	message, err := messagingService.SendMessage(
		userID,
		req.VolunteerID,
		req.Content,
		req.MessageType,
		req.AttachmentURL,
		req.AttachmentName,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Convert to response format
	response := MessageResponse{
		ID:             message.ID,
		ConversationID: message.ConversationID,
		SenderID:       message.SenderID,
		RecipientID:    message.RecipientID,
		Content:        message.Content,
		MessageType:    message.MessageType,
		AttachmentURL:  message.AttachmentURL,
		AttachmentName: message.AttachmentName,
		IsRead:         message.IsRead,
		CreatedAt:      message.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      message.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if message.Sender != nil {
		response.SenderName = message.Sender.FirstName + " " + message.Sender.LastName
	}

	if message.ReadAt != nil {
		response.ReadAt = message.ReadAt.Format("2006-01-02T15:04:05Z07:00")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Message sent successfully",
		"data":    response,
	})
}

// GetVolunteerConversation handles getting admin's conversation with a specific volunteer
func GetVolunteerConversation(c *gin.Context) {
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

	volunteerIDStr := c.Param("id")
	volunteerID, err := strconv.ParseUint(volunteerIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	// Parse pagination parameters
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

	messagingService := services.NewMessagingService()

	// Find or create conversation between admin and volunteer
	conversations, err := messagingService.GetConversations(adminID, 1, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
		return
	}

	var conversationID uint
	for _, conv := range conversations {
		for _, participant := range conv.Participants {
			if participant.UserID == uint(volunteerID) {
				conversationID = conv.ID
				break
			}
		}
		if conversationID != 0 {
			break
		}
	}

	// If no conversation exists, create one without creating an empty system message
	if conversationID == 0 {
		conv, err := messagingService.CreateConversation(adminID, uint(volunteerID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
			return
		}
		conversationID = conv.ID
	}

	// Get messages for the conversation
	messages, err := messagingService.GetMessages(conversationID, adminID, limit, offset)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied or conversation not found"})
		return
	}

	// Convert to response format
	response := make([]MessageResponse, len(messages))
	for i, msg := range messages {
		response[i] = MessageResponse{
			ID:             msg.ID,
			ConversationID: msg.ConversationID,
			SenderID:       msg.SenderID,
			RecipientID:    msg.RecipientID,
			Content:        msg.Content,
			MessageType:    msg.MessageType,
			AttachmentURL:  msg.AttachmentURL,
			AttachmentName: msg.AttachmentName,
			IsRead:         msg.IsRead,
			CreatedAt:      msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:      msg.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		if msg.Sender != nil {
			response[i].SenderName = msg.Sender.FirstName + " " + msg.Sender.LastName
		}

		if msg.ReadAt != nil {
			response[i].ReadAt = msg.ReadAt.Format("2006-01-02T15:04:05Z07:00")
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation_id": conversationID,
		"messages":        response,
		"total":           len(response),
	})
}

// GetAllConversations handles getting all admin conversations
func GetAllConversations(c *gin.Context) {
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

	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 20
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	messagingService := services.NewMessagingService()
	conversations, err := messagingService.GetConversations(adminID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
		return
	}

	// Convert to response format
	response := make([]ConversationResponse, len(conversations))
	for i, conv := range conversations {
		response[i] = ConversationResponse{
			ID:        conv.ID,
			Type:      conv.Type,
			CreatedAt: conv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: conv.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}

		// Add participants (volunteers)
		for _, participant := range conv.Participants {
			if participant.User != nil && participant.UserID != adminID {
				response[i].Participants = append(response[i].Participants, ParticipantInfo{
					UserID: participant.UserID,
					Name:   participant.User.FirstName + " " + participant.User.LastName,
					Role:   "volunteer",
				})
			}
		}

		// Add last message if exists
		if len(conv.Messages) > 0 {
			msg := conv.Messages[0]
			lastMessage := &MessageResponse{
				ID:             msg.ID,
				ConversationID: msg.ConversationID,
				SenderID:       msg.SenderID,
				RecipientID:    msg.RecipientID,
				Content:        msg.Content,
				MessageType:    msg.MessageType,
				AttachmentURL:  msg.AttachmentURL,
				AttachmentName: msg.AttachmentName,
				IsRead:         msg.IsRead,
				CreatedAt:      msg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				UpdatedAt:      msg.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			}

			if msg.Sender != nil {
				lastMessage.SenderName = msg.Sender.FirstName + " " + msg.Sender.LastName
			}

			if msg.ReadAt != nil {
				lastMessage.ReadAt = msg.ReadAt.Format("2006-01-02T15:04:05Z07:00")
			}

			response[i].LastMessage = lastMessage
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": response,
		"total":         len(response),
	})
}

// ReplyToVolunteer handles admin replying to a volunteer's message
func ReplyToVolunteer(c *gin.Context) {
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

	var req AdminMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Default message type if not provided
	if req.MessageType == "" {
		req.MessageType = "text"
	}

	messagingService := services.NewMessagingService()
	message, err := messagingService.SendMessage(
		adminID,
		req.VolunteerID,
		req.Content,
		req.MessageType,
		req.AttachmentURL,
		req.AttachmentName,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send reply"})
		return
	}

	// Convert to response format
	response := MessageResponse{
		ID:             message.ID,
		ConversationID: message.ConversationID,
		SenderID:       message.SenderID,
		RecipientID:    message.RecipientID,
		Content:        message.Content,
		MessageType:    message.MessageType,
		AttachmentURL:  message.AttachmentURL,
		AttachmentName: message.AttachmentName,
		IsRead:         message.IsRead,
		CreatedAt:      message.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      message.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if message.Sender != nil {
		response.SenderName = message.Sender.FirstName + " " + message.Sender.LastName
	}

	if message.ReadAt != nil {
		response.ReadAt = message.ReadAt.Format("2006-01-02T15:04:05Z07:00")
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Reply sent successfully",
		"data":    response,
	})
}

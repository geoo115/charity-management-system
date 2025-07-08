package volunteer

import (
	"net/http"
	"strconv"

	"github.com/geoo115/charity-management-system/internal/services"
	"github.com/gin-gonic/gin"
)

// MessageRequest represents a message request
type MessageRequest struct {
	RecipientID    uint   `json:"recipient_id" binding:"required"`
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

// SendMessage handles sending a message
func SendMessage(c *gin.Context) {
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

	var req MessageRequest
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
		req.RecipientID,
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

// GetConversations handles getting user's conversations
func GetConversations(c *gin.Context) {
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
	conversations, err := messagingService.GetConversations(userID, limit, offset)
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

		// Add participants
		for _, participant := range conv.Participants {
			if participant.User != nil && participant.UserID != userID {
				response[i].Participants = append(response[i].Participants, ParticipantInfo{
					UserID: participant.UserID,
					Name:   participant.User.FirstName + " " + participant.User.LastName,
					Role:   participant.Role,
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

// GetMessages handles getting messages for a conversation
func GetMessages(c *gin.Context) {
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

	conversationIDStr := c.Param("conversationId")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
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
	messages, err := messagingService.GetMessages(uint(conversationID), userID, limit, offset)
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
		"messages": response,
		"total":    len(response),
	})
}

// MarkMessageAsRead handles marking a message as read
func MarkMessageAsRead(c *gin.Context) {
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

	messageIDStr := c.Param("messageId")
	messageID, err := strconv.ParseUint(messageIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message ID"})
		return
	}

	messagingService := services.NewMessagingService()
	if err := messagingService.MarkMessageAsRead(uint(messageID), userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied or message not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message marked as read"})
}

// MarkConversationAsRead handles marking all messages in a conversation as read
func MarkConversationAsRead(c *gin.Context) {
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

	conversationIDStr := c.Param("conversationId")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
		return
	}

	messagingService := services.NewMessagingService()
	if err := messagingService.MarkConversationAsRead(uint(conversationID), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark conversation as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Conversation marked as read"})
}

// GetUnreadCount handles getting unread message count
func GetUnreadCount(c *gin.Context) {
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

	messagingService := services.NewMessagingService()
	count, err := messagingService.GetUnreadCount(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get unread count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

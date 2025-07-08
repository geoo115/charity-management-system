package services

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/websocket"
	"gorm.io/gorm"
)

// MessagingService handles messaging operations
type MessagingService struct {
	db *gorm.DB
}

// NewMessagingService creates a new messaging service
func NewMessagingService() *MessagingService {
	return &MessagingService{
		db: db.GetDB(),
	}
}

// SendMessage sends a message between users
func (s *MessagingService) SendMessage(senderID, recipientID uint, content, messageType string, attachmentURL, attachmentName string) (*models.Message, error) {
	// Find or create conversation
	conversation, err := s.findOrCreateConversation(senderID, recipientID)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create conversation: %w", err)
	}

	// Create message
	message := &models.Message{
		ConversationID: conversation.ID,
		SenderID:       senderID,
		RecipientID:    recipientID,
		Content:        content,
		MessageType:    messageType,
		AttachmentURL:  attachmentURL,
		AttachmentName: attachmentName,
	}

	if err := s.db.Create(message).Error; err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Update conversation last message time
	s.db.Model(conversation).Update("last_message_at", time.Now())

	// Load sender information for real-time notification
	s.db.Preload("Sender").First(message, message.ID)

	// Send real-time notification to recipient
	go s.sendRealTimeNotification(message)

	return message, nil
}

// GetConversations gets all conversations for a user
func (s *MessagingService) GetConversations(userID uint, limit, offset int) ([]models.Conversation, error) {
	var conversations []models.Conversation

	query := s.db.
		Joins("JOIN conversation_participants ON conversations.id = conversation_participants.conversation_id").
		Where("conversation_participants.user_id = ? AND conversation_participants.is_active = ?", userID, true).
		Preload("Participants.User").
		Order("conversations.last_message_at DESC NULLS LAST, conversations.created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&conversations).Error; err != nil {
		return nil, fmt.Errorf("failed to get conversations: %w", err)
	}

	// Get last message for each conversation
	for i := range conversations {
		var lastMessage models.Message
		if err := s.db.Where("conversation_id = ?", conversations[i].ID).
			Order("created_at DESC").
			Preload("Sender").
			First(&lastMessage).Error; err == nil {
			conversations[i].Messages = []models.Message{lastMessage}
		}
	}

	return conversations, nil
}

// GetMessages gets messages for a conversation
func (s *MessagingService) GetMessages(conversationID, userID uint, limit, offset int) ([]models.Message, error) {
	// Verify user is participant
	var participant models.ConversationParticipant
	if err := s.db.Where("conversation_id = ? AND user_id = ? AND is_active = ?",
		conversationID, userID, true).First(&participant).Error; err != nil {
		return nil, errors.New("user is not a participant in this conversation")
	}

	var messages []models.Message
	query := s.db.Where("conversation_id = ?", conversationID).
		Preload("Sender").
		Preload("ReplyTo.Sender").
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&messages).Error; err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, nil
}

// MarkMessageAsRead marks a message as read
func (s *MessagingService) MarkMessageAsRead(messageID, userID uint) error {
	var message models.Message
	if err := s.db.First(&message, messageID).Error; err != nil {
		return fmt.Errorf("message not found: %w", err)
	}

	if message.RecipientID != userID {
		return errors.New("unauthorized to mark this message as read")
	}

	now := time.Now()
	return s.db.Model(&message).Updates(models.Message{
		IsRead: true,
		ReadAt: &now,
	}).Error
}

// MarkConversationAsRead marks all messages in a conversation as read
func (s *MessagingService) MarkConversationAsRead(conversationID, userID uint) error {
	// Update all unread messages for this user in the conversation
	now := time.Now()
	return s.db.Model(&models.Message{}).
		Where("conversation_id = ? AND recipient_id = ? AND is_read = ?", conversationID, userID, false).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": now,
		}).Error
}

// GetUnreadCount gets the count of unread messages for a user
func (s *MessagingService) GetUnreadCount(userID uint) (int64, error) {
	var count int64
	err := s.db.Model(&models.Message{}).
		Where("recipient_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

// findOrCreateConversation finds existing conversation or creates new one
func (s *MessagingService) findOrCreateConversation(user1ID, user2ID uint) (*models.Conversation, error) {
	// Look for existing conversation between these users
	var conversation models.Conversation
	err := s.db.
		Joins("JOIN conversation_participants p1 ON conversations.id = p1.conversation_id").
		Joins("JOIN conversation_participants p2 ON conversations.id = p2.conversation_id").
		Where("conversations.type = ? AND p1.user_id = ? AND p2.user_id = ? AND p1.is_active = ? AND p2.is_active = ?",
			models.ConversationTypeDirect, user1ID, user2ID, true, true).
		Or("conversations.type = ? AND p1.user_id = ? AND p2.user_id = ? AND p1.is_active = ? AND p2.is_active = ?",
			models.ConversationTypeDirect, user2ID, user1ID, true, true).
		First(&conversation).Error

	if err == nil {
		return &conversation, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create new conversation
	conversation = models.Conversation{
		Type:     models.ConversationTypeDirect,
		IsActive: true,
	}

	if err := s.db.Create(&conversation).Error; err != nil {
		return nil, err
	}

	// Add participants
	participants := []models.ConversationParticipant{
		{
			ConversationID: conversation.ID,
			UserID:         user1ID,
			Role:           models.ParticipantRoleUser,
			JoinedAt:       time.Now(),
			IsActive:       true,
		},
		{
			ConversationID: conversation.ID,
			UserID:         user2ID,
			Role:           models.ParticipantRoleUser,
			JoinedAt:       time.Now(),
			IsActive:       true,
		},
	}

	if err := s.db.Create(&participants).Error; err != nil {
		return nil, err
	}

	return &conversation, nil
}

// sendRealTimeNotification sends real-time notification via WebSocket
func (s *MessagingService) sendRealTimeNotification(message *models.Message) {
	notification := map[string]interface{}{
		"type":            "new_message",
		"message_id":      message.ID,
		"sender_id":       message.SenderID,
		"sender_name":     "",
		"content":         message.Content,
		"message_type":    message.MessageType,
		"conversation_id": message.ConversationID,
		"timestamp":       message.CreatedAt,
	}

	if message.Sender != nil {
		notification["sender_name"] = message.Sender.FirstName + " " + message.Sender.LastName
	}

	// Send to recipient via WebSocket
	if wsManager := websocket.GetGlobalManager(); wsManager != nil {
		if err := wsManager.BroadcastToUser(message.RecipientID, notification); err != nil {
			log.Printf("Failed to send real-time message notification: %v", err)
		}
	}
}

// SearchMessages searches messages by content
func (s *MessagingService) SearchMessages(userID uint, query string, limit int) ([]models.Message, error) {
	var conversationIDs []uint

	// Get user's conversation IDs
	if err := s.db.Model(&models.ConversationParticipant{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Pluck("conversation_id", &conversationIDs).Error; err != nil {
		return nil, err
	}

	if len(conversationIDs) == 0 {
		return []models.Message{}, nil
	}

	var messages []models.Message
	err := s.db.Where("conversation_id IN ? AND content ILIKE ?", conversationIDs, "%"+query+"%").
		Preload("Sender").
		Preload("Conversation").
		Order("created_at DESC").
		Limit(limit).
		Find(&messages).Error

	return messages, err
}

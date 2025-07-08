package models

import (
	"time"

	"gorm.io/gorm"
)

// Message represents a message between users
type Message struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	ConversationID uint           `json:"conversation_id" gorm:"not null;index"`
	SenderID       uint           `json:"sender_id" gorm:"not null;index"`
	RecipientID    uint           `json:"recipient_id" gorm:"not null;index"`
	Content        string         `json:"content" gorm:"type:text;not null"`
	MessageType    string         `json:"message_type" gorm:"default:'text'"` // text, file, image
	AttachmentURL  string         `json:"attachment_url,omitempty"`
	AttachmentName string         `json:"attachment_name,omitempty"`
	IsRead         bool           `json:"is_read" gorm:"default:false"`
	ReadAt         *time.Time     `json:"read_at,omitempty"`
	IsSystemMsg    bool           `json:"is_system_msg" gorm:"default:false"`
	ReplyToID      *uint          `json:"reply_to_id,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Conversation *Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
	Sender       *User         `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
	Recipient    *User         `json:"recipient,omitempty" gorm:"foreignKey:RecipientID"`
	ReplyTo      *Message      `json:"reply_to,omitempty" gorm:"foreignKey:ReplyToID"`
}

// Conversation represents a conversation between users
type Conversation struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Title         string         `json:"title,omitempty"`
	Type          string         `json:"type" gorm:"default:'direct'"` // direct, group, support
	IsActive      bool           `json:"is_active" gorm:"default:true"`
	LastMessageAt *time.Time     `json:"last_message_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Messages     []Message                 `json:"messages,omitempty" gorm:"foreignKey:ConversationID"`
	Participants []ConversationParticipant `json:"participants,omitempty" gorm:"foreignKey:ConversationID"`
}

// ConversationParticipant represents participants in a conversation
type ConversationParticipant struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	ConversationID uint           `json:"conversation_id" gorm:"not null;index"`
	UserID         uint           `json:"user_id" gorm:"not null;index"`
	Role           string         `json:"role" gorm:"default:'participant'"` // participant, admin, moderator
	JoinedAt       time.Time      `json:"joined_at"`
	LastReadAt     *time.Time     `json:"last_read_at,omitempty"`
	IsActive       bool           `json:"is_active" gorm:"default:true"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Conversation *Conversation `json:"conversation,omitempty" gorm:"foreignKey:ConversationID"`
	User         *User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// MessageTemplates for common responses
type MessageTemplate struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	Name       string         `json:"name" gorm:"not null"`
	Subject    string         `json:"subject,omitempty"`
	Content    string         `json:"content" gorm:"type:text;not null"`
	Category   string         `json:"category" gorm:"not null"`
	IsActive   bool           `json:"is_active" gorm:"default:true"`
	UsageCount int            `json:"usage_count" gorm:"default:0"`
	CreatedBy  uint           `json:"created_by" gorm:"not null;index"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Creator *User `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
}

// Constants for messaging system
const (
	// Message Types
	MessageTypeText  = "text"
	MessageTypeFile  = "file"
	MessageTypeImage = "image"

	// Conversation Types
	ConversationTypeDirect  = "direct"
	ConversationTypeGroup   = "group"
	ConversationTypeSupport = "support"

	// Participant Roles
	ParticipantRoleUser      = "participant"
	ParticipantRoleAdmin     = "admin"
	ParticipantRoleModerator = "moderator"

	// Ticket Categories
	TicketCategoryTechnical = "Technical"
	TicketCategoryShift     = "Shift-related"
	TicketCategoryTraining  = "Training"
	TicketCategoryEmergency = "Emergency"
	TicketCategoryGeneral   = "General"

	// Ticket Priorities
	TicketPriorityLow    = "Low"
	TicketPriorityMedium = "Medium"
	TicketPriorityHigh   = "High"
	TicketPriorityUrgent = "Urgent"

	// Ticket Status
	TicketStatusOpen       = "Open"
	TicketStatusInProgress = "In Progress"
	TicketStatusResolved   = "Resolved"
	TicketStatusClosed     = "Closed"
)

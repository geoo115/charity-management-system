package models

import (
	"time"

	"gorm.io/gorm"
)

// NotificationPreferences stores user notification preferences
type NotificationPreferences struct {
	ID     uint `json:"id" gorm:"primaryKey"`
	UserID uint `json:"userId" gorm:"index"`
	Email  bool `json:"email" gorm:"default:true"`
	SMS    bool `json:"sms" gorm:"default:true"`
	Push   bool `json:"push" gorm:"default:true"`

	// Fields to match what's used in the notification service
	EmailEnabled   bool `json:"emailEnabled" gorm:"default:true"`
	SMSEnabled     bool `json:"smsEnabled" gorm:"default:true"`
	PushEnabled    bool `json:"pushEnabled" gorm:"default:true"`
	ShiftReminders bool `json:"shiftReminders" gorm:"default:true"`
	ShiftUpdates   bool `json:"shiftUpdates" gorm:"default:true"`
	UpcomingShifts bool `json:"upcomingShifts" gorm:"default:true"`
	SystemUpdates  bool `json:"systemUpdates" gorm:"default:true"`

	// Additional notification preferences
	QueueUpdates         bool   `json:"queueUpdates" gorm:"default:true"`
	ApplicationUpdates   bool   `json:"applicationUpdates" gorm:"default:true"`
	GeneralAnnouncements bool   `json:"generalAnnouncements" gorm:"default:true"`
	EmergencyAlerts      bool   `json:"emergencyAlerts" gorm:"default:true"`
	ReminderTiming       string `json:"reminderTiming" gorm:"default:'30m'"`
	PreferredMethod      string `json:"preferredMethod" gorm:"default:'email'"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// NotificationTypePreference stores preferences for specific notification types
type NotificationTypePreference struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	UserID           uint      `json:"userId" gorm:"index"`
	NotificationType string    `json:"notificationType" gorm:"index"`
	Email            bool      `json:"email" gorm:"default:true"`
	SMS              bool      `json:"sms" gorm:"default:true"`
	Push             bool      `json:"push" gorm:"default:true"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// Notification represents a notification sent to a user
type Notification struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"userId" gorm:"index"`
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Channel   string         `json:"channel"`
	Read      bool           `json:"read" gorm:"default:false"`
	Metadata  JSON           `json:"metadata" gorm:"type:jsonb"`
	CreatedAt time.Time      `json:"createdAt"`
	ReadAt    time.Time      `json:"readAt"`
	DeletedAt gorm.DeletedAt `json:"deletedAt" gorm:"index"`
}

// ScheduledNotification represents a notification scheduled to be sent later
type ScheduledNotification struct {
	ID               uint `gorm:"primaryKey"`
	UserID           uint
	Type             string
	Channel          string
	Subject          string
	To               string
	ScheduledFor     time.Time
	Status           string
	TemplateDataJSON string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

// JSON type for storing metadata
type JSON map[string]interface{}

// InAppNotification represents in-app notifications for users
type InAppNotification struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `json:"user_id" gorm:"index"`
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Type      string         `json:"type"`                             // info, warning, success, error
	Priority  string         `json:"priority" gorm:"default:'normal'"` // low, normal, high, urgent
	Read      bool           `json:"read" gorm:"default:false"`
	IsRead    bool           `json:"isRead" gorm:"default:false"`
	ReadAt    *time.Time     `json:"read_at"`
	ActionURL string         `json:"actionUrl"`
	ExpiresAt *time.Time     `json:"expires_at"`
	Metadata  JSON           `json:"metadata" gorm:"type:jsonb"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// NotificationLog represents a log of sent notifications
type NotificationLog struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `json:"user_id" gorm:"index"`
	Type         string         `json:"type"`
	Channel      string         `json:"channel"` // email, sms, push, in-app
	Method       string         `json:"method"`  // delivery method
	Subject      string         `json:"subject"`
	Message      string         `json:"message"`
	Status       string         `json:"status"` // sent, failed, pending
	SentAt       *time.Time     `json:"sent_at"`
	DeliveredAt  *time.Time     `json:"delivered_at"`
	ReadAt       *time.Time     `json:"read_at"`
	ErrorMessage string         `json:"error_message"`
	RetryCount   int            `json:"retry_count" gorm:"default:0"`
	Metadata     JSON           `json:"metadata" gorm:"type:jsonb"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// EmailTemplate represents an email template
type EmailTemplate struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Subject   string    `json:"subject" gorm:"not null"`
	Body      string    `json:"body" gorm:"type:text;not null"`
	Type      string    `json:"type" gorm:"not null"` // 'welcome', 'reminder', 'notification', 'custom'
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NotificationTemplate represents a notification template
type NotificationTemplate struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Subject   string    `json:"subject" gorm:"not null"`
	Body      string    `json:"body" gorm:"type:text;not null"`
	Type      string    `json:"type" gorm:"not null"`
	Category  string    `json:"category" gorm:"not null"` // 'volunteer', 'visitor', 'donor', 'system'
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NotificationHistory represents sent notifications
type NotificationHistory struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Subject     string    `json:"subject" gorm:"not null"`
	Message     string    `json:"message" gorm:"type:text"`
	Type        string    `json:"type" gorm:"not null"` // 'info', 'warning', 'urgent', 'maintenance'
	Recipients  string    `json:"recipients"`           // JSON or simple description
	SentBy      uint      `json:"sent_by" gorm:"not null"`
	Status      string    `json:"status" gorm:"default:'pending'"` // 'pending', 'sent', 'failed'
	DeliveredTo int       `json:"delivered_to" gorm:"default:0"`
	FailedTo    int       `json:"failed_to" gorm:"default:0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PushSubscription represents a browser push notification subscription
type PushSubscription struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	Endpoint  string    `json:"endpoint" gorm:"not null"`
	P256DH    string    `json:"p256dh" gorm:"not null"`
	Auth      string    `json:"auth" gorm:"not null"`
	Active    bool      `json:"active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Browser and device info
	UserAgent string `json:"user_agent"`
	Platform  string `json:"platform"`
	Browser   string `json:"browser"`

	// Relationship
	User User `json:"user" gorm:"foreignKey:UserID"`
}

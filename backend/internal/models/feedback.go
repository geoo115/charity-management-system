package models

import (
	"time"

	"gorm.io/gorm"
)

// Feedback types
const (
	FeedbackTypeVisit      = "visit"
	FeedbackTypeVolunteer  = "volunteer"
	FeedbackTypeSystem     = "system"
	FeedbackTypeGeneral    = "general"
	FeedbackTypeSuggestion = "suggestion"
	FeedbackTypeComplaint  = "complaint"
)

// Feedback represents user feedback and ratings
type Feedback struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `json:"user_id" gorm:"not null;index"`
	Type          string         `json:"type" gorm:"not null"`
	Rating        int            `json:"rating"` // 1-5 stars
	Subject       string         `json:"subject"`
	Message       string         `json:"message" gorm:"type:text"`
	Category      string         `json:"category"`
	IsAnonymous   bool           `json:"is_anonymous" gorm:"default:false"`
	IsPublic      bool           `json:"is_public" gorm:"default:false"`
	Status        string         `json:"status" gorm:"default:'pending'"` // pending, reviewed, resolved
	ReviewedBy    *uint          `json:"reviewed_by"`
	ReviewedAt    *time.Time     `json:"reviewed_at"`
	Response      string         `json:"response"`
	ResponseBy    *uint          `json:"response_by"`
	ResponseAt    *time.Time     `json:"response_at"`
	ReferenceID   *uint          `json:"reference_id"` // Help request, shift, etc.
	ReferenceType string         `json:"reference_type"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User           User  `json:"user" gorm:"foreignKey:UserID"`
	ReviewedByUser *User `json:"reviewed_by_user" gorm:"foreignKey:ReviewedBy"`
	ResponseByUser *User `json:"response_by_user" gorm:"foreignKey:ResponseBy"`
}

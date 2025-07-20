package models

import (
	"time"

	"gorm.io/gorm"
)

// CharityUser - Simplified user model for charity operations
type CharityUser struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Email     string `json:"email" gorm:"uniqueIndex"`
	Phone     string `json:"phone"`
	Role      string `json:"role"` // visitor, volunteer, donor, admin

	// Basic profile info
	Address  string `json:"address"`
	City     string `json:"city"`
	Postcode string `json:"postcode"`

	// Authentication
	Password        string     `json:"-"`
	Status          string     `json:"status" gorm:"default:'pending'"`
	EmailVerified   bool       `json:"emailVerified" gorm:"default:false"`
	EmailVerifiedAt *time.Time `json:"emailVerifiedAt"`
	LastLogin       *time.Time `json:"lastLogin"`

	// Role-specific fields (simplified)
	// For volunteers
	Skills           string `json:"skills"`
	Availability     string `json:"availability"`
	EmergencyContact string `json:"emergencyContact"`

	// For donors
	PreferredDonationType string  `json:"preferredDonationType"`
	GiftAidEligible       bool    `json:"giftAidEligible"`
	TotalDonated          float64 `json:"totalDonated" gorm:"default:0"`

	// For visitors
	EligibilityStatus string `json:"eligibilityStatus"`
	DocumentVerified  bool   `json:"documentVerified" gorm:"default:false"`

	// Timestamps
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// CharityHelpRequest - Simplified help request model
type CharityHelpRequest struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	UserID      uint           `json:"userId"`
	Type        string         `json:"type"` // food, clothing, shelter, other
	Description string         `json:"description"`
	Urgency     string         `json:"urgency"` // low, medium, high, emergency
	Status      string         `json:"status" gorm:"default:'pending'"`
	AssignedTo  *uint          `json:"assignedTo"`
	CompletedAt *time.Time     `json:"completedAt"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User         CharityUser  `json:"user" gorm:"foreignKey:UserID"`
	AssignedUser *CharityUser `json:"assignedUser" gorm:"foreignKey:AssignedTo"`
}

// CharityDonation - Simplified donation model
type CharityDonation struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	DonorID     uint           `json:"donorId"`
	Type        string         `json:"type"` // monetary, item, service
	Amount      float64        `json:"amount"`
	Description string         `json:"description"`
	Status      string         `json:"status" gorm:"default:'pending'"`
	ReceivedAt  *time.Time     `json:"receivedAt"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Donor CharityUser `json:"donor" gorm:"foreignKey:DonorID"`
}

// CharityShift - Simplified shift model
type CharityShift struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	Date          time.Time      `json:"date"`
	StartTime     time.Time      `json:"startTime"`
	EndTime       time.Time      `json:"endTime"`
	Location      string         `json:"location"`
	Description   string         `json:"description"`
	Role          string         `json:"role"`
	MaxVolunteers int            `json:"maxVolunteers" gorm:"default:1"`
	Status        string         `json:"status" gorm:"default:'open'"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// CharityShiftAssignment - Simplified shift assignment
type CharityShiftAssignment struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	ShiftID     uint           `json:"shiftId"`
	VolunteerID uint           `json:"volunteerId"`
	Status      string         `json:"status" gorm:"default:'assigned'"`
	AssignedAt  time.Time      `json:"assignedAt"`
	CompletedAt *time.Time     `json:"completedAt"`
	Notes       string         `json:"notes"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Shift     CharityShift `json:"shift" gorm:"foreignKey:ShiftID"`
	Volunteer CharityUser  `json:"volunteer" gorm:"foreignKey:VolunteerID"`
}

// CharityDocument - Simplified document model
type CharityDocument struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	UserID     uint           `json:"userId"`
	Type       string         `json:"type"` // id, proof_of_address, other
	FileName   string         `json:"fileName"`
	FileURL    string         `json:"fileUrl"`
	Status     string         `json:"status" gorm:"default:'pending'"`
	VerifiedAt *time.Time     `json:"verifiedAt"`
	VerifiedBy *uint          `json:"verifiedBy"`
	Notes      string         `json:"notes"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User           CharityUser  `json:"user" gorm:"foreignKey:UserID"`
	VerifiedByUser *CharityUser `json:"verifiedByUser" gorm:"foreignKey:VerifiedBy"`
}

// CharityNotification - Simplified notification model
type CharityNotification struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	UserID    uint           `json:"userId"`
	Type      string         `json:"type"` // email, sms, in_app
	Title     string         `json:"title"`
	Message   string         `json:"message"`
	Status    string         `json:"status" gorm:"default:'pending'"`
	SentAt    *time.Time     `json:"sentAt"`
	ReadAt    *time.Time     `json:"readAt"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User CharityUser `json:"user" gorm:"foreignKey:UserID"`
}

// CharityFeedback - Simplified feedback model
type CharityFeedback struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	UserID     uint           `json:"userId"`
	Type       string         `json:"type"`   // general, service, volunteer
	Rating     int            `json:"rating"` // 1-5 stars
	Comment    string         `json:"comment"`
	Status     string         `json:"status" gorm:"default:'pending'"`
	ReviewedAt *time.Time     `json:"reviewedAt"`
	ReviewedBy *uint          `json:"reviewedBy"`
	Response   string         `json:"response"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User           CharityUser  `json:"user" gorm:"foreignKey:UserID"`
	ReviewedByUser *CharityUser `json:"reviewedByUser" gorm:"foreignKey:ReviewedBy"`
}

// CharityVisit - Simplified visit tracking
type CharityVisit struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	UserID       uint           `json:"userId"`
	CheckInTime  time.Time      `json:"checkInTime"`
	CheckOutTime *time.Time     `json:"checkOutTime"`
	Purpose      string         `json:"purpose"`
	Notes        string         `json:"notes"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User CharityUser `json:"user" gorm:"foreignKey:UserID"`
}

// CharitySystemConfig - Simplified system configuration
type CharitySystemConfig struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	Key         string         `json:"key" gorm:"uniqueIndex"`
	Value       string         `json:"value"`
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Table names for charity models
func (CharityUser) TableName() string            { return "charity_users" }
func (CharityHelpRequest) TableName() string     { return "charity_help_requests" }
func (CharityDonation) TableName() string        { return "charity_donations" }
func (CharityShift) TableName() string           { return "charity_shifts" }
func (CharityShiftAssignment) TableName() string { return "charity_shift_assignments" }
func (CharityDocument) TableName() string        { return "charity_documents" }
func (CharityNotification) TableName() string    { return "charity_notifications" }
func (CharityFeedback) TableName() string        { return "charity_feedback" }
func (CharityVisit) TableName() string           { return "charity_visits" }
func (CharitySystemConfig) TableName() string    { return "charity_system_configs" }

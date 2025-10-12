package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`

	// Keep only common fields
	Address  string `json:"address"`
	City     string `json:"city"`
	Postcode string `json:"postcode"`

	// Common fields for authentication and basic profile
	Password        string     `json:"-"`
	Status          string     `json:"status" gorm:"default:'pending'"`
	FirstLogin      bool       `json:"first_login" gorm:"default:true"`
	LastLogin       *time.Time `json:"last_login,omitempty"`
	EmailVerified   bool       `json:"email_verified" gorm:"default:false"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	PhoneVerified   bool       `json:"phone_verified" gorm:"default:false"`
	PhoneVerifiedAt *time.Time `json:"phone_verified_at"`

	// Payment integration fields
	StripeCustomerID string `json:"stripe_customer_id,omitempty"`

	CreatedAt               time.Time                `json:"created_at"`
	UpdatedAt               time.Time                `json:"updated_at"`
	DeletedAt               gorm.DeletedAt           `gorm:"index" json:"-"`
	NotificationPreferences *NotificationPreferences `json:"notification_preferences,omitempty"`
}

// HashPassword creates a bcrypt hash of the password
func (u *User) HashPassword() error {
	// Validate password strength
	if err := ValidatePassword(u.Password); err != nil {
		return err
	}

	// Use cost 8 for better performance in high-load scenarios
	// Still secure but faster than default cost 10
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), 8)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword compares the stored hash with the provided password
func (u *User) CheckPassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
}

// HashPasswordWithValue hashes a provided password value and sets it on the user
func (u *User) HashPasswordWithValue(password string) error {
	// Validate password strength
	if err := ValidatePassword(password); err != nil {
		return err
	}

	// Use cost 8 for better performance in high-load scenarios
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 8)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// DonorProfile represents the profile for a donor user
type DonorProfile struct {
	ID                    uint           `gorm:"primaryKey" json:"id"`
	UserID                uint           `gorm:"uniqueIndex" json:"user_id"`
	PreferredDonationType string         `json:"preferred_donation_type"`
	GiftAidEligible       bool           `json:"gift_aid_eligible"`
	DonationFrequency     string         `json:"donation_frequency"`
	TotalDonated          float64        `json:"total_donated" gorm:"default:0"`
	LastDonationDate      *time.Time     `json:"last_donation_date"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	DeletedAt             gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// GetVolunteerProfile retrieves the volunteer profile for a user
func (u *User) GetVolunteerProfile(db *gorm.DB) (*VolunteerProfile, error) {
	var profile VolunteerProfile
	err := db.Where("user_id = ?", u.ID).First(&profile).Error
	return &profile, err
}

// GetDonorProfile retrieves the donor profile for a user
func (u *User) GetDonorProfile(db *gorm.DB) (*DonorProfile, error) {
	var profile DonorProfile
	err := db.Where("user_id = ?", u.ID).First(&profile).Error
	return &profile, err
}

// GetVisitorProfile retrieves the visitor profile for a user
func (u *User) GetVisitorProfile(db *gorm.DB) (*VisitorProfile, error) {
	var profile VisitorProfile
	err := db.Where("user_id = ?", u.ID).First(&profile).Error
	return &profile, err
}

// CreateVolunteerProfile creates a new volunteer profile
func (u *User) CreateVolunteerProfile(db *gorm.DB, profile *VolunteerProfile) error {
	profile.UserID = u.ID
	return db.Create(profile).Error
}

// CreateDonorProfile creates a new donor profile
func (u *User) CreateDonorProfile(db *gorm.DB, profile *DonorProfile) error {
	profile.UserID = u.ID
	return db.Create(profile).Error
}

// CreateVisitorProfile creates a new visitor profile
func (u *User) CreateVisitorProfile(db *gorm.DB, profile *VisitorProfile) error {
	profile.UserID = u.ID
	return db.Create(profile).Error
}

// PasswordReset represents a password reset token
type PasswordReset struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Token     string         `json:"-" gorm:"not null;index"` // Hashed token
	ExpiresAt time.Time      `json:"expires_at" gorm:"not null;index"`
	Used      bool           `json:"used" gorm:"default:false;index"`
	UsedAt    *time.Time     `json:"used_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// IsExpired checks if the reset token has expired
func (pr *PasswordReset) IsExpired() bool {
	return time.Now().After(pr.ExpiresAt)
}

// IsValid checks if the token is valid (not expired and not used)
func (pr *PasswordReset) IsValid() bool {
	return !pr.IsExpired() && !pr.Used
}

// MarkAsUsed marks the token as used
func (pr *PasswordReset) MarkAsUsed() {
	now := time.Now()
	pr.Used = true
	pr.UsedAt = &now
	pr.UpdatedAt = now
}

// TableName specifies the table name
func (PasswordReset) TableName() string {
	return "password_resets"
}

// RefreshToken represents refresh tokens in the database
type RefreshToken struct {
	gorm.Model
	TokenID      string    `gorm:"uniqueIndex;not null"`
	UserID       uint      `gorm:"index;not null"`
	User         User      `gorm:"foreignKey:UserID"`
	ExpiresAt    time.Time `gorm:"not null"`
	IP           string    `gorm:"size:45"`
	UserAgent    string    `gorm:"size:255"`
	Revoked      bool      `gorm:"default:false"`
	RevokedAt    *time.Time
	RevokedBy    *string
	RevokeReason *string
}

// IsExpired checks if the token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

// Verification tracks various verification processes
type Verification struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       uint           `json:"user_id" gorm:"not null;index"`
	Type         string         `json:"type" gorm:"not null"`
	Token        string         `json:"token" gorm:"uniqueIndex"`
	Code         string         `json:"code"`
	Status       string         `json:"status" gorm:"default:'pending'"`
	ExpiresAt    time.Time      `json:"expires_at"`
	CompletedAt  *time.Time     `json:"completed_at"`
	AttemptCount int            `json:"attempt_count" gorm:"default:0"`
	MaxAttempts  int            `json:"max_attempts" gorm:"default:3"`
	Metadata     string         `json:"metadata"` // JSON for additional data
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

// IsExpired checks if verification has expired
func (v *Verification) IsExpired() bool {
	return time.Now().After(v.ExpiresAt)
}

// CanAttempt checks if more attempts are allowed
func (v *Verification) CanAttempt() bool {
	return v.AttemptCount < v.MaxAttempts && !v.IsExpired()
}

// EmailVerificationToken represents email verification tokens
type EmailVerificationToken struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Token     string    `json:"token" gorm:"uniqueIndex;not null"`
	Email     string    `json:"email" gorm:"index;not null"`
	UserID    uint      `json:"user_id" gorm:"index"`
	IsUsed    bool      `json:"is_used" gorm:"default:false"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User User `json:"user" gorm:"foreignKey:UserID"`
}

// TokenBlacklist represents blacklisted JWT tokens
type TokenBlacklist struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Token         string    `json:"token" gorm:"uniqueIndex;not null"`
	BlacklistedAt time.Time `json:"blacklisted_at"`
	Reason        string    `json:"reason"`
	UserID        uint      `json:"user_id,omitempty" gorm:"index"`
	CreatedAt     time.Time `json:"created_at"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Consent represents user consent records for processing, marketing, etc.
type Consent struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Type      string     `json:"type" gorm:"not null"` // e.g., marketing, data_processing, background_check
	Granted   bool       `json:"granted" gorm:"default:false"`
	GrantedAt *time.Time `json:"granted_at"`
	Source    string     `json:"source"` // where consent was given (web, admin)
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// DataExportRequest tracks user data export requests
type DataExportRequest struct {
	ID          uint       `gorm:"primarykey" json:"id"`
	UserID      uint       `gorm:"index;not null" json:"user_id"`
	RequestedAt time.Time  `json:"requested_at"`
	CompletedAt *time.Time `json:"completed_at"`
	Status      string     `json:"status" gorm:"default:'pending'"` // pending, processing, ready, failed
	FilePath    string     `json:"file_path"`                       // where to find the export
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AccountDeletionRequest tracks deletion requests and their status
type AccountDeletionRequest struct {
	ID          uint       `gorm:"primarykey" json:"id"`
	UserID      uint       `gorm:"index;not null" json:"user_id"`
	RequestedAt time.Time  `json:"requested_at"`
	ConfirmedAt *time.Time `json:"confirmed_at"`
	CompletedAt *time.Time `json:"completed_at"`
	Status      string     `json:"status" gorm:"default:'pending'"` // pending, confirmed, completed, cancelled
	Reason      string     `json:"reason"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

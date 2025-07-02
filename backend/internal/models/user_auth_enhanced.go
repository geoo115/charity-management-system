package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Enhanced User model with better structure and validation
type UserEnhanced struct {
	AuditableModel

	// Personal Information
	FirstName string `json:"first_name" gorm:"type:varchar(100);not null" validate:"required,min=2,max=100"`
	LastName  string `json:"last_name" gorm:"type:varchar(100);not null" validate:"required,min=2,max=100"`
	Email     string `json:"email" gorm:"type:varchar(255);uniqueIndex;not null" validate:"required,email"`
	Phone     string `json:"phone" gorm:"type:varchar(20)" validate:"phone"`

	// Contact Information (embedded structure)
	ContactInfo ContactInfo `json:"contact_info" gorm:"embedded;embeddedPrefix:contact_"`

	// Authentication
	Role     string `json:"role" gorm:"type:varchar(50);not null;index" validate:"required,oneof=admin volunteer donor visitor super_admin user"`
	Password string `json:"-" gorm:"type:varchar(255);not null"`
	Status   string `json:"status" gorm:"type:varchar(50);default:'pending';index" validate:"oneof=pending active inactive suspended deactivated"`

	// Login tracking
	FirstLogin             bool       `json:"first_login" gorm:"default:true"`
	LastLogin              *time.Time `json:"last_login,omitempty"`
	LastLoginIP            string     `json:"last_login_ip,omitempty" gorm:"type:varchar(45)"`
	FailedLoginAttempts    int        `json:"failed_login_attempts" gorm:"default:0"`
	LastFailedLoginAttempt *time.Time `json:"last_failed_login_attempt,omitempty"`
	AccountLockedUntil     *time.Time `json:"account_locked_until,omitempty"`

	// Verification status
	EmailVerified   bool       `json:"email_verified" gorm:"default:false"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	PhoneVerified   bool       `json:"phone_verified" gorm:"default:false"`
	PhoneVerifiedAt *time.Time `json:"phone_verified_at,omitempty"`

	// Metadata
	Metadata MetaData `json:"metadata,omitempty" gorm:"type:jsonb"`

	// Relationships
	NotificationPreferences *NotificationPreferencesEnhanced `json:"notification_preferences,omitempty" gorm:"foreignKey:UserID"`
	PasswordResets          []PasswordResetEnhanced          `json:"password_resets,omitempty" gorm:"foreignKey:UserID"`
	RefreshTokens           []RefreshTokenEnhanced           `json:"refresh_tokens,omitempty" gorm:"foreignKey:UserID"`
	Verifications           []VerificationEnhanced           `json:"verifications,omitempty" gorm:"foreignKey:UserID"`
}

// TableName specifies the table name
func (UserEnhanced) TableName() string {
	return "users_enhanced"
}

// Validate implements the Validatable interface
func (u *UserEnhanced) Validate() error {
	var errors ValidationErrors

	// Basic validation
	if strings.TrimSpace(u.FirstName) == "" {
		errors = append(errors, ValidationError{
			Field:   "first_name",
			Message: "First name is required",
			Value:   u.FirstName,
		})
	}

	if strings.TrimSpace(u.LastName) == "" {
		errors = append(errors, ValidationError{
			Field:   "last_name",
			Message: "Last name is required",
			Value:   u.LastName,
		})
	}

	// Email validation
	if !isValidEmail(u.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Invalid email format",
			Value:   u.Email,
		})
	}

	// Phone validation (if provided)
	if u.Phone != "" && !isValidPhone(u.Phone) {
		errors = append(errors, ValidationError{
			Field:   "phone",
			Message: "Invalid phone format",
			Value:   u.Phone,
		})
	}

	// Role validation
	validRoles := []string{RoleAdmin, RoleVolunteer, RoleDonor, RoleVisitor, RoleSuperAdmin, RoleUser}
	if !contains(validRoles, u.Role) {
		errors = append(errors, ValidationError{
			Field:   "role",
			Message: "Invalid role",
			Value:   u.Role,
		})
	}

	// Status validation
	validStatuses := []string{StatusPending, StatusActive, StatusInactive, StatusSuspended, StatusDeactivated}
	if !contains(validStatuses, u.Status) {
		errors = append(errors, ValidationError{
			Field:   "status",
			Message: "Invalid status",
			Value:   u.Status,
		})
	}

	if errors.HasErrors() {
		return errors
	}

	return nil
}

// BeforeCreate hook for additional validation and setup
func (u *UserEnhanced) BeforeCreate(tx *gorm.DB) error {
	// Call parent BeforeCreate
	if err := u.AuditableModel.BeforeCreate(tx); err != nil {
		return err
	}

	// Validate the model
	if err := u.Validate(); err != nil {
		return err
	}

	// Normalize email
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))

	// Set default status if empty
	if u.Status == "" {
		u.Status = StatusPending
	}

	// Set default role if empty
	if u.Role == "" {
		u.Role = RoleUser
	}

	return nil
}

// BeforeUpdate hook
func (u *UserEnhanced) BeforeUpdate(tx *gorm.DB) error {
	// Call parent BeforeUpdate
	if err := u.AuditableModel.BeforeUpdate(tx); err != nil {
		return err
	}

	// Validate the model
	if err := u.Validate(); err != nil {
		return err
	}

	// Normalize email
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))

	return nil
}

// Authentication methods
func (u *UserEnhanced) HashPassword(password string) error {
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	u.Password = string(hashedPassword)
	return nil
}

func (u *UserEnhanced) CheckPassword(password string) error {
	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	if err != nil {
		return fmt.Errorf("invalid password")
	}

	return nil
}

// Account management methods
func (u *UserEnhanced) IsActive() bool {
	return u.Status == StatusActive
}

func (u *UserEnhanced) IsLocked() bool {
	if u.AccountLockedUntil == nil {
		return false
	}
	return time.Now().Before(*u.AccountLockedUntil)
}

func (u *UserEnhanced) RecordFailedLogin() {
	u.FailedLoginAttempts++
	now := time.Now()
	u.LastFailedLoginAttempt = &now

	// Lock account after 5 failed attempts for 30 minutes
	if u.FailedLoginAttempts >= 5 {
		lockUntil := now.Add(30 * time.Minute)
		u.AccountLockedUntil = &lockUntil
	}
}

func (u *UserEnhanced) RecordSuccessfulLogin(ip string) {
	now := time.Now()
	u.LastLogin = &now
	u.LastLoginIP = ip
	u.FailedLoginAttempts = 0
	u.LastFailedLoginAttempt = nil
	u.AccountLockedUntil = nil
	u.FirstLogin = false
}

func (u *UserEnhanced) UnlockAccount() {
	u.FailedLoginAttempts = 0
	u.LastFailedLoginAttempt = nil
	u.AccountLockedUntil = nil
}

// Verification methods
func (u *UserEnhanced) MarkEmailVerified() {
	u.EmailVerified = true
	now := time.Now()
	u.EmailVerifiedAt = &now
}

func (u *UserEnhanced) MarkPhoneVerified() {
	u.PhoneVerified = true
	now := time.Time{}
	u.PhoneVerifiedAt = &now
}

func (u *UserEnhanced) IsFullyVerified() bool {
	return u.EmailVerified && (u.Phone == "" || u.PhoneVerified)
}

// Profile methods
func (u *UserEnhanced) GetFullName() string {
	return strings.TrimSpace(u.FirstName + " " + u.LastName)
}

func (u *UserEnhanced) GetDisplayName() string {
	fullName := u.GetFullName()
	if fullName == "" {
		return u.Email
	}
	return fullName
}

// Enhanced password reset model
type PasswordResetEnhanced struct {
	AuditableModel
	UserID    uint       `json:"user_id" gorm:"not null;index"`
	Token     string     `json:"-" gorm:"type:varchar(255);not null;uniqueIndex"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null;index"`
	Used      bool       `json:"used" gorm:"default:false;index"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	IPAddress string     `json:"ip_address,omitempty" gorm:"type:varchar(45)"`
	UserAgent string     `json:"user_agent,omitempty" gorm:"type:text"`

	// Relationships
	User UserEnhanced `json:"user" gorm:"foreignKey:UserID"`
}

func (PasswordResetEnhanced) TableName() string {
	return "password_resets_enhanced"
}

func (pr *PasswordResetEnhanced) IsValid() bool {
	return !pr.Used && time.Now().Before(pr.ExpiresAt)
}

func (pr *PasswordResetEnhanced) MarkAsUsed() {
	pr.Used = true
	now := time.Now()
	pr.UsedAt = &now
}

// Enhanced refresh token model
type RefreshTokenEnhanced struct {
	AuditableModel
	TokenID      string     `gorm:"type:varchar(255);uniqueIndex;not null"`
	UserID       uint       `gorm:"index;not null"`
	ExpiresAt    time.Time  `gorm:"not null;index"`
	IPAddress    string     `gorm:"type:varchar(45)"`
	UserAgent    string     `gorm:"type:text"`
	Revoked      bool       `gorm:"default:false;index"`
	RevokedAt    *time.Time `json:"revoked_at,omitempty"`
	RevokedBy    *uint      `json:"revoked_by,omitempty"`
	RevokeReason string     `json:"revoke_reason,omitempty" gorm:"type:varchar(255)"`

	// Relationships
	User          UserEnhanced  `json:"user" gorm:"foreignKey:UserID"`
	RevokedByUser *UserEnhanced `json:"revoked_by_user,omitempty" gorm:"foreignKey:RevokedBy"`
}

func (RefreshTokenEnhanced) TableName() string {
	return "refresh_tokens_enhanced"
}

func (rt *RefreshTokenEnhanced) IsValid() bool {
	return !rt.Revoked && time.Now().Before(rt.ExpiresAt)
}

func (rt *RefreshTokenEnhanced) Revoke(reason string, revokedBy *uint) {
	rt.Revoked = true
	now := time.Now()
	rt.RevokedAt = &now
	rt.RevokeReason = reason
	rt.RevokedBy = revokedBy
}

// Enhanced verification model
type VerificationEnhanced struct {
	AuditableModel
	UserID       uint       `json:"user_id" gorm:"not null;index"`
	Type         string     `json:"type" gorm:"type:varchar(50);not null;index"`
	Token        string     `json:"token" gorm:"type:varchar(255);uniqueIndex"`
	Code         string     `json:"code" gorm:"type:varchar(10)"`
	Status       string     `json:"status" gorm:"type:varchar(50);default:'pending';index"`
	ExpiresAt    time.Time  `json:"expires_at" gorm:"not null;index"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	AttemptCount int        `json:"attempt_count" gorm:"default:0"`
	MaxAttempts  int        `json:"max_attempts" gorm:"default:3"`
	IPAddress    string     `json:"ip_address,omitempty" gorm:"type:varchar(45)"`
	UserAgent    string     `json:"user_agent,omitempty" gorm:"type:text"`
	Metadata     MetaData   `json:"metadata,omitempty" gorm:"type:jsonb"`

	// Relationships
	User UserEnhanced `json:"user" gorm:"foreignKey:UserID"`
}

func (VerificationEnhanced) TableName() string {
	return "verifications_enhanced"
}

func (v *VerificationEnhanced) IsValid() bool {
	return v.Status == StatusPending && time.Now().Before(v.ExpiresAt)
}

func (v *VerificationEnhanced) CanAttempt() bool {
	return v.IsValid() && v.AttemptCount < v.MaxAttempts
}

func (v *VerificationEnhanced) RecordAttempt() {
	v.AttemptCount++
}

func (v *VerificationEnhanced) MarkCompleted() {
	v.Status = StatusCompleted
	now := time.Now()
	v.CompletedAt = &now
}

// Enhanced notification preferences model
type NotificationPreferencesEnhanced struct {
	AuditableModel
	UserID uint `json:"user_id" gorm:"uniqueIndex;not null"`

	// Channel preferences
	EmailEnabled bool `json:"email_enabled" gorm:"default:true"`
	SMSEnabled   bool `json:"sms_enabled" gorm:"default:false"`
	PushEnabled  bool `json:"push_enabled" gorm:"default:true"`
	InAppEnabled bool `json:"in_app_enabled" gorm:"default:true"`

	// Content preferences
	ShiftReminders       bool `json:"shift_reminders" gorm:"default:true"`
	ShiftUpdates         bool `json:"shift_updates" gorm:"default:true"`
	UpcomingShifts       bool `json:"upcoming_shifts" gorm:"default:true"`
	SystemUpdates        bool `json:"system_updates" gorm:"default:true"`
	QueueUpdates         bool `json:"queue_updates" gorm:"default:true"`
	ApplicationUpdates   bool `json:"application_updates" gorm:"default:true"`
	GeneralAnnouncements bool `json:"general_announcements" gorm:"default:true"`
	EmergencyAlerts      bool `json:"emergency_alerts" gorm:"default:true"`

	// Timing preferences
	ReminderTiming  string `json:"reminder_timing" gorm:"type:varchar(50);default:'30m'"`
	PreferredMethod string `json:"preferred_method" gorm:"type:varchar(50);default:'email'"`
	QuietHoursStart string `json:"quiet_hours_start" gorm:"type:varchar(5)"`
	QuietHoursEnd   string `json:"quiet_hours_end" gorm:"type:varchar(5)"`

	// Relationships
	User UserEnhanced `json:"user" gorm:"foreignKey:UserID"`
}

func (NotificationPreferencesEnhanced) TableName() string {
	return "notification_preferences_enhanced"
}

// Validation helper functions
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$`)
	return emailRegex.MatchString(strings.ToLower(email))
}

func isValidPhone(phone string) bool {
	// Remove spaces and common separators
	cleaned := strings.ReplaceAll(phone, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")

	// Basic UK phone number validation
	phoneRegex := regexp.MustCompile(`^\+?44[0-9]{10}$|^0[0-9]{10}$`)
	return phoneRegex.MatchString(cleaned)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

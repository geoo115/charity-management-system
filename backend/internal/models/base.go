package models

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Custom types for better type safety
type (
	UserID        uint
	DonationID    uint
	VolunteerID   uint
	VisitorID     uint
	HelpRequestID uint
	ShiftID       uint
	TicketID      uint
)

// Common errors
var (
	ErrNotFound        = errors.New("record not found")
	ErrValidation      = errors.New("validation failed")
	ErrUnauthorized    = errors.New("unauthorized access")
	ErrDuplicateRecord = errors.New("duplicate record")
	ErrInvalidStatus   = errors.New("invalid status")
)

// BaseModel provides standard fields for all models
type BaseModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// AuditableModel extends BaseModel with audit fields
type AuditableModel struct {
	BaseModel
	CreatedBy *uint `json:"created_by,omitempty" gorm:"index"`
	UpdatedBy *uint `json:"updated_by,omitempty" gorm:"index"`
}

// SoftDeletable interface for models that support soft deletion
type SoftDeletable interface {
	IsDeleted() bool
	SoftDelete() error
	Restore() error
}

// Auditable interface for models that track creation/modification
type Auditable interface {
	SetCreatedBy(userID uint)
	SetUpdatedBy(userID uint)
	GetCreatedBy() *uint
	GetUpdatedBy() *uint
}

// Validatable interface for models that can validate themselves
type Validatable interface {
	Validate() error
}

// Timestampable interface for models with timestamps
type Timestampable interface {
	GetCreatedAt() time.Time
	GetUpdatedAt() time.Time
}

// Note: Constants are now centralized in constants.go to avoid duplication

// Implement interfaces for BaseModel
func (bm *BaseModel) GetCreatedAt() time.Time {
	return bm.CreatedAt
}

func (bm *BaseModel) GetUpdatedAt() time.Time {
	return bm.UpdatedAt
}

func (bm *BaseModel) IsDeleted() bool {
	return bm.DeletedAt.Valid
}

// Implement interfaces for AuditableModel
func (am *AuditableModel) SetCreatedBy(userID uint) {
	am.CreatedBy = &userID
}

func (am *AuditableModel) SetUpdatedBy(userID uint) {
	am.UpdatedBy = &userID
}

func (am *AuditableModel) GetCreatedBy() *uint {
	return am.CreatedBy
}

func (am *AuditableModel) GetUpdatedBy() *uint {
	return am.UpdatedBy
}

// ValidationError represents a validation error with field-specific details
type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value,omitempty"`
}

func (ve ValidationError) Error() string {
	return ve.Message
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (ves ValidationErrors) Error() string {
	if len(ves) == 0 {
		return "validation failed"
	}
	return ves[0].Error()
}

func (ves ValidationErrors) HasErrors() bool {
	return len(ves) > 0
}

// Common GORM hooks for auditable models
func (am *AuditableModel) BeforeCreate(tx *gorm.DB) error {
	// Set created_at and updated_at if not already set
	now := time.Now()
	if am.CreatedAt.IsZero() {
		am.CreatedAt = now
	}
	if am.UpdatedAt.IsZero() {
		am.UpdatedAt = now
	}
	return nil
}

func (am *AuditableModel) BeforeUpdate(tx *gorm.DB) error {
	am.UpdatedAt = time.Now()
	return nil
}

// Pagination helper
type PaginationParams struct {
	Page     int    `json:"page" form:"page" validate:"min=1"`
	PageSize int    `json:"page_size" form:"page_size" validate:"min=1,max=100"`
	SortBy   string `json:"sort_by" form:"sort_by"`
	SortDir  string `json:"sort_dir" form:"sort_dir" validate:"oneof=asc desc"`
}

func (p *PaginationParams) GetOffset() int {
	if p.Page <= 1 {
		return 0
	}
	return (p.Page - 1) * p.PageSize
}

func (p *PaginationParams) GetLimit() int {
	if p.PageSize <= 0 {
		return 20 // default page size
	}
	if p.PageSize > 100 {
		return 100 // max page size
	}
	return p.PageSize
}

// PaginationResult wraps paginated results
type PaginationResult struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
	HasNext    bool        `json:"has_next"`
	HasPrev    bool        `json:"has_prev"`
}

// Helper function to create pagination result
func NewPaginationResult(data interface{}, total int64, params PaginationParams) *PaginationResult {
	pageSize := params.GetLimit()
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	return &PaginationResult{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		PageSize:   pageSize,
		TotalPages: totalPages,
		HasNext:    params.Page < totalPages,
		HasPrev:    params.Page > 1,
	}
}

// Common filter interface
type Filterable interface {
	ApplyFilters(db *gorm.DB, filters map[string]interface{}) *gorm.DB
}

// MetaData represents flexible metadata storage
type MetaData map[string]interface{}

// Contact information structure used across models
type ContactInfo struct {
	Phone    string `json:"phone" validate:"phone"`
	Email    string `json:"email" validate:"email"`
	Address  string `json:"address"`
	City     string `json:"city"`
	Postcode string `json:"postcode" validate:"required"`
	Country  string `json:"country" gorm:"default:'UK'"`
}

// Emergency contact structure
type EmergencyContactInfo struct {
	Name         string `json:"name" validate:"required"`
	Relationship string `json:"relationship" validate:"required"`
	Phone        string `json:"phone" validate:"required,phone"`
	Email        string `json:"email" validate:"email"`
}

// Time range structure for schedules
type TimeRange struct {
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

func (tr TimeRange) IsValid() bool {
	return tr.StartTime.Before(tr.EndTime)
}

func (tr TimeRange) Duration() time.Duration {
	if !tr.IsValid() {
		return 0
	}
	return tr.EndTime.Sub(tr.StartTime)
}

// Status tracking for entities that go through workflows
type StatusHistory struct {
	BaseModel
	EntityType string    `json:"entity_type" gorm:"index"`
	EntityID   uint      `json:"entity_id" gorm:"index"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	ChangedBy  uint      `json:"changed_by"`
	ChangedAt  time.Time `json:"changed_at"`
	Reason     string    `json:"reason"`
	Notes      string    `json:"notes" gorm:"type:text"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:ChangedBy"`
}

package models

import (
	"time"

	"gorm.io/gorm"
)

// Document status constants
const (
	DocumentStatusPending  = "pending"
	DocumentStatusApproved = "approved"
	DocumentStatusRejected = "rejected"
)

// Document types
const (
	DocumentTypeID           = "photo_id"
	DocumentTypeProofAddress = "proof_address"
)

// Document represents a user-uploaded document for verification
type Document struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	UserID          uint           `json:"user_id" gorm:"index"`
	Type            string         `json:"type" gorm:"index"`
	Name            string         `json:"name"`  // Original filename of the document
	Title           string         `json:"title"` // User-friendly title
	FilePath        string         `json:"file_path"`
	FileType        string         `json:"file_type"` // MIME type
	FileSize        int64          `json:"file_size"` // Size in bytes
	Status          string         `json:"status" gorm:"default:pending;index"`
	Description     string         `json:"description"`
	VerifiedBy      *uint          `json:"verified_by"`
	VerifiedAt      *time.Time     `json:"verified_at"`
	UploadedAt      time.Time      `json:"uploaded_at"`
	RejectionReason string         `json:"rejection_reason"`
	Notes           string         `json:"notes"`      // Administrative notes
	ExpiresAt       *time.Time     `json:"expires_at"` // When document expires
	IsPrivate       bool           `json:"is_private"` // Is document private
	Checksum        string         `json:"checksum"`   // MD5 or SHA checksum
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User           User  `json:"-" gorm:"foreignKey:UserID"`
	VerifiedByUser *User `json:"-" gorm:"foreignKey:VerifiedBy"`
}

// CanViewDocument checks if a user can view the document based on their ID and role
func (d *Document) CanViewDocument(userID uint, role string) bool {
	// Owner can always view their own documents
	if d.UserID == userID {
		return true
	}

	// Admin or SuperAdmin can view all documents
	if role == RoleAdmin || role == RoleSuperAdmin {
		return true
	}

	// Staff might be able to view certain documents based on permissions
	if role == "staff" {
		// Check document type and other conditions...
		return !d.IsPrivate || d.Type == "public"
	}

	return false
}

// DocumentVerificationRequest represents a request to verify a document
type DocumentVerificationRequest struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	DocumentID  uint       `json:"document_id" gorm:"index"`
	RequestedBy uint       `json:"requested_by"`
	Status      string     `json:"status" gorm:"default:pending"`
	Priority    string     `json:"priority" gorm:"default:normal"` // high, normal, low
	Notes       string     `json:"notes"`
	RequestedAt time.Time  `json:"requested_at"`
	CompletedAt *time.Time `json:"completed_at"`
	AssignedTo  *uint      `json:"assigned_to"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relations
	Document     Document `json:"-" gorm:"foreignKey:DocumentID"`
	Requester    User     `json:"-" gorm:"foreignKey:RequestedBy"`
	AssignedUser *User    `json:"-" gorm:"foreignKey:AssignedTo"`
}

// DocumentVerificationResult represents the outcome of a verification
type DocumentVerificationResult struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	DocumentID      uint      `json:"document_id" gorm:"index"`
	RequestID       *uint     `json:"request_id"` // Optional link to the verification request
	VerifiedBy      uint      `json:"verified_by" gorm:"index"`
	Status          string    `json:"status"`
	Notes           string    `json:"notes"`
	RejectionReason string    `json:"rejection_reason"` // Only set when status is rejected
	VerifiedAt      time.Time `json:"verified_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	// Relations
	Document     Document                     `json:"-" gorm:"foreignKey:DocumentID"`
	Request      *DocumentVerificationRequest `json:"-" gorm:"foreignKey:RequestID"`
	VerifierUser User                         `json:"-" gorm:"foreignKey:VerifiedBy"`
}

// DocumentAccessLog tracks who accessed documents and when
type DocumentAccessLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	DocumentID   uint      `json:"document_id" gorm:"index"`
	AccessedBy   uint      `json:"accessed_by" gorm:"index"`
	AccessedAt   time.Time `json:"accessed_at"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	AccessType   string    `json:"access_type"`   // view, download, etc.
	AccessReason string    `json:"access_reason"` // Why the document was accessed
	Success      bool      `json:"success"`       // Whether access was granted
	CreatedAt    time.Time `json:"created_at"`

	// Relations
	Document Document `json:"-" gorm:"foreignKey:DocumentID"`
	User     User     `json:"-" gorm:"foreignKey:AccessedBy"`
}

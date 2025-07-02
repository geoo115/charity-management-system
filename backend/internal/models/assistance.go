package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// HelpRequest represents assistance requested by a visitor
type HelpRequest struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	VisitorID        uint           `json:"visitor_id" gorm:"not null"`
	VisitorName      string         `json:"visitor_name" gorm:"type:varchar(255)"`
	Email            string         `json:"email" gorm:"type:varchar(255)"`
	Phone            string         `json:"phone" gorm:"type:varchar(20)"`
	Postcode         string         `json:"postcode" gorm:"type:varchar(10)"`
	PreferredTime    time.Time      `json:"preferred_time"`
	Category         string         `json:"category" gorm:"type:varchar(100)"`
	Details          string         `json:"details" gorm:"type:text"`
	SpecialNeeds     string         `json:"special_needs" gorm:"type:text"`
	HouseholdSize    int            `json:"household_size" gorm:"default:1"`
	Status           string         `json:"status" gorm:"type:varchar(50);default:'pending'"`
	RequestDate      time.Time      `json:"request_date" gorm:"not null"`
	ApprovedAt       *time.Time     `json:"approved_at"`
	ApprovedBy       *uint          `json:"approved_by"`
	RejectedAt       *time.Time     `json:"rejected_at"`
	RejectedBy       *uint          `json:"rejected_by"`
	RejectionReason  string         `json:"rejection_reason" gorm:"type:text"`
	EligibilityNotes string         `json:"eligibility_notes" gorm:"type:text"`
	TicketNumber     string         `json:"ticket_number" gorm:"type:varchar(50)"`
	QRCode           string         `json:"qr_code" gorm:"type:text"`
	Reference        string         `json:"reference" gorm:"type:varchar(50);uniqueIndex"`
	VisitDay         string         `json:"visit_day" gorm:"type:varchar(20)"`
	TimeSlot         string         `json:"time_slot" gorm:"type:varchar(20)"`
	AssignedStaffID  *uint          `json:"assigned_staff_id"`
	Notes            string         `json:"notes" gorm:"type:text"`
	Priority         string         `json:"priority" gorm:"type:varchar(20);default:'normal'"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Relationships
	Visitor        User  `json:"visitor" gorm:"foreignKey:VisitorID"`
	AssignedStaff  *User `json:"assigned_staff,omitempty" gorm:"foreignKey:AssignedStaffID"`
	ApprovedByUser *User `json:"approved_by_user,omitempty" gorm:"foreignKey:ApprovedBy"`
	RejectedByUser *User `json:"rejected_by_user,omitempty" gorm:"foreignKey:RejectedBy"`
}

// IsEligible checks if the postcode indicates the visitor is eligible for services
func (hr *HelpRequest) IsEligible() bool {
	// Check if postcode is in eligible areas (example logic)
	if hr.Postcode == "" {
		return false
	}

	eligiblePrefixes := []string{"SE13", "SE14", "SE4", "SE6", "SE8", "BR1", "BR3"}
	for _, prefix := range eligiblePrefixes {
		if strings.HasPrefix(strings.ToUpper(hr.Postcode), prefix) {
			return true
		}
	}
	return false
}

// IsValidPostcode checks if postcode is in allowed areas (SE, BR, CR)
func (hr *HelpRequest) IsValidPostcode() bool {
	if len(hr.Postcode) < 2 {
		return false
	}

	prefix := hr.Postcode[:2]
	allowedPrefixes := []string{"SE", "BR", "CR"}

	for _, allowed := range allowedPrefixes {
		if prefix == allowed {
			return true
		}
	}

	return false
}

// EmergencyAssessment represents emergency request assessments by staff
type EmergencyAssessment struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	HelpRequestID       uint           `json:"help_request_id" gorm:"index"`
	AssessedBy          uint           `json:"assessed_by"`
	AssessmentDate      time.Time      `json:"assessment_date"`
	Approved            bool           `json:"approved"`
	Priority            string         `json:"priority"`
	AssessmentNotes     string         `json:"assessment_notes"`
	RequiredDocuments   string         `json:"required_documents"`
	FollowUpRequired    bool           `json:"follow_up_required"`
	FollowUpDate        *time.Time     `json:"follow_up_date"`
	SpecialInstructions string         `json:"special_instructions"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	HelpRequest    HelpRequest `json:"help_request" gorm:"foreignKey:HelpRequestID"`
	AssessedByUser User        `json:"assessed_by_user" gorm:"foreignKey:AssessedBy"`
}

// Update HelpRequest model to include automatic approval fields
type HelpRequestUpdate struct {
	TicketNumber *string    `json:"ticket_number"`
	QRCode       *string    `json:"qr_code"`
	ApprovedAt   *time.Time `json:"approved_at"`
	ApprovedBy   *uint      `json:"approved_by"`
}

// EligibilityCheck represents a visitor eligibility verification
type EligibilityCheck struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	FirstName     string         `json:"first_name" gorm:"type:varchar(100);not null"`
	LastName      string         `json:"last_name" gorm:"type:varchar(100);not null"`
	Email         string         `json:"email" gorm:"type:varchar(255);not null"`
	Phone         string         `json:"phone" gorm:"type:varchar(20)"`
	Address       string         `json:"address" gorm:"type:text"`
	Postcode      string         `json:"postcode" gorm:"type:varchar(10);not null"`
	DateOfBirth   *time.Time     `json:"date_of_birth,omitempty"`
	HouseholdSize int            `json:"household_size" gorm:"default:1"`
	CheckedAt     time.Time      `json:"checked_at" gorm:"not null"`
	IsEligible    bool           `json:"is_eligible" gorm:"default:false"`
	Reason        string         `json:"reason" gorm:"type:text"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName returns the table name for EligibilityCheck
func (EligibilityCheck) TableName() string {
	return "eligibility_checks"
}

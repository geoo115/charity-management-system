package models

import (
	"time"

	"gorm.io/gorm"
)

// Shift represents a volunteer shift
type Shift struct {
	ID                  uint           `gorm:"primaryKey" json:"id"`
	Date                time.Time      `json:"date"`
	StartTime           time.Time      `json:"start_time"`
	EndTime             time.Time      `json:"end_time"`
	Location            string         `json:"location"`
	Description         string         `json:"description"`
	Role                string         `json:"role"`
	MaxVolunteers       int            `json:"max_volunteers" gorm:"default:1"`
	RequiredSkills      string         `json:"required_skills"`
	AssignedVolunteerID *uint          `json:"assigned_volunteer_id"`
	Type                string         `json:"type"`       // e.g. "fixed", "flexible", "open"
	OpenEnded           bool           `json:"open_ended"` // true if open-ended shift
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to set CreatedAt and UpdatedAt
func (s *Shift) BeforeCreate(tx *gorm.DB) error {
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	return nil
}

// BeforeUpdate hook to set UpdatedAt
func (s *Shift) BeforeUpdate(tx *gorm.DB) error {
	s.UpdatedAt = time.Now()
	return nil
}

// ShiftAssignment represents a volunteer assigned to a shift
type ShiftAssignment struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	ShiftID     uint       `json:"shift_id" gorm:"index"`
	UserID      uint       `json:"user_id" gorm:"index"`
	VolunteerID uint       `json:"volunteer_id" gorm:"index"` // Reference to VolunteerProfile
	Status      string     `json:"status"`                    // "Confirmed", "Cancelled", "Completed", "NoShow"
	AssignedAt  time.Time  `json:"assigned_at"`
	AssignedBy  *uint      `json:"assigned_by"`
	CancelledAt *time.Time `json:"cancelled_at"`

	// Check-in/out tracking
	CheckedInAt  *time.Time `json:"checked_in_at"`
	CheckedOutAt *time.Time `json:"checked_out_at"`
	HoursLogged  float64    `json:"hours_logged" gorm:"default:0"`

	// Cancellation details
	CancellationReason string  `json:"cancellation_reason"`
	HoursNotice        float64 `json:"hours_notice"`

	// No-show tracking
	NoShowRecorded   bool       `json:"no_show_recorded" gorm:"default:false"`
	NoShowReason     string     `json:"no_show_reason"`
	NoShowRecordedBy *uint      `json:"no_show_recorded_by"`
	NoShowRecordedAt *time.Time `json:"no_show_recorded_at"`
	NoShowComments   string     `json:"no_show_comments"`

	// Reassignment tracking
	ReassignedFrom     *uint      `json:"reassigned_from"`
	ReassignmentReason string     `json:"reassignment_reason"`
	ReassignedBy       *uint      `json:"reassigned_by"`
	ReassignedAt       *time.Time `json:"reassigned_at"`

	// Flexible shift support - custom time selection
	CustomStartTime *time.Time `json:"custom_start_time"`
	CustomEndTime   *time.Time `json:"custom_end_time"`
	Duration        float64    `json:"duration" gorm:"default:0"` // Duration in hours

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Shift                Shift            `json:"shift" gorm:"foreignKey:ShiftID"`
	User                 User             `json:"user" gorm:"foreignKey:UserID"`
	Volunteer            VolunteerProfile `json:"volunteer" gorm:"foreignKey:VolunteerID"`
	AssignedByUser       *User            `json:"assigned_by_user" gorm:"foreignKey:AssignedBy"`
	NoShowRecordedByUser *User            `json:"no_show_recorded_by_user" gorm:"foreignKey:NoShowRecordedBy"`
	ReassignedFromUser   *User            `json:"reassigned_from_user" gorm:"foreignKey:ReassignedFrom"`
	ReassignedByUser     *User            `json:"reassigned_by_user" gorm:"foreignKey:ReassignedBy"`
}

// ShiftCancellation tracks when shifts are cancelled
type ShiftCancellation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ShiftID     uint      `json:"shift_id" gorm:"index"`
	VolunteerID uint      `json:"volunteer_id" gorm:"index"`
	Reason      string    `json:"reason"`
	CancelledBy uint      `json:"cancelled_by"`
	CancelledAt time.Time `json:"cancelled_at"`
	HoursNotice float64   `json:"hours_notice"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Shift           Shift `json:"shift" gorm:"foreignKey:ShiftID"`
	Volunteer       User  `json:"volunteer" gorm:"foreignKey:VolunteerID"`
	CancelledByUser User  `json:"cancelled_by_user" gorm:"foreignKey:CancelledBy"`
}

// VolunteerNoShow tracks when volunteers don't show up
type VolunteerNoShow struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	VolunteerID uint      `json:"volunteer_id" gorm:"index"`
	ShiftID     uint      `json:"shift_id" gorm:"index"`
	Reason      string    `json:"reason"`
	ReportedBy  uint      `json:"reported_by"`
	ReportedAt  time.Time `json:"reported_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Volunteer      User  `json:"volunteer" gorm:"foreignKey:VolunteerID"`
	Shift          Shift `json:"shift" gorm:"foreignKey:ShiftID"`
	ReportedByUser User  `json:"reported_by_user" gorm:"foreignKey:ReportedBy"`
}

// ShiftReassignment tracks when shifts are reassigned between volunteers
type ShiftReassignment struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ShiftID       uint      `json:"shift_id" gorm:"index"`
	FromVolunteer uint      `json:"from_volunteer"`
	ToVolunteer   uint      `json:"to_volunteer"`
	Reason        string    `json:"reason"`
	ReassignedBy  uint      `json:"reassigned_by"`
	ReassignedAt  time.Time `json:"reassigned_at"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relationships
	Shift             Shift `json:"shift" gorm:"foreignKey:ShiftID"`
	FromVolunteerUser User  `json:"from_volunteer_user" gorm:"foreignKey:FromVolunteer"`
	ToVolunteerUser   User  `json:"to_volunteer_user" gorm:"foreignKey:ToVolunteer"`
	ReassignedByUser  User  `json:"reassigned_by_user" gorm:"foreignKey:ReassignedBy"`
}

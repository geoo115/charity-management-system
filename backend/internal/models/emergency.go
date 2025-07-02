package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// EmergencyWorkflow represents emergency response procedures
type EmergencyWorkflow struct {
	ID            uint          `json:"id" gorm:"primarykey"`
	Name          string        `json:"name" gorm:"not null"`
	Description   string        `json:"description"`
	Category      string        `json:"category"` // Safety, Health, Technical, Security, Weather
	Priority      string        `json:"priority"` // Critical, High, Medium, Low
	Status        string        `json:"status"`   // Active, Draft, Archived
	Steps         WorkflowSteps `json:"steps" gorm:"type:json"`
	EstimatedTime string        `json:"estimated_time"`
	UsageCount    int           `json:"usage_count" gorm:"default:0"`
	CreatedBy     string        `json:"created_by"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// WorkflowStep represents a single step in an emergency workflow
type WorkflowStep struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Duration    string `json:"duration"`
	Responsible string `json:"responsible"`
	Required    bool   `json:"required"`
}

// WorkflowSteps is a custom type for JSON serialization
type WorkflowSteps []WorkflowStep

// Value implements the driver.Valuer interface for database storage
func (ws WorkflowSteps) Value() (driver.Value, error) {
	return json.Marshal(ws)
}

// Scan implements the sql.Scanner interface for database retrieval
func (ws *WorkflowSteps) Scan(value interface{}) error {
	if value == nil {
		*ws = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, ws)
}

// EmergencyIncident represents emergency incidents
type EmergencyIncident struct {
	ID                  uint                  `json:"id" gorm:"primarykey"`
	Title               string                `json:"title" gorm:"not null"`
	Type                string                `json:"type"`     // Fire, Medical, Security, Technical, Weather, Other
	Severity            string                `json:"severity"` // Critical, High, Medium, Low
	Status              string                `json:"status"`   // Active, Responding, Investigating, Resolved, Cancelled
	Location            string                `json:"location"`
	Description         string                `json:"description"`
	ReportedBy          string                `json:"reported_by"`
	AssignedTo          StringArray           `json:"assigned_to" gorm:"type:json"`
	TimelineEntries     IncidentTimelineArray `json:"timeline_entries" gorm:"type:json"`
	Priority            int                   `json:"priority"`
	WorkflowID          *uint                 `json:"workflow_id"`
	Workflow            *EmergencyWorkflow    `json:"workflow,omitempty" gorm:"foreignKey:WorkflowID"`
	EstimatedResolution *time.Time            `json:"estimated_resolution"`
	ResolutionNotes     *string               `json:"resolution_notes"`
	CreatedAt           time.Time             `json:"created_at"`
	UpdatedAt           time.Time             `json:"updated_at"`
}

// IncidentTimelineEntry represents a timeline entry for an incident
type IncidentTimelineEntry struct {
	Time   string `json:"time"`
	Action string `json:"action"`
	User   string `json:"user"`
}

// IncidentTimelineArray is a custom type for JSON serialization
type IncidentTimelineArray []IncidentTimelineEntry

// Value implements the driver.Valuer interface for database storage
func (ita IncidentTimelineArray) Value() (driver.Value, error) {
	return json.Marshal(ita)
}

// Scan implements the sql.Scanner interface for database retrieval
func (ita *IncidentTimelineArray) Scan(value interface{}) error {
	if value == nil {
		*ita = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, ita)
}

// StringArray is a custom type for JSON serialization of string arrays
type StringArray []string

// Value implements the driver.Valuer interface for database storage
func (sa StringArray) Value() (driver.Value, error) {
	return json.Marshal(sa)
}

// Scan implements the sql.Scanner interface for database retrieval
func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, sa)
}

// EmergencyAlert represents emergency alerts/notifications
type EmergencyAlert struct {
	ID         uint               `json:"id" gorm:"primarykey"`
	Title      string             `json:"title" gorm:"not null"`
	Type       string             `json:"type"`     // Critical Alert, Emergency, Medical Alert, Weather Alert, Information
	Severity   string             `json:"severity"` // Critical, High, Medium, Low
	Status     string             `json:"status"`   // Active, Stopped, Expired
	Message    string             `json:"message" gorm:"type:text"`
	Channels   StringArray        `json:"channels" gorm:"type:json"`   // SMS, Email, Push, PA System, etc.
	Recipients StringArray        `json:"recipients" gorm:"type:json"` // All Staff, Volunteers, Managers, etc.
	IncidentID *uint              `json:"incident_id"`
	Incident   *EmergencyIncident `json:"incident,omitempty" gorm:"foreignKey:IncidentID"`
	SentAt     *time.Time         `json:"sent_at"`
	ExpiresAt  *time.Time         `json:"expires_at"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
}

// EmergencyMessageTemplate represents pre-configured emergency message templates
type EmergencyMessageTemplate struct {
	ID         uint        `json:"id" gorm:"primarykey"`
	Name       string      `json:"name" gorm:"not null"`
	Category   string      `json:"category"` // Emergency, Weather, Medical, Technical, etc.
	Message    string      `json:"message" gorm:"type:text"`
	Variables  StringArray `json:"variables" gorm:"type:json"` // Variables that can be substituted
	UsageCount int         `json:"usage_count" gorm:"default:0"`
	CreatedBy  string      `json:"created_by"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

// EmergencyResource represents emergency resources and equipment
type EmergencyResource struct {
	ID          uint       `json:"id" gorm:"primarykey"`
	Name        string     `json:"name" gorm:"not null"`
	Type        string     `json:"type"` // Equipment, Facility, Personnel
	Location    string     `json:"location"`
	Status      string     `json:"status"` // Available, In Use, Maintenance, Unavailable
	Description string     `json:"description"`
	Quantity    int        `json:"quantity"`
	LastChecked *time.Time `json:"last_checked"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

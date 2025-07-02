package models

import (
	"time"
)

// AuditLog represents system audit trail
type AuditLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Action      string    `json:"action" gorm:"type:varchar(100);not null"`
	EntityType  string    `json:"entity_type" gorm:"type:varchar(50)"`
	EntityID    uint      `json:"entity_id"`
	Description string    `json:"description" gorm:"type:text"`
	DetailsJSON string    `json:"details_json" gorm:"type:text"`
	PerformedBy string    `json:"performed_by" gorm:"type:varchar(255)"`
	IPAddress   string    `json:"ip_address" gorm:"type:varchar(45)"`
	UserAgent   string    `json:"user_agent" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName returns the table name for AuditLog
func (AuditLog) TableName() string {
	return "audit_logs"
}

// AuditLogFilter represents filtering options for audit logs
type AuditLogFilter struct {
	Action     string    `json:"action,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   *uint     `json:"entity_id,omitempty"`
	StartDate  time.Time `json:"start_date,omitempty"`
	EndDate    time.Time `json:"end_date,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	Limit      int       `json:"limit,omitempty"`
	Offset     int       `json:"offset,omitempty"`
}

// GetSeverityLevel returns the severity level of the audit action
func (al *AuditLog) GetSeverityLevel() string {
	switch al.Action {
	case "AdminDeleteUser", "AdminDeleteDocument", "AdminMarkNoShow":
		return "high"
	case "AdminUpdateUser", "AdminReassignShift", "AdminApproveDocument":
		return "medium"
	default:
		return "low"
	}
}

// IsSecurityRelevant returns true if this audit log is security-relevant
func (al *AuditLog) IsSecurityRelevant() bool {
	securityActions := []string{
		"Login", "LoginFailed", "Logout", "PasswordReset",
		"AdminDeleteUser", "AdminUpdateUserRole", "AdminReassignShift",
	}

	for _, action := range securityActions {
		if al.Action == action {
			return true
		}
	}
	return false
}

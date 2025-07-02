package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuditService handles centralized audit logging and security monitoring
type AuditService struct {
	db                          *gorm.DB
	realtimeNotificationService *RealtimeNotificationService
}

// AuditEvent represents an audit event
type AuditEvent struct {
	ID           uint                   `json:"id"`
	UserID       *uint                  `json:"user_id,omitempty"`
	Action       string                 `json:"action"`
	Resource     string                 `json:"resource"`
	ResourceID   *uint                  `json:"resource_id,omitempty"`
	Details      map[string]interface{} `json:"details"`
	IPAddress    string                 `json:"ip_address"`
	UserAgent    string                 `json:"user_agent"`
	Timestamp    time.Time              `json:"timestamp"`
	Severity     string                 `json:"severity"` // "low", "medium", "high", "critical"
	Category     string                 `json:"category"` // "auth", "data", "system", "security"
	Success      bool                   `json:"success"`
	ErrorMessage string                 `json:"error_message,omitempty"`
	SessionID    string                 `json:"session_id,omitempty"`
}

// SecurityAlert represents a security alert
type SecurityAlert struct {
	ID          uint                   `json:"id"`
	Type        string                 `json:"type"`
	Severity    string                 `json:"severity"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	UserID      *uint                  `json:"user_id,omitempty"`
	IPAddress   string                 `json:"ip_address"`
	Timestamp   time.Time              `json:"timestamp"`
	Status      string                 `json:"status"` // "active", "investigating", "resolved", "false_positive"
	Context     map[string]interface{} `json:"context"`
}

// AuditReport represents an audit report
type AuditReport struct {
	TimeRange          string          `json:"time_range"`
	TotalEvents        int64           `json:"total_events"`
	EventsByAction     map[string]int  `json:"events_by_action"`
	EventsByUser       map[string]int  `json:"events_by_user"`
	SecurityAlerts     int64           `json:"security_alerts"`
	FailedLogins       int64           `json:"failed_logins"`
	DataChanges        int64           `json:"data_changes"`
	SystemEvents       int64           `json:"system_events"`
	TopUsers           []UserActivity  `json:"top_users"`
	SuspiciousActivity []SecurityAlert `json:"suspicious_activity"`
	GeneratedAt        time.Time       `json:"generated_at"`
}

// UserActivity represents user activity summary
type UserActivity struct {
	UserID       uint      `json:"user_id"`
	UserName     string    `json:"user_name"`
	EventCount   int       `json:"event_count"`
	LastActivity time.Time `json:"last_activity"`
}

// ComplianceReport represents a compliance audit report
type ComplianceReport struct {
	Period              string    `json:"period"`
	DataAccess          int64     `json:"data_access_events"`
	DataModifications   int64     `json:"data_modification_events"`
	UserCreations       int64     `json:"user_creation_events"`
	PermissionChanges   int64     `json:"permission_change_events"`
	SecurityIncidents   int64     `json:"security_incidents"`
	PolicyViolations    int64     `json:"policy_violations"`
	DataRetentionEvents int64     `json:"data_retention_events"`
	GeneratedAt         time.Time `json:"generated_at"`
}

// NewAuditService creates a new audit service
func NewAuditService() *AuditService {
	return &AuditService{
		db:                          db.DB,
		realtimeNotificationService: GetGlobalRealtimeNotificationService(),
	}
}

// LogEvent logs an audit event
func (as *AuditService) LogEvent(event AuditEvent) error {
	// Create audit log entry
	detailsJSON := ""
	if event.Details != nil {
		if jsonBytes, err := json.Marshal(event.Details); err == nil {
			detailsJSON = string(jsonBytes)
		}
	}

	performedBy := ""
	if event.UserID != nil {
		performedBy = fmt.Sprintf("user_%d", *event.UserID)
	}

	description := event.ErrorMessage
	if description == "" && event.Success {
		description = fmt.Sprintf("Successful %s on %s", event.Action, event.Resource)
	} else if description == "" {
		description = fmt.Sprintf("Failed %s on %s", event.Action, event.Resource)
	}

	auditLog := models.AuditLog{
		Action:      event.Action,
		EntityType:  event.Resource,
		EntityID:    0, // Will be set if ResourceID is provided
		Description: description,
		DetailsJSON: detailsJSON,
		PerformedBy: performedBy,
		IPAddress:   event.IPAddress,
		UserAgent:   event.UserAgent,
		CreatedAt:   event.Timestamp,
	}

	if event.ResourceID != nil {
		auditLog.EntityID = *event.ResourceID
	}

	if err := as.db.Create(&auditLog).Error; err != nil {
		log.Printf("Failed to create audit log: %v", err)
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	// Check for suspicious activity
	go as.analyzeSuspiciousActivity(event)

	// Send real-time alerts for critical events
	if event.Severity == "critical" {
		go as.sendSecurityAlert(event)
	}

	return nil
}

// LogHTTPRequest logs an HTTP request as an audit event
func (as *AuditService) LogHTTPRequest(c *gin.Context, action, resource string, resourceID *uint, success bool, errorMessage string) {
	userID := as.getUserIDFromContext(c)

	details := map[string]interface{}{
		"method": c.Request.Method,
		"path":   c.Request.URL.Path,
		"query":  c.Request.URL.RawQuery,
		"status": c.Writer.Status(),
		"size":   c.Writer.Size(),
	}

	event := AuditEvent{
		UserID:       userID,
		Action:       action,
		Resource:     resource,
		ResourceID:   resourceID,
		Details:      details,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
		Timestamp:    time.Now(),
		Severity:     as.determineSeverity(action, success),
		Category:     as.determineCategory(action),
		Success:      success,
		ErrorMessage: errorMessage,
		SessionID:    as.getSessionID(c),
	}

	as.LogEvent(event)
}

// LogDataAccess logs data access events
func (as *AuditService) LogDataAccess(userID uint, resource string, resourceID uint, action string, ipAddress string) {
	event := AuditEvent{
		UserID:     &userID,
		Action:     action,
		Resource:   resource,
		ResourceID: &resourceID,
		Details: map[string]interface{}{
			"access_type": action,
		},
		IPAddress: ipAddress,
		Timestamp: time.Now(),
		Severity:  "medium",
		Category:  "data",
		Success:   true,
	}

	as.LogEvent(event)
}

// LogAuthenticationEvent logs authentication events
func (as *AuditService) LogAuthenticationEvent(userID *uint, action string, success bool, ipAddress, userAgent string, details map[string]interface{}) {
	severity := "low"
	if !success {
		severity = "medium"
	}
	if action == "failed_login" {
		severity = "high"
	}

	event := AuditEvent{
		UserID:    userID,
		Action:    action,
		Resource:  "authentication",
		Details:   details,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Timestamp: time.Now(),
		Severity:  severity,
		Category:  "auth",
		Success:   success,
	}

	as.LogEvent(event)
}

// LogPermissionChange logs permission and role changes
func (as *AuditService) LogPermissionChange(adminUserID, targetUserID uint, action string, oldValue, newValue interface{}, ipAddress string) {
	event := AuditEvent{
		UserID:     &adminUserID,
		Action:     action,
		Resource:   "user_permissions",
		ResourceID: &targetUserID,
		Details: map[string]interface{}{
			"old_value":      oldValue,
			"new_value":      newValue,
			"target_user_id": targetUserID,
		},
		IPAddress: ipAddress,
		Timestamp: time.Now(),
		Severity:  "high",
		Category:  "security",
		Success:   true,
	}

	as.LogEvent(event)
}

// LogSystemEvent logs system-level events
func (as *AuditService) LogSystemEvent(action string, details map[string]interface{}, severity string) {
	event := AuditEvent{
		Action:    action,
		Resource:  "system",
		Details:   details,
		Timestamp: time.Now(),
		Severity:  severity,
		Category:  "system",
		Success:   true,
	}

	as.LogEvent(event)
}

// GetAuditEvents retrieves audit events with filtering
func (as *AuditService) GetAuditEvents(userID *uint, action, resource string, startDate, endDate time.Time, limit int) ([]AuditEvent, error) {
	var auditLogs []models.AuditLog
	query := as.db.Model(&models.AuditLog{})

	// Apply filters
	if userID != nil {
		query = query.Where("performed_by = ?", fmt.Sprintf("user_%d", *userID))
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("entity_type = ?", resource)
	}
	if !startDate.IsZero() {
		query = query.Where("created_at >= ?", startDate)
	}
	if !endDate.IsZero() {
		query = query.Where("created_at <= ?", endDate)
	}

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Order("created_at DESC").Find(&auditLogs).Error; err != nil {
		return nil, fmt.Errorf("failed to get audit events: %w", err)
	}

	// Convert to AuditEvent structs
	var events []AuditEvent
	for _, log := range auditLogs {
		var details map[string]interface{}
		if log.DetailsJSON != "" {
			json.Unmarshal([]byte(log.DetailsJSON), &details)
		}

		var userID *uint
		if strings.HasPrefix(log.PerformedBy, "user_") {
			var uid uint
			if _, err := fmt.Sscanf(log.PerformedBy, "user_%d", &uid); err == nil {
				userID = &uid
			}
		}

		var resourceID *uint
		if log.EntityID > 0 {
			resourceID = &log.EntityID
		}

		events = append(events, AuditEvent{
			ID:           log.ID,
			UserID:       userID,
			Action:       log.Action,
			Resource:     log.EntityType,
			ResourceID:   resourceID,
			Details:      details,
			IPAddress:    log.IPAddress,
			UserAgent:    log.UserAgent,
			Timestamp:    log.CreatedAt,
			ErrorMessage: log.Description,
		})
	}

	return events, nil
}

// GenerateAuditReport generates a comprehensive audit report
func (as *AuditService) GenerateAuditReport(startDate, endDate time.Time) (*AuditReport, error) {
	report := &AuditReport{
		TimeRange:      fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
		EventsByAction: make(map[string]int),
		EventsByUser:   make(map[string]int),
		GeneratedAt:    time.Now(),
	}

	// Total events
	as.db.Model(&models.AuditLog{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&report.TotalEvents)

	// Events by action
	var actionCounts []struct {
		Action string
		Count  int
	}
	as.db.Model(&models.AuditLog{}).
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Select("action, count(*) as count").
		Group("action").
		Scan(&actionCounts)

	for _, ac := range actionCounts {
		report.EventsByAction[ac.Action] = ac.Count
	}

	// Failed logins
	as.db.Model(&models.AuditLog{}).
		Where("action = ? AND description LIKE ? AND created_at BETWEEN ? AND ?", "login", "%Failed%", startDate, endDate).
		Count(&report.FailedLogins)

	// Data changes
	dataActions := []string{"create", "update", "delete"}
	as.db.Model(&models.AuditLog{}).
		Where("action IN ? AND created_at BETWEEN ? AND ?", dataActions, startDate, endDate).
		Count(&report.DataChanges)

	// System events
	as.db.Model(&models.AuditLog{}).
		Where("entity_type = ? AND created_at BETWEEN ? AND ?", "system", startDate, endDate).
		Count(&report.SystemEvents)

	// Top users by activity
	var userActivities []struct {
		PerformedBy string
		Count       int
		LastEvent   time.Time
	}
	as.db.Model(&models.AuditLog{}).
		Where("performed_by != '' AND created_at BETWEEN ? AND ?", startDate, endDate).
		Select("performed_by, count(*) as count, max(created_at) as last_event").
		Group("performed_by").
		Order("count DESC").
		Limit(10).
		Scan(&userActivities)

	for _, ua := range userActivities {
		if strings.HasPrefix(ua.PerformedBy, "user_") {
			var userID uint
			if _, err := fmt.Sscanf(ua.PerformedBy, "user_%d", &userID); err == nil {
				var user models.User
				if err := as.db.First(&user, userID).Error; err == nil {
					report.TopUsers = append(report.TopUsers, UserActivity{
						UserID:       userID,
						UserName:     user.FirstName + " " + user.LastName,
						EventCount:   ua.Count,
						LastActivity: ua.LastEvent,
					})
				}
			}
		}
	}

	return report, nil
}

// GenerateComplianceReport generates a compliance audit report
func (as *AuditService) GenerateComplianceReport(startDate, endDate time.Time) (*ComplianceReport, error) {
	report := &ComplianceReport{
		Period:      fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
		GeneratedAt: time.Now(),
	}

	// Data access events
	dataAccessActions := []string{"read", "view", "download"}
	as.db.Model(&models.AuditLog{}).
		Where("action IN ? AND created_at BETWEEN ? AND ?", dataAccessActions, startDate, endDate).
		Count(&report.DataAccess)

	// Data modification events
	dataModActions := []string{"create", "update", "delete"}
	as.db.Model(&models.AuditLog{}).
		Where("action IN ? AND created_at BETWEEN ? AND ?", dataModActions, startDate, endDate).
		Count(&report.DataModifications)

	// User creation events
	as.db.Model(&models.AuditLog{}).
		Where("action = ? AND entity_type = ? AND created_at BETWEEN ? AND ?", "create", "user", startDate, endDate).
		Count(&report.UserCreations)

	// Permission change events
	permissionActions := []string{"role_change", "permission_grant", "permission_revoke"}
	as.db.Model(&models.AuditLog{}).
		Where("action IN ? AND created_at BETWEEN ? AND ?", permissionActions, startDate, endDate).
		Count(&report.PermissionChanges)

	return report, nil
}

// analyzeSuspiciousActivity analyzes events for suspicious patterns
func (as *AuditService) analyzeSuspiciousActivity(event AuditEvent) {
	// Check for multiple failed login attempts
	if event.Action == "login" && !event.Success {
		go as.checkFailedLoginAttempts(event)
	}

	// Check for unusual access patterns
	if event.UserID != nil {
		go as.checkUnusualAccessPatterns(*event.UserID, event)
	}

	// Check for privilege escalation attempts
	if strings.Contains(event.Action, "role") || strings.Contains(event.Action, "permission") {
		go as.checkPrivilegeEscalation(event)
	}
}

// checkFailedLoginAttempts checks for multiple failed login attempts
func (as *AuditService) checkFailedLoginAttempts(event AuditEvent) {
	// Check for failed logins from same IP in last 15 minutes
	since := time.Now().Add(-15 * time.Minute)
	var count int64

	as.db.Model(&models.AuditLog{}).
		Where("action = ? AND description LIKE ? AND ip_address = ? AND created_at >= ?",
			"login", "%Failed%", event.IPAddress, since).
		Count(&count)

	if count >= 5 {
		alert := SecurityAlert{
			Type:        "multiple_failed_logins",
			Severity:    "high",
			Title:       "Multiple Failed Login Attempts",
			Description: fmt.Sprintf("Multiple failed login attempts detected from IP %s", event.IPAddress),
			IPAddress:   event.IPAddress,
			Timestamp:   time.Now(),
			Status:      "active",
			Context: map[string]interface{}{
				"failed_attempts": count,
				"ip_address":      event.IPAddress,
				"time_window":     "15 minutes",
			},
		}

		as.createSecurityAlert(alert)
	}
}

// checkUnusualAccessPatterns checks for unusual user access patterns
func (as *AuditService) checkUnusualAccessPatterns(userID uint, event AuditEvent) {
	// Check if user is accessing from a new IP address
	var ipCount int64
	as.db.Model(&models.AuditLog{}).
		Where("performed_by = ? AND ip_address = ?", fmt.Sprintf("user_%d", userID), event.IPAddress).
		Count(&ipCount)

	if ipCount == 1 { // First time from this IP
		// Check if user has accessed from other IPs recently
		var recentIPs int64
		since := time.Now().Add(-7 * 24 * time.Hour) // Last 7 days
		as.db.Model(&models.AuditLog{}).
			Where("performed_by = ? AND ip_address != ? AND created_at >= ?", fmt.Sprintf("user_%d", userID), event.IPAddress, since).
			Distinct("ip_address").
			Count(&recentIPs)

		if recentIPs > 0 {
			alert := SecurityAlert{
				Type:        "new_ip_access",
				Severity:    "medium",
				Title:       "Access from New IP Address",
				Description: fmt.Sprintf("User accessed system from new IP address: %s", event.IPAddress),
				UserID:      &userID,
				IPAddress:   event.IPAddress,
				Timestamp:   time.Now(),
				Status:      "active",
				Context: map[string]interface{}{
					"user_id":  userID,
					"new_ip":   event.IPAddress,
					"action":   event.Action,
					"resource": event.Resource,
				},
			}

			as.createSecurityAlert(alert)
		}
	}
}

// checkPrivilegeEscalation checks for potential privilege escalation
func (as *AuditService) checkPrivilegeEscalation(event AuditEvent) {
	if event.UserID == nil {
		return
	}

	// Check if user is trying to modify their own permissions
	if targetUserID, ok := event.Details["target_user_id"].(uint); ok {
		if targetUserID == *event.UserID {
			alert := SecurityAlert{
				Type:        "self_privilege_escalation",
				Severity:    "critical",
				Title:       "Potential Self-Privilege Escalation",
				Description: "User attempted to modify their own permissions",
				UserID:      event.UserID,
				IPAddress:   event.IPAddress,
				Timestamp:   time.Now(),
				Status:      "active",
				Context: map[string]interface{}{
					"user_id": *event.UserID,
					"action":  event.Action,
					"details": event.Details,
				},
			}

			as.createSecurityAlert(alert)
		}
	}
}

// createSecurityAlert creates a new security alert
func (as *AuditService) createSecurityAlert(alert SecurityAlert) {
	// For now, we'll log the alert. In a real implementation,
	// you might store these in a separate security_alerts table
	alertJSON, _ := json.Marshal(alert)

	as.LogSystemEvent("security_alert", map[string]interface{}{
		"alert_type":  alert.Type,
		"severity":    alert.Severity,
		"description": alert.Description,
		"alert_data":  string(alertJSON),
	}, "critical")

	// Send real-time notification to security team
	as.sendSecurityNotification(alert)
}

// sendSecurityAlert sends a security alert notification
func (as *AuditService) sendSecurityAlert(event AuditEvent) {
	// Send notification to admin users about critical security events
	as.realtimeNotificationService.SendToRole("admin", RealtimeNotificationData{
		Type:     "security_alert",
		Title:    "Security Alert",
		Message:  fmt.Sprintf("Critical security event: %s on %s", event.Action, event.Resource),
		Priority: "critical",
		Category: "security",
		Channels: []string{"websocket", "push", "email"},
		Data: map[string]interface{}{
			"event":      event,
			"severity":   event.Severity,
			"ip_address": event.IPAddress,
		},
	})
}

// sendSecurityNotification sends a security alert notification
func (as *AuditService) sendSecurityNotification(alert SecurityAlert) {
	as.realtimeNotificationService.SendToRole("admin", RealtimeNotificationData{
		Type:     "security_alert",
		Title:    alert.Title,
		Message:  alert.Description,
		Priority: "critical",
		Category: "security",
		Channels: []string{"websocket", "push", "email"},
		Data: map[string]interface{}{
			"alert":      alert,
			"alert_type": alert.Type,
			"severity":   alert.Severity,
		},
	})
}

// Helper methods
func (as *AuditService) getUserIDFromContext(c *gin.Context) *uint {
	if userID, exists := c.Get("userID"); exists {
		if uid, ok := userID.(uint); ok {
			return &uid
		}
	}
	return nil
}

func (as *AuditService) getSessionID(c *gin.Context) string {
	if sessionID, exists := c.Get("sessionID"); exists {
		if sid, ok := sessionID.(string); ok {
			return sid
		}
	}
	return ""
}

func (as *AuditService) determineSeverity(action string, success bool) string {
	if !success {
		return "medium"
	}

	criticalActions := []string{"delete", "role_change", "permission_grant", "permission_revoke"}
	for _, ca := range criticalActions {
		if action == ca {
			return "high"
		}
	}

	return "low"
}

func (as *AuditService) determineCategory(action string) string {
	authActions := []string{"login", "logout", "register", "password_reset"}
	for _, aa := range authActions {
		if action == aa {
			return "auth"
		}
	}

	dataActions := []string{"create", "read", "update", "delete"}
	for _, da := range dataActions {
		if action == da {
			return "data"
		}
	}

	securityActions := []string{"role_change", "permission_grant", "permission_revoke"}
	for _, sa := range securityActions {
		if action == sa {
			return "security"
		}
	}

	return "system"
}

// GetGlobalAuditService returns the global audit service instance
var globalAuditService *AuditService

func GetGlobalAuditService() *AuditService {
	if globalAuditService == nil {
		globalAuditService = NewAuditService()
	}
	return globalAuditService
}

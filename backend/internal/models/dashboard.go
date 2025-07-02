package models

import (
	"time"
)

// DashboardStats represents overall system statistics
type DashboardStats struct {
	// General Statistics
	TotalUsers        int64 `json:"total_users"`
	ActiveUsers       int64 `json:"active_users"`
	NewUsersThisMonth int64 `json:"new_users_this_month"`

	// Visitor Statistics
	TotalVisits         int64   `json:"total_visits"`
	VisitsToday         int64   `json:"visits_today"`
	VisitsThisWeek      int64   `json:"visits_this_week"`
	VisitsThisMonth     int64   `json:"visits_this_month"`
	AverageVisitsPerDay float64 `json:"average_visits_per_day"`

	// Help Request Statistics
	TotalHelpRequests     int64 `json:"total_help_requests"`
	PendingHelpRequests   int64 `json:"pending_help_requests"`
	ApprovedHelpRequests  int64 `json:"approved_help_requests"`
	CompletedHelpRequests int64 `json:"completed_help_requests"`

	// Donation Statistics
	TotalDonations     int64   `json:"total_donations"`
	DonationsThisMonth int64   `json:"donations_this_month"`
	TotalDonationValue float64 `json:"total_donation_value"`

	// Volunteer Statistics
	TotalVolunteers         int64   `json:"total_volunteers"`
	ActiveVolunteers        int64   `json:"active_volunteers"`
	VolunteerHoursThisMonth float64 `json:"volunteer_hours_this_month"`

	// Queue Statistics
	CurrentQueueLength int `json:"current_queue_length"`
	AverageWaitTime    int `json:"average_wait_time_minutes"`

	// System Health
	SystemHealth string    `json:"system_health"` // healthy, warning, critical
	LastUpdated  time.Time `json:"last_updated"`
}

// VisitorDashboard represents visitor-specific dashboard data
type VisitorDashboard struct {
	UserID uint   `json:"user_id"`
	Name   string `json:"name"`

	// Visit History
	TotalVisits        int64      `json:"total_visits"`
	LastVisitDate      *time.Time `json:"last_visit_date"`
	NextScheduledVisit *time.Time `json:"next_scheduled_visit"`

	// Current Status
	HasActiveHelpRequest bool  `json:"has_active_help_request"`
	ActiveHelpRequestID  *uint `json:"active_help_request_id"`
	QueuePosition        *int  `json:"queue_position"`
	EstimatedWaitTime    *int  `json:"estimated_wait_time_minutes"`

	// Recent Activity
	RecentVisits       []Visit       `json:"recent_visits"`
	RecentHelpRequests []HelpRequest `json:"recent_help_requests"`

	// Notifications
	UnreadNotifications    int            `json:"unread_notifications"`
	ImportantNotifications []Notification `json:"important_notifications"`

	// Eligibility Status
	EligibilityStatus    string     `json:"eligibility_status"` // eligible, pending, expired
	EligibilityExpiresAt *time.Time `json:"eligibility_expires_at"`

	// Quick Actions
	CanRequestHelp   bool `json:"can_request_help"`
	CanScheduleVisit bool `json:"can_schedule_visit"`

	LastUpdated time.Time `json:"last_updated"`
}

// DonorDashboard represents donor-specific dashboard data
type DonorDashboard struct {
	UserID uint   `json:"user_id"`
	Name   string `json:"name"`

	// Donation Statistics
	TotalDonations        int64      `json:"total_donations"`
	TotalDonationValue    float64    `json:"total_donation_value"`
	DonationsThisYear     int64      `json:"donations_this_year"`
	DonationValueThisYear float64    `json:"donation_value_this_year"`
	LastDonationDate      *time.Time `json:"last_donation_date"`

	// Impact Metrics
	PeopleHelped      int64 `json:"people_helped"`
	MealsProvided     int64 `json:"meals_provided"`
	FamiliesSupported int64 `json:"families_supported"`

	// Recent Activity
	RecentDonations []Donation `json:"recent_donations"`

	// Urgent Needs
	UrgentNeeds []UrgentNeed `json:"urgent_needs"`

	// Recognition
	DonorLevel   string   `json:"donor_level"` // bronze, silver, gold, platinum
	Achievements []string `json:"achievements"`

	// Notifications
	UnreadNotifications int `json:"unread_notifications"`

	LastUpdated time.Time `json:"last_updated"`
}

// VolunteerDashboard represents volunteer-specific dashboard data
type VolunteerDashboard struct {
	UserID          uint   `json:"user_id"`
	Name            string `json:"name"`
	VolunteerStatus string `json:"volunteer_status"` // pending, approved, active, inactive

	// Shift Statistics
	TotalShifts     int64   `json:"total_shifts"`
	CompletedShifts int64   `json:"completed_shifts"`
	TotalHours      float64 `json:"total_hours"`
	HoursThisMonth  float64 `json:"hours_this_month"`

	// Current Status
	NextShift               *time.Time `json:"next_shift"`
	ActiveShiftID           *uint      `json:"active_shift_id"`
	IsCurrentlyVolunteering bool       `json:"is_currently_volunteering"`

	// Performance Metrics
	AttendanceRate   float64 `json:"attendance_rate"`
	AverageRating    float64 `json:"average_rating"`
	ReliabilityScore float64 `json:"reliability_score"`

	// Recent Activity
	RecentShifts   []Shift `json:"recent_shifts"`
	UpcomingShifts []Shift `json:"upcoming_shifts"`

	// Training Status
	CompletedTrainingModules int     `json:"completed_training_modules"`
	TotalTrainingModules     int     `json:"total_training_modules"`
	TrainingCompletionRate   float64 `json:"training_completion_rate"`

	// Tasks and Assignments
	PendingTasks   int `json:"pending_tasks"`
	CompletedTasks int `json:"completed_tasks"`

	// Notifications
	UnreadNotifications    int            `json:"unread_notifications"`
	ImportantAnnouncements []Announcement `json:"important_announcements"`

	// Recognition
	VolunteerLevel string   `json:"volunteer_level"` // bronze, silver, gold, platinum
	Achievements   []string `json:"achievements"`

	LastUpdated time.Time `json:"last_updated"`
}

// AdminDashboard represents admin-specific dashboard data
type AdminDashboard struct {
	UserID uint   `json:"user_id"`
	Name   string `json:"name"`

	// System Overview
	SystemHealth SystemHealthStatus `json:"system_health"`
	TotalUsers   int64              `json:"total_users"`
	ActiveUsers  int64              `json:"active_users"`

	// Today's Statistics
	VisitsToday       int64 `json:"visits_today"`
	HelpRequestsToday int64 `json:"help_requests_today"`
	VolunteersOnDuty  int64 `json:"volunteers_on_duty"`

	// Pending Actions
	PendingHelpRequests          int64 `json:"pending_help_requests"`
	PendingVolunteerApprovals    int64 `json:"pending_volunteer_approvals"`
	PendingDocumentVerifications int64 `json:"pending_document_verifications"`
	PendingFeedbackReviews       int64 `json:"pending_feedback_reviews"`

	// Queue Management
	CurrentQueueStatus QueueStatus `json:"current_queue_status"`

	// Alerts and Notifications
	SystemAlerts        []SystemAlert `json:"system_alerts"`
	UnreadNotifications int           `json:"unread_notifications"`

	// Recent Activity
	RecentActivity []ActivityLog `json:"recent_activity"`

	// Performance Metrics
	ServiceEfficiency ServiceMetrics `json:"service_efficiency"`

	LastUpdated time.Time `json:"last_updated"`
}

// SystemHealthStatus represents system health information
type SystemHealthStatus struct {
	Status              string    `json:"status"` // healthy, warning, critical
	DatabaseConnection  bool      `json:"database_connection"`
	QueueService        bool      `json:"queue_service"`
	NotificationService bool      `json:"notification_service"`
	StorageService      bool      `json:"storage_service"`
	LastHealthCheck     time.Time `json:"last_health_check"`
	Issues              []string  `json:"issues,omitempty"`
}

// QueueStatus represents current queue status
type QueueStatus struct {
	TotalInQueue       int       `json:"total_in_queue"`
	FoodQueue          int       `json:"food_queue"`
	GeneralQueue       int       `json:"general_queue"`
	EmergencyQueue     int       `json:"emergency_queue"`
	AverageWaitTime    int       `json:"average_wait_time_minutes"`
	ServiceDesksActive int       `json:"service_desks_active"`
	LastUpdated        time.Time `json:"last_updated"`
}

// SystemAlert represents system alerts
type SystemAlert struct {
	ID             uint       `json:"id"`
	Type           string     `json:"type"` // info, warning, error, critical
	Title          string     `json:"title"`
	Message        string     `json:"message"`
	CreatedAt      time.Time  `json:"created_at"`
	IsAcknowledged bool       `json:"is_acknowledged"`
	AcknowledgedBy *uint      `json:"acknowledged_by"`
	AcknowledgedAt *time.Time `json:"acknowledged_at"`
}

// ActivityLog represents system activity logs
type ActivityLog struct {
	ID          uint      `json:"id"`
	UserID      *uint     `json:"user_id"`
	UserName    string    `json:"user_name"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	CreatedAt   time.Time `json:"created_at"`
}

// ServiceMetrics represents service performance metrics
type ServiceMetrics struct {
	AverageProcessingTime     float64   `json:"average_processing_time_minutes"`
	ServiceCompletionRate     float64   `json:"service_completion_rate"`
	CustomerSatisfactionScore float64   `json:"customer_satisfaction_score"`
	VolunteerUtilizationRate  float64   `json:"volunteer_utilization_rate"`
	DailyCapacityUtilization  float64   `json:"daily_capacity_utilization"`
	LastCalculated            time.Time `json:"last_calculated"`
}

// UserActivity represents individual user activity
type UserActivity struct {
	UserID           uint       `json:"user_id"`
	LastLogin        *time.Time `json:"last_login"`
	LastActivity     *time.Time `json:"last_activity"`
	SessionCount     int        `json:"session_count"`
	TotalTimeSpent   int        `json:"total_time_spent_minutes"`
	ActionsPerformed int        `json:"actions_performed"`
	LastUpdated      time.Time  `json:"last_updated"`
}

// WeeklyStats represents weekly statistics
type WeeklyStats struct {
	WeekStart             time.Time `json:"week_start"`
	WeekEnd               time.Time `json:"week_end"`
	TotalVisits           int64     `json:"total_visits"`
	TotalHelpRequests     int64     `json:"total_help_requests"`
	TotalDonations        int64     `json:"total_donations"`
	VolunteerHours        float64   `json:"volunteer_hours"`
	AverageWaitTime       float64   `json:"average_wait_time"`
	ServiceCompletionRate float64   `json:"service_completion_rate"`
}

// MonthlyStats represents monthly statistics
type MonthlyStats struct {
	Month                     time.Time `json:"month"`
	TotalVisits               int64     `json:"total_visits"`
	TotalHelpRequests         int64     `json:"total_help_requests"`
	TotalDonations            int64     `json:"total_donations"`
	TotalDonationValue        float64   `json:"total_donation_value"`
	VolunteerHours            float64   `json:"volunteer_hours"`
	AverageWaitTime           float64   `json:"average_wait_time"`
	ServiceCompletionRate     float64   `json:"service_completion_rate"`
	CustomerSatisfactionScore float64   `json:"customer_satisfaction_score"`
}

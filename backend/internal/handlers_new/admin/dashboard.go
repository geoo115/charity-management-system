package admin

import (
	"fmt"
	"time"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// DashboardHandler handles admin dashboard operations
type DashboardHandler struct {
	*shared.BaseHandler
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(base *shared.BaseHandler) *DashboardHandler {
	return &DashboardHandler{
		BaseHandler: base,
	}
}

// DashboardResponse represents the admin dashboard data
type DashboardResponse struct {
	Overview       DashboardOverview `json:"overview"`
	RecentActivity RecentActivity    `json:"recent_activity"`
	QuickStats     QuickStats        `json:"quick_stats"`
	Alerts         []DashboardAlert  `json:"alerts"`
}

// DashboardOverview contains key metrics
type DashboardOverview struct {
	TotalUsers       int64   `json:"total_users"`
	ActiveVolunteers int64   `json:"active_volunteers"`
	PendingRequests  int64   `json:"pending_requests"`
	TotalDonations   float64 `json:"total_donations"`
	VisitorsThisWeek int64   `json:"visitors_this_week"`
	ShiftsToday      int64   `json:"shifts_today"`
}

// RecentActivity contains recent system activity
type RecentActivity struct {
	NewUsers        []UserActivity     `json:"new_users"`
	RecentRequests  []RequestActivity  `json:"recent_requests"`
	RecentDonations []DonationActivity `json:"recent_donations"`
	RecentShifts    []ShiftActivity    `json:"recent_shifts"`
}

// UserActivity represents user registration activity
type UserActivity struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// RequestActivity represents help request activity
type RequestActivity struct {
	ID          uint      `json:"id"`
	VisitorName string    `json:"visitor_name"`
	Category    string    `json:"category"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

// DonationActivity represents donation activity
type DonationActivity struct {
	ID        uint      `json:"id"`
	DonorName string    `json:"donor_name"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

// ShiftActivity represents shift activity
type ShiftActivity struct {
	ID            uint      `json:"id"`
	VolunteerName string    `json:"volunteer_name"`
	StartTime     time.Time `json:"start_time"`
	DurationHours float64   `json:"duration_hours"`
	Status        string    `json:"status"`
}

// QuickStats contains quick statistics
type QuickStats struct {
	UsersByRole      map[string]int64 `json:"users_by_role"`
	RequestsByStatus map[string]int64 `json:"requests_by_status"`
	DonationsByType  map[string]int64 `json:"donations_by_type"`
	ShiftsByStatus   map[string]int64 `json:"shifts_by_status"`
}

// DashboardAlert represents system alerts
type DashboardAlert struct {
	ID      uint   `json:"id"`
	Type    string `json:"type"`
	Message string `json:"message"`
	Level   string `json:"level"` // info, warning, error
}

// GetDashboard provides comprehensive admin dashboard data
// @Summary Get admin dashboard
// @Description Provides comprehensive admin dashboard data including overview, recent activity, and alerts
// @Tags admin
// @Security BearerAuth
// @Produce json
// @Success 200 {object} shared.StandardResponse{data=DashboardResponse}
// @Failure 401 {object} shared.StandardResponse
// @Failure 403 {object} shared.StandardResponse
// @Router /api/v1/admin/dashboard [get]
func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	// Get overview metrics
	overview := h.getDashboardOverview()

	// Get recent activity
	recentActivity := h.getRecentActivity()

	// Get quick stats
	quickStats := h.getQuickStats()

	// Get alerts
	alerts := h.getDashboardAlerts()

	response := DashboardResponse{
		Overview:       overview,
		RecentActivity: recentActivity,
		QuickStats:     quickStats,
		Alerts:         alerts,
	}

	h.Success(c, response)
}

// GetOverview provides dashboard overview metrics
// @Summary Get dashboard overview
// @Description Provides key dashboard overview metrics
// @Tags admin
// @Security BearerAuth
// @Produce json
// @Success 200 {object} shared.StandardResponse{data=DashboardOverview}
// @Failure 401 {object} shared.StandardResponse
// @Failure 403 {object} shared.StandardResponse
// @Router /api/v1/admin/dashboard/overview [get]
func (h *DashboardHandler) GetOverview(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	overview := h.getDashboardOverview()
	h.Success(c, overview)
}

// GetRecentActivity provides recent system activity
// @Summary Get recent activity
// @Description Provides recent system activity including new users, requests, donations, and shifts
// @Tags admin
// @Security BearerAuth
// @Produce json
// @Success 200 {object} shared.StandardResponse{data=RecentActivity}
// @Failure 401 {object} shared.StandardResponse
// @Failure 403 {object} shared.StandardResponse
// @Router /api/v1/admin/dashboard/recent-activity [get]
func (h *DashboardHandler) GetRecentActivity(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		return
	}

	recentActivity := h.getRecentActivity()
	h.Success(c, recentActivity)
}

// Helper functions
func (h *DashboardHandler) getDashboardOverview() DashboardOverview {
	var overview DashboardOverview

	// Total users
	h.DB.Model(&models.User{}).Count(&overview.TotalUsers)

	// Active volunteers
	h.DB.Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleVolunteer, "active").
		Count(&overview.ActiveVolunteers)

	// Pending requests
	h.DB.Model(&models.HelpRequest{}).
		Where("status = ?", "pending").
		Count(&overview.PendingRequests)

	// Total donations (monetary)
	h.DB.Model(&models.Donation{}).
		Where("type = ?", "monetary").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&overview.TotalDonations)

	// Visitors this week
	weekStart := time.Now().AddDate(0, 0, -7)
	h.DB.Model(&models.User{}).
		Where("role = ? AND created_at >= ?", models.RoleVisitor, weekStart).
		Count(&overview.VisitorsThisWeek)

	// Shifts today
	today := time.Now().Truncate(24 * time.Hour)
	h.DB.Model(&models.Shift{}).
		Where("DATE(start_time) = ?", today.Format("2006-01-02")).
		Count(&overview.ShiftsToday)

	return overview
}

func (h *DashboardHandler) getRecentActivity() RecentActivity {
	var activity RecentActivity

	// Recent new users (last 7 days)
	var newUsers []UserActivity
	h.DB.Model(&models.User{}).
		Select("id, first_name || ' ' || last_name as name, role, created_at").
		Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("created_at DESC").
		Limit(10).
		Scan(&newUsers)
	activity.NewUsers = newUsers

	// Recent help requests (last 7 days)
	var recentRequests []RequestActivity
	h.DB.Model(&models.HelpRequest{}).
		Select("help_requests.id, users.first_name || ' ' || users.last_name as visitor_name, help_requests.category, help_requests.status, help_requests.created_at").
		Joins("LEFT JOIN users ON help_requests.visitor_id = users.id").
		Where("help_requests.created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("help_requests.created_at DESC").
		Limit(10).
		Scan(&recentRequests)
	activity.RecentRequests = recentRequests

	// Recent donations (last 7 days)
	var recentDonations []DonationActivity
	h.DB.Model(&models.Donation{}).
		Select("donations.id, users.first_name || ' ' || users.last_name as donor_name, donations.type, donations.amount, donations.created_at").
		Joins("LEFT JOIN users ON donations.user_id = users.id").
		Where("donations.created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("donations.created_at DESC").
		Limit(10).
		Scan(&recentDonations)
	activity.RecentDonations = recentDonations

	// Recent shifts (last 7 days)
	var recentShifts []ShiftActivity
	h.DB.Model(&models.Shift{}).
		Select("shifts.id, users.first_name || ' ' || users.last_name as volunteer_name, shifts.start_time, shifts.duration_hours, shifts.status").
		Joins("LEFT JOIN users ON shifts.assigned_volunteer_id = users.id").
		Where("shifts.created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("shifts.start_time DESC").
		Limit(10).
		Scan(&recentShifts)
	activity.RecentShifts = recentShifts

	return activity
}

func (h *DashboardHandler) getQuickStats() QuickStats {
	var stats QuickStats
	stats.UsersByRole = make(map[string]int64)
	stats.RequestsByStatus = make(map[string]int64)
	stats.DonationsByType = make(map[string]int64)
	stats.ShiftsByStatus = make(map[string]int64)

	// Users by role
	var roleCounts []struct {
		Role  string `json:"role"`
		Count int64  `json:"count"`
	}
	h.DB.Model(&models.User{}).
		Select("role, COUNT(*) as count").
		Group("role").
		Scan(&roleCounts)

	for _, roleCount := range roleCounts {
		stats.UsersByRole[roleCount.Role] = roleCount.Count
	}

	// Requests by status
	var requestCounts []struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	h.DB.Model(&models.HelpRequest{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&requestCounts)

	for _, requestCount := range requestCounts {
		stats.RequestsByStatus[requestCount.Status] = requestCount.Count
	}

	// Donations by type
	var donationCounts []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	h.DB.Model(&models.Donation{}).
		Select("type, COUNT(*) as count").
		Group("type").
		Scan(&donationCounts)

	for _, donationCount := range donationCounts {
		stats.DonationsByType[donationCount.Type] = donationCount.Count
	}

	// Shifts by status
	var shiftCounts []struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	h.DB.Model(&models.Shift{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&shiftCounts)

	for _, shiftCount := range shiftCounts {
		stats.ShiftsByStatus[shiftCount.Status] = shiftCount.Count
	}

	return stats
}

func (h *DashboardHandler) getDashboardAlerts() []DashboardAlert {
	var alerts []DashboardAlert

	// Check for pending volunteer applications
	var pendingApplications int64
	h.DB.Model(&models.VolunteerApplication{}).
		Where("status = ?", "pending").
		Count(&pendingApplications)

	if pendingApplications > 0 {
		alerts = append(alerts, DashboardAlert{
			ID:      1,
			Type:    "volunteer_applications",
			Message: fmt.Sprintf("%d pending volunteer applications require review", pendingApplications),
			Level:   "warning",
		})
	}

	// Check for urgent help requests
	var urgentRequests int64
	h.DB.Model(&models.HelpRequest{}).
		Where("status = ? AND priority = ?", "pending", "high").
		Count(&urgentRequests)

	if urgentRequests > 0 {
		alerts = append(alerts, DashboardAlert{
			ID:      2,
			Type:    "urgent_requests",
			Message: fmt.Sprintf("%d urgent help requests need immediate attention", urgentRequests),
			Level:   "error",
		})
	}

	// Check for upcoming shifts without volunteers
	var unassignedShifts int64
	h.DB.Model(&models.Shift{}).
		Where("status = ? AND assigned_volunteer_id IS NULL AND start_time > ?", "scheduled", time.Now()).
		Count(&unassignedShifts)

	if unassignedShifts > 0 {
		alerts = append(alerts, DashboardAlert{
			ID:      3,
			Type:    "unassigned_shifts",
			Message: fmt.Sprintf("%d upcoming shifts need volunteer assignment", unassignedShifts),
			Level:   "warning",
		})
	}

	// Check for low inventory (if applicable)
	var lowInventoryItems int64
	h.DB.Model(&models.DonationItem{}).
		Where("quantity <= minimum_quantity").
		Count(&lowInventoryItems)

	if lowInventoryItems > 0 {
		alerts = append(alerts, DashboardAlert{
			ID:      4,
			Type:    "low_inventory",
			Message: fmt.Sprintf("%d inventory items are running low", lowInventoryItems),
			Level:   "info",
		})
	}

	return alerts
}

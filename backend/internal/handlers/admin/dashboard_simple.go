package admin

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// SimpleDashboardData represents simplified dashboard data
type SimpleDashboardData struct {
	KPIs     SimpleDashboardKPIs `json:"kpis"`
	Alerts   []SimpleAlert       `json:"alerts"`
	Activity []SimpleActivity    `json:"activity"`
}

// SimpleDashboardKPIs represents essential KPIs only
type SimpleDashboardKPIs struct {
	TotalUsers       int64   `json:"totalUsers"`
	ActiveUsers      int64   `json:"activeUsers"`
	TotalVolunteers  int64   `json:"totalVolunteers"`
	ActiveVolunteers int64   `json:"activeVolunteers"`
	TotalRequests    int64   `json:"totalRequests"`
	TodayRequests    int64   `json:"todayRequests"`
	TotalDonations   float64 `json:"totalDonations"`
	PendingDocuments int64   `json:"pendingDocuments"`
}

// SimpleAlert represents a system alert
type SimpleAlert struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Level   string `json:"level"` // info, warning, error
}

// SimpleActivity represents recent system activity
type SimpleActivity struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// SimpleAdminDashboard returns simplified admin dashboard with essential KPIs
func SimpleAdminDashboard(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	// Get essential KPIs
	kpis := getSimpleDashboardKPIs(today)

	// Get basic alerts
	alerts := getSimpleBasicAlerts(kpis)

	// Get recent activity
	activity := getSimpleRecentActivity()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": SimpleDashboardData{
			KPIs:     kpis,
			Alerts:   alerts,
			Activity: activity,
		},
	})
}

// getSimpleDashboardKPIs returns essential KPIs only
func getSimpleDashboardKPIs(today string) SimpleDashboardKPIs {
	var kpis SimpleDashboardKPIs

	// User counts
	db.DB.Model(&models.User{}).Count(&kpis.TotalUsers)
	db.DB.Model(&models.User{}).Where("status = ?", "active").Count(&kpis.ActiveUsers)

	// Volunteer counts
	db.DB.Model(&models.User{}).Where("role = ?", models.RoleVolunteer).Count(&kpis.TotalVolunteers)
	db.DB.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "active").Count(&kpis.ActiveVolunteers)

	// Request counts
	db.DB.Model(&models.HelpRequest{}).Count(&kpis.TotalRequests)
	db.DB.Model(&models.HelpRequest{}).Where("DATE(created_at) = ?", today).Count(&kpis.TodayRequests)

	// Donation total (simplified)
	var totalDonations float64
	db.DB.Model(&models.Donation{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalDonations)
	kpis.TotalDonations = totalDonations

	// Pending documents
	db.DB.Model(&models.Document{}).Where("status = ?", "pending_verification").Count(&kpis.PendingDocuments)

	return kpis
}

// getSimpleBasicAlerts returns essential alerts only
func getSimpleBasicAlerts(kpis SimpleDashboardKPIs) []SimpleAlert {
	var alerts []SimpleAlert

	// Check for urgent needs
	if kpis.TodayRequests > 50 {
		alerts = append(alerts, SimpleAlert{
			Type:    "high_requests",
			Message: "High number of requests today",
			Level:   "warning",
		})
	}

	// Check for pending documents
	if kpis.PendingDocuments > 10 {
		alerts = append(alerts, SimpleAlert{
			Type:    "pending_documents",
			Message: "Documents pending verification",
			Level:   "info",
		})
	}

	// Check for low volunteer coverage
	if kpis.ActiveVolunteers < 5 {
		alerts = append(alerts, SimpleAlert{
			Type:    "low_volunteers",
			Message: "Low number of active volunteers",
			Level:   "warning",
		})
	}

	return alerts
}

// getSimpleRecentActivity returns recent system activity
func getSimpleRecentActivity() []SimpleActivity {
	var activity []SimpleActivity

	// Get recent help requests
	var recentRequests []models.HelpRequest
	db.DB.Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("created_at DESC").
		Limit(5).
		Find(&recentRequests)

	for _, req := range recentRequests {
		activity = append(activity, SimpleActivity{
			Type:      "help_request",
			Message:   "New help request submitted",
			Timestamp: req.CreatedAt,
		})
	}

	// Get recent donations
	var recentDonations []models.Donation
	db.DB.Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).
		Order("created_at DESC").
		Limit(5).
		Find(&recentDonations)

	for _, donation := range recentDonations {
		activity = append(activity, SimpleActivity{
			Type:      "donation",
			Message:   "New donation received",
			Timestamp: donation.CreatedAt,
		})
	}

	return activity
}

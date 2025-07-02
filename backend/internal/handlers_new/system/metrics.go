package system

import (
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
)

// MetricsTimeRange defines the time ranges for metrics filtering
type MetricsTimeRange string

const (
	TimeRangeDay   MetricsTimeRange = "day"
	TimeRangeWeek  MetricsTimeRange = "week"
	TimeRangeMonth MetricsTimeRange = "month"
	TimeRangeYear  MetricsTimeRange = "year"
	TimeRangeAll   MetricsTimeRange = "all"
)

// GetMetrics returns analytics data for admin dashboard with optimized queries
// and optional time range filtering
func GetMetrics(c *gin.Context) {
	// Get time range from query params (default to month)
	timeRange := MetricsTimeRange(c.DefaultQuery("timeRange", string(TimeRangeMonth)))

	// Calculate the start date based on time range
	startDate := calculateStartDate(timeRange)

	// Get specific section if requested, otherwise return all metrics
	section := c.Query("section")

	// Initialize response object
	metrics := gin.H{}

	// Fetch metrics based on requested section(s)
	if section == "" || section == "donations" {
		metrics["donations"] = getDonationMetrics(startDate)
	}

	if section == "" || section == "help_requests" {
		metrics["help_requests"] = getHelpRequestMetrics(startDate)
	}

	if section == "" || section == "volunteers" {
		metrics["volunteers"] = getVolunteerMetrics(startDate)
	}

	if section == "" || section == "response_times" {
		metrics["response_times"] = getResponseTimeMetrics(startDate)
	}

	// Add metadata about the request
	metrics["meta"] = gin.H{
		"timeRange": timeRange,
		"startDate": startDate.Format("2006-01-02"),
		"endDate":   time.Now().Format("2006-01-02"),
		"cached":    false,
	}

	c.JSON(http.StatusOK, metrics)
}

// Helper function to calculate start date based on time range
func calculateStartDate(timeRange MetricsTimeRange) time.Time {
	now := time.Now()

	switch timeRange {
	case TimeRangeDay:
		return now.AddDate(0, 0, -1)
	case TimeRangeWeek:
		return now.AddDate(0, 0, -7)
	case TimeRangeMonth:
		return now.AddDate(0, 0, -30)
	case TimeRangeYear:
		return now.AddDate(-1, 0, 0)
	case TimeRangeAll:
		return now.AddDate(-10, 0, 0) // Effectively "all" - 10 years ago
	default:
		return now.AddDate(0, 0, -30) // Default to last 30 days
	}
}

// getDonationMetrics retrieves donation-related metrics with an optimized single query approach
func getDonationMetrics(startDate time.Time) gin.H {
	type DonationResult struct {
		Count int64   `json:"count"`
		Total float64 `json:"total"`
	}

	var result DonationResult

	// Combine count and sum into a single query
	query := db.GetDB().Model(&models.Donation{}).
		Select("COUNT(*) as count, COALESCE(SUM(amount), 0) as total").
		Where("created_at > ?", startDate)

	if err := query.Scan(&result).Error; err != nil {
		// Return zeros with error info if query fails
		return gin.H{
			"last_period":  0,
			"total_amount": 0.0,
			"error":        err.Error(),
		}
	}

	return gin.H{
		"last_period":  result.Count,
		"total_amount": result.Total,
	}
}

// getHelpRequestMetrics retrieves help request metrics with optimized queries
func getHelpRequestMetrics(startDate time.Time) gin.H {
	// Use a struct to capture counts by status
	type StatusCounts struct {
		PendingCount   int64 `json:"pending"`
		ActiveCount    int64 `json:"active"`
		CompletedCount int64 `json:"completed"`
		TotalCount     int64 `json:"total"`
	}

	var counts StatusCounts

	// Get total count for the period
	db.GetDB().Model(&models.HelpRequest{}).
		Where("created_at > ?", startDate).
		Count(&counts.TotalCount)

	// Use a single query with aggregation to get counts by status
	db.GetDB().Model(&models.HelpRequest{}).
		Where("created_at > ?", startDate).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(func(status string, count int64) {
			switch status {
			case "New", "Pending":
				counts.PendingCount += count
			case "Active", "InProgress":
				counts.ActiveCount += count
			case "Completed", "Fulfilled", "Closed":
				counts.CompletedCount += count
			}
		})

	return gin.H{
		"pending":   counts.PendingCount,
		"active":    counts.ActiveCount,
		"completed": counts.CompletedCount,
		"total":     counts.TotalCount,
	}
}

// getVolunteerMetrics retrieves volunteer-related metrics
func getVolunteerMetrics(startDate time.Time) gin.H {
	var activeCount, pendingCount int64

	// Count active volunteers
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleVolunteer, "active").
		Count(&activeCount)

	// Count pending volunteer applications
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND status = ? AND created_at > ?", models.RoleVolunteer, "pending", startDate).
		Count(&pendingCount)

	return gin.H{
		"active":               activeCount,
		"pending_applications": pendingCount,
		"new_since":            pendingCount, // For backward compatibility
	}
}

// getResponseTimeMetrics calculates average response time metrics
func getResponseTimeMetrics(startDate time.Time) gin.H {
	// Use a more efficient approach for response time calculation
	var avgResponseTime float64

	query := `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))), 0) as avg
		FROM help_requests 
		WHERE assigned_at IS NOT NULL
		AND created_at > ?
	`

	if err := db.GetDB().Raw(query, startDate).Scan(&avgResponseTime).Error; err != nil {
		return gin.H{
			"average_hours": 0,
			"error":         err.Error(),
		}
	}

	// Convert seconds to hours
	avgResponseHours := avgResponseTime / 3600

	return gin.H{
		"average_hours": avgResponseHours,
	}
}

// GetDashboardMetrics returns a lightweight version of metrics for dashboard
// with pagination for detailed views
func GetDashboardMetrics(c *gin.Context) {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	// Use last 7 days for dashboard by default
	startDate := time.Now().AddDate(0, 0, -7)

	// Get donation count
	var donationCount int64
	db.GetDB().Model(&models.Donation{}).
		Where("created_at > ?", startDate).
		Count(&donationCount)

	// Get help request count
	var helpRequestCount int64
	db.GetDB().Model(&models.HelpRequest{}).
		Where("created_at > ?", startDate).
		Count(&helpRequestCount)

	// Get pending volunteer application count
	var pendingVolunteerCount int64
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleVolunteer, "pending").
		Count(&pendingVolunteerCount)

	// Return lightweight metrics for dashboard
	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			"donation_count":     donationCount,
			"help_request_count": helpRequestCount,
			"pending_volunteers": pendingVolunteerCount,
		},
		"pagination": gin.H{
			"page":     page,
			"pageSize": pageSize,
		},
		"period": gin.H{
			"start": startDate.Format("2006-01-02"),
			"end":   time.Now().Format("2006-01-02"),
		},
	})
}

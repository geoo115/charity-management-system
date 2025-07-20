package admin

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
)

// AdminGetMetrics returns comprehensive system metrics for admin dashboard
func AdminGetMetrics(c *gin.Context) {
	// Get time range from query params (default to month)
	timeRange := c.DefaultQuery("timeRange", "month")
	startDate := calculateAdminStartDate(timeRange)

	// Get metrics data
	donationMetrics := getDashboardDonationMetrics(startDate)
	helpRequestMetrics := getDashboardHelpRequestMetrics(startDate)
	volunteerMetrics := getDashboardVolunteerMetrics(startDate)
	userMetrics := getDashboardUserMetrics()

	// Construct response matching frontend expectations
	response := gin.H{
		"totalUsers":        userMetrics["total"],
		"totalVolunteers":   volunteerMetrics["count"],
		"totalDonations":    donationMetrics["count"],
		"totalHelpRequests": helpRequestMetrics["count"],
		"recentActivity":    []gin.H{},

		"donations": gin.H{
			"last_30_days": donationMetrics["last_30_days"],
			"total_amount": donationMetrics["total_amount"],
			"count":        donationMetrics["count"],
			"recent":       []gin.H{},
		},

		"help_requests": gin.H{
			"pending":   helpRequestMetrics["pending"],
			"active":    helpRequestMetrics["active"],
			"completed": helpRequestMetrics["completed"],
			"count":     helpRequestMetrics["count"],
			"recent":    []gin.H{},
		},

		"volunteers": gin.H{
			"active":               volunteerMetrics["active"],
			"pending_applications": volunteerMetrics["pending_applications"],
			"count":                volunteerMetrics["count"],
			"recent":               []gin.H{},
		},

		"response_times": gin.H{
			"average":  "24h",
			"urgent":   "4h",
			"standard": "36h",
		},
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetDonationReports returns comprehensive donation reports
func AdminGetDonationReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get donation statistics
	var totalDonations int64
	var totalAmount float64
	var monthlyDonations int64
	var monthlyAmount float64
	var lastMonthDonations int64
	var lastMonthAmount float64

	// Total donations
	db.Model(&models.Donation{}).Where("deleted_at IS NULL").Count(&totalDonations)
	db.Model(&models.Donation{}).Where("deleted_at IS NULL").Select("COALESCE(SUM(amount), 0)").Scan(&totalAmount)

	// This month's donations
	db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&monthlyDonations)
	db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Select("COALESCE(SUM(amount), 0)").Scan(&monthlyAmount)

	// Last month's donations
	db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthDonations)
	db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Select("COALESCE(SUM(amount), 0)").Scan(&lastMonthAmount)

	// Get donations by type
	type DonationTypeCount struct {
		Type  string  `json:"type"`
		Count int64   `json:"count"`
		Total float64 `json:"total"`
	}
	var donationsByType []DonationTypeCount
	db.Model(&models.Donation{}).
		Select("donation_type as type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total").
		Where("deleted_at IS NULL").
		Group("donation_type").
		Scan(&donationsByType)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month string  `json:"month"`
		Count int64   `json:"count"`
		Total float64 `json:"total"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		var total float64
		db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)
		db.Model(&models.Donation{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Select("COALESCE(SUM(amount), 0)").Scan(&total)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month: monthStart.Format("2006-01"),
			Count: count,
			Total: total,
		})
	}

	// Calculate growth rates
	donationGrowth := 0.0
	amountGrowth := 0.0
	if lastMonthDonations > 0 {
		donationGrowth = float64(monthlyDonations-lastMonthDonations) / float64(lastMonthDonations) * 100
	}
	if lastMonthAmount > 0 {
		amountGrowth = (monthlyAmount - lastMonthAmount) / lastMonthAmount * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalDonations":   totalDonations,
			"totalAmount":      totalAmount,
			"monthlyDonations": monthlyDonations,
			"monthlyAmount":    monthlyAmount,
			"donationGrowth":   donationGrowth,
			"amountGrowth":     amountGrowth,
			"averageDonation": func() float64 {
				if totalDonations > 0 {
					return totalAmount / float64(totalDonations)
				}
				return 0
			}(),
		},
		"byType": donationsByType,
		"trends": monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetHelpRequestReports returns comprehensive help request reports
func AdminGetHelpRequestReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get help request statistics
	var totalRequests int64
	var pendingRequests int64
	var completedRequests int64
	var monthlyRequests int64
	var lastMonthRequests int64

	// Total requests
	db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL").Count(&totalRequests)
	db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND status = ?", "Pending").Count(&pendingRequests)
	db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND status = ?", "Approved").Count(&completedRequests)

	// This month's requests
	db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&monthlyRequests)

	// Last month's requests
	db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthRequests)

	// Get requests by category
	type CategoryCount struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var requestsByCategory []CategoryCount
	db.Model(&models.HelpRequest{}).
		Select("category, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("category").
		Scan(&requestsByCategory)

	// Get requests by status
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var requestsByStatus []StatusCount
	db.Model(&models.HelpRequest{}).
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&requestsByStatus)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month: monthStart.Format("2006-01"),
			Count: count,
		})
	}

	// Calculate growth rate
	requestGrowth := 0.0
	if lastMonthRequests > 0 {
		requestGrowth = float64(monthlyRequests-lastMonthRequests) / float64(lastMonthRequests) * 100
	}

	// Calculate completion rate
	completionRate := 0.0
	if totalRequests > 0 {
		completionRate = float64(completedRequests) / float64(totalRequests) * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalRequests":     totalRequests,
			"pendingRequests":   pendingRequests,
			"completedRequests": completedRequests,
			"monthlyRequests":   monthlyRequests,
			"requestGrowth":     requestGrowth,
			"completionRate":    completionRate,
		},
		"byCategory": requestsByCategory,
		"byStatus":   requestsByStatus,
		"trends":     monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// AdminGenerateCustomReport generates a custom report based on parameters
func AdminGenerateCustomReport(c *gin.Context) {
	var request struct {
		ReportType string    `json:"reportType" binding:"required"`
		DateFrom   time.Time `json:"dateFrom"`
		DateTo     time.Time `json:"dateTo"`
		Filters    gin.H     `json:"filters"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	db := db.GetDB()
	now := time.Now()

	// Set default date range if not provided
	if request.DateFrom.IsZero() {
		request.DateFrom = now.AddDate(0, -1, 0)
	}
	if request.DateTo.IsZero() {
		request.DateTo = now
	}

	var reportData gin.H

	switch request.ReportType {
	case "user_activity":
		// User activity report
		var totalUsers int64
		var newUsers int64
		var activeUsers int64

		db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&totalUsers)
		db.Model(&models.User{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at <= ?", request.DateFrom, request.DateTo).Count(&newUsers)
		db.Model(&models.User{}).Where("deleted_at IS NULL AND last_login >= ?", now.AddDate(0, 0, -30)).Count(&activeUsers)

		reportData = gin.H{
			"totalUsers":  totalUsers,
			"newUsers":    newUsers,
			"activeUsers": activeUsers,
			"dateRange": gin.H{
				"from": request.DateFrom.Format("2006-01-02"),
				"to":   request.DateTo.Format("2006-01-02"),
			},
		}

	case "volunteer_performance":
		// Volunteer performance report
		var totalVolunteers int64
		var activeVolunteers int64
		var totalHours float64

		db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL").Count(&totalVolunteers)
		db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL AND status = ?", "active").Count(&activeVolunteers)
		db.Model(&models.VolunteerProfile{}).Where("deleted_at IS NULL").Select("COALESCE(SUM(total_hours), 0)").Scan(&totalHours)

		reportData = gin.H{
			"totalVolunteers":  totalVolunteers,
			"activeVolunteers": activeVolunteers,
			"totalHours":       totalHours,
			"avgHoursPerVolunteer": func() float64 {
				if activeVolunteers > 0 {
					return totalHours / float64(activeVolunteers)
				}
				return 0
			}(),
			"dateRange": gin.H{
				"from": request.DateFrom.Format("2006-01-02"),
				"to":   request.DateTo.Format("2006-01-02"),
			},
		}

	case "service_efficiency":
		// Service efficiency report
		var totalRequests int64
		var completedRequests int64
		var avgProcessingTime float64

		db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at <= ?", request.DateFrom, request.DateTo).Count(&totalRequests)
		db.Model(&models.HelpRequest{}).Where("deleted_at IS NULL AND status = ? AND created_at >= ? AND created_at <= ?", "Approved", request.DateFrom, request.DateTo).Count(&completedRequests)

		// Calculate average processing time (simplified)
		avgProcessingTime = 24.0 // Default 24 hours

		reportData = gin.H{
			"totalRequests":     totalRequests,
			"completedRequests": completedRequests,
			"completionRate": func() float64 {
				if totalRequests > 0 {
					return float64(completedRequests) / float64(totalRequests) * 100
				}
				return 0
			}(),
			"avgProcessingTime": avgProcessingTime,
			"dateRange": gin.H{
				"from": request.DateFrom.Format("2006-01-02"),
				"to":   request.DateTo.Format("2006-01-02"),
			},
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported report type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"report":      reportData,
		"generatedAt": now.Format("2006-01-02 15:04:05"),
	})
}

// AdminGetFeedbackReports returns comprehensive feedback reports
func AdminGetFeedbackReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get feedback statistics
	var totalFeedback int64
	var avgRating float64
	var monthlyFeedback int64
	var lastMonthFeedback int64

	// Total feedback
	db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL").Count(&totalFeedback)
	db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL").Select("COALESCE(AVG(overall_rating), 0)").Scan(&avgRating)

	// This month's feedback
	db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&monthlyFeedback)

	// Last month's feedback
	db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthFeedback)

	// Get feedback by category
	type CategoryCount struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var feedbackByCategory []CategoryCount
	db.Model(&models.VisitFeedback{}).
		Select("service_category as category, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("service_category").
		Scan(&feedbackByCategory)

	// Get feedback by rating
	type RatingCount struct {
		Rating int64 `json:"rating"`
		Count  int64 `json:"count"`
	}
	var feedbackByRating []RatingCount
	db.Model(&models.VisitFeedback{}).
		Select("overall_rating as rating, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("overall_rating").
		Order("overall_rating").
		Scan(&feedbackByRating)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month     string  `json:"month"`
		Count     int64   `json:"count"`
		AvgRating float64 `json:"avgRating"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		var avgRating float64
		db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)
		db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Select("COALESCE(AVG(overall_rating), 0)").Scan(&avgRating)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month:     monthStart.Format("2006-01"),
			Count:     count,
			AvgRating: avgRating,
		})
	}

	// Calculate growth rate
	feedbackGrowth := 0.0
	if lastMonthFeedback > 0 {
		feedbackGrowth = float64(monthlyFeedback-lastMonthFeedback) / float64(lastMonthFeedback) * 100
	}

	// Calculate response rate (percentage of feedback that received admin response)
	var respondedCount int64
	db.Model(&models.VisitFeedback{}).Where("deleted_at IS NULL AND review_status IN (?, ?, ?)", "responded", "resolved", "escalated").Count(&respondedCount)

	responseRate := 0.0
	if totalFeedback > 0 {
		responseRate = float64(respondedCount) / float64(totalFeedback) * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalFeedback":   totalFeedback,
			"avgRating":       avgRating,
			"monthlyFeedback": monthlyFeedback,
			"feedbackGrowth":  feedbackGrowth,
			"responseRate":    responseRate,
		},
		"byCategory": feedbackByCategory,
		"byRating":   feedbackByRating,
		"trends":     monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetDocumentReports returns comprehensive document reports
func AdminGetDocumentReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get document statistics
	var totalDocuments int64
	var verifiedDocuments int64
	var pendingDocuments int64
	var monthlyDocuments int64
	var lastMonthDocuments int64

	// Total documents
	db.Model(&models.Document{}).Where("deleted_at IS NULL").Count(&totalDocuments)
	db.Model(&models.Document{}).Where("deleted_at IS NULL AND status = ?", "approved").Count(&verifiedDocuments)
	db.Model(&models.Document{}).Where("deleted_at IS NULL AND status = ?", "pending").Count(&pendingDocuments)

	// This month's documents
	db.Model(&models.Document{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&monthlyDocuments)

	// Last month's documents
	db.Model(&models.Document{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthDocuments)

	// Get documents by type
	type DocumentTypeCount struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	var documentsByType []DocumentTypeCount
	db.Model(&models.Document{}).
		Select("type, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("type").
		Scan(&documentsByType)

	// Get documents by status
	type DocumentStatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var documentsByStatus []DocumentStatusCount
	db.Model(&models.Document{}).
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&documentsByStatus)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		db.Model(&models.Document{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month: monthStart.Format("2006-01"),
			Count: count,
		})
	}

	// Calculate growth rate
	documentGrowth := 0.0
	if lastMonthDocuments > 0 {
		documentGrowth = float64(monthlyDocuments-lastMonthDocuments) / float64(lastMonthDocuments) * 100
	}

	// Calculate verification rate
	verificationRate := 0.0
	if totalDocuments > 0 {
		verificationRate = float64(verifiedDocuments) / float64(totalDocuments) * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalDocuments":    totalDocuments,
			"verifiedDocuments": verifiedDocuments,
			"pendingDocuments":  pendingDocuments,
			"monthlyDocuments":  monthlyDocuments,
			"documentGrowth":    documentGrowth,
			"verificationRate":  verificationRate,
		},
		"byType":   documentsByType,
		"byStatus": documentsByStatus,
		"trends":   monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// AdminGetUserReports returns comprehensive user reports
func AdminGetUserReports(c *gin.Context) {
	db := db.GetDB()
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonth := startOfMonth.AddDate(0, -1, 0)

	// Get user statistics
	var totalUsers int64
	var activeUsers int64
	var newUsersThisMonth int64
	var lastMonthUsers int64

	// Total users
	db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&totalUsers)
	db.Model(&models.User{}).Where("deleted_at IS NULL AND status = ?", "active").Count(&activeUsers)

	// This month's users
	db.Model(&models.User{}).Where("deleted_at IS NULL AND created_at >= ?", startOfMonth).Count(&newUsersThisMonth)

	// Last month's users
	db.Model(&models.User{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", lastMonth, startOfMonth).Count(&lastMonthUsers)

	// Get users by role
	type UserRoleCount struct {
		Role  string `json:"role"`
		Count int64  `json:"count"`
	}
	var usersByRole []UserRoleCount
	db.Model(&models.User{}).
		Select("role, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("role").
		Scan(&usersByRole)

	// Get users by status
	type UserStatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var usersByStatus []UserStatusCount
	db.Model(&models.User{}).
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&usersByStatus)

	// Get monthly trend for the last 6 months
	type MonthlyTrend struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var monthlyTrends []MonthlyTrend
	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)

		var count int64
		db.Model(&models.User{}).Where("deleted_at IS NULL AND created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&count)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month: monthStart.Format("2006-01"),
			Count: count,
		})
	}

	// Calculate growth rate
	userGrowth := 0.0
	if lastMonthUsers > 0 {
		userGrowth = float64(newUsersThisMonth-lastMonthUsers) / float64(lastMonthUsers) * 100
	}

	response := gin.H{
		"summary": gin.H{
			"totalUsers":        totalUsers,
			"activeUsers":       activeUsers,
			"newUsersThisMonth": newUsersThisMonth,
			"userGrowth":        userGrowth,
		},
		"byRole":   usersByRole,
		"byStatus": usersByStatus,
		"trends":   monthlyTrends,
	}

	c.JSON(http.StatusOK, response)
}

// Helper functions for dashboard metrics

// calculateAdminStartDate calculates the start date based on time range
func calculateAdminStartDate(timeRange string) time.Time {
	now := time.Now()

	switch timeRange {
	case "day":
		return now.AddDate(0, 0, -1)
	case "week":
		return now.AddDate(0, 0, -7)
	case "month":
		return now.AddDate(0, 0, -30)
	case "year":
		return now.AddDate(-1, 0, 0)
	default:
		return now.AddDate(0, 0, -30) // Default to last 30 days
	}
}

// getDashboardDonationMetrics retrieves donation metrics for dashboard
func getDashboardDonationMetrics(startDate time.Time) map[string]interface{} {
	var totalCount int64
	var last30DaysCount int64
	var totalAmount float64

	// Get total donations count
	db.GetDB().Model(&models.Donation{}).Count(&totalCount)

	// Get donations in the specified period
	db.GetDB().Model(&models.Donation{}).
		Where("created_at > ?", startDate).
		Count(&last30DaysCount)

	// Get total amount
	db.GetDB().Model(&models.Donation{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("created_at > ?", startDate).
		Scan(&totalAmount)

	return map[string]interface{}{
		"count":        totalCount,
		"last_30_days": last30DaysCount,
		"total_amount": totalAmount,
	}
}

// getDashboardHelpRequestMetrics retrieves help request metrics for dashboard
func getDashboardHelpRequestMetrics(startDate time.Time) map[string]interface{} {
	var totalCount int64
	var pendingCount int64
	var activeCount int64
	var completedCount int64

	// Get total count within the time range
	db.GetDB().Model(&models.HelpRequest{}).
		Where("created_at >= ?", startDate).
		Count(&totalCount)

	// Get counts by status within the time range
	db.GetDB().Model(&models.HelpRequest{}).
		Where("status IN (?, ?) AND created_at >= ?", "New", "Pending", startDate).
		Count(&pendingCount)

	db.GetDB().Model(&models.HelpRequest{}).
		Where("status IN (?, ?) AND created_at >= ?", "Active", "InProgress", startDate).
		Count(&activeCount)

	db.GetDB().Model(&models.HelpRequest{}).
		Where("status IN (?, ?, ?) AND created_at >= ?", "Completed", "Fulfilled", "Closed", startDate).
		Count(&completedCount)

	return map[string]interface{}{
		"count":     totalCount,
		"pending":   pendingCount,
		"active":    activeCount,
		"completed": completedCount,
	}
}

// getDashboardVolunteerMetrics retrieves volunteer metrics for dashboard
func getDashboardVolunteerMetrics(startDate time.Time) map[string]interface{} {
	var totalCount int64
	var activeCount int64
	var pendingCount int64

	// Get total volunteer count (registered within time range)
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND created_at >= ?", models.RoleVolunteer, startDate).
		Count(&totalCount)

	// Get active volunteers (within time range)
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND status = ? AND created_at >= ?", models.RoleVolunteer, "active", startDate).
		Count(&activeCount)

	// Get pending volunteer applications (within time range)
	db.GetDB().Model(&models.User{}).
		Where("role = ? AND status = ? AND created_at >= ?", models.RoleVolunteer, "pending", startDate).
		Count(&pendingCount)

	return map[string]interface{}{
		"count":                totalCount,
		"active":               activeCount,
		"pending_applications": pendingCount,
	}
}

// getDashboardUserMetrics retrieves user metrics for dashboard
func getDashboardUserMetrics() map[string]interface{} {
	var totalUsers int64

	// Get total user count
	db.GetDB().Model(&models.User{}).Count(&totalUsers)

	return map[string]interface{}{
		"total": totalUsers,
	}
}

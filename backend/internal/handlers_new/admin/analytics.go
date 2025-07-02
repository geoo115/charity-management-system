package admin

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// GetVisitorTrends provides visitor trend analytics
func GetVisitorTrends(c *gin.Context) {
	period := c.Query("period") // "week", "month", "quarter", "year"
	category := c.Query("category")

	// Calculate date range based on period
	var startDate time.Time
	now := time.Now()

	switch period {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	case "quarter":
		startDate = now.AddDate(0, -3, 0)
	case "year":
		startDate = now.AddDate(-1, 0, 0)
	default:
		startDate = now.AddDate(0, -1, 0) // Default to month
	}

	// Get total visitors count
	var totalVisitors int64
	query := db.DB.Model(&models.User{}).Where("role = ? AND created_at >= ?", models.RoleVisitor, startDate)
	if category != "" {
		// Join with help requests to filter by category
		query = query.Joins("JOIN help_requests ON help_requests.visitor_id = users.id").
			Where("help_requests.category = ?", category)
	}
	query.Count(&totalVisitors)

	// Get new vs returning visitors
	var newVisitors, returningVisitors int64
	db.DB.Model(&models.User{}).
		Where("role = ? AND created_at >= ?", models.RoleVisitor, startDate).
		Count(&newVisitors)

	// Calculate returning visitors (simplified)
	returningVisitors = totalVisitors - newVisitors

	// Get help requests by category
	var foodRequests, generalRequests int64
	db.DB.Model(&models.HelpRequest{}).
		Where("created_at >= ? AND category = ?", startDate, "Food").
		Count(&foodRequests)
	db.DB.Model(&models.HelpRequest{}).
		Where("created_at >= ? AND category = ?", startDate, "General").
		Count(&generalRequests)

	// Calculate growth rate (simplified)
	var previousPeriodVisitors int64
	previousStart := startDate.AddDate(0, 0, -int(now.Sub(startDate).Hours()/24))
	db.DB.Model(&models.User{}).
		Where("role = ? AND created_at >= ? AND created_at < ?", models.RoleVisitor, previousStart, startDate).
		Count(&previousPeriodVisitors)

	growthRate := float64(0)
	if previousPeriodVisitors > 0 {
		growthRate = (float64(newVisitors) - float64(previousPeriodVisitors)) / float64(previousPeriodVisitors) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"period":   period,
			"category": category,
			"trends": gin.H{
				"totalVisitors":     totalVisitors,
				"newVisitors":       newVisitors,
				"returningVisitors": returningVisitors,
				"growthRate":        growthRate,
			},
			"categoryBreakdown": gin.H{
				"foodRequests":    foodRequests,
				"generalRequests": generalRequests,
			},
		},
	})
}

// GetDonationImpact provides donation impact analytics
func GetDonationImpact(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Parse dates or use defaults
	var start, end time.Time
	var err error

	if startDate != "" {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			start = time.Now().AddDate(0, -1, 0) // Default to 1 month ago
		}
	} else {
		start = time.Now().AddDate(0, -1, 0)
	}

	if endDate != "" {
		end, err = time.Parse("2006-01-02", endDate)
		if err != nil {
			end = time.Now()
		}
	} else {
		end = time.Now()
	}

	// Get monetary donations total
	var monetaryTotal float64
	var monetaryCount int64
	db.DB.Model(&models.Donation{}).
		Where("created_at >= ? AND created_at <= ? AND type = ?", start, end, "monetary").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&monetaryTotal)
	db.DB.Model(&models.Donation{}).
		Where("created_at >= ? AND created_at <= ? AND type = ?", start, end, "monetary").
		Count(&monetaryCount)

	// Get item donations count
	var itemCount int64
	db.DB.Model(&models.Donation{}).
		Where("created_at >= ? AND created_at <= ? AND type = ?", start, end, "item").
		Count(&itemCount)

	// Get families helped (unique visitors with approved help requests)
	var familiesHelped int64
	db.DB.Model(&models.HelpRequest{}).
		Where("created_at >= ? AND created_at <= ? AND status = ?", start, end, "Completed").
		Distinct("visitor_id").
		Count(&familiesHelped)

	// Get top donors (simplified - would need proper donor tracking)
	type DonorSummary struct {
		UserID        uint    `json:"user_id"`
		Name          string  `json:"name"`
		TotalAmount   float64 `json:"total_amount"`
		DonationCount int64   `json:"donation_count"`
	}

	var topDonors []DonorSummary
	db.DB.Model(&models.Donation{}).
		Select("user_id, users.name, SUM(amount) as total_amount, COUNT(*) as donation_count").
		Joins("LEFT JOIN users ON donations.user_id = users.id").
		Where("donations.created_at >= ? AND donations.created_at <= ? AND donations.type = ?", start, end, "monetary").
		Group("user_id, users.name").
		Order("total_amount DESC").
		Limit(5).
		Scan(&topDonors)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"period": gin.H{
				"startDate": start.Format("2006-01-02"),
				"endDate":   end.Format("2006-01-02"),
			},
			"totalImpact": gin.H{
				"monetaryDonations": monetaryTotal,
				"monetaryCount":     monetaryCount,
				"itemDonations":     itemCount,
				"familiesHelped":    familiesHelped,
			},
			"topDonors": topDonors,
		},
	})
}

// GetVolunteerPerformance provides volunteer performance analytics
func GetVolunteerPerformance(c *gin.Context) {
	period := c.Query("period")

	// Calculate date range
	var startDate time.Time
	now := time.Now()

	switch period {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	case "quarter":
		startDate = now.AddDate(0, -3, 0)
	case "year":
		startDate = now.AddDate(-1, 0, 0)
	default:
		startDate = now.AddDate(0, -1, 0)
	}

	// Get total volunteers
	var totalVolunteers, activeVolunteers int64
	db.DB.Model(&models.User{}).
		Where("role = ?", models.RoleVolunteer).
		Count(&totalVolunteers)
	db.DB.Model(&models.User{}).
		Where("role = ? AND status = ?", models.RoleVolunteer, "active").
		Count(&activeVolunteers)

	// Get shift assignments in period
	var totalHours float64
	var completedShifts int64

	db.DB.Model(&models.ShiftAssignment{}).
		Where("created_at >= ? AND status = ?", startDate, "Completed").
		Count(&completedShifts)

	// Calculate total hours (simplified calculation)
	type ShiftHours struct {
		TotalHours float64 `json:"total_hours"`
	}
	var shiftHours ShiftHours
	db.DB.Raw(`
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0) as total_hours
		FROM shift_assignments 
		JOIN shifts ON shift_assignments.shift_id = shifts.id 
		WHERE shift_assignments.created_at >= ? AND shift_assignments.status = ?
	`, startDate, "Completed").Scan(&shiftHours)
	totalHours = shiftHours.TotalHours

	// Get top performers
	type TopPerformer struct {
		UserID           uint    `json:"user_id"`
		Name             string  `json:"name"`
		HoursContributed float64 `json:"hours_contributed"`
		ShiftsCompleted  int64   `json:"shifts_completed"`
	}

	var topPerformers []TopPerformer
	db.DB.Raw(`
		SELECT 
			users.id as user_id,
			users.name,
			COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0) as hours_contributed,
			COUNT(shift_assignments.id) as shifts_completed
		FROM users 
		LEFT JOIN shift_assignments ON users.id = shift_assignments.user_id
		LEFT JOIN shifts ON shift_assignments.shift_id = shifts.id
		WHERE users.role = ? 
			AND shift_assignments.created_at >= ? 
			AND shift_assignments.status = ?
		GROUP BY users.id, users.name
		ORDER BY hours_contributed DESC
		LIMIT 5
	`, models.RoleVolunteer, startDate, "Completed").Scan(&topPerformers)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"period": period,
			"overview": gin.H{
				"totalVolunteers":  totalVolunteers,
				"activeVolunteers": activeVolunteers,
				"totalHours":       totalHours,
				"completedShifts":  completedShifts,
			},
			"topPerformers": topPerformers,
		},
	})
}

// GetServiceEfficiency provides service efficiency analytics
func GetServiceEfficiency(c *gin.Context) {
	// Get queue metrics
	var avgWaitTime, avgServiceTime float64

	// Calculate average wait time from queue data (simplified)
	db.DB.Raw(`
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (service_started_at - created_at))/60), 0) as avg_wait_time
		FROM queue_entries 
		WHERE service_started_at IS NOT NULL 
			AND created_at >= ?
	`, time.Now().AddDate(0, 0, -30)).Scan(&avgWaitTime)

	// Calculate average service time
	db.DB.Raw(`
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - service_started_at))/60), 0) as avg_service_time
		FROM queue_entries 
		WHERE completed_at IS NOT NULL 
			AND service_started_at IS NOT NULL
			AND created_at >= ?
	`, time.Now().AddDate(0, 0, -30)).Scan(&avgServiceTime)

	// Get satisfaction metrics from feedback
	type SatisfactionMetrics struct {
		AverageRating      float64 `json:"average_rating"`
		RecommendationRate float64 `json:"recommendation_rate"`
		TotalFeedback      int64   `json:"total_feedback"`
	}

	var satisfaction SatisfactionMetrics
	db.DB.Raw(`
		SELECT 
			COALESCE(AVG(overall_rating), 0) as average_rating,
			COALESCE(AVG(CASE WHEN would_recommend THEN 100.0 ELSE 0.0 END), 0) as recommendation_rate,
			COUNT(*) as total_feedback
		FROM visit_feedback 
		WHERE created_at >= ?
	`, time.Now().AddDate(0, 0, -30)).Scan(&satisfaction)

	// Calculate resource utilization (simplified)
	var totalShifts, filledShifts int64
	db.DB.Model(&models.Shift{}).
		Where("date >= ?", time.Now().AddDate(0, 0, -30)).
		Count(&totalShifts)
	db.DB.Model(&models.Shift{}).
		Where("date >= ? AND assigned_volunteer_id IS NOT NULL", time.Now().AddDate(0, 0, -30)).
		Count(&filledShifts)

	staffUtilization := float64(0)
	if totalShifts > 0 {
		staffUtilization = float64(filledShifts) / float64(totalShifts) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"queueMetrics": gin.H{
				"averageWaitTime":    avgWaitTime,
				"averageServiceTime": avgServiceTime,
			},
			"resourceUtilization": gin.H{
				"staffUtilization": staffUtilization,
				"totalShifts":      totalShifts,
				"filledShifts":     filledShifts,
			},
			"satisfactionMetrics": gin.H{
				"averageRating":      satisfaction.AverageRating,
				"recommendationRate": satisfaction.RecommendationRate,
				"totalFeedback":      satisfaction.TotalFeedback,
			},
		},
	})
}

// GetAnalytics provides comprehensive analytics data for admin dashboard
func GetAnalytics(c *gin.Context) {
	fmt.Printf("=== DEBUG [%s] === GetAnalytics endpoint called ===\n", time.Now().Format("15:04:05"))

	// Get date range from query parameters
	startDate := c.Query("start_date")

	// Parse dates or use defaults (last 30 days)
	var start time.Time
	var err error

	if startDate != "" {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			start = time.Now().AddDate(0, 0, -30)
		}
	} else {
		start = time.Now().AddDate(0, 0, -30)
	}

	// Get total users count
	var totalUsers, newUsersThisMonth int64
	db.DB.Model(&models.User{}).Count(&totalUsers)
	fmt.Printf("=== DEBUG [%s] === totalUsers = %d ===\n", time.Now().Format("15:04:05"), totalUsers)
	db.DB.Model(&models.User{}).
		Where("created_at >= ?", time.Now().AddDate(0, -1, 0)).
		Count(&newUsersThisMonth)

	// Get help requests metrics
	var activeHelpRequests, completedHelpRequests int64
	db.DB.Model(&models.HelpRequest{}).
		Where("status IN ?", []string{"pending", "approved", "in_progress"}).
		Count(&activeHelpRequests)
	db.DB.Model(&models.HelpRequest{}).
		Where("status = ? AND created_at >= ?", "completed", start).
		Count(&completedHelpRequests)

	// Get volunteer metrics
	var totalVolunteerHours, volunteerHoursThisMonth float64
	db.DB.Raw(`
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0)
		FROM shift_assignments 
		JOIN shifts ON shift_assignments.shift_id = shifts.id 
		WHERE shift_assignments.status = 'Completed'
	`).Scan(&totalVolunteerHours)

	db.DB.Raw(`
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0)
		FROM shift_assignments 
		JOIN shifts ON shift_assignments.shift_id = shifts.id 
		WHERE shift_assignments.status = 'Completed' 
			AND shift_assignments.created_at >= ?
	`, time.Now().AddDate(0, -1, 0)).Scan(&volunteerHoursThisMonth)

	// Get average response time (simplified calculation)
	var avgResponseTime float64 = 24.5 // Mock data - implement actual calculation
	responseTrend := 5.2               // Mock data - percentage improvement

	// Get help requests over time (last 7 days) - Fix PostgreSQL DATE function
	type DateCount struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}

	var helpRequestsOverTime []DateCount
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		var count int64
		db.DB.Model(&models.HelpRequest{}).
			Where("created_at::date = ?", date.Format("2006-01-02")).
			Count(&count)
		helpRequestsOverTime = append(helpRequestsOverTime, DateCount{
			Date:  date.Format("2006-01-02"),
			Count: count,
		})
	}

	// Get volunteer activity (top 5 volunteers by hours) - Fix column names
	type VolunteerActivity struct {
		Name  string  `json:"name"`
		Hours float64 `json:"hours"`
	}

	volunteerActivity := make([]VolunteerActivity, 0) // Initialize empty array
	db.DB.Raw(`
		SELECT 
			CONCAT(users.first_name, ' ', users.last_name) as name,
			COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0) as hours
		FROM users 
		LEFT JOIN shift_assignments ON users.id = shift_assignments.user_id
		LEFT JOIN shifts ON shift_assignments.shift_id = shifts.id
		WHERE users.role = ? 
			AND shift_assignments.status = 'Completed'
			AND shift_assignments.created_at >= ?
		GROUP BY users.id, users.first_name, users.last_name
		ORDER BY hours DESC
		LIMIT 5
	`, models.RoleVolunteer, start).Scan(&volunteerActivity)

	// Get help request categories
	type CategoryCount struct {
		Name  string `json:"name"`
		Value int64  `json:"value"`
	}

	helpRequestCategories := make([]CategoryCount, 0) // Initialize empty array
	db.DB.Model(&models.HelpRequest{}).
		Select("category as name, COUNT(*) as value").
		Where("created_at >= ?", start).
		Group("category").
		Scan(&helpRequestCategories)

	// Get document statistics
	var totalDocuments, verifiedDocuments, pendingDocuments int64
	db.DB.Model(&models.Document{}).Count(&totalDocuments)
	fmt.Printf("=== DEBUG [%s] === totalDocuments = %d ===\n", time.Now().Format("15:04:05"), totalDocuments)
	db.DB.Model(&models.Document{}).Where("status = ?", "verified").Count(&verifiedDocuments)
	db.DB.Model(&models.Document{}).Where("status = ?", "pending").Count(&pendingDocuments)

	// Calculate verification rate
	verificationRate := float64(0)
	if totalDocuments > 0 {
		verificationRate = float64(verifiedDocuments) / float64(totalDocuments) * 100
	}

	// Ensure help requests over time is not nil
	if helpRequestsOverTime == nil {
		helpRequestsOverTime = make([]DateCount, 0)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_users":                totalUsers,
			"new_users_this_month":       newUsersThisMonth,
			"active_help_requests":       activeHelpRequests,
			"completed_help_requests":    completedHelpRequests,
			"total_volunteer_hours":      totalVolunteerHours,
			"volunteer_hours_this_month": volunteerHoursThisMonth,
			"avg_response_time":          avgResponseTime,
			"response_time_trend":        responseTrend,
			"help_requests_over_time":    helpRequestsOverTime,
			"volunteer_activity":         volunteerActivity,
			"help_request_categories":    helpRequestCategories,
			"total_documents":            totalDocuments,
			"verified_documents":         verifiedDocuments,
			"pending_documents":          pendingDocuments,
			"verification_rate":          verificationRate,
		},
	})
}

// ExportAnalytics exports comprehensive analytics data to CSV format
func ExportAnalytics(c *gin.Context) {
	// Get date range from query parameters (default to last 30 days)
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Parse dates or use defaults
	var start, end time.Time
	var err error

	if startDate != "" {
		start, err = time.Parse("2006-01-02", startDate)
		if err != nil {
			start = time.Now().AddDate(0, 0, -30)
		}
	} else {
		start = time.Now().AddDate(0, 0, -30)
	}

	if endDate != "" {
		end, err = time.Parse("2006-01-02", endDate)
		if err != nil {
			end = time.Now()
		}
	} else {
		end = time.Now()
	}

	// Set up response headers for CSV download
	filename := fmt.Sprintf("analytics_export_%s_to_%s.csv", start.Format("2006-01-02"), end.Format("2006-01-02"))
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write summary metrics section
	if err := writer.Write([]string{"SUMMARY METRICS", "", "", "", ""}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV header"})
		return
	}

	// Get summary data
	var totalUsers, newUsers int64
	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("created_at >= ? AND created_at <= ?", start, end).Count(&newUsers)

	var totalHelpRequests, activeHelpRequests, completedHelpRequests int64
	db.DB.Model(&models.HelpRequest{}).Where("created_at >= ? AND created_at <= ?", start, end).Count(&totalHelpRequests)
	db.DB.Model(&models.HelpRequest{}).Where("created_at >= ? AND created_at <= ? AND status IN ?", start, end, []string{"pending", "approved", "in_progress"}).Count(&activeHelpRequests)
	db.DB.Model(&models.HelpRequest{}).Where("created_at >= ? AND created_at <= ? AND status = ?", start, end, "completed").Count(&completedHelpRequests)

	var totalVolunteers, activeVolunteers int64
	db.DB.Model(&models.User{}).Where("role = ?", models.RoleVolunteer).Count(&totalVolunteers)
	db.DB.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "active").Count(&activeVolunteers)

	var totalVolunteerHours float64
	db.DB.Raw(`
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0)
		FROM shift_assignments 
		JOIN shifts ON shift_assignments.shift_id = shifts.id 
		WHERE shift_assignments.status = 'Completed' 
			AND shift_assignments.created_at >= ? AND shift_assignments.created_at <= ?
	`, start, end).Scan(&totalVolunteerHours)

	// Write summary data
	summaryData := [][]string{
		{"Metric", "Value", "", "", ""},
		{"Total Users", fmt.Sprintf("%d", totalUsers), "", "", ""},
		{"New Users (Period)", fmt.Sprintf("%d", newUsers), "", "", ""},
		{"Total Help Requests (Period)", fmt.Sprintf("%d", totalHelpRequests), "", "", ""},
		{"Active Help Requests", fmt.Sprintf("%d", activeHelpRequests), "", "", ""},
		{"Completed Help Requests", fmt.Sprintf("%d", completedHelpRequests), "", "", ""},
		{"Total Volunteers", fmt.Sprintf("%d", totalVolunteers), "", "", ""},
		{"Active Volunteers", fmt.Sprintf("%d", activeVolunteers), "", "", ""},
		{"Volunteer Hours (Period)", fmt.Sprintf("%.2f", totalVolunteerHours), "", "", ""},
		{"", "", "", "", ""},
	}

	for _, row := range summaryData {
		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write summary data"})
			return
		}
	}

	// Write help requests by category section
	if err := writer.Write([]string{"HELP REQUESTS BY CATEGORY", "", "", "", ""}); err != nil {
		return
	}
	if err := writer.Write([]string{"Category", "Count", "Percentage", "", ""}); err != nil {
		return
	}

	type CategoryCount struct {
		Category string
		Count    int64
	}

	var categoryData []CategoryCount
	db.DB.Model(&models.HelpRequest{}).
		Select("category, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", start, end).
		Group("category").
		Scan(&categoryData)

	for _, cat := range categoryData {
		percentage := float64(0)
		if totalHelpRequests > 0 {
			percentage = float64(cat.Count) / float64(totalHelpRequests) * 100
		}
		if err := writer.Write([]string{cat.Category, fmt.Sprintf("%d", cat.Count), fmt.Sprintf("%.1f%%", percentage), "", ""}); err != nil {
			return
		}
	}

	// Empty line
	if err := writer.Write([]string{"", "", "", "", ""}); err != nil {
		return
	}

	// Write daily help requests section
	if err := writer.Write([]string{"DAILY HELP REQUESTS", "", "", "", ""}); err != nil {
		return
	}
	if err := writer.Write([]string{"Date", "Count", "", "", ""}); err != nil {
		return
	}

	// Generate daily data for the period
	currentDate := start
	for currentDate.Before(end.AddDate(0, 0, 1)) {
		var dailyCount int64
		db.DB.Model(&models.HelpRequest{}).
			Where("created_at::date = ?", currentDate.Format("2006-01-02")).
			Count(&dailyCount)

		if err := writer.Write([]string{currentDate.Format("2006-01-02"), fmt.Sprintf("%d", dailyCount), "", "", ""}); err != nil {
			return
		}
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	// Empty line
	if err := writer.Write([]string{"", "", "", "", ""}); err != nil {
		return
	}

	// Write top volunteers section
	if err := writer.Write([]string{"TOP VOLUNTEERS BY HOURS", "", "", "", ""}); err != nil {
		return
	}
	if err := writer.Write([]string{"Name", "Hours", "Shifts Completed", "", ""}); err != nil {
		return
	}

	type VolunteerStats struct {
		Name            string
		Hours           float64
		ShiftsCompleted int64
	}

	var topVolunteers []VolunteerStats
	db.DB.Raw(`
		SELECT 
			CONCAT(users.first_name, ' ', users.last_name) as name,
			COALESCE(SUM(EXTRACT(EPOCH FROM (shifts.end_time - shifts.start_time))/3600), 0) as hours,
			COUNT(shift_assignments.id) as shifts_completed
		FROM users 
		LEFT JOIN shift_assignments ON users.id = shift_assignments.user_id
		LEFT JOIN shifts ON shift_assignments.shift_id = shifts.id
		WHERE users.role = ? 
			AND shift_assignments.created_at >= ? AND shift_assignments.created_at <= ?
			AND shift_assignments.status = 'Completed'
		GROUP BY users.id, users.first_name, users.last_name
		ORDER BY hours DESC
		LIMIT 10
	`, models.RoleVolunteer, start, end).Scan(&topVolunteers)

	for _, vol := range topVolunteers {
		if err := writer.Write([]string{vol.Name, fmt.Sprintf("%.2f", vol.Hours), fmt.Sprintf("%d", vol.ShiftsCompleted), "", ""}); err != nil {
			return
		}
	}

	// Empty line
	if err := writer.Write([]string{"", "", "", "", ""}); err != nil {
		return
	}

	// Write donations section if any exist
	var donationCount int64
	var totalDonationAmount float64
	db.DB.Model(&models.Donation{}).Where("created_at >= ? AND created_at <= ?", start, end).Count(&donationCount)
	db.DB.Model(&models.Donation{}).
		Where("created_at >= ? AND created_at <= ? AND type = ?", start, end, "monetary").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalDonationAmount)

	if donationCount > 0 {
		if err := writer.Write([]string{"DONATIONS SUMMARY", "", "", "", ""}); err != nil {
			return
		}
		if err := writer.Write([]string{"Total Donations", fmt.Sprintf("%d", donationCount), "", "", ""}); err != nil {
			return
		}
		if err := writer.Write([]string{"Total Amount", fmt.Sprintf("£%.2f", totalDonationAmount), "", "", ""}); err != nil {
			return
		}
	}

	// Add generation timestamp
	if err := writer.Write([]string{"", "", "", "", ""}); err != nil {
		return
	}
	if err := writer.Write([]string{"Generated on", time.Now().Format("2006-01-02 15:04:05"), "", "", ""}); err != nil {
		return
	}
	if err := writer.Write([]string{"Period", fmt.Sprintf("%s to %s", start.Format("2006-01-02"), end.Format("2006-01-02")), "", "", ""}); err != nil {
		return
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV data"})
		return
	}
}

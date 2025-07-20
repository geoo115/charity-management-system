package system

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetReportDonations generates a report on donations
func GetReportDonations(c *gin.Context) {
	timeRange := c.Query("timeRange")

	// Determine date range based on timeRange
	var startDate, endDate time.Time
	now := time.Now()

	switch timeRange {
	case "this-week":
		startDate = now.AddDate(0, 0, -int(now.Weekday()))
		endDate = now
	case "this-month":
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = now
	case "last-month":
		lastMonth := now.AddDate(0, -1, 0)
		startDate = time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Add(-time.Second)
	case "last-quarter":
		quarter := ((now.Month()-1)/3)*3 + 1
		startDate = time.Date(now.Year(), quarter-3, 1, 0, 0, 0, 0, now.Location())
		endDate = time.Date(now.Year(), quarter, 1, 0, 0, 0, 0, now.Location()).Add(-time.Second)
	case "year-to-date":
		startDate = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		endDate = now
	case "custom":
		// Parse custom date range
		customStart := c.Query("startDate")
		customEnd := c.Query("endDate")
		var err error

		if customStart != "" {
			startDate, err = time.Parse("2006-01-02", customStart)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format"})
				return
			}
		}

		if customEnd != "" {
			endDate, err = time.Parse("2006-01-02", customEnd)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format"})
				return
			}
		}
	default:
		// Default to this month
		startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		endDate = now
	}

	// Example of constructing a donations report
	// In a real implementation, this would query the database for actual metrics
	report := map[string]interface{}{
		"overview": map[string]interface{}{
			"thisMonth":     25,
			"lastMonth":     20,
			"yearToDate":    145,
			"percentChange": 25.0,
			"dateRange": map[string]string{
				"from": startDate.Format("2006-01-02"),
				"to":   endDate.Format("2006-01-02"),
			},
		},
		"byType": map[string]interface{}{
			"monetary": map[string]interface{}{
				"count":  15,
				"amount": 1250.00,
			},
			"items": map[string]interface{}{
				"count": 10,
			},
		},
		"byCategory": []map[string]interface{}{
			{"category": "Food", "count": 8, "percentage": 32},
			{"category": "Clothing", "count": 7, "percentage": 28},
			{"category": "Financial", "count": 6, "percentage": 24},
			{"category": "Other", "count": 4, "percentage": 16},
		},
		"timeline": []map[string]interface{}{
			{"date": time.Now().AddDate(0, 0, -6).Format("2006-01-02"), "count": 3},
			{"date": time.Now().AddDate(0, 0, -5).Format("2006-01-02"), "count": 2},
			{"date": time.Now().AddDate(0, 0, -4).Format("2006-01-02"), "count": 4},
			{"date": time.Now().AddDate(0, 0, -3).Format("2006-01-02"), "count": 3},
			{"date": time.Now().AddDate(0, 0, -2).Format("2006-01-02"), "count": 5},
			{"date": time.Now().AddDate(0, 0, -1).Format("2006-01-02"), "count": 4},
			{"date": time.Now().Format("2006-01-02"), "count": 4},
		},
	}

	c.JSON(http.StatusOK, report)
}

// GetReportHelpRequests generates a report on help requests
func GetReportHelpRequests(c *gin.Context) {
	// Similar implementation to donations report but for help requests
	// This would return data shaped for the help requests report

	report := map[string]interface{}{
		"overview": map[string]interface{}{
			"thisMonth":     18,
			"lastMonth":     15,
			"yearToDate":    120,
			"percentChange": 20.0,
		},
		"byStatus": []map[string]interface{}{
			{"status": "New", "count": 5, "percentage": 28},
			{"status": "InProgress", "count": 8, "percentage": 44},
			{"status": "Completed", "count": 5, "percentage": 28},
		},
		"byCategory": []map[string]interface{}{
			{"category": "Food", "count": 7, "percentage": 39},
			{"category": "Housing", "count": 5, "percentage": 28},
			{"category": "Clothing", "count": 3, "percentage": 17},
			{"category": "Financial", "count": 3, "percentage": 17},
		},
		"responseTime": map[string]interface{}{
			"average": 6.5,
			"target":  8.0,
			"byDay": []map[string]interface{}{
				{"day": "Monday", "avg": 7.2},
				{"day": "Tuesday", "avg": 6.8},
				{"day": "Wednesday", "avg": 5.9},
				{"day": "Thursday", "avg": 6.2},
				{"day": "Friday", "avg": 6.5},
				{"day": "Saturday", "avg": 0.0},
				{"day": "Sunday", "avg": 0.0},
			},
		},
	}

	c.JSON(http.StatusOK, report)
}

// GetReportVolunteers generates a report on volunteers
func GetReportVolunteers(c *gin.Context) {
	report := map[string]interface{}{
		"overview": map[string]interface{}{
			"total":               32,
			"active":              28,
			"pendingApplications": 4,
			"hoursThisMonth":      124,
		},
		"byRole": []map[string]interface{}{
			{"role": "Warehouse Assistant", "count": 12, "percentage": 38},
			{"role": "Driver", "count": 6, "percentage": 19},
			{"role": "Front Desk", "count": 5, "percentage": 16},
			{"role": "Events Coordinator", "count": 4, "percentage": 13},
			{"role": "Fundraiser", "count": 5, "percentage": 16},
		},
		"topVolunteers": []map[string]interface{}{
			{"name": "Jane Smith", "role": "Warehouse Assistant", "hours": 24},
			{"name": "John Doe", "role": "Driver", "hours": 18},
			{"name": "Alex Johnson", "role": "Front Desk", "hours": 16},
			{"name": "Sarah Brown", "role": "Events Coordinator", "hours": 12},
			{"name": "Michael Wilson", "role": "Fundraiser", "hours": 10},
		},
	}

	c.JSON(http.StatusOK, report)
}

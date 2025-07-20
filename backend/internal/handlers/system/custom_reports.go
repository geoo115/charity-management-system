package system

import (
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"

	"github.com/gin-gonic/gin"
)

// ReportRequest represents the request for a custom report
type ReportRequest struct {
	ReportType string                 `json:"reportType" binding:"required"`
	TimeRange  string                 `json:"timeRange" binding:"required"`
	StartDate  string                 `json:"startDate"`
	EndDate    string                 `json:"endDate"`
	Filters    map[string]interface{} `json:"filters"`
	GroupBy    string                 `json:"groupBy"`
	SortBy     string                 `json:"sortBy"`
	SortOrder  string                 `json:"sortOrder"`
	ExportType string                 `json:"exportType"`
}

// GenerateCustomReport handles requests for custom reports with advanced filtering
func GenerateCustomReport(c *gin.Context) {
	var req ReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Process date range
	var startDate, endDate time.Time
	var err error

	if req.TimeRange == "custom" {
		if req.StartDate != "" {
			startDate, err = time.Parse("2006-01-02", req.StartDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format"})
				return
			}
		}

		if req.EndDate != "" {
			endDate, err = time.Parse("2006-01-02", req.EndDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format"})
				return
			}
		}
	} else {
		// Calculate date range based on timeRange
		endDate = time.Now()

		switch req.TimeRange {
		case "today":
			startDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 0, 0, 0, 0, endDate.Location())
		case "yesterday":
			yesterday := endDate.AddDate(0, 0, -1)
			startDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, endDate.Location())
			endDate = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, endDate.Location())
		case "thisWeek":
			// Get start of current week (Sunday or Monday depending on locale)
			daysSinceMonday := (int(endDate.Weekday()) - 1 + 7) % 7
			startDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day()-daysSinceMonday, 0, 0, 0, 0, endDate.Location())
		case "lastWeek":
			// Last week: 7-13 days ago
			daysSinceMonday := (int(endDate.Weekday()) - 1 + 7) % 7
			startOfThisWeek := time.Date(endDate.Year(), endDate.Month(), endDate.Day()-daysSinceMonday, 0, 0, 0, 0, endDate.Location())
			startDate = startOfThisWeek.AddDate(0, 0, -7)
			endDate = startOfThisWeek.AddDate(0, 0, -1)
		case "thisMonth":
			startDate = time.Date(endDate.Year(), endDate.Month(), 1, 0, 0, 0, 0, endDate.Location())
		case "lastMonth":
			lastMonth := endDate.AddDate(0, -1, 0)
			startDate = time.Date(lastMonth.Year(), lastMonth.Month(), 1, 0, 0, 0, 0, endDate.Location())
			endDate = time.Date(endDate.Year(), endDate.Month(), 0, 23, 59, 59, 0, endDate.Location())
		case "thisQuarter":
			quarter := (endDate.Month()-1)/3 + 1
			startDate = time.Date(endDate.Year(), time.Month((quarter-1)*3+1), 1, 0, 0, 0, 0, endDate.Location())
		case "lastQuarter":
			quarter := (endDate.Month()-1)/3 + 1
			if quarter == 1 {
				startDate = time.Date(endDate.Year()-1, time.Month(10), 1, 0, 0, 0, 0, endDate.Location())
				endDate = time.Date(endDate.Year(), time.Month(1), 0, 23, 59, 59, 0, endDate.Location())
			} else {
				startDate = time.Date(endDate.Year(), time.Month((quarter-2)*3+1), 1, 0, 0, 0, 0, endDate.Location())
				endDate = time.Date(endDate.Year(), time.Month((quarter-1)*3+1), 0, 23, 59, 59, 0, endDate.Location())
			}
		case "thisYear":
			startDate = time.Date(endDate.Year(), 1, 1, 0, 0, 0, 0, endDate.Location())
		case "lastYear":
			startDate = time.Date(endDate.Year()-1, 1, 1, 0, 0, 0, 0, endDate.Location())
			endDate = time.Date(endDate.Year()-1, 12, 31, 23, 59, 59, 0, endDate.Location())
		default:
			// Default to all time
			startDate = time.Date(2000, 1, 1, 0, 0, 0, 0, endDate.Location())
		}
	}

	// Based on report type, generate appropriate report
	switch req.ReportType {
	case "donations":
		generateDonationsReport(c, req, startDate, endDate)
	case "helpRequests":
		generateHelpRequestsReport(c, req, startDate, endDate)
	case "inventory":
		generateInventoryReport(c, req, startDate, endDate)
	case "volunteers":
		generateVolunteersReport(c, req, startDate, endDate)
	case "auditLogs":
		generateAuditReport(c, req, startDate, endDate)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report type"})
		return
	}
}

// Helper functions for specific report types
func generateDonationsReport(c *gin.Context, req ReportRequest, startDate, endDate time.Time) {
	// Base query for donations
	query := db.GetDB().Table("donations").
		Where("created_at BETWEEN ? AND ?", startDate, endDate)

	// Apply filters
	if req.Filters != nil {
		if category, ok := req.Filters["category"].(string); ok && category != "all" {
			query = query.Where("type = ?", category)
		}

		if status, ok := req.Filters["status"].(string); ok && status != "all" {
			query = query.Where("status = ?", status)
		}
	}

	// Group by logic based on request
	var result []map[string]interface{}
	var groupByClause string

	switch req.GroupBy {
	case "day":
		groupByClause = "DATE(created_at)"
	case "week":
		groupByClause = "DATE(DATE_ADD(created_at, INTERVAL(-WEEKDAY(created_at)) DAY))"
	case "month":
		groupByClause = "DATE_FORMAT(created_at, '%Y-%m-01')"
	case "category":
		groupByClause = "type"
	case "status":
		groupByClause = "status"
	default:
		groupByClause = "DATE(created_at)"
	}

	// Execute query with grouping
	rows, err := query.Select(groupByClause + " as period, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount").
		Group(groupByClause).
		Order(groupByClause).
		Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report: " + err.Error()})
		return
	}
	defer rows.Close()

	// Process results
	for rows.Next() {
		var period string
		var count int
		var totalAmount float64

		if err := rows.Scan(&period, &count, &totalAmount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process report data: " + err.Error()})
			return
		}

		result = append(result, map[string]interface{}{
			"period":       period,
			"count":        count,
			"total_amount": totalAmount,
		})
	}

	// Return the report data
	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": map[string]interface{}{
			"reportType": req.ReportType,
			"timeRange":  req.TimeRange,
			"startDate":  startDate.Format("2006-01-02"),
			"endDate":    endDate.Format("2006-01-02"),
			"filters":    req.Filters,
			"groupBy":    req.GroupBy,
		},
	})
}

// Simplified implementation for other report types
func generateHelpRequestsReport(c *gin.Context, req ReportRequest, startDate, endDate time.Time) {
	// Simple implementation for help requests report
	c.JSON(http.StatusOK, gin.H{
		"data": []map[string]interface{}{
			{"period": startDate.Format("2006-01-02"), "count": 12, "fulfilled": 8},
			{"period": endDate.Format("2006-01-02"), "count": 14, "fulfilled": 10},
		},
		"meta": map[string]interface{}{
			"reportType": req.ReportType,
			"timeRange":  req.TimeRange,
			"startDate":  startDate.Format("2006-01-02"),
			"endDate":    endDate.Format("2006-01-02"),
			"filters":    req.Filters,
		},
	})
}

func generateInventoryReport(c *gin.Context, req ReportRequest, startDate, endDate time.Time) {
	// Simple implementation for inventory report
	c.JSON(http.StatusOK, gin.H{
		"data": []map[string]interface{}{
			{"category": "Food", "inStock": 120, "lowStock": 30, "outOfStock": 5},
			{"category": "Clothing", "inStock": 85, "lowStock": 15, "outOfStock": 3},
			{"category": "Hygiene", "inStock": 50, "lowStock": 10, "outOfStock": 2},
		},
		"meta": map[string]interface{}{
			"reportType": req.ReportType,
			"timeRange":  req.TimeRange,
			"startDate":  startDate.Format("2006-01-02"),
			"endDate":    endDate.Format("2006-01-02"),
			"filters":    req.Filters,
		},
	})
}

func generateVolunteersReport(c *gin.Context, req ReportRequest, startDate, endDate time.Time) {
	// Simple implementation for volunteers report
	c.JSON(http.StatusOK, gin.H{
		"data": []map[string]interface{}{
			{"period": "2023-01", "newVolunteers": 5, "activeVolunteers": 25, "totalHours": 120},
			{"period": "2023-02", "newVolunteers": 7, "activeVolunteers": 30, "totalHours": 145},
		},
		"meta": map[string]interface{}{
			"reportType": req.ReportType,
			"timeRange":  req.TimeRange,
			"startDate":  startDate.Format("2006-01-02"),
			"endDate":    endDate.Format("2006-01-02"),
			"filters":    req.Filters,
		},
	})
}

func generateAuditReport(c *gin.Context, req ReportRequest, startDate, endDate time.Time) {
	// Simple implementation for audit report
	c.JSON(http.StatusOK, gin.H{
		"data": []map[string]interface{}{
			{"action": "Create", "count": 45},
			{"action": "Update", "count": 78},
			{"action": "Delete", "count": 12},
			{"action": "Login", "count": 140},
		},
		"meta": map[string]interface{}{
			"reportType": req.ReportType,
			"timeRange":  req.TimeRange,
			"startDate":  startDate.Format("2006-01-02"),
			"endDate":    endDate.Format("2006-01-02"),
			"filters":    req.Filters,
		},
	})
}

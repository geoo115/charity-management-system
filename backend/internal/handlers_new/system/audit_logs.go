package system

import (
	"net/http"
	"sort"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
)

// GetAuditLog returns a single audit log by ID
func GetAuditLog(c *gin.Context) {
	id := c.Param("id")
	var log models.AuditLog

	if err := db.GetDB().First(&log, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log entry not found"})
		return
	}

	c.JSON(http.StatusOK, log)
}

// ListAuditLogs returns a list of audit logs (stub)
func ListAuditLogs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"logs": []gin.H{},
	})
}

// GetAuditLogDetails returns details for a specific audit log (stub)
func GetAuditLogDetails(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"log": gin.H{},
	})
}

// GetAuditLogAnalytics returns analytics data for audit logs
func GetAuditLogAnalytics(c *gin.Context) {
	// Parse query parameters
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	action := c.Query("action")
	entityType := c.Query("entityType")
	userIDStr := c.Query("userId")

	// Setup base query
	query := db.GetDB().Model(&models.AuditLog{})

	// Apply date range filters
	var startDate, endDate time.Time
	var err error
	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err == nil {
			query = query.Where("created_at >= ?", startDate)
		}
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err == nil {
			// Add a day to include all entries on the end date
			endDate = endDate.AddDate(0, 0, 1)
			query = query.Where("created_at < ?", endDate)
		}
	}

	// Apply other filters
	if action != "" {
		query = query.Where("action = ?", action)
	}

	if entityType != "" {
		query = query.Where("entity_type = ?", entityType)
	}

	if userIDStr != "" {
		query = query.Where("user_id = ?", userIDStr)
	}

	// Get total count
	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count audit logs"})
		return
	}

	// Get action breakdown
	var actionCounts []struct {
		Action string `json:"action"`
		Count  int64  `json:"count"`
	}
	if err := query.Select("action, COUNT(*) as count").Group("action").Scan(&actionCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get action breakdown"})
		return
	}

	// Convert to map for the response
	actionBreakdown := make(map[string]int64)
	var mostCommonAction string
	var maxActionCount int64
	for _, ac := range actionCounts {
		actionBreakdown[ac.Action] = ac.Count
		if ac.Count > maxActionCount {
			maxActionCount = ac.Count
			mostCommonAction = ac.Action
		}
	}

	// Get entity type breakdown
	var entityCounts []struct {
		EntityType string `json:"entity_type"`
		Count      int64  `json:"count"`
	}
	if err := query.Select("entity_type, COUNT(*) as count").Group("entity_type").Scan(&entityCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get entity breakdown"})
		return
	}

	// Convert to map for the response
	entityBreakdown := make(map[string]int64)
	for _, ec := range entityCounts {
		entityBreakdown[ec.EntityType] = ec.Count
	}

	// Get user breakdown
	var userCounts []struct {
		PerformedBy string `json:"performed_by"`
		Count       int64  `json:"count"`
	}
	if err := query.Select("performed_by, COUNT(*) as count").Group("performed_by").Scan(&userCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user breakdown"})
		return
	}

	// Convert to map for the response
	userBreakdown := make(map[string]int64)
	for _, uc := range userCounts {
		userBreakdown[uc.PerformedBy] = uc.Count
	}

	// Get timeline data - daily counts
	var dailyCounts []struct {
		Date  time.Time `json:"date"`
		Count int64     `json:"count"`
	}

	// Determine time resolution based on date range
	if !startDate.IsZero() && !endDate.IsZero() {
		daysDiff := endDate.Sub(startDate).Hours() / 24
		if daysDiff > 60 {
			// For longer ranges, use monthly aggregation
			// timeSQL = "DATE_TRUNC('month', created_at)"
		} else if daysDiff > 14 {
			// For medium ranges, use weekly aggregation
			// timeSQL = "DATE_TRUNC('week', created_at)"
		}
	}

	timelineQuery := `
		SELECT 
			%s as date, 
			COUNT(*) as count 
		FROM 
			audit_logs 
		WHERE 
			1=1
	`

	// Apply the same filters as the base query
	params := []interface{}{}
	if !startDate.IsZero() {
		timelineQuery += " AND created_at >= ?"
		params = append(params, startDate)
	}
	if !endDate.IsZero() {
		timelineQuery += " AND created_at < ?"
		params = append(params, endDate)
	}
	if action != "" {
		timelineQuery += " AND action = ?"
		params = append(params, action)
	}
	if entityType != "" {
		timelineQuery += " AND entity_type = ?"
		params = append(params, entityType)
	}
	if userIDStr != "" {
		timelineQuery += " AND user_id = ?"
		params = append(params, userIDStr)
	}

	timelineQuery += " GROUP BY date ORDER BY date"

	// Format the SQL with the appropriate time resolution
	// c.JSON(http.StatusOK, gin.H{"TimelineSQL": timelineQuery, "TimeSQL": timeSQL})
	// return;

	// Execute the formatted query
	if err := db.GetDB().Raw(timelineQuery, params...).Scan(&dailyCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get timeline data"})
		return
	}

	// Format dates for the timeline
	timelineData := make([]gin.H, len(dailyCounts))
	for i, dc := range dailyCounts {
		timelineData[i] = gin.H{
			"date":  dc.Date.Format("2006-01-02"),
			"count": dc.Count,
		}
	}

	// Get oldest and newest log dates for summary
	var oldestDate, newestDate time.Time
	if err := db.GetDB().Model(&models.AuditLog{}).Select("MIN(created_at)").Row().Scan(&oldestDate); err != nil {
		oldestDate = time.Time{}
	}
	if err := db.GetDB().Model(&models.AuditLog{}).Select("MAX(created_at)").Row().Scan(&newestDate); err != nil {
		newestDate = time.Now()
	}

	// If no custom date range was provided, use the entire range
	if startDateStr == "" {
		startDate = oldestDate
	}
	if endDateStr == "" {
		endDate = newestDate
	}

	// Return the analytics data
	c.JSON(http.StatusOK, gin.H{
		"actionBreakdown": actionBreakdown,
		"entityBreakdown": entityBreakdown,
		"userBreakdown":   userBreakdown,
		"timelineData":    timelineData,
		"summary": gin.H{
			"totalLogs":        totalCount,
			"startDate":        startDate.Format("2006-01-02"),
			"endDate":          endDate.Format("2006-01-02"),
			"mostCommonAction": mostCommonAction,
		},
	})
}

// GetAuditLogFilterOptions returns available filter options for audit logs
func GetAuditLogFilterOptions(c *gin.Context) {
	var actions, entityTypes []string
	var users []gin.H

	// Get unique actions
	if err := db.GetDB().Model(&models.AuditLog{}).Distinct().Pluck("action", &actions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get action types"})
		return
	}
	sort.Strings(actions)

	// Get unique entity types
	if err := db.GetDB().Model(&models.AuditLog{}).Distinct().Pluck("entity_type", &entityTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get entity types"})
		return
	}
	sort.Strings(entityTypes)

	// Get unique users who performed actions
	var userList []struct {
		PerformedBy string `json:"performed_by"`
		UserID      uint   `json:"user_id"`
		Count       int64  `json:"count"`
	}
	if err := db.GetDB().Model(&models.AuditLog{}).
		Select("performed_by, user_id, COUNT(*) as count").
		Group("performed_by, user_id").
		Order("count DESC").
		Scan(&userList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	// Convert to the format needed for the response
	users = make([]gin.H, len(userList))
	for i, u := range userList {
		users[i] = gin.H{
			"id":    u.UserID,
			"name":  u.PerformedBy,
			"count": u.Count,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"actions":     actions,
		"entityTypes": entityTypes,
		"users":       users,
	})
}

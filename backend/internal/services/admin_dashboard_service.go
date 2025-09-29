package services

import (
	"fmt"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/shared" // Import minimal shared helpers to avoid import cycle
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminDashboardService handles business logic for the admin dashboard
type AdminDashboardService struct {
	db *gorm.DB
}

// NewAdminDashboardService creates a new AdminDashboardService
func NewAdminDashboardService(database *gorm.DB) *AdminDashboardService {
	return &AdminDashboardService{
		db: database,
	}
}

// GetAdminDashboardData retrieves comprehensive admin dashboard data
func (s *AdminDashboardService) GetAdminDashboardData() (gin.H, error) {
	today := time.Now()
	todayStr := today.Format("2006-01-02")

	// Get comprehensive KPIs
	kpis := s.calculateAdminKPIs(todayStr)

	// Get system alerts
	var todayRequests int64
	s.db.Model(&models.HelpRequest{}).
		Where("DATE(created_at) = ?", today.Format("2006-01-02")).
		Count(&todayRequests)

	var assignedShifts int64
	s.db.Model(&models.Shift{}).
		Where("assigned_volunteer_id IS NOT NULL AND date = ?", today.Format("2006-01-02")).
		Count(&assignedShifts)

	var todayShifts int64
	s.db.Model(&models.Shift{}).
		Where("date = ?", today.Format("2006-01-02")).
		Count(&todayShifts)

	var pendingVerifications int64
	s.db.Model(&models.Document{}).
		Where("status = ?", "pending_verification").
		Count(&pendingVerifications)

	// Get total users and active users
	var totalUsers, activeUsers int64
	s.db.Model(&models.User{}).Count(&totalUsers)
	s.db.Model(&models.User{}).Where("status = ?", "active").Count(&activeUsers)

	// Get volunteer stats
	var totalVolunteers, activeVolunteers, pendingVolunteers int64
	s.db.Model(&models.User{}).Where("role = ?", models.RoleVolunteer).Count(&totalVolunteers)
	s.db.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "active").Count(&activeVolunteers)
	s.db.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "pending").Count(&pendingVolunteers)

	// Get help request stats
	var totalHelpRequests int64
	s.db.Model(&models.HelpRequest{}).Count(&totalHelpRequests)

	// Get system uptime (assuming startTime is accessible or passed)
	// For now, hardcode or pass from main
	uptime := time.Since(time.Now().Add(-5 * time.Minute)).Round(time.Second).String() // Placeholder

	alerts := s.generateSystemAlerts(todayRequests, assignedShifts, todayShifts, int(kpis.UrgentNeeds), pendingVerifications)

	// Get recent activity
	recentActivity := s.getRecentSystemActivity()

	// Get capacity warnings
	capacityWarnings := s.getCapacityWarnings()

	// Get volunteer coverage gaps
	coverageGaps := s.getVolunteerCoverageGaps()

	// Get feedback metrics
	var feedbackCount int64
	var averageRating float64

	// Count total feedback
	s.db.Model(&models.Feedback{}).Count(&feedbackCount)

	// Calculate average rating
	var ratingSum struct {
		Total float64
		Count int64
	}
	s.db.Model(&models.Feedback{}).
		Where("rating > 0").
		Select("AVG(rating) as total, COUNT(*) as count").
		Scan(&ratingSum)

	if ratingSum.Count > 0 {
		averageRating = ratingSum.Total
	}

	return gin.H{
		"kpis": gin.H{
			"totalUsers":        totalUsers,
			"activeUsers":       activeUsers,
			"totalVolunteers":   totalVolunteers,
			"activeVolunteers":  activeVolunteers,
			"pendingVolunteers": pendingVolunteers,
			"totalHelpRequests": totalHelpRequests,
			"todayRequests":     todayRequests,
			"resolvedRequests":  kpis.TodayTickets,
			"activeShifts":      todayShifts,
			"totalShifts":       todayShifts,
			"assignedShifts":    assignedShifts,
			"totalDonations":    kpis.MonthlyDonations,
			"urgentNeeds":       kpis.UrgentNeeds,
			"feedbackCount":     feedbackCount,
			"averageRating":     averageRating,
			"systemUptime":      uptime,
		},
		"alerts":           alerts,
		"recentActivity":   recentActivity,
		"capacityWarnings": capacityWarnings,
		"coverageGaps":     coverageGaps,
		"queueStatus":      s.getTicketQueueStatus(),
		"systemHealth":     s.getSystemHealthMetrics(),
	}, nil
}

// AdminKPIs struct (moved from handler)
type AdminKPIs struct {
	TodayRequests        int64   `json:"today_requests"`
	TodayTickets         int64   `json:"today_tickets"`
	PendingRequests      int64   `json:"pending_requests"`
	PendingVerifications int64   `json:"pending_verifications"`
	TodayShifts          int64   `json:"today_shifts"`
	AssignedShifts       int64   `json:"assigned_shifts"`
	UrgentNeeds          int64   `json:"urgent_needs"`
	ActiveVolunteers     int64   `json:"active_volunteers"`
	TotalVisitors        int64   `json:"total_visitors"`
	MonthlyDonations     float64 `json:"monthly_donations"`
}

func (s *AdminDashboardService) calculateAdminKPIs(todayStr string) AdminKPIs {
	var kpis AdminKPIs

	// Daily metrics
	s.db.Model(&models.HelpRequest{}).Where("DATE(created_at) = ?", todayStr).Count(&kpis.TodayRequests)
	s.db.Model(&models.HelpRequest{}).Where("DATE(created_at) = ? AND status = ?",
		todayStr, models.HelpRequestStatusTicketIssued).Count(&kpis.TodayTickets)

	// Pending items
	s.db.Model(&models.HelpRequest{}).Where("status = ?", models.HelpRequestStatusPending).Count(&kpis.PendingRequests)
	s.db.Model(&models.Document{}).Where("status = ?", "pending_verification").Count(&kpis.PendingVerifications)

	// Volunteer metrics
	s.db.Model(&models.Shift{}).Where("DATE(date) = ?", todayStr).Count(&kpis.TodayShifts)
	s.db.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shifts.id = shift_assignments.shift_id").
		Where("DATE(shifts.date) = ? AND shift_assignments.status = ?", todayStr, "Confirmed").
		Count(&kpis.AssignedShifts)

	// General metrics
	kpis.UrgentNeeds = 3 // Placeholder for removed inventory system
	s.db.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleVolunteer, "active").Count(&kpis.ActiveVolunteers)
	s.db.Model(&models.User{}).Where("role = ?", models.RoleVisitor).Count(&kpis.TotalVisitors)

	// Monthly donations
	firstOfMonth := time.Now().AddDate(0, 0, -time.Now().Day()+1)
	s.db.Model(&models.Donation{}).Where("created_at >= ? AND type = ?", firstOfMonth, "monetary").
		Select("COALESCE(SUM(amount), 0)").Scan(&kpis.MonthlyDonations)

	return kpis
}

func (s *AdminDashboardService) generateSystemAlerts(todayRequests, assignedShifts, todayShifts int64, urgentNeeds int, pendingVerifications int64) []gin.H {
	var alerts []gin.H

	if todayRequests > 50 {
		alerts = append(alerts, gin.H{
			"type":    "warning",
			"message": fmt.Sprintf("High volume of requests today: %d", todayRequests),
		})
	}

	coveragePercent := s.calculateCoveragePercentage(assignedShifts, todayShifts)
	if coveragePercent < 80 {
		alerts = append(alerts, gin.H{
			"type":    "error",
			"message": fmt.Sprintf("Low volunteer coverage: %d%%", coveragePercent),
		})
	}

	if urgentNeeds > 3 {
		alerts = append(alerts, gin.H{
			"type":    "warning",
			"message": fmt.Sprintf("%d urgent inventory needs require attention", urgentNeeds),
		})
	}

	if pendingVerifications > 10 {
		alerts = append(alerts, gin.H{
			"type":    "info",
			"message": fmt.Sprintf("%d document verifications pending", pendingVerifications),
		})
	}

	return alerts
}

func (s *AdminDashboardService) calculateCoveragePercentage(assigned, total int64) int {
	if total == 0 {
		return 100
	}
	return int((assigned * 100) / total)
}

func (s *AdminDashboardService) getRecentSystemActivity() []gin.H {
	var activities []gin.H

	// Get recent audit logs
	var auditLogs []models.AuditLog
	if err := s.db.Order("created_at DESC").Limit(10).Find(&auditLogs).Error; err == nil {
		for _, logEntry := range auditLogs { // Renamed 'log' to 'logEntry' to avoid conflict with log package
			activities = append(activities, gin.H{
				"type":         "audit",
				"action":       logEntry.Action,
				"entity_type":  logEntry.EntityType,
				"description":  logEntry.Description,
				"performed_by": logEntry.PerformedBy,
				"timestamp":    logEntry.CreatedAt,
			})
		}
	}

	return activities
}

func (s *AdminDashboardService) getCapacityWarnings() []gin.H {
	var warnings []gin.H

	// Check next 7 days for capacity issues
	for i := 0; i < 7; i++ {
		checkDate := time.Now().AddDate(0, 0, i)
		checkDateStr := checkDate.Format("2006-01-02")

		// Check if it's an operating day
		if !s.isValidVisitDay(checkDateStr, models.CategoryFood) && !s.isValidVisitDay(checkDateStr, models.CategoryGeneral) {
			continue
		}

		// Check food capacity
		var pendingFood int64
		s.db.Model(&models.HelpRequest{}).
			Where("visit_day = ? AND category = ? AND status IN ?",
				checkDateStr, models.CategoryFood,
				[]string{models.HelpRequestStatusPending, models.HelpRequestStatusApproved}).
			Count(&pendingFood)

		foodCapacity := s.getDailyCapacity(checkDateStr, models.CategoryFood)
		if pendingFood > int64(foodCapacity) {
			warnings = append(warnings, gin.H{
				"type":     "overbooked",
				"date":     checkDateStr,
				"category": models.CategoryFood,
				"pending":  pendingFood,
				"capacity": foodCapacity,
				"excess":   pendingFood - int64(foodCapacity),
			})
		}

		// Check general capacity
		var pendingGeneral int64
		s.db.Model(&models.HelpRequest{}).
			Where("visit_day = ? AND category = ? AND status IN ?",
				checkDateStr, models.CategoryGeneral,
				[]string{models.HelpRequestStatusPending, models.HelpRequestStatusApproved}).
			Count(&pendingGeneral)

		generalCapacity := s.getDailyCapacity(checkDateStr, models.CategoryGeneral)
		if pendingGeneral > int64(generalCapacity) {
			warnings = append(warnings, gin.H{
				"type":     "overbooked",
				"date":     checkDateStr,
				"category": models.CategoryGeneral,
				"pending":  pendingGeneral,
				"capacity": generalCapacity,
				"excess":   pendingGeneral - int64(generalCapacity),
			})
		}
	}

	return warnings
}

func (s *AdminDashboardService) getVolunteerCoverageGaps() []gin.H {
	var gaps []gin.H

	// Check next 7 days for volunteer coverage
	for i := 0; i < 7; i++ {
		checkDate := time.Now().AddDate(0, 0, i)
		checkDateStr := checkDate.Format("2006-01-02")

		var totalShifts int64
		var assignedShifts int64

		s.db.Model(&models.Shift{}).Where("DATE(date) = ?", checkDateStr).Count(&totalShifts)
		s.db.Model(&models.Shift{}).Where("DATE(date) = ? AND assigned_volunteer_id IS NOT NULL", checkDateStr).Count(&assignedShifts)

		if totalShifts > 0 {
			coveragePercent := float64(assignedShifts) / float64(totalShifts) * 100
			if coveragePercent < 80 {
				gaps = append(gaps, gin.H{
					"date":             checkDateStr,
					"total_shifts":     totalShifts,
					"assigned_shifts":  assignedShifts,
					"coverage_percent": coveragePercent,
					"gap_count":        totalShifts - assignedShifts,
				})
			}
		}
	}

	return gaps
}

func (s *AdminDashboardService) getTicketQueueStatus() gin.H {
	nextReleaseDate := shared.GetNextTicketReleaseDate()

	var queueCounts struct {
		Food    int64 `json:"food"`
		General int64 `json:"general"`
	}

	// Parse next release date to get the date part
	releaseTime, _ := time.Parse("Monday, January 2, 2006 at 15:04", nextReleaseDate)
	releaseDateStr := releaseTime.Format("2006-01-02")

	s.db.Model(&models.HelpRequest{}).
		Where("visit_day = ? AND category = ? AND status = ?",
			releaseDateStr, models.CategoryFood, models.HelpRequestStatusPending).
		Count(&queueCounts.Food)

	s.db.Model(&models.HelpRequest{}).
		Where("visit_day = ? AND category = ? AND status = ?",
			releaseDateStr, models.CategoryGeneral, models.HelpRequestStatusPending).
		Count(&queueCounts.General)

	return gin.H{
		"next_release":   nextReleaseDate,
		"queue_counts":   queueCounts,
		"total_in_queue": queueCounts.Food + queueCounts.General,
	}
}

func (s *AdminDashboardService) getSystemHealthMetrics() gin.H {
	// Populate system health by delegating to component-level checks so
	// the individual helper methods are referenced and kept in sync.
	return gin.H{
		"database":      s.checkDatabaseHealth(),
		"queues":        s.getQueueHealth(),
		"storage":       s.getStorageHealth(),
		"notifications": s.getNotificationHealth(),
		"user_activity": s.getUserActivityHealth(),
		"system_load":   s.getSystemLoadMetrics(),
		"last_backup":   time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
	}
}

func (s *AdminDashboardService) checkDatabaseHealth() gin.H {
	// Simple database health check
	var count int64
	err := s.db.Model(&models.User{}).Count(&count).Error

	if err != nil {
		return gin.H{
			"status":  "error",
			"message": "Database connection failed",
			"error":   err.Error(),
		}
	}

	return gin.H{
		"status":      "healthy",
		"total_users": count,
		"last_check":  time.Now(),
	}
}

func (s *AdminDashboardService) getQueueHealth() gin.H {
	var pendingCount int64
	s.db.Model(&models.HelpRequest{}).Where("status = ?", models.HelpRequestStatusPending).Count(&pendingCount)

	status := "healthy"
	if pendingCount > 100 {
		status = "warning"
	}
	if pendingCount > 200 {
		status = "error"
	}

	return gin.H{
		"status":           status,
		"pending_requests": pendingCount,
		"processing_rate":  "normal",
	}
}

func (s *AdminDashboardService) getStorageHealth() gin.H {
	// Placeholder for storage health metrics
	return gin.H{
		"status":          "healthy",
		"used_space":      "45%",
		"available_space": "55%",
	}
}

func (s *AdminDashboardService) getNotificationHealth() gin.H {
	// Placeholder for notification system health
	return gin.H{
		"status":               "healthy",
		"email_queue":          0,
		"sms_queue":            0,
		"failed_notifications": 0,
	}
}

func (s *AdminDashboardService) getUserActivityHealth() gin.H {
	// Get recent user activity
	var recentLogins int64
	twentyFourHoursAgo := time.Now().AddDate(0, 0, -1)
	s.db.Model(&models.User{}).Where("last_login > ?", twentyFourHoursAgo).Count(&recentLogins)

	return gin.H{
		"status":          "healthy",
		"recent_logins":   recentLogins,
		"active_sessions": "normal",
	}
}

func (s *AdminDashboardService) getSystemLoadMetrics() gin.H {
	// Placeholder for system load metrics
	return gin.H{
		"status":        "healthy",
		"cpu_usage":     "normal",
		"memory_usage":  "normal",
		"response_time": "good",
	}
}

func (s *AdminDashboardService) getDailyCapacity(visitDay, category string) int {
	visitDate, err := time.Parse("2006-01-02", visitDay)
	if err != nil {
		return 0
	}

	var capacity models.VisitCapacity
	if err := s.db.Where("date = ?", visitDate).First(&capacity).Error; err != nil {
		// Return default capacity if no record exists
		switch category {
		case models.CategoryFood:
			return 50
		case models.CategoryGeneral:
			return 20
		default:
			return 10
		}
	}

	// Calculate available capacity
	switch category {
	case models.CategoryFood:
		return capacity.MaxFoodVisits - capacity.CurrentFoodVisits
	case models.CategoryGeneral:
		return capacity.MaxGeneralVisits - capacity.CurrentGeneralVisits
	default:
		return 0
	}
}

func (s *AdminDashboardService) isValidVisitDay(dateStr, _ string) bool {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return false
	}

	dayOfWeek := date.Weekday()

	// Operating days are Tuesday, Wednesday, Thursday
	return dayOfWeek >= time.Tuesday && dayOfWeek <= time.Thursday
}

// GetGlobalAdminDashboardService returns the global AdminDashboardService instance
var globalAdminDashboardService *AdminDashboardService

func GetGlobalAdminDashboardService() *AdminDashboardService {
	if globalAdminDashboardService == nil {
		globalAdminDashboardService = NewAdminDashboardService(db.DB)
	}
	return globalAdminDashboardService
}

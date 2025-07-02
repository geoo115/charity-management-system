package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"gorm.io/gorm"
)

// AnalyticsService handles analytics and reporting data aggregation
type AnalyticsService struct {
	db           *gorm.DB
	cacheService *CacheService
}

// AnalyticsDashboardMetrics represents overall dashboard metrics
type AnalyticsDashboardMetrics struct {
	Users         UserMetrics         `json:"users"`
	Volunteers    VolunteerMetrics    `json:"volunteers"`
	Visitors      VisitorMetrics      `json:"visitors"`
	Donations     DonationMetrics     `json:"donations"`
	Documents     DocumentMetrics     `json:"documents"`
	Queue         QueueMetrics        `json:"queue"`
	Notifications NotificationMetrics `json:"notifications"`
	System        SystemMetrics       `json:"system"`
	TimeRange     string              `json:"time_range"`
	GeneratedAt   time.Time           `json:"generated_at"`
}

// UserMetrics represents user-related metrics
type UserMetrics struct {
	Total         int64             `json:"total"`
	Active        int64             `json:"active"`
	NewThisMonth  int64             `json:"new_this_month"`
	NewThisWeek   int64             `json:"new_this_week"`
	ByRole        map[string]int    `json:"by_role"`
	GrowthTrend   []TimeSeriesPoint `json:"growth_trend"`
	ActivityTrend []TimeSeriesPoint `json:"activity_trend"`
}

// VolunteerMetrics represents volunteer-specific metrics
type VolunteerMetrics struct {
	Total        int64            `json:"total"`
	Active       int64            `json:"active"`
	Applications ApplicationStats `json:"applications"`
	Shifts       ShiftStats       `json:"shifts"`
	Performance  PerformanceStats `json:"performance"`
	Retention    RetentionStats   `json:"retention"`
}

// VisitorMetrics represents visitor-specific metrics
type VisitorMetrics struct {
	Total        int64             `json:"total"`
	Visits       VisitStats        `json:"visits"`
	HelpRequests HelpRequestStats  `json:"help_requests"`
	Satisfaction SatisfactionStats `json:"satisfaction"`
	Demographics DemographicStats  `json:"demographics"`
}

// DonationMetrics represents donation-related metrics
type DonationMetrics struct {
	Total     float64            `json:"total"`
	Count     int64              `json:"count"`
	ThisMonth float64            `json:"this_month"`
	LastMonth float64            `json:"last_month"`
	ByType    map[string]float64 `json:"by_type"`
	Trend     []TimeSeriesPoint  `json:"trend"`
	TopDonors []DonorInfo        `json:"top_donors"`
	Recurring RecurringStats     `json:"recurring"`
}

// DocumentMetrics represents document-related metrics
type DocumentMetrics struct {
	Total          int64          `json:"total"`
	Pending        int64          `json:"pending"`
	Verified       int64          `json:"verified"`
	Rejected       int64          `json:"rejected"`
	ByType         map[string]int `json:"by_type"`
	ProcessingTime time.Duration  `json:"avg_processing_time"`
}

// QueueMetrics represents queue-related metrics
type QueueMetrics struct {
	CurrentWaiting    int64         `json:"current_waiting"`
	AverageWaitTime   time.Duration `json:"average_wait_time"`
	TotalServedToday  int64         `json:"total_served_today"`
	PeakHours         []int         `json:"peak_hours"`
	ServiceEfficiency float64       `json:"service_efficiency"`
}

// NotificationMetrics represents notification-related metrics
type NotificationMetrics struct {
	SentToday      int64          `json:"sent_today"`
	DeliveryRate   float64        `json:"delivery_rate"`
	ByChannel      map[string]int `json:"by_channel"`
	ByType         map[string]int `json:"by_type"`
	EngagementRate float64        `json:"engagement_rate"`
}

// SystemMetrics represents system performance metrics
type SystemMetrics struct {
	Uptime         time.Duration    `json:"uptime"`
	ActiveSessions int64            `json:"active_sessions"`
	APIRequests    int64            `json:"api_requests_today"`
	ErrorRate      float64          `json:"error_rate"`
	DatabaseHealth string           `json:"database_health"`
	StorageUsage   map[string]int64 `json:"storage_usage"`
}

// Supporting structs
type TimeSeriesPoint struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

type ApplicationStats struct {
	Total    int64 `json:"total"`
	Pending  int64 `json:"pending"`
	Approved int64 `json:"approved"`
	Rejected int64 `json:"rejected"`
}

type ShiftStats struct {
	Scheduled  int64   `json:"scheduled"`
	Completed  int64   `json:"completed"`
	NoShows    int64   `json:"no_shows"`
	Attendance float64 `json:"attendance_rate"`
}

type PerformanceStats struct {
	AverageRating float64 `json:"average_rating"`
	TotalHours    float64 `json:"total_hours"`
	Punctuality   float64 `json:"punctuality_rate"`
}

type RetentionStats struct {
	MonthlyRetention float64 `json:"monthly_retention"`
	AverageStay      float64 `json:"average_stay_months"`
}

type VisitStats struct {
	Total      int64          `json:"total"`
	ThisMonth  int64          `json:"this_month"`
	RepeatRate float64        `json:"repeat_rate"`
	ByPurpose  map[string]int `json:"by_purpose"`
}

type HelpRequestStats struct {
	Total      int64   `json:"total"`
	Pending    int64   `json:"pending"`
	Completed  int64   `json:"completed"`
	Resolution float64 `json:"avg_resolution_hours"`
}

type SatisfactionStats struct {
	AverageRating float64            `json:"average_rating"`
	ByCategory    map[string]float64 `json:"by_category"`
	ResponseRate  float64            `json:"response_rate"`
}

type DemographicStats struct {
	ByAge      map[string]int `json:"by_age"`
	ByGender   map[string]int `json:"by_gender"`
	ByLocation map[string]int `json:"by_location"`
}

type DonorInfo struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
	Count  int     `json:"count"`
}

type RecurringStats struct {
	Count       int64   `json:"count"`
	TotalAmount float64 `json:"total_amount"`
	Retention   float64 `json:"retention_rate"`
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService() *AnalyticsService {
	service := &AnalyticsService{
		db:           db.DB,
		cacheService: GetCacheService(),
	}
	return service
}

// Initialize implements ServiceInterface
func (as *AnalyticsService) Initialize(ctx context.Context) error {
	// Validate database connection
	if as.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// Test database connectivity
	sqlDB, err := as.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	log.Println("Analytics service initialized successfully")
	return nil
}

// Shutdown implements ServiceInterface
func (as *AnalyticsService) Shutdown(ctx context.Context) error {
	log.Println("Analytics service shutdown completed")
	return nil
}

// HealthCheck implements ServiceInterface
func (as *AnalyticsService) HealthCheck(ctx context.Context) error {
	// Check database connectivity
	sqlDB, err := as.db.DB()
	if err != nil {
		return fmt.Errorf("database connection error: %w", err)
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	// Check cache service if available
	if as.cacheService != nil {
		if err := as.cacheService.HealthCheck(); err != nil {
			return fmt.Errorf("cache service health check failed: %w", err)
		}
	}

	return nil
}

// GetDashboardMetrics returns comprehensive dashboard metrics
func (as *AnalyticsService) GetDashboardMetrics(timeRange string) (*AnalyticsDashboardMetrics, error) {
	// Try to get from cache first
	var metrics AnalyticsDashboardMetrics
	cacheKey := fmt.Sprintf("dashboard_metrics_%s", timeRange)

	if err := as.cacheService.Get(cacheKey, &metrics); err == nil {
		return &metrics, nil
	}

	// Calculate date ranges
	endDate := time.Now()
	var startDate time.Time

	switch timeRange {
	case "week":
		startDate = endDate.AddDate(0, 0, -7)
	case "month":
		startDate = endDate.AddDate(0, -1, 0)
	case "quarter":
		startDate = endDate.AddDate(0, -3, 0)
	case "year":
		startDate = endDate.AddDate(-1, 0, 0)
	default:
		startDate = endDate.AddDate(0, -1, 0) // Default to month
		timeRange = "month"
	}

	// Gather all metrics
	userMetrics, err := as.getUserMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting user metrics: %v", err)
		userMetrics = &UserMetrics{}
	}

	volunteerMetrics, err := as.getVolunteerMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting volunteer metrics: %v", err)
		volunteerMetrics = &VolunteerMetrics{}
	}

	visitorMetrics, err := as.getVisitorMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting visitor metrics: %v", err)
		visitorMetrics = &VisitorMetrics{}
	}

	donationMetrics, err := as.getDonationMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting donation metrics: %v", err)
		donationMetrics = &DonationMetrics{}
	}

	documentMetrics, err := as.getDocumentMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting document metrics: %v", err)
		documentMetrics = &DocumentMetrics{}
	}

	queueMetrics, err := as.getQueueMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting queue metrics: %v", err)
		queueMetrics = &QueueMetrics{}
	}

	notificationMetrics, err := as.getNotificationMetrics(startDate, endDate)
	if err != nil {
		log.Printf("Error getting notification metrics: %v", err)
		notificationMetrics = &NotificationMetrics{}
	}

	systemMetrics, err := as.getSystemMetrics()
	if err != nil {
		log.Printf("Error getting system metrics: %v", err)
		systemMetrics = &SystemMetrics{}
	}

	metrics = AnalyticsDashboardMetrics{
		Users:         *userMetrics,
		Volunteers:    *volunteerMetrics,
		Visitors:      *visitorMetrics,
		Donations:     *donationMetrics,
		Documents:     *documentMetrics,
		Queue:         *queueMetrics,
		Notifications: *notificationMetrics,
		System:        *systemMetrics,
		TimeRange:     timeRange,
		GeneratedAt:   time.Now(),
	}

	// Cache the results for 15 minutes
	as.cacheService.Set(cacheKey, metrics, 15*time.Minute)

	return &metrics, nil
}

// getUserMetrics calculates user-related metrics
func (as *AnalyticsService) getUserMetrics(startDate, endDate time.Time) (*UserMetrics, error) {
	metrics := &UserMetrics{
		ByRole: make(map[string]int),
	}

	// Total users
	as.db.Model(&models.User{}).Count(&metrics.Total)

	// Active users (logged in within last 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	as.db.Model(&models.User{}).Where("last_login > ?", thirtyDaysAgo).Count(&metrics.Active)

	// New users this month
	thisMonth := time.Now().Truncate(24*time.Hour).AddDate(0, 0, -time.Now().Day()+1)
	as.db.Model(&models.User{}).Where("created_at >= ?", thisMonth).Count(&metrics.NewThisMonth)

	// New users this week
	thisWeek := time.Now().Truncate(24*time.Hour).AddDate(0, 0, -int(time.Now().Weekday()))
	as.db.Model(&models.User{}).Where("created_at >= ?", thisWeek).Count(&metrics.NewThisWeek)

	// Users by role
	var roleCounts []struct {
		Role  string
		Count int
	}
	as.db.Model(&models.User{}).Select("role, count(*) as count").Group("role").Scan(&roleCounts)
	for _, rc := range roleCounts {
		metrics.ByRole[rc.Role] = rc.Count
	}

	// Growth trend (daily new users for the period)
	metrics.GrowthTrend = as.calculateDailyGrowthTrend(startDate, endDate)

	return metrics, nil
}

// getVolunteerMetrics calculates volunteer-specific metrics
func (as *AnalyticsService) getVolunteerMetrics(startDate, endDate time.Time) (*VolunteerMetrics, error) {
	metrics := &VolunteerMetrics{}

	// Total volunteers
	as.db.Model(&models.User{}).Where("role = ?", "volunteer").Count(&metrics.Total)

	// Active volunteers (with recent shifts)
	as.db.Model(&models.User{}).
		Joins("JOIN shift_assignments ON users.id = shift_assignments.volunteer_id").
		Where("users.role = ? AND shift_assignments.created_at >= ?", "volunteer", time.Now().AddDate(0, -1, 0)).
		Distinct("users.id").
		Count(&metrics.Active)

	// Application stats
	var appStats ApplicationStats
	as.db.Model(&models.VolunteerApplication{}).Count(&appStats.Total)
	as.db.Model(&models.VolunteerApplication{}).Where("status = ?", "pending").Count(&appStats.Pending)
	as.db.Model(&models.VolunteerApplication{}).Where("status = ?", "approved").Count(&appStats.Approved)
	as.db.Model(&models.VolunteerApplication{}).Where("status = ?", "rejected").Count(&appStats.Rejected)
	metrics.Applications = appStats

	// Shift stats
	var shiftStats ShiftStats
	as.db.Model(&models.ShiftAssignment{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&shiftStats.Scheduled)
	as.db.Model(&models.ShiftAssignment{}).Where("status = ? AND created_at BETWEEN ? AND ?", "completed", startDate, endDate).Count(&shiftStats.Completed)
	as.db.Model(&models.VolunteerNoShow{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&shiftStats.NoShows)

	if shiftStats.Scheduled > 0 {
		shiftStats.Attendance = float64(shiftStats.Completed) / float64(shiftStats.Scheduled) * 100
	}
	metrics.Shifts = shiftStats

	return metrics, nil
}

// getVisitorMetrics calculates visitor-specific metrics
func (as *AnalyticsService) getVisitorMetrics(startDate, endDate time.Time) (*VisitorMetrics, error) {
	metrics := &VisitorMetrics{}

	// Total visitors
	as.db.Model(&models.User{}).Where("role = ?", "visitor").Count(&metrics.Total)

	// Visit stats
	var visitStats VisitStats
	as.db.Model(&models.Visit{}).Count(&visitStats.Total)
	as.db.Model(&models.Visit{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&visitStats.ThisMonth)

	// Calculate repeat visitor rate
	var uniqueVisitors, totalVisits int64
	as.db.Model(&models.Visit{}).Distinct("visitor_id").Count(&uniqueVisitors)
	as.db.Model(&models.Visit{}).Count(&totalVisits)
	if uniqueVisitors > 0 {
		visitStats.RepeatRate = (float64(totalVisits) - float64(uniqueVisitors)) / float64(uniqueVisitors) * 100
	}

	metrics.Visits = visitStats

	// Help request stats
	var helpStats HelpRequestStats
	as.db.Model(&models.HelpRequest{}).Count(&helpStats.Total)
	as.db.Model(&models.HelpRequest{}).Where("status = ?", "pending").Count(&helpStats.Pending)
	as.db.Model(&models.HelpRequest{}).Where("status = ?", "completed").Count(&helpStats.Completed)
	metrics.HelpRequests = helpStats

	return metrics, nil
}

// getDonationMetrics calculates donation-related metrics
func (as *AnalyticsService) getDonationMetrics(startDate, endDate time.Time) (*DonationMetrics, error) {
	metrics := &DonationMetrics{
		ByType: make(map[string]float64),
	}

	// Total donations
	var totalAmount float64
	as.db.Model(&models.Donation{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalAmount)
	metrics.Total = totalAmount

	// Count of donations
	as.db.Model(&models.Donation{}).Count(&metrics.Count)

	// This month's donations
	thisMonth := time.Now().Truncate(24*time.Hour).AddDate(0, 0, -time.Now().Day()+1)
	var thisMonthAmount float64
	as.db.Model(&models.Donation{}).Where("created_at >= ?", thisMonth).Select("COALESCE(SUM(amount), 0)").Scan(&thisMonthAmount)
	metrics.ThisMonth = thisMonthAmount

	// Last month's donations
	lastMonth := thisMonth.AddDate(0, -1, 0)
	var lastMonthAmount float64
	as.db.Model(&models.Donation{}).Where("created_at BETWEEN ? AND ?", lastMonth, thisMonth).Select("COALESCE(SUM(amount), 0)").Scan(&lastMonthAmount)
	metrics.LastMonth = lastMonthAmount

	// Donations by type
	var typeCounts []struct {
		Type   string
		Amount float64
	}
	as.db.Model(&models.Donation{}).Select("type, COALESCE(SUM(amount), 0) as amount").Group("type").Scan(&typeCounts)
	for _, tc := range typeCounts {
		metrics.ByType[tc.Type] = tc.Amount
	}

	return metrics, nil
}

// getDocumentMetrics calculates document-related metrics
func (as *AnalyticsService) getDocumentMetrics(startDate, endDate time.Time) (*DocumentMetrics, error) {
	metrics := &DocumentMetrics{
		ByType: make(map[string]int),
	}

	// Total documents
	as.db.Model(&models.Document{}).Count(&metrics.Total)

	// Documents by status
	as.db.Model(&models.Document{}).Where("status = ?", "pending").Count(&metrics.Pending)
	as.db.Model(&models.Document{}).Where("status = ?", "verified").Count(&metrics.Verified)
	as.db.Model(&models.Document{}).Where("status = ?", "rejected").Count(&metrics.Rejected)

	// Documents by type
	var typeCounts []struct {
		Type  string
		Count int
	}
	as.db.Model(&models.Document{}).Select("type, count(*) as count").Group("type").Scan(&typeCounts)
	for _, tc := range typeCounts {
		metrics.ByType[tc.Type] = tc.Count
	}

	return metrics, nil
}

// getQueueMetrics calculates queue-related metrics
func (as *AnalyticsService) getQueueMetrics(startDate, endDate time.Time) (*QueueMetrics, error) {
	metrics := &QueueMetrics{}

	// Current waiting
	as.db.Model(&models.QueueEntry{}).Where("status = ?", "waiting").Count(&metrics.CurrentWaiting)

	// Total served today
	today := time.Now().Truncate(24 * time.Hour)
	as.db.Model(&models.QueueEntry{}).Where("status = ? AND completed_at >= ?", "completed", today).Count(&metrics.TotalServedToday)

	// Calculate average wait time
	var completedEntries []models.QueueEntry
	as.db.Where("status = ? AND completed_at BETWEEN ? AND ? AND served_at IS NOT NULL", "completed", startDate, endDate).Find(&completedEntries)

	if len(completedEntries) > 0 {
		var totalWait time.Duration
		for _, entry := range completedEntries {
			if entry.ServedAt != nil {
				totalWait += entry.ServedAt.Sub(entry.JoinedAt)
			}
		}
		metrics.AverageWaitTime = totalWait / time.Duration(len(completedEntries))
	}

	return metrics, nil
}

// getNotificationMetrics calculates notification-related metrics
func (as *AnalyticsService) getNotificationMetrics(startDate, endDate time.Time) (*NotificationMetrics, error) {
	metrics := &NotificationMetrics{
		ByChannel: make(map[string]int),
		ByType:    make(map[string]int),
	}

	// Notifications sent today
	today := time.Now().Truncate(24 * time.Hour)
	as.db.Model(&models.NotificationLog{}).Where("created_at >= ?", today).Count(&metrics.SentToday)

	// Calculate delivery rate
	var totalSent, delivered int64
	as.db.Model(&models.NotificationLog{}).Where("created_at BETWEEN ? AND ?", startDate, endDate).Count(&totalSent)
	as.db.Model(&models.NotificationLog{}).Where("status = ? AND created_at BETWEEN ? AND ?", "delivered", startDate, endDate).Count(&delivered)

	if totalSent > 0 {
		metrics.DeliveryRate = float64(delivered) / float64(totalSent) * 100
	}

	return metrics, nil
}

// getSystemMetrics calculates system performance metrics
func (as *AnalyticsService) getSystemMetrics() (*SystemMetrics, error) {
	metrics := &SystemMetrics{
		StorageUsage: make(map[string]int64),
	}

	// Database health check
	if err := as.db.Exec("SELECT 1").Error; err != nil {
		metrics.DatabaseHealth = "unhealthy"
	} else {
		metrics.DatabaseHealth = "healthy"
	}

	// Get file upload service for storage stats
	fileService := GetGlobalFileUploadService()
	if storageStats, err := fileService.GetStorageStats(); err == nil {
		if totalSize, ok := storageStats["total_size"].(int64); ok {
			metrics.StorageUsage["total"] = totalSize
		}
	}

	return metrics, nil
}

// calculateDailyGrowthTrend calculates daily user growth trend
func (as *AnalyticsService) calculateDailyGrowthTrend(startDate, endDate time.Time) []TimeSeriesPoint {
	var points []TimeSeriesPoint

	for d := startDate; d.Before(endDate); d = d.AddDate(0, 0, 1) {
		var count int64
		nextDay := d.AddDate(0, 0, 1)
		as.db.Model(&models.User{}).Where("created_at BETWEEN ? AND ?", d, nextDay).Count(&count)

		points = append(points, TimeSeriesPoint{
			Date:  d,
			Value: float64(count),
		})
	}

	return points
}

// GetUserAnalytics returns analytics for a specific user
func (as *AnalyticsService) GetUserAnalytics(userID uint, timeRange string) (map[string]interface{}, error) {
	analytics := make(map[string]interface{})

	var user models.User
	if err := as.db.First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Calculate date range
	endDate := time.Now()
	var startDate time.Time
	switch timeRange {
	case "week":
		startDate = endDate.AddDate(0, 0, -7)
	case "month":
		startDate = endDate.AddDate(0, -1, 0)
	case "year":
		startDate = endDate.AddDate(-1, 0, 0)
	default:
		startDate = endDate.AddDate(0, -1, 0)
	}

	analytics["user_id"] = userID
	analytics["role"] = user.Role
	analytics["time_range"] = timeRange

	// Role-specific analytics
	switch user.Role {
	case "volunteer":
		analytics["volunteer_stats"] = as.getVolunteerUserStats(userID, startDate, endDate)
	case "visitor":
		analytics["visitor_stats"] = as.getVisitorUserStats(userID, startDate, endDate)
	case "donor":
		analytics["donor_stats"] = as.getDonorUserStats(userID, startDate, endDate)
	}

	return analytics, nil
}

// Helper methods for user-specific analytics
func (as *AnalyticsService) getVolunteerUserStats(userID uint, startDate, endDate time.Time) map[string]interface{} {
	stats := make(map[string]interface{})

	// Shift statistics
	var totalShifts, completedShifts int64
	as.db.Model(&models.ShiftAssignment{}).Where("volunteer_id = ?", userID).Count(&totalShifts)
	as.db.Model(&models.ShiftAssignment{}).Where("volunteer_id = ? AND status = ?", userID, "completed").Count(&completedShifts)

	stats["total_shifts"] = totalShifts
	stats["completed_shifts"] = completedShifts

	if totalShifts > 0 {
		stats["completion_rate"] = float64(completedShifts) / float64(totalShifts) * 100
	}

	return stats
}

func (as *AnalyticsService) getVisitorUserStats(userID uint, startDate, endDate time.Time) map[string]interface{} {
	stats := make(map[string]interface{})

	// Visit statistics
	var totalVisits int64
	as.db.Model(&models.Visit{}).Where("visitor_id = ?", userID).Count(&totalVisits)
	stats["total_visits"] = totalVisits

	// Help request statistics
	var totalRequests, completedRequests int64
	as.db.Model(&models.HelpRequest{}).Where("visitor_id = ?", userID).Count(&totalRequests)
	as.db.Model(&models.HelpRequest{}).Where("visitor_id = ? AND status = ?", userID, "completed").Count(&completedRequests)

	stats["total_help_requests"] = totalRequests
	stats["completed_help_requests"] = completedRequests

	return stats
}

func (as *AnalyticsService) getDonorUserStats(userID uint, startDate, endDate time.Time) map[string]interface{} {
	stats := make(map[string]interface{})

	// Donation statistics
	var totalDonations int64
	var totalAmount float64
	as.db.Model(&models.Donation{}).Where("donor_id = ?", userID).Count(&totalDonations)
	as.db.Model(&models.Donation{}).Where("donor_id = ?", userID).Select("COALESCE(SUM(amount), 0)").Scan(&totalAmount)

	stats["total_donations"] = totalDonations
	stats["total_amount"] = totalAmount

	return stats
}

// GetGlobalAnalyticsService returns the global analytics service instance
var globalAnalyticsService *AnalyticsService

func GetGlobalAnalyticsService() *AnalyticsService {
	if globalAnalyticsService == nil {
		globalAnalyticsService = NewAnalyticsService()
	}
	return globalAnalyticsService
}

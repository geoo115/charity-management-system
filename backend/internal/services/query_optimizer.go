package services

import (
	"context"
	"log"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// QueryOptimizer provides optimized database queries for high-performance endpoints.
// Use this struct to encapsulate all query optimizations and performance improvements.
type QueryOptimizer struct {
	db *gorm.DB
}

// NewQueryOptimizer creates a new query optimizer instance.
func NewQueryOptimizer() *QueryOptimizer {
	return &QueryOptimizer{
		db: db.GetDB(),
	}
}

// OptimizedVolunteerSearch provides optimized volunteer search with skill matching and availability filtering.
func (qo *QueryOptimizer) OptimizedVolunteerSearch(params VolunteerSearchParams) ([]VolunteerSearchResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := `
		WITH skill_matches AS (
			SELECT 
				u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
				vp.skills, vp.availability,
				CASE 
					WHEN vp.skills IS NULL OR $2::text[] IS NULL THEN 0
					ELSE array_length(array(
						SELECT unnest(string_to_array(vp.skills, ',')) 
						INTERSECT 
						SELECT unnest($2::text[])
					), 1)
				END as skill_match_count
			FROM users u
			LEFT JOIN volunteer_profiles vp ON u.id = vp.user_id
			WHERE u.role = $1
			  AND u.status = 'active'
			  AND ($3::text IS NULL OR u.status = $3)
			  AND ($4::text IS NULL OR 
				   u.first_name ILIKE '%' || $4 || '%' OR 
				   u.last_name ILIKE '%' || $4 || '%' OR 
				   u.email ILIKE '%' || $4 || '%')
		),
		conflict_check AS (
			SELECT DISTINCT sa.user_id
			FROM shift_assignments sa
			JOIN shifts s ON sa.shift_id = s.id
			WHERE ($5::date IS NULL OR s.date = $5::date)
			  AND sa.status IN ('confirmed', 'checked_in')
		)
		SELECT 
			sm.id, sm.first_name, sm.last_name, sm.email, sm.phone,
			sm.skills, sm.availability,
			sm.skill_match_count,
			CASE WHEN cc.user_id IS NOT NULL THEN true ELSE false END as has_conflict
		FROM skill_matches sm
		LEFT JOIN conflict_check cc ON sm.id = cc.user_id
		ORDER BY 
			sm.skill_match_count DESC,
			sm.first_name ASC
		LIMIT $6;
	`

	var results []VolunteerSearchResult
	err := qo.db.WithContext(ctx).Raw(query,
		models.RoleVolunteer,
		params.Skills,
		params.Status,
		params.Search,
		params.Date,
		params.Limit,
	).Scan(&results).Error

	if err != nil {
		log.Printf("[OptimizedVolunteerSearch] error: %v", err)
		return nil, err
	}

	return results, nil
}

// BulkVolunteerAssignment performs optimized bulk assignment of volunteers to shifts.
func (qo *QueryOptimizer) BulkVolunteerAssignment(assignments []BulkAssignmentRequest) (*BulkAssignmentResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	tx := qo.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer tx.Rollback()

	result := &BulkAssignmentResult{
		Successful: make([]uint, 0),
		Failed:     make([]FailedAssignment, 0),
	}

	// Prepare bulk insert statement for shift assignments
	batchSize := 100
	for i := 0; i < len(assignments); i += batchSize {
		end := i + batchSize
		if end > len(assignments) {
			end = len(assignments)
		}

		batch := assignments[i:end]
		if err := qo.processBulkAssignmentBatch(tx, batch, result); err != nil {
			log.Printf("[BulkVolunteerAssignment] batch error: %v", err)
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return result, nil
}

// GetVolunteerPerformanceMetrics provides optimized volunteer performance analytics
func (qo *QueryOptimizer) GetVolunteerPerformanceMetrics(volunteerID uint, timeRange string) (*VolunteerPerformanceMetrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var startDate time.Time
	now := time.Now()

	switch timeRange {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	case "quarter":
		startDate = now.AddDate(0, -3, 0)
	case "year":
		startDate = now.AddDate(-1, 0, 0)
	default:
		startDate = now.AddDate(0, -3, 0) // Default to 3 months
	}

	query := `
		WITH volunteer_stats AS (
			SELECT 
				COUNT(CASE WHEN sa.status = 'completed' THEN 1 END) as completed_shifts,
				COUNT(CASE WHEN sa.status = 'cancelled' THEN 1 END) as cancelled_shifts,
				COUNT(CASE WHEN sa.status = 'no_show' THEN 1 END) as no_shows,
				COALESCE(SUM(
					CASE WHEN sa.status = 'completed' 
					THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 
					ELSE 0 END
				), 0) as total_hours
			FROM shift_assignments sa
			JOIN shifts s ON sa.shift_id = s.id
			WHERE sa.user_id = $1
			  AND sa.created_at >= $2
		)
		SELECT 
			vs.completed_shifts,
			vs.cancelled_shifts,
			vs.no_shows,
			vs.total_hours
		FROM volunteer_stats vs;
	`

	var metrics VolunteerPerformanceMetrics
	err := qo.db.WithContext(ctx).Raw(query, volunteerID, startDate).Scan(&metrics).Error

	if err != nil {
		log.Printf("GetVolunteerPerformanceMetrics error: %v", err)
		return nil, err
	}

	return &metrics, nil
}

// GetDashboardMetrics provides optimized dashboard statistics
func (qo *QueryOptimizer) GetDashboardMetrics(userRole string, timeRange string) (*DashboardMetrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var startDate time.Time
	now := time.Now()

	switch timeRange {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "month":
		startDate = now.AddDate(0, -1, 0)
	case "quarter":
		startDate = now.AddDate(0, -3, 0)
	default:
		startDate = now.AddDate(0, -1, 0) // Default to 1 month
	}

	// Single optimized query for multiple metrics
	query := `
		SELECT 
			COUNT(DISTINCT CASE WHEN u.role = 'volunteer' AND u.status = 'active' THEN u.id END) as active_volunteers,
			COUNT(DISTINCT CASE WHEN u.role = 'volunteer' AND u.status = 'pending' THEN u.id END) as pending_volunteers,
			COUNT(DISTINCT CASE WHEN s.date >= CURRENT_DATE THEN s.id END) as upcoming_shifts,
			COUNT(DISTINCT CASE WHEN sa.status = 'completed' AND sa.created_at >= $1 THEN sa.id END) as completed_shifts,
			COALESCE(SUM(
				CASE WHEN sa.status = 'completed' AND sa.created_at >= $1
				THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 
				ELSE 0 END
			), 0) as total_volunteer_hours
		FROM users u
		LEFT JOIN shift_assignments sa ON u.id = sa.user_id
		LEFT JOIN shifts s ON sa.shift_id = s.id;
	`

	var metrics DashboardMetrics
	err := qo.db.WithContext(ctx).Raw(query, startDate).Scan(&metrics).Error

	if err != nil {
		log.Printf("GetDashboardMetrics error: %v", err)
		return nil, err
	}

	return &metrics, nil
}

// processBulkAssignmentBatch processes a batch of volunteer assignments
func (qo *QueryOptimizer) processBulkAssignmentBatch(tx *gorm.DB, batch []BulkAssignmentRequest, result *BulkAssignmentResult) error {
	for _, assignment := range batch {
		// Validate shift availability
		var shift models.Shift
		if err := tx.First(&shift, assignment.ShiftID).Error; err != nil {
			result.Failed = append(result.Failed, FailedAssignment{
				ShiftID:     assignment.ShiftID,
				VolunteerID: assignment.VolunteerID,
				Reason:      "Shift not found",
			})
			continue
		}

		if shift.AssignedVolunteerID != nil {
			result.Failed = append(result.Failed, FailedAssignment{
				ShiftID:     assignment.ShiftID,
				VolunteerID: assignment.VolunteerID,
				Reason:      "Shift already assigned",
			})
			continue
		}

		// Check for conflicts
		var conflictCount int64
		tx.Model(&models.ShiftAssignment{}).
			Joins("JOIN shifts ON shift_assignments.shift_id = shifts.id").
			Where("shift_assignments.user_id = ? AND shifts.date = ? AND shift_assignments.status IN (?)",
				assignment.VolunteerID, shift.Date, []string{"confirmed", "checked_in"}).
			Count(&conflictCount)

		if conflictCount > 0 {
			result.Failed = append(result.Failed, FailedAssignment{
				ShiftID:     assignment.ShiftID,
				VolunteerID: assignment.VolunteerID,
				Reason:      "Volunteer has conflicting shift",
			})
			continue
		}

		// Create assignment
		shiftAssignment := models.ShiftAssignment{
			ShiftID:    assignment.ShiftID,
			UserID:     assignment.VolunteerID,
			Status:     "confirmed",
			AssignedBy: &assignment.AssignedBy,
			CreatedAt:  time.Now(),
		}

		if err := tx.Create(&shiftAssignment).Error; err != nil {
			result.Failed = append(result.Failed, FailedAssignment{
				ShiftID:     assignment.ShiftID,
				VolunteerID: assignment.VolunteerID,
				Reason:      "Database error",
			})
			continue
		}

		// Update shift assignment
		shift.AssignedVolunteerID = &assignment.VolunteerID
		if err := tx.Save(&shift).Error; err != nil {
			result.Failed = append(result.Failed, FailedAssignment{
				ShiftID:     assignment.ShiftID,
				VolunteerID: assignment.VolunteerID,
				Reason:      "Failed to update shift",
			})
			continue
		}

		result.Successful = append(result.Successful, assignment.ShiftID)
	}

	return nil
}

// OptimizedShiftHistory provides paginated shift history with efficient queries
func (qo *QueryOptimizer) OptimizedShiftHistory(volunteerID uint, page, pageSize int) (*ShiftHistoryResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	offset := (page - 1) * pageSize

	// Get total count and paginated results in a single transaction
	var total int64
	var shifts []ShiftHistoryItem

	// Count query
	countQuery := `
		SELECT COUNT(*)
		FROM shift_assignments sa
		JOIN shifts s ON sa.shift_id = s.id
		WHERE sa.user_id = ?;
	`

	if err := qo.db.WithContext(ctx).Raw(countQuery, volunteerID).Scan(&total).Error; err != nil {
		return nil, err
	}

	// Data query with optimized joins
	dataQuery := `
		SELECT 
			s.id, s.date, s.start_time, s.end_time, s.location, s.role, s.description,
			sa.status, sa.created_at as assigned_at,
			EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 as hours
		FROM shift_assignments sa
		JOIN shifts s ON sa.shift_id = s.id
		WHERE sa.user_id = ?
		ORDER BY s.date DESC, s.start_time DESC
		LIMIT ? OFFSET ?;
	`

	if err := qo.db.WithContext(ctx).Raw(dataQuery, volunteerID, pageSize, offset).Scan(&shifts).Error; err != nil {
		return nil, err
	}

	return &ShiftHistoryResult{
		Shifts:     shifts,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: (total + int64(pageSize) - 1) / int64(pageSize),
	}, nil
}

// Data transfer objects
type VolunteerSearchParams struct {
	Skills []string   `json:"skills"`
	Status string     `json:"status"`
	Search string     `json:"search"`
	Date   *time.Time `json:"date"`
	Limit  int        `json:"limit"`
}

type VolunteerSearchResult struct {
	ID              uint   `json:"id"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Skills          string `json:"skills"`
	Availability    string `json:"availability"`
	SkillMatchCount int    `json:"skill_match_count"`
	HasConflict     bool   `json:"has_conflict"`
}

type BulkAssignmentRequest struct {
	ShiftID     uint `json:"shift_id"`
	VolunteerID uint `json:"volunteer_id"`
	AssignedBy  uint `json:"assigned_by"`
}

type BulkAssignmentResult struct {
	Successful []uint             `json:"successful"`
	Failed     []FailedAssignment `json:"failed"`
}

type FailedAssignment struct {
	ShiftID     uint   `json:"shift_id"`
	VolunteerID uint   `json:"volunteer_id"`
	Reason      string `json:"reason"`
}

type VolunteerPerformanceMetrics struct {
	CompletedShifts int64   `json:"completed_shifts"`
	CancelledShifts int64   `json:"cancelled_shifts"`
	NoShows         int64   `json:"no_shows"`
	TotalHours      float64 `json:"total_hours"`
}

type DashboardMetrics struct {
	ActiveVolunteers    int64   `json:"active_volunteers"`
	PendingVolunteers   int64   `json:"pending_volunteers"`
	UpcomingShifts      int64   `json:"upcoming_shifts"`
	CompletedShifts     int64   `json:"completed_shifts"`
	TotalVolunteerHours float64 `json:"total_volunteer_hours"`
}

type ShiftHistoryItem struct {
	ID          uint      `json:"id"`
	Date        time.Time `json:"date"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Location    string    `json:"location"`
	Role        string    `json:"role"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	AssignedAt  time.Time `json:"assigned_at"`
	Hours       float64   `json:"hours"`
}

type ShiftHistoryResult struct {
	Shifts     []ShiftHistoryItem `json:"shifts"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int64              `json:"total_pages"`
}

// OptimizedQueryMiddleware provides query optimization context
func OptimizedQueryMiddleware() gin.HandlerFunc {
	optimizer := NewQueryOptimizer()

	return func(c *gin.Context) {
		c.Set("queryOptimizer", optimizer)
		c.Next()
	}
}

// GetQueryOptimizer retrieves the query optimizer from context
func GetQueryOptimizer(c *gin.Context) *QueryOptimizer {
	if optimizer, exists := c.Get("queryOptimizer"); exists {
		return optimizer.(*QueryOptimizer)
	}
	return NewQueryOptimizer()
}

// Stub: GetVolunteerProfile returns nil for now
func (qo *QueryOptimizer) GetVolunteerProfile(volunteerID uint) (interface{}, error) {
	return nil, nil
}

// Stub: GetAvailableShifts returns nil for now
func (qo *QueryOptimizer) GetAvailableShifts(date string, page, limit int) (interface{}, error) {
	return nil, nil
}

// Stub: GetAdminDashboardMetrics returns nil for now
func (qo *QueryOptimizer) GetAdminDashboardMetrics(timeRange string) (interface{}, error) {
	return nil, nil
}

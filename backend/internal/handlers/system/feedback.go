package system

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
)

// FeedbackSubmissionRequest represents the request payload for submitting feedback
type FeedbackSubmissionRequest struct {
	VisitID             uint   `json:"visitId" binding:"required"`
	OverallRating       int    `json:"overallRating" binding:"required,min=1,max=5"`
	StaffHelpfulness    int    `json:"staffHelpfulness" binding:"required,min=1,max=5"`
	WaitTimeRating      int    `json:"waitTimeRating" binding:"required,min=1,max=5"`
	FacilityRating      int    `json:"facilityRating" binding:"required,min=1,max=5"`
	ServiceSpeedRating  int    `json:"serviceSpeedRating" binding:"required,min=1,max=5"`
	FoodQualityRating   *int   `json:"foodQualityRating" binding:"omitempty,min=1,max=5"`
	ServiceCategory     string `json:"serviceCategory"`
	PositiveComments    string `json:"positiveComments"`
	AreasForImprovement string `json:"areasForImprovement"`
	Suggestions         string `json:"suggestions"`
	WouldRecommend      bool   `json:"wouldRecommend"`
	FeltWelcomed        bool   `json:"feltWelcomed"`
	NeedsWereMet        bool   `json:"needsWereMet"`
}

// FeedbackUpdateRequest represents the request payload for updating feedback status
type FeedbackUpdateRequest struct {
	ReviewStatus  string `json:"review_status" binding:"required,oneof=pending reviewed responded escalated resolved"`
	AdminResponse string `json:"admin_response"`
	AdminNotes    string `json:"admin_notes"`
	Priority      string `json:"priority" binding:"omitempty,oneof=low normal high critical"`
}

// BulkResponseRequest represents the request payload for bulk responding to feedback
type BulkResponseRequest struct {
	FeedbackIDs   []uint `json:"feedback_ids" binding:"required"`
	ReviewStatus  string `json:"review_status" binding:"required,oneof=reviewed responded resolved"`
	AdminResponse string `json:"admin_response"`
	AdminNotes    string `json:"admin_notes"`
}

// DailyTrend represents daily feedback trend data
type DailyTrend struct {
	Date          string  `json:"date"`
	Count         int     `json:"count"`
	AverageRating float64 `json:"averageRating"`
}

// FeedbackAnalytics represents comprehensive feedback analytics
type FeedbackAnalytics struct {
	Overview struct {
		TotalFeedback         int      `json:"totalFeedback"`
		AvgOverallRating      float64  `json:"avgOverallRating"`
		AvgStaffRating        float64  `json:"avgStaffRating"`
		AvgWaitTimeRating     float64  `json:"avgWaitTimeRating"`
		AvgFacilityRating     float64  `json:"avgFacilityRating"`
		AvgServiceSpeedRating float64  `json:"avgServiceSpeedRating"`
		AvgFoodQualityRating  *float64 `json:"avgFoodQualityRating"`
	} `json:"overview"`
	ExperienceMetrics struct {
		WouldRecommendPercentage float64 `json:"wouldRecommendPercentage"`
		FeltWelcomedPercentage   float64 `json:"feltWelcomedPercentage"`
		NeedsMetPercentage       float64 `json:"needsMetPercentage"`
	} `json:"experienceMetrics"`
	CategoryBreakdown map[string]struct {
		Count         int     `json:"count"`
		AverageRating float64 `json:"averageRating"`
	} `json:"categoryBreakdown"`
	ReviewStatusBreakdown map[string]int         `json:"reviewStatusBreakdown"`
	PriorityFeedback      []models.VisitFeedback `json:"priorityFeedback"`
	DailyTrends           []DailyTrend           `json:"dailyTrends"`
}

// SubmitVisitFeedback handles POST /api/v1/visits/feedback
func SubmitVisitFeedback(c *gin.Context) {
	var req FeedbackSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Verify the visit belongs to the authenticated user
	var visit models.Visit
	if err := db.DB.Where("id = ? AND visitor_id = ?", req.VisitID, userID).First(&visit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit not found or access denied"})
		return
	}

	// Check if feedback already exists for this visit
	var existingFeedback models.VisitFeedback
	if err := db.DB.Where("visit_id = ? AND visitor_id = ?", req.VisitID, userID).First(&existingFeedback).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Feedback already exists for this visit"})
		return
	}

	// Create the feedback record
	feedback := models.VisitFeedback{
		VisitorID:           userID.(uint),
		VisitID:             req.VisitID,
		OverallRating:       req.OverallRating,
		StaffHelpfulness:    req.StaffHelpfulness,
		WaitTimeRating:      req.WaitTimeRating,
		FacilityRating:      req.FacilityRating,
		ServiceSpeedRating:  req.ServiceSpeedRating,
		FoodQualityRating:   req.FoodQualityRating,
		ServiceCategory:     req.ServiceCategory,
		PositiveComments:    req.PositiveComments,
		AreasForImprovement: req.AreasForImprovement,
		Suggestions:         req.Suggestions,
		WouldRecommend:      req.WouldRecommend,
		FeelWelcomed:        req.FeltWelcomed,
		NeedsWereMet:        req.NeedsWereMet,
		Status:              "submitted",
		VisitDate:           visit.CheckInTime,
		IsAnonymous:         false,
		AllowFollowUp:       true,
	}

	// Save to database
	if err := db.DB.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save feedback"})
		return
	}

	// Send notification to admin team for review (async)
	go func() {
		var admins []models.User
		db.DB.Where("role = ?", "Admin").Find(&admins)

		for _, admin := range admins {
			notification := models.Notification{
				UserID:    admin.ID,
				Type:      "feedback_submitted",
				Title:     "New Feedback Submitted",
				Message:   "A new feedback has been submitted and requires review",
				Channel:   "system",
				Read:      false,
				CreatedAt: time.Now(),
			}
			db.DB.Create(&notification)
		}
	}()

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"message":  "Thank you for your feedback! Your input helps us improve our services.",
		"feedback": feedback,
	})
}

// GetVisitFeedback handles GET /api/v1/visits/:visit_id/feedback
func GetVisitFeedback(c *gin.Context) {
	visitID := c.Param("visit_id")
	id, err := strconv.ParseUint(visitID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid visit ID"})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user role for access control
	userRole, _ := c.Get("userRole")

	// Build query based on user role
	var feedback models.VisitFeedback
	query := db.DB.Where("visit_id = ?", id)

	// Non-admin users can only access their own feedback
	if userRole != "Admin" && userRole != "SuperAdmin" {
		query = query.Where("visitor_id = ?", userID)
	}

	if err := query.First(&feedback).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"feedback": feedback,
	})
}

// GetAllFeedback handles GET /admin/feedback (Admin only)
func GetAllFeedback(c *gin.Context) {
	// Parse query parameters for filtering
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	rating := c.Query("rating")
	category := c.Query("category")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build query with filters
	query := db.DB.Model(&models.VisitFeedback{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if rating != "" {
		r, err := strconv.Atoi(rating)
		if err == nil {
			query = query.Where("overall_rating = ?", r)
		}
	}
	if category != "" {
		query = query.Where("service_category = ?", category)
	}
	if fromDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", parsedDate)
		}
	}
	if toDate != "" {
		if parsedDate, err := time.Parse("2006-01-02", toDate); err == nil {
			// Add one day to include the entire end date
			endDate := parsedDate.AddDate(0, 0, 1)
			query = query.Where("created_at < ?", endDate)
		}
	}

	// Count total filtered records
	var total int64
	query.Count(&total)

	// Get paginated feedback with preloaded data
	var allFeedback []models.VisitFeedback
	if err := query.Preload("Visitor").
		Preload("Visit").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&allFeedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve feedback"})
		return
	}

	// Calculate summary statistics
	var avgRating sql.NullFloat64
	var pendingCount int64

	db.DB.Model(&models.VisitFeedback{}).Select("AVG(overall_rating)").Scan(&avgRating)
	db.DB.Model(&models.VisitFeedback{}).Where("status = ?", "submitted").Count(&pendingCount)

	// Convert NullFloat64 to regular float64, defaulting to 0.0 if NULL
	averageRating := 0.0
	if avgRating.Valid {
		averageRating = avgRating.Float64
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	c.JSON(http.StatusOK, gin.H{
		"feedback": allFeedback,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": totalPages,
		},
		"summary": gin.H{
			"averageRating": averageRating,
			"totalFeedback": total,
			"pendingReview": pendingCount,
		},
		"filters": gin.H{
			"status":   status,
			"rating":   rating,
			"category": category,
			"fromDate": fromDate,
			"toDate":   toDate,
		},
	})
}

// UpdateFeedbackReviewStatus handles PUT /admin/feedback/:feedback_id/status
func UpdateFeedbackReviewStatus(c *gin.Context) {
	feedbackID := c.Param("feedback_id")
	id, err := strconv.ParseUint(feedbackID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var req FeedbackUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Get admin user ID from context for audit trail
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
		return
	}

	// Find the feedback record
	var feedback models.VisitFeedback
	if err := db.DB.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	// Update feedback with new status and admin response
	updates := map[string]interface{}{
		"status":     req.ReviewStatus,
		"updated_at": time.Now(),
	}

	if req.AdminResponse != "" {
		updates["admin_response"] = req.AdminResponse
		updates["admin_response_by"] = adminID
		updates["admin_response_at"] = time.Now()
	}

	if req.AdminNotes != "" {
		updates["admin_notes"] = req.AdminNotes
	}

	if req.ReviewStatus == "reviewed" && feedback.ReviewedAt == nil {
		updates["reviewed_by"] = adminID
		updates["reviewed_at"] = time.Now()
	}

	// Perform the update
	if err := db.DB.Model(&feedback).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feedback"})
		return
	}

	// Reload the updated feedback
	db.DB.First(&feedback, id)

	// Create audit log entry
	auditLog := models.AuditLog{
		Action:      "Update Feedback Status",
		EntityType:  "VisitFeedback",
		EntityID:    uint(id),
		Description: "Updated feedback review status to " + req.ReviewStatus,
		PerformedBy: strconv.FormatUint(uint64(adminID.(uint)), 10),
		CreatedAt:   time.Now(),
	}
	db.DB.Create(&auditLog)

	// Send notification to visitor if public response provided
	if req.AdminResponse != "" {
		go func() {
			notification := models.Notification{
				UserID:    feedback.VisitorID,
				Type:      "feedback_response",
				Title:     "Response to Your Feedback",
				Message:   "We have responded to your feedback. Thank you for helping us improve!",
				Channel:   "system",
				Read:      false,
				CreatedAt: time.Now(),
			}
			db.DB.Create(&notification)
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Feedback status updated successfully",
		"feedback": feedback,
		"adminID":  adminID,
	})
}

// GetFeedbackAnalytics handles GET /admin/feedback/analytics
func GetFeedbackAnalytics(c *gin.Context) {
	// Parse date range parameters
	fromDate := c.DefaultQuery("from_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	toDate := c.DefaultQuery("to_date", time.Now().Format("2006-01-02"))
	category := c.Query("category")

	// Build base query with date range
	query := db.DB.Model(&models.VisitFeedback{})

	if parsedFromDate, err := time.Parse("2006-01-02", fromDate); err == nil {
		query = query.Where("created_at >= ?", parsedFromDate)
	}
	if parsedToDate, err := time.Parse("2006-01-02", toDate); err == nil {
		endDate := parsedToDate.AddDate(0, 0, 1)
		query = query.Where("created_at < ?", endDate)
	}
	if category != "" {
		query = query.Where("service_category = ?", category)
	}

	// Calculate overview statistics
	var totalFeedback int64
	var avgOverall, avgStaff, avgWait, avgFacility, avgSpeed, avgFood float64

	query.Count(&totalFeedback)
	query.Select("AVG(overall_rating)").Scan(&avgOverall)
	query.Select("AVG(staff_helpfulness)").Scan(&avgStaff)
	query.Select("AVG(wait_time_rating)").Scan(&avgWait)
	query.Select("AVG(facility_rating)").Scan(&avgFacility)
	query.Select("AVG(service_speed_rating)").Scan(&avgSpeed)
	query.Where("food_quality_rating IS NOT NULL").Select("AVG(food_quality_rating)").Scan(&avgFood)

	// Calculate experience metrics
	var wouldRecommendCount, feltWelcomedCount, needsMetCount int64
	query.Where("would_recommend = ?", true).Count(&wouldRecommendCount)
	query.Where("feel_welcomed = ?", true).Count(&feltWelcomedCount)
	query.Where("needs_were_met = ?", true).Count(&needsMetCount)

	wouldRecommendPerc := float64(0)
	feltWelcomedPerc := float64(0)
	needsMetPerc := float64(0)

	if totalFeedback > 0 {
		wouldRecommendPerc = float64(wouldRecommendCount) / float64(totalFeedback) * 100
		feltWelcomedPerc = float64(feltWelcomedCount) / float64(totalFeedback) * 100
		needsMetPerc = float64(needsMetCount) / float64(totalFeedback) * 100
	}

	// Get category breakdown
	type CategoryStat struct {
		Category      string  `json:"category"`
		Count         int64   `json:"count"`
		AverageRating float64 `json:"average_rating"`
	}

	var categoryStats []CategoryStat
	db.DB.Model(&models.VisitFeedback{}).
		Select("service_category as category, COUNT(*) as count, AVG(overall_rating) as average_rating").
		Where("created_at >= ? AND created_at < ?", fromDate, toDate).
		Group("service_category").
		Scan(&categoryStats)

	categoryBreakdown := make(map[string]struct {
		Count         int     `json:"count"`
		AverageRating float64 `json:"averageRating"`
	})

	for _, stat := range categoryStats {
		categoryBreakdown[stat.Category] = struct {
			Count         int     `json:"count"`
			AverageRating float64 `json:"averageRating"`
		}{
			Count:         int(stat.Count),
			AverageRating: stat.AverageRating,
		}
	}

	// Get status breakdown
	type StatusStat struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	var statusStats []StatusStat
	query.Select("status, COUNT(*) as count").Group("status").Scan(&statusStats)

	statusBreakdown := make(map[string]int)
	for _, stat := range statusStats {
		statusBreakdown[stat.Status] = int(stat.Count)
	}

	// Get priority feedback (low ratings or escalated)
	var priorityFeedback []models.VisitFeedback
	db.DB.Where("overall_rating <= ? OR status = ?", 2, "escalated").
		Order("created_at DESC").
		Limit(10).
		Find(&priorityFeedback)

	// Get daily trends for the past 7 days
	var dailyTrends []DailyTrend
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")

		var count int64
		var avgRating float64

		db.DB.Model(&models.VisitFeedback{}).
			Where("DATE(created_at) = ?", dateStr).
			Count(&count)

		if count > 0 {
			db.DB.Model(&models.VisitFeedback{}).
				Where("DATE(created_at) = ?", dateStr).
				Select("AVG(overall_rating)").
				Scan(&avgRating)
		}

		dailyTrends = append(dailyTrends, DailyTrend{
			Date:          dateStr,
			Count:         int(count),
			AverageRating: avgRating,
		})
	}

	analytics := FeedbackAnalytics{
		Overview: struct {
			TotalFeedback         int      `json:"totalFeedback"`
			AvgOverallRating      float64  `json:"avgOverallRating"`
			AvgStaffRating        float64  `json:"avgStaffRating"`
			AvgWaitTimeRating     float64  `json:"avgWaitTimeRating"`
			AvgFacilityRating     float64  `json:"avgFacilityRating"`
			AvgServiceSpeedRating float64  `json:"avgServiceSpeedRating"`
			AvgFoodQualityRating  *float64 `json:"avgFoodQualityRating"`
		}{
			TotalFeedback:         int(totalFeedback),
			AvgOverallRating:      avgOverall,
			AvgStaffRating:        avgStaff,
			AvgWaitTimeRating:     avgWait,
			AvgFacilityRating:     avgFacility,
			AvgServiceSpeedRating: avgSpeed,
			AvgFoodQualityRating:  &avgFood,
		},
		ExperienceMetrics: struct {
			WouldRecommendPercentage float64 `json:"wouldRecommendPercentage"`
			FeltWelcomedPercentage   float64 `json:"feltWelcomedPercentage"`
			NeedsMetPercentage       float64 `json:"needsMetPercentage"`
		}{
			WouldRecommendPercentage: wouldRecommendPerc,
			FeltWelcomedPercentage:   feltWelcomedPerc,
			NeedsMetPercentage:       needsMetPerc,
		},
		CategoryBreakdown:     categoryBreakdown,
		ReviewStatusBreakdown: statusBreakdown,
		PriorityFeedback:      priorityFeedback,
		DailyTrends:           dailyTrends,
	}

	c.JSON(http.StatusOK, gin.H{
		"analytics": analytics,
		"dateRange": gin.H{
			"from":     fromDate,
			"to":       toDate,
			"category": category,
		},
	})
}

// GetPriorityFeedback handles GET /admin/feedback/priority
func GetPriorityFeedback(c *gin.Context) {
	// Get feedback with low ratings (<=2) or escalated status
	// Sort by priority level and creation date

	// Parse query parameters
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	// Get feedback with low ratings (<=2) or escalated status
	var priorityFeedback []models.VisitFeedback
	if err := db.DB.Where("overall_rating <= ? OR status = ?", 2, "escalated").
		Preload("Visitor").
		Preload("Visit").
		Order("CASE WHEN status = 'escalated' THEN 1 WHEN overall_rating = 1 THEN 2 WHEN overall_rating = 2 THEN 3 ELSE 4 END, created_at DESC").
		Limit(limit).
		Find(&priorityFeedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve priority feedback"})
		return
	}

	// Get summary statistics
	var totalPriority int64
	var criticalCount, escalatedCount int64

	db.DB.Model(&models.VisitFeedback{}).
		Where("overall_rating <= ? OR status = ?", 2, "escalated").
		Count(&totalPriority)

	db.DB.Model(&models.VisitFeedback{}).
		Where("overall_rating = ?", 1).
		Count(&criticalCount)

	db.DB.Model(&models.VisitFeedback{}).
		Where("status = ?", "escalated").
		Count(&escalatedCount)

	c.JSON(http.StatusOK, gin.H{
		"priorityFeedback": priorityFeedback,
		"summary": gin.H{
			"totalPriority": totalPriority,
			"critical":      criticalCount,
			"escalated":     escalatedCount,
		},
		"limit": limit,
	})
}

// BulkRespondToFeedback handles POST /admin/feedback/bulk-response
func BulkRespondToFeedback(c *gin.Context) {
	var req BulkResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Get admin user ID from context for audit trail
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin not authenticated"})
		return
	}

	if len(req.FeedbackIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No feedback IDs provided"})
		return
	}

	// Validate all feedback IDs exist and get feedback records
	var feedbackRecords []models.VisitFeedback
	if err := db.DB.Where("id IN ?", req.FeedbackIDs).Find(&feedbackRecords).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve feedback records"})
		return
	}

	if len(feedbackRecords) != len(req.FeedbackIDs) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Some feedback IDs are invalid"})
		return
	}

	// Prepare bulk update data
	updates := map[string]interface{}{
		"status":     req.ReviewStatus,
		"updated_at": time.Now(),
	}

	if req.AdminResponse != "" {
		updates["admin_response"] = req.AdminResponse
		updates["admin_response_by"] = adminID
		updates["admin_response_at"] = time.Now()
	}

	if req.AdminNotes != "" {
		updates["admin_notes"] = req.AdminNotes
	}

	if req.ReviewStatus == "reviewed" {
		updates["reviewed_by"] = adminID
		updates["reviewed_at"] = time.Now()
	}

	// Perform bulk update
	if err := db.DB.Model(&models.VisitFeedback{}).Where("id IN ?", req.FeedbackIDs).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feedback records"})
		return
	}

	// Create audit log for bulk action
	auditLog := models.AuditLog{
		Action:      "Bulk Update Feedback Status",
		EntityType:  "VisitFeedback",
		EntityID:    0, // Bulk action - no single entity ID
		Description: fmt.Sprintf("Bulk updated %d feedback records to status: %s", len(req.FeedbackIDs), req.ReviewStatus),
		PerformedBy: strconv.FormatUint(uint64(adminID.(uint)), 10),
		CreatedAt:   time.Now(),
	}
	db.DB.Create(&auditLog)

	// Send notifications to all affected visitors if response provided
	if req.AdminResponse != "" {
		go func() {
			for _, feedback := range feedbackRecords {
				notification := models.Notification{
					UserID:    feedback.VisitorID,
					Type:      "feedback_response",
					Title:     "Response to Your Feedback",
					Message:   "We have responded to your feedback. Thank you for helping us improve!",
					Channel:   "system",
					Read:      false,
					CreatedAt: time.Now(),
				}
				db.DB.Create(&notification)
			}
		}()
	}

	updatedCount := len(req.FeedbackIDs)

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Bulk response completed successfully",
		"updatedCount": updatedCount,
		"feedbackIds":  req.FeedbackIDs,
		"reviewStatus": req.ReviewStatus,
		"adminId":      adminID,
		"processedAt":  time.Now(),
	})
}

// Helper function to determine feedback priority based on rating
/*
func determineFeedbackPriority(overallRating int) string {
	switch {
	case overallRating <= 2:
		return "high"
	case overallRating == 3:
		return "normal"
	default:
		return "low"
	}
}
*/

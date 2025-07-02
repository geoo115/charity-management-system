package system

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/services"

	"github.com/gin-gonic/gin"
)

// OptimizedListVolunteers provides high-performance volunteer listing with search and filtering
func OptimizedListVolunteers(c *gin.Context) {
	// For volunteer management page, we need complete volunteer data, not search results
	// Fall back to the original ListVolunteers functionality but with optimizations

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Build query for users with volunteer role
	query := db.DB.Model(&models.User{}).Where("role = ?", models.RoleVolunteer)

	// Apply filters
	if search != "" {
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Apply sorting and pagination
	orderClause := fmt.Sprintf("%s %s", sortBy, sortOrder)
	var users []models.User
	if err := query.Order(orderClause).Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve volunteers"})
		return
	}

	// Get volunteer profiles for additional info
	volunteers := make([]gin.H, 0, len(users))
	for _, user := range users {
		volunteer := gin.H{
			"id":         user.ID,
			"first_name": user.FirstName,
			"last_name":  user.LastName,
			"email":      user.Email,
			"phone":      user.Phone,
			"status":     user.Status,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		}

		// Get volunteer profile if exists
		var profile models.VolunteerProfile
		if err := db.DB.Where("user_id = ?", user.ID).First(&profile).Error; err == nil {
			volunteer["skills"] = profile.Skills
			volunteer["availability"] = profile.Availability
			volunteer["experience"] = profile.Experience
			volunteer["profile_status"] = profile.Status
			volunteer["application_id"] = profile.ApplicationID
		}

		// Get volunteer application for approval/rejection purposes
		var application models.VolunteerApplication
		if err := db.DB.Where("email = ?", user.Email).First(&application).Error; err == nil {
			volunteer["application_id"] = application.ID
			volunteer["application_status"] = application.Status
		}

		volunteers = append(volunteers, volunteer)
	}

	c.JSON(http.StatusOK, gin.H{
		"volunteers": volunteers,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// OptimizedBulkAssignVolunteers provides high-performance bulk volunteer assignment
func OptimizedBulkAssignVolunteers(c *gin.Context) {
	optimizer := services.GetQueryOptimizer(c)

	var request struct {
		Assignments []services.BulkAssignmentRequest `json:"assignments" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Get admin ID for audit trail
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Set assigned by for all assignments
	for i := range request.Assignments {
		request.Assignments[i].AssignedBy = adminID.(uint)
	}

	result, err := optimizer.BulkVolunteerAssignment(request.Assignments)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Bulk assignment failed",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":          "Bulk assignment completed",
		"successful_count": len(result.Successful),
		"failed_count":     len(result.Failed),
		"results":          result,
	})
}

// OptimizedVolunteerPerformance provides high-performance volunteer performance metrics
func OptimizedVolunteerPerformance(c *gin.Context) {
	optimizer := services.GetQueryOptimizer(c)

	volunteerIDParam := c.Param("id")
	volunteerID, err := strconv.ParseUint(volunteerIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	timeRange := c.DefaultQuery("range", "quarter")

	metrics, err := optimizer.GetVolunteerPerformanceMetrics(uint(volunteerID), timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve performance metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volunteer_id": volunteerID,
		"time_range":   timeRange,
		"metrics":      metrics,
	})
}

// OptimizedDashboardMetrics provides high-performance dashboard statistics
func OptimizedDashboardMetrics(c *gin.Context) {
	optimizer := services.GetQueryOptimizer(c)

	// Get user role from context
	userRole := "admin" // Default to admin, could be extracted from user context
	timeRange := c.DefaultQuery("range", "month")

	metrics, err := optimizer.GetDashboardMetrics(userRole, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve dashboard metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"time_range":   timeRange,
		"metrics":      metrics,
		"generated_at": time.Now(),
	})
}

// OptimizedVolunteerShiftHistory provides high-performance paginated shift history
func OptimizedVolunteerShiftHistory(c *gin.Context) {
	optimizer := services.GetQueryOptimizer(c)

	volunteerIDParam := c.Param("id")
	volunteerID, err := strconv.ParseUint(volunteerIDParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid volunteer ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	result, err := optimizer.OptimizedShiftHistory(uint(volunteerID), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve shift history",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volunteer_id": volunteerID,
		"data":         result.Shifts,
		"pagination": gin.H{
			"page":        result.Page,
			"page_size":   result.PageSize,
			"total":       result.Total,
			"total_pages": result.TotalPages,
		},
	})
}

// OptimizedVolunteerDashboard provides comprehensive volunteer statistics with performance optimization
func OptimizedVolunteerDashboard(c *gin.Context) {
	optimizer := services.GetQueryOptimizer(c)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	volunteerID := userID.(uint)
	timeRange := c.DefaultQuery("range", "quarter")

	// Get performance metrics
	metrics, err := optimizer.GetVolunteerPerformanceMetrics(volunteerID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve volunteer statistics",
			"details": err.Error(),
		})
		return
	}

	// Get recent shift history (last 5 shifts)
	recentShifts, err := optimizer.OptimizedShiftHistory(volunteerID, 1, 5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve recent shifts",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"volunteer_id":         volunteerID,
		"time_range":           timeRange,
		"statistics":           metrics,
		"recent_shifts":        recentShifts.Shifts,
		"dashboard_updated_at": time.Now(),
	})
}

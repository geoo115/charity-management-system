package system

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/services"

	"github.com/gin-gonic/gin"
)

// CachedVolunteerHandlers provides cache-optimized volunteer management endpoints
type CachedVolunteerHandlers struct {
	cache     *services.CacheService
	optimizer *services.QueryOptimizer
}

// NewCachedVolunteerHandlers creates handlers with cache optimization
func NewCachedVolunteerHandlers() *CachedVolunteerHandlers {
	return &CachedVolunteerHandlers{
		cache:     services.GetCacheService(),
		optimizer: services.NewQueryOptimizer(),
	}
}

// CachedVolunteerProfile retrieves volunteer profile with caching
func CachedVolunteerProfile(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	volunteerID := userID.(uint)

	// Try cache first
	if profile, err := cache.GetVolunteerFromCache(volunteerID); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"volunteer_profile": profile,
			"cached":            true,
		})
		return
	}

	// Cache miss - fetch from database using optimizer
	optimizer := services.GetQueryOptimizer(c)
	profile, err := optimizer.GetVolunteerProfile(volunteerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve volunteer profile",
			"details": err.Error(),
		})
		return
	}

	// Cache the result
	if err := cache.CacheVolunteer(volunteerID, profile); err != nil {
		// Log but don't fail the request
		fmt.Printf("Failed to cache volunteer profile: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"volunteer_profile": profile,
		"cached":            false,
	})
}

// CachedVolunteerDashboard provides cached dashboard metrics
func CachedVolunteerDashboard(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	volunteerID := userID.(uint)
	timeRange := c.DefaultQuery("range", "quarter")

	// Try cache first
	var metrics interface{}
	if err := cache.GetDashboardMetricsFromCache(volunteerID, timeRange, &metrics); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"volunteer_id":         volunteerID,
			"time_range":           timeRange,
			"metrics":              metrics,
			"cached":               true,
			"dashboard_updated_at": time.Now(),
		})
		return
	}

	// Cache miss - fetch from database
	optimizer := services.GetQueryOptimizer(c)
	freshMetrics, err := optimizer.GetVolunteerPerformanceMetrics(volunteerID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve dashboard metrics",
			"details": err.Error(),
		})
		return
	}

	// Cache the result
	if err := cache.CacheDashboardMetrics(volunteerID, timeRange, freshMetrics); err != nil {
		fmt.Printf("Failed to cache dashboard metrics: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"volunteer_id":         volunteerID,
		"time_range":           timeRange,
		"metrics":              freshMetrics,
		"cached":               false,
		"dashboard_updated_at": time.Now(),
	})
}

// CachedVolunteerList provides cached volunteer listing with search
func CachedVolunteerList(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	// Build cache key from query parameters
	search := c.Query("search")
	status := c.Query("status")
	skills := c.Query("skills")
	date := c.Query("date")
	limit := c.DefaultQuery("limit", "50")

	cacheKey := fmt.Sprintf("volunteers:list:%s:%s:%s:%s:%s", search, status, skills, date, limit)

	// Try cache first
	var volunteers []services.VolunteerSearchResult
	if err := cache.Get(cacheKey, &volunteers); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"volunteers": volunteers,
			"count":      len(volunteers),
			"cached":     true,
		})
		return
	}

	// Cache miss - use optimized handler logic
	optimizer := services.GetQueryOptimizer(c)

	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 || limitInt > 100 {
		limitInt = 50
	}

	var skillsSlice []string
	if skills != "" {
		skillsSlice = []string{skills}
	}

	var datePtr *time.Time
	if date != "" {
		if parsedDate, err := time.Parse("2006-01-02", date); err == nil {
			datePtr = &parsedDate
		}
	}

	params := services.VolunteerSearchParams{
		Skills: skillsSlice,
		Status: status,
		Search: search,
		Date:   datePtr,
		Limit:  limitInt,
	}

	freshVolunteers, err := optimizer.OptimizedVolunteerSearch(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve volunteers",
			"details": err.Error(),
		})
		return
	}

	// Cache the result for 5 minutes
	if err := cache.Set(cacheKey, freshVolunteers, 5*time.Minute); err != nil {
		fmt.Printf("Failed to cache volunteer list: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"volunteers": freshVolunteers,
		"count":      len(freshVolunteers),
		"cached":     false,
	})
}

// CachedAvailableShifts provides cached available shifts
func CachedAvailableShifts(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")

	cacheKey := fmt.Sprintf("shifts:available:%s:%s:%s", date, page, limit)

	// Try cache first
	var shifts interface{}
	if err := cache.Get(cacheKey, &shifts); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"shifts": shifts,
			"cached": true,
		})
		return
	}

	// Cache miss - fetch from database
	optimizer := services.GetQueryOptimizer(c)

	pageInt, _ := strconv.Atoi(page)
	limitInt, _ := strconv.Atoi(limit)

	if pageInt < 1 {
		pageInt = 1
	}
	if limitInt < 1 || limitInt > 100 {
		limitInt = 20
	}

	freshShifts, err := optimizer.GetAvailableShifts(date, pageInt, limitInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve available shifts",
			"details": err.Error(),
		})
		return
	}

	// Cache for 2 minutes (shifts change frequently)
	if err := cache.Set(cacheKey, freshShifts, 2*time.Minute); err != nil {
		fmt.Printf("Failed to cache available shifts: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"shifts": freshShifts,
		"cached": false,
	})
}

// CachedShiftHistory provides cached volunteer shift history
func CachedShiftHistory(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

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

	cacheKey := fmt.Sprintf("shifts:history:%d:%d:%d", volunteerID, page, pageSize)

	// Try cache first
	var history interface{}
	if err := cache.Get(cacheKey, &history); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"volunteer_id": volunteerID,
			"data":         history,
			"cached":       true,
		})
		return
	}

	// Cache miss - fetch from database
	optimizer := services.GetQueryOptimizer(c)
	freshHistory, err := optimizer.OptimizedShiftHistory(uint(volunteerID), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve shift history",
			"details": err.Error(),
		})
		return
	}

	// Cache for 10 minutes
	if err := cache.Set(cacheKey, freshHistory, 10*time.Minute); err != nil {
		fmt.Printf("Failed to cache shift history: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"volunteer_id": volunteerID,
		"data":         freshHistory,
		"cached":       false,
	})
}

// CachedAdminStats provides cached admin dashboard statistics
func CachedAdminStats(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	timeRange := c.DefaultQuery("range", "month")
	cacheKey := fmt.Sprintf("admin:stats:%s", timeRange)

	// Try cache first
	var stats interface{}
	if err := cache.Get(cacheKey, &stats); err == nil {
		c.Header("X-Cache", "HIT")
		c.JSON(http.StatusOK, gin.H{
			"statistics": stats,
			"time_range": timeRange,
			"cached":     true,
			"updated_at": time.Now(),
		})
		return
	}

	// Cache miss - fetch from database
	optimizer := services.GetQueryOptimizer(c)
	freshStats, err := optimizer.GetAdminDashboardMetrics(timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve admin statistics",
			"details": err.Error(),
		})
		return
	}

	// Cache for 1 minute (admin stats should be fresh)
	if err := cache.Set(cacheKey, freshStats, 1*time.Minute); err != nil {
		fmt.Printf("Failed to cache admin stats: %v\n", err)
	}

	c.Header("X-Cache", "MISS")
	c.JSON(http.StatusOK, gin.H{
		"statistics": freshStats,
		"time_range": timeRange,
		"cached":     false,
		"updated_at": time.Now(),
	})
}

// CacheInvalidationHandler provides cache management endpoint
func CacheInvalidationHandler(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	// Check admin role
	role, exists := c.Get("role")
	if !exists || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var request struct {
		Pattern string `json:"pattern"`
		UserID  *uint  `json:"user_id,omitempty"`
		Type    string `json:"type"` // "user", "volunteers", "shifts", "admin", "all"
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	var message string

	switch request.Type {
	case "user":
		if request.UserID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user_id required for user cache invalidation"})
			return
		}
		cache.InvalidateUserCache(*request.UserID)
		message = fmt.Sprintf("User cache invalidated for user ID: %d", *request.UserID)

	case "volunteers":
		cache.DeletePattern("volunteers:*")
		cache.DeletePattern("volunteer:*")
		message = "All volunteer caches invalidated"

	case "shifts":
		cache.DeletePattern("shifts:*")
		message = "All shift caches invalidated"

	case "admin":
		cache.DeletePattern("admin:*")
		message = "All admin caches invalidated"

	case "all":
		cache.DeletePattern("*")
		message = "All caches invalidated"

	case "pattern":
		if request.Pattern == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "pattern required for pattern cache invalidation"})
			return
		}
		cache.DeletePattern(request.Pattern)
		message = fmt.Sprintf("Caches invalidated for pattern: %s", request.Pattern)

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invalidation type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   message,
		"timestamp": time.Now(),
	})
}

// CacheStatsHandler provides cache performance statistics
func CacheStatsHandler(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)

	stats := cache.GetStats()
	health := cache.HealthCheck()

	c.JSON(http.StatusOK, gin.H{
		"cache_statistics": stats,
		"cache_health":     health,
		"timestamp":        time.Now(),
	})
}

// Cache warming handlers for common data

// WarmVolunteerCache pre-loads frequently accessed volunteer data
func WarmVolunteerCache(c *gin.Context) {
	cache := services.GetCacheServiceFromContext(c)
	optimizer := services.GetQueryOptimizer(c)

	// Check admin role
	role, exists := c.Get("role")
	if !exists || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Warm common volunteer searches
	commonSearches := []services.VolunteerSearchParams{
		{Status: "active", Limit: 50},
		{Status: "approved", Limit: 50},
		{Limit: 100}, // All volunteers
	}

	warmed := 0
	for _, search := range commonSearches {
		volunteers, err := optimizer.OptimizedVolunteerSearch(search)
		if err != nil {
			continue
		}

		cacheKey := fmt.Sprintf("volunteers:list:%s:%s:::%d", search.Search, search.Status, search.Limit)
		if err := cache.Set(cacheKey, volunteers, 10*time.Minute); err == nil {
			warmed++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Volunteer cache warming completed",
		"warmed_entries": warmed,
		"timestamp":      time.Now(),
	})
}

// Middleware for automatic cache invalidation on data changes

// InvalidateCacheOnUpdateMiddleware invalidates relevant caches when data is updated
func InvalidateCacheOnUpdateMiddleware() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// Store original response writer
		originalWriter := c.Writer

		// Create a custom response writer to capture the response
		responseCapture := &ResponseCapture{
			ResponseWriter: originalWriter,
			statusCode:     http.StatusOK,
		}
		c.Writer = responseCapture

		// Process the request
		c.Next()

		// If the request was successful and modified data, invalidate relevant caches
		if responseCapture.statusCode >= 200 && responseCapture.statusCode < 300 {
			cache := services.GetCacheServiceFromContext(c)

			// Determine what to invalidate based on the route
			path := c.FullPath()
			method := c.Request.Method

			if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
				switch {
				case strings.Contains(path, "/volunteers"):
					cache.DeletePattern("volunteers:*")
					cache.DeletePattern("volunteer:*")
				case strings.Contains(path, "/shifts"):
					cache.DeletePattern("shifts:*")
				case strings.Contains(path, "/admin"):
					cache.DeletePattern("admin:*")
				}
			}
		}
	})
}

// ResponseCapture captures response status codes for cache invalidation decisions
type ResponseCapture struct {
	gin.ResponseWriter
	statusCode int
}

func (rc *ResponseCapture) WriteHeader(statusCode int) {
	rc.statusCode = statusCode
	rc.ResponseWriter.WriteHeader(statusCode)
}

package routes

import (
	"net/http"

	"github.com/geoo115/LDH/internal/observability"
	"github.com/geoo115/LDH/internal/services"
	"github.com/gin-gonic/gin"
)

// RegisterMetricsRoutes registers observability and metrics routes
func RegisterMetricsRoutes(router *gin.Engine) {
	// Prometheus metrics endpoint
	router.GET("/metrics", gin.WrapH(observability.GetMetricsService().GetHandler()))

	// Cache statistics endpoint
	router.GET("/api/v1/cache/stats", CacheStatsHandler)

	// Health check with detailed component status
	router.GET("/health/detailed", DetailedHealthHandler)

	// System observability endpoints
	observability := router.Group("/api/v1/observability")
	{
		observability.GET("/metrics/summary", MetricsSummaryHandler)
		observability.GET("/cache/health", CacheHealthHandler)
		observability.POST("/cache/invalidate", CacheInvalidateHandler)
		observability.GET("/trace/status", TraceStatusHandler)
	}
}

// CacheStatsHandler provides comprehensive cache statistics
func CacheStatsHandler(c *gin.Context) {
	cache := services.GetCacheService()
	stats := cache.GetStats()

	c.JSON(http.StatusOK, gin.H{
		"cache_stats": stats,
		"timestamp":   "now",
	})
}

// DetailedHealthHandler provides detailed health status for all components
func DetailedHealthHandler(c *gin.Context) {
	cache := services.GetCacheService()
	metrics := observability.GetMetricsService()

	health := gin.H{
		"status":    "healthy",
		"timestamp": "now",
		"components": gin.H{
			"cache": cache.HealthCheck(),
			"metrics": gin.H{
				"status": "healthy",
				"stats":  metrics.GetHandler(),
			},
		},
	}

	// Check if tracing is available
	if tracing := observability.GetTracingService(); tracing != nil {
		health["components"].(gin.H)["tracing"] = gin.H{
			"status":  "healthy",
			"enabled": true,
		}
	} else {
		health["components"].(gin.H)["tracing"] = gin.H{
			"status":  "disabled",
			"enabled": false,
		}
	}

	c.JSON(http.StatusOK, health)
}

// MetricsSummaryHandler provides a summary of key metrics
func MetricsSummaryHandler(c *gin.Context) {
	// This would typically aggregate key metrics from Prometheus
	// For now, providing a basic structure
	summary := gin.H{
		"http_requests": gin.H{
			"total": "available_via_/metrics",
			"rate":  "available_via_/metrics",
		},
		"cache": gin.H{
			"hit_rate": "available_via_/api/v1/cache/stats",
			"size":     "available_via_/api/v1/cache/stats",
		},
		"system": gin.H{
			"status": "use_/health/detailed",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"metrics_summary": summary,
		"endpoints": gin.H{
			"prometheus_metrics": "/metrics",
			"cache_stats":        "/api/v1/cache/stats",
			"detailed_health":    "/health/detailed",
		},
	})
}

// CacheHealthHandler provides cache-specific health status
func CacheHealthHandler(c *gin.Context) {
	cache := services.GetCacheService()
	health := cache.HealthCheck()

	c.JSON(http.StatusOK, gin.H{
		"cache_health": health,
	})
}

// CacheInvalidateHandler allows manual cache invalidation
func CacheInvalidateHandler(c *gin.Context) {
	var request struct {
		Pattern string `json:"pattern"`
		UserID  uint   `json:"user_id,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	cache := services.GetCacheService()

	if request.UserID > 0 {
		// Invalidate user-specific cache
		if err := cache.InvalidateUserCache(request.UserID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to invalidate user cache",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "User cache invalidated successfully",
			"user_id": request.UserID,
		})
		return
	}

	if request.Pattern != "" {
		// Invalidate by pattern
		if err := cache.DeletePattern(request.Pattern); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to invalidate cache pattern",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Cache pattern invalidated successfully",
			"pattern": request.Pattern,
		})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{
		"error": "Either pattern or user_id must be provided",
	})
}

// TraceStatusHandler provides tracing status information
func TraceStatusHandler(c *gin.Context) {
	tracing := observability.GetTracingService()

	if tracing == nil {
		c.JSON(http.StatusOK, gin.H{
			"tracing": gin.H{
				"enabled": false,
				"status":  "disabled",
				"message": "Tracing service not initialized",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tracing": gin.H{
			"enabled": true,
			"status":  "active",
			"message": "Tracing service is running",
		},
	})
}

package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/jobs"
	"github.com/gin-gonic/gin"
)

// RedisRateLimit returns a middleware that rate-limits by key (user or IP) using Redis INCR + EXPIRE.
// It falls back to the in-memory RateLimiter if Redis is not available.
func RedisRateLimit(limit int, window time.Duration) gin.HandlerFunc {
	// Reuse in-memory limiter as fallback
	fallback := NewRateLimiter(limit, window)

	return func(c *gin.Context) {
		// Determine key: prefer authenticated userID if present
		key := c.ClientIP()
		if userID, exists := c.Get("userID"); exists {
			key = fmt.Sprintf("user_%v", userID)
		}

		// If Redis is configured, use it
		if jobs.RedisClient != nil {
			ctx := context.Background()
			redisKey := fmt.Sprintf("rl:%s", key)
			// Use a Lua script or simple INCR+EXPIRE. We'll do INCR then set expiry when count==1
			count, err := jobs.RedisClient.Incr(ctx, redisKey).Result()
			if err != nil {
				// Fall back to in-memory limiter on Redis errors
				allowed, _ := fallback.isAllowed(key)
				if !allowed {
					c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))
					c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded (fallback)"})
					c.Abort()
					return
				}
				c.Next()
				return
			}

			if count == 1 {
				// set expiry
				if err := jobs.RedisClient.Expire(ctx, redisKey, window).Err(); err != nil {
					// ignore expiry set failure
				}
			}

			if count > int64(limit) {
				c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
				c.Header("X-RateLimit-Remaining", "0")
				c.Header("X-RateLimit-Reset", strconv.Itoa(int(window.Seconds())))
				c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))
				c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
				c.Abort()
				return
			}

			// Allowed
			c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Header("X-RateLimit-Remaining", strconv.FormatInt(int64(limit)-count, 10))
			c.Next()
			return
		}

		// Redis not configured: fallback to in-memory
		allowed, _ := fallback.isAllowed(key)
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded (fallback)"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Helper constructors for common policies
func RedisAuthRateLimit() gin.HandlerFunc {
	return RedisRateLimit(5, time.Minute*15) // 5 attempts per 15 minutes
}

func RedisAPIRateLimit() gin.HandlerFunc {
	return RedisRateLimit(100, time.Minute) // 100 req/min
}

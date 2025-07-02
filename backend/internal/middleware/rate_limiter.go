package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter represents a simple in-memory rate limiter
type RateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	limit    int
	window   time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// cleanup removes old entries to prevent memory leaks
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute * 5)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		for key, times := range rl.requests {
			var validTimes []time.Time
			for _, t := range times {
				if now.Sub(t) <= rl.window {
					validTimes = append(validTimes, t)
				}
			}
			if len(validTimes) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = validTimes
			}
		}
		rl.mutex.Unlock()
	}
}

// isAllowed checks if a request from the given key is allowed
func (rl *RateLimiter) isAllowed(key string) (bool, int) {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()

	// Get existing requests for this key
	times, exists := rl.requests[key]
	if !exists {
		times = []time.Time{}
	}

	// Filter out old requests
	var validTimes []time.Time
	for _, t := range times {
		if now.Sub(t) <= rl.window {
			validTimes = append(validTimes, t)
		}
	}

	// Check if we're under the limit
	if len(validTimes) >= rl.limit {
		return false, len(validTimes)
	}

	// Add current request
	validTimes = append(validTimes, now)
	rl.requests[key] = validTimes

	return true, len(validTimes)
}

// RateLimit middleware with configurable limits
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(limit, window)

	return func(c *gin.Context) {
		// Use IP address as the key
		key := c.ClientIP()

		// For authenticated requests, use user ID for more accurate limiting
		if userID, exists := c.Get("userID"); exists {
			key = fmt.Sprintf("user_%v", userID)
		}

		allowed, currentCount := limiter.isAllowed(key)
		if !allowed {
			// Calculate retry after time with exponential backoff
			retryAfter := int(window.Seconds())
			if currentCount > limit {
				retryAfter = int(window.Seconds() * float64(currentCount-limit))
			}

			c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.Itoa(retryAfter))
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded. Please try again later.",
				"retry_after": retryAfter,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthRateLimit provides stricter rate limiting for authentication endpoints
func AuthRateLimit() gin.HandlerFunc {
	return RateLimit(5, time.Minute*15) // 5 attempts per 15 minutes
}

// APIRateLimit provides general API rate limiting
func APIRateLimit() gin.HandlerFunc {
	return RateLimit(100, time.Minute) // 100 requests per minute
}

// WebSocketRateLimit provides more lenient rate limiting for WebSocket connections
func WebSocketRateLimit() gin.HandlerFunc {
	return RateLimit(100, time.Minute*5) // 100 connections per 5 minutes - more appropriate for development and testing
}

// StrictRateLimit provides very strict rate limiting for sensitive operations
func StrictRateLimit() gin.HandlerFunc {
	return RateLimit(10, time.Hour) // 10 requests per hour
}

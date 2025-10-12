package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/geoo115/charity-management-system/internal/config"
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

		// Set rate limit headers for all requests
		remaining := limit - currentCount
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Window", window.String())

		if !allowed {
			// Calculate retry after time - time until window resets
			retryAfter := int(window.Seconds())
			resetTime := time.Now().Add(window).Unix()

			c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime, 10))
			c.Header("Retry-After", strconv.Itoa(retryAfter))

			// More user-friendly error message
			endpoint := c.Request.URL.Path
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": fmt.Sprintf("Too many requests to %s. You can make %d requests per %v.", endpoint, limit, window),
				"details": gin.H{
					"limit":         limit,
					"window":        window.String(),
					"retry_after":   retryAfter,
					"reset_time":    resetTime,
					"current_count": currentCount,
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ConfigurableRateLimit creates a rate limiter with configuration support
func ConfigurableRateLimit(cfg *config.RateLimitConfig, limit int, window time.Duration) gin.HandlerFunc {
	// In development mode, optionally bypass rate limiting
	if cfg != nil && !cfg.EnabledInDev {
		// Check if we're in development mode
		return func(c *gin.Context) {
			if gin.Mode() == gin.DebugMode {
				c.Next()
				return
			}
			// Use regular rate limiting in production
			RateLimit(limit, window)(c)
		}
	}

	return RateLimit(limit, window)
}

// AuthRateLimit provides stricter rate limiting for authentication endpoints
func AuthRateLimit() gin.HandlerFunc {
	cfg, _ := config.Load()
	if cfg != nil {
		return ConfigurableRateLimit(&cfg.RateLimit, cfg.RateLimit.AuthLimit, cfg.RateLimit.AuthWindow)
	}
	return ConfigurableRateLimit(nil, 10, time.Minute)
}

// APIRateLimit provides general API rate limiting
func APIRateLimit() gin.HandlerFunc {
	cfg, _ := config.Load()
	if cfg != nil {
		return ConfigurableRateLimit(&cfg.RateLimit, cfg.RateLimit.APILimit, cfg.RateLimit.APIWindow)
	}
	return ConfigurableRateLimit(nil, 100, time.Minute)
}

// WebSocketRateLimit provides more lenient rate limiting for WebSocket connections
func WebSocketRateLimit() gin.HandlerFunc {
	cfg, _ := config.Load()
	if cfg != nil {
		return ConfigurableRateLimit(&cfg.RateLimit, cfg.RateLimit.WebSocketLimit, cfg.RateLimit.WebSocketWindow)
	}
	return ConfigurableRateLimit(nil, 50, time.Minute)
}

// StrictRateLimit provides very strict rate limiting for sensitive operations
func StrictRateLimit() gin.HandlerFunc {
	cfg, _ := config.Load()
	if cfg != nil {
		return ConfigurableRateLimit(&cfg.RateLimit, cfg.RateLimit.StrictLimit, cfg.RateLimit.StrictWindow)
	}
	return ConfigurableRateLimit(nil, 3, time.Minute*5)
}

// LoginRateLimit provides rate limiting specifically for login endpoints
func LoginRateLimit() gin.HandlerFunc {
	cfg, _ := config.Load()
	if cfg != nil {
		return ConfigurableRateLimit(&cfg.RateLimit, cfg.RateLimit.LoginLimit, cfg.RateLimit.LoginWindow)
	}
	return ConfigurableRateLimit(nil, 5, time.Minute)
}

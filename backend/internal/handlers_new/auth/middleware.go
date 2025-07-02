package auth

import (
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/auth"
	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// MiddlewareHandler handles authentication middleware
type MiddlewareHandler struct {
	*shared.BaseHandler
}

// NewMiddlewareHandler creates a new middleware handler
func NewMiddlewareHandler(base *shared.BaseHandler) *MiddlewareHandler {
	return &MiddlewareHandler{
		BaseHandler: base,
	}
}

// AuthMiddleware validates JWT tokens and sets user context
func (h *MiddlewareHandler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Authorization header required",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Check if token starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Invalid authorization header format",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Extract token
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Check if token is blacklisted
		var blacklistedCount int64
		h.DB.Table("token_blacklists").Where("token = ?", token).Count(&blacklistedCount)
		if blacklistedCount > 0 {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Token has been invalidated",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Validate token
		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Invalid or expired token",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Get user from database
		var user models.User
		if err := h.DB.First(&user, claims.UserID).Error; err != nil {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "User not found",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Check if user is active
		if user.Status != "active" {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "User account is not active",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("userID", user.ID)
		c.Set("userEmail", user.Email)
		c.Set("userRole", user.Role)
		c.Set("user", user)

		c.Next()
	}
}

// RequireRole middleware ensures user has specific role
func (h *MiddlewareHandler) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Authentication required",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.JSON(401, shared.StandardResponse{
				Success:   false,
				Error:     "Invalid user role",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Check if user has required role
		hasRole := false
		for _, requiredRole := range roles {
			if role == requiredRole {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(403, shared.StandardResponse{
				Success:   false,
				Error:     "Insufficient permissions",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin middleware ensures user is an admin
func (h *MiddlewareHandler) RequireAdmin() gin.HandlerFunc {
	return h.RequireRole("Admin", "admin", "super_admin", "SuperAdmin")
}

// RequireVolunteer middleware ensures user is a volunteer
func (h *MiddlewareHandler) RequireVolunteer() gin.HandlerFunc {
	return h.RequireRole("Volunteer", "volunteer")
}

// RequireDonor middleware ensures user is a donor
func (h *MiddlewareHandler) RequireDonor() gin.HandlerFunc {
	return h.RequireRole("Donor")
}

// RequireVisitor middleware ensures user is a visitor
func (h *MiddlewareHandler) RequireVisitor() gin.HandlerFunc {
	return h.RequireRole("Visitor")
}

// OptionalAuth middleware allows optional authentication
func (h *MiddlewareHandler) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.Next()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Check if token is blacklisted
		var blacklistedCount int64
		h.DB.Table("token_blacklists").Where("token = ?", token).Count(&blacklistedCount)
		if blacklistedCount > 0 {
			c.Next()
			return
		}

		// Validate token
		claims, err := auth.ValidateToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Get user from database
		var user models.User
		if err := h.DB.First(&user, claims.UserID).Error; err != nil {
			c.Next()
			return
		}

		// Check if user is active
		if user.Status != "active" {
			c.Next()
			return
		}

		// Set user information in context
		c.Set("userID", user.ID)
		c.Set("userEmail", user.Email)
		c.Set("userRole", user.Role)
		c.Set("user", user)

		c.Next()
	}
}

// RateLimitMiddleware provides basic rate limiting
func (h *MiddlewareHandler) RateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	// Simple in-memory rate limiting
	// In production, use Redis or similar
	clientIPs := make(map[string][]int64)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now().Unix()

		// Clean old requests
		if requests, exists := clientIPs[clientIP]; exists {
			var validRequests []int64
			for _, timestamp := range requests {
				if now-timestamp < 60 { // Keep requests from last minute
					validRequests = append(validRequests, timestamp)
				}
			}
			clientIPs[clientIP] = validRequests
		}

		// Check rate limit
		if len(clientIPs[clientIP]) >= requestsPerMinute {
			c.JSON(429, shared.StandardResponse{
				Success:   false,
				Error:     "Rate limit exceeded",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		// Add current request
		clientIPs[clientIP] = append(clientIPs[clientIP], now)

		c.Next()
	}
}

// CORS middleware for handling cross-origin requests
func (h *MiddlewareHandler) CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// LoggingMiddleware logs request information
func (h *MiddlewareHandler) LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		end := time.Now()
		latency := end.Sub(start)

		userID, _ := c.Get("userID")
		userRole, _ := c.Get("userRole")

		h.LogInfo("Request: %s %s | Status: %d | Latency: %v | User: %v (%v)",
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			latency,
			userID,
			userRole,
		)
	}
}

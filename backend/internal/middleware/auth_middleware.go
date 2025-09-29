package middleware

import (
	"net/http"
	"strings"

	"github.com/geoo115/charity-management-system/internal/auth"
	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware uses the auth package to validate JWTs and populate the request context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		claims, err := auth.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		// Set typed values in context
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userRole", claims.Role)

		c.Next()
	}
}

// ActiveVolunteerMiddleware ensures that only active volunteers can access protected volunteer routes
func ActiveVolunteerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by AuthMiddleware)
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.JSON(401, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		// Get user role from context (set by AuthMiddleware)
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(401, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		// Only check status if user is a volunteer
		if userRole == "volunteer" || userRole == "Volunteer" {
			var uid uint
			switch v := userIDVal.(type) {
			case uint:
				uid = v
			case int:
				uid = uint(v)
			case int64:
				uid = uint(v)
			case float64:
				uid = uint(v)
			default:
				c.JSON(500, gin.H{"error": "Invalid user ID format"})
				c.Abort()
				return
			}

			// Query the database to check if user is active
			var user models.User
			if err := db.GetDB().First(&user, uid).Error; err != nil {
				c.JSON(404, gin.H{"error": "User not found"})
				c.Abort()
				return
			}

			// If user is a volunteer but not active, deny access
			if (user.Role == "volunteer" || user.Role == "Volunteer") && user.Status != "active" {
				c.JSON(403, gin.H{"error": "Your volunteer application is still pending approval. Please wait for administrator approval before accessing the dashboard."})
				c.Abort()
				return
			}
		}

		// Continue if not a volunteer or if volunteer is active
		c.Next()
	}
}

package middleware

import (
	"fmt"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// AuthMiddleware creates middleware for JWT authentication
func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the JWT token from the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Check if the header has the right format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(401, gin.H{"error": "Authorization header format must be Bearer {token}"})
			c.Abort()
			return
		}

		// Parse and validate the token
		token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
			// Validate the algorithm
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			return []byte(secret), nil
		})

		if err != nil {
			c.JSON(401, gin.H{"error": fmt.Sprintf("Invalid or expired token: %v", err)})
			c.Abort()
			return
		}

		// Extract claims from token
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Check expiration
			if exp, ok := claims["exp"].(float64); ok {
				if time.Unix(int64(exp), 0).Before(time.Now()) {
					c.JSON(401, gin.H{"error": "Token expired"})
					c.Abort()
					return
				}
			}

			// Set claims in context
			userID := int(claims["sub"].(float64))
			c.Set("userID", userID)
			c.Set("userEmail", claims["email"])
			c.Set("userRole", claims["role"])
			c.Next()
		} else {
			c.JSON(401, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}
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
			userID, ok := userIDVal.(int)
			if !ok {
				c.JSON(500, gin.H{"error": "Invalid user ID format"})
				c.Abort()
				return
			}

			// Query the database to check if user is active
			var user models.User
			if err := db.GetDB().First(&user, userID).Error; err != nil {
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

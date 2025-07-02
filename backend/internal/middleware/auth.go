package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/geoo115/LDH/internal/auth"
	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// getJWTSecret returns the JWT secret, matching the auth package behavior
func getJWTSecret() []byte {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default_secret_for_development" // Default for development - matches auth package
	}
	return []byte(jwtSecret)
}

// Auth middleware validates JWT tokens
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add debug logging
		log.Printf("Auth middleware called for path: %s", c.Request.URL.Path)

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Printf("Missing auth header for path: %s", c.Request.URL.Path)
			// Don't log missing auth header as it's expected for public endpoints
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		log.Printf("Auth header present for path: %s", c.Request.URL.Path)

		// Check for Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Printf("Invalid auth header format for path: %s", c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		if token == "" {
			log.Printf("Empty token for path: %s", c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
			c.Abort()
			return
		}

		log.Printf("Validating token for path: %s", c.Request.URL.Path)

		// Validate token using utils package
		claims, err := auth.ValidateToken(token)
		if err != nil {
			log.Printf("Token validation failed for path: %s, error: %v", c.Request.URL.Path, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		log.Printf("Token validated successfully for path: %s, userID: %d", c.Request.URL.Path, claims.UserID)

		// Get user from database to ensure they still exist and are active
		var user models.User
		if err := db.DB.First(&user, claims.UserID).Error; err != nil {
			log.Printf("User not found in DB for path: %s, userID: %d, error: %v", c.Request.URL.Path, claims.UserID, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if user is active
		if user.Status == models.StatusInactive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account inactive"})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("userID", user.ID)
		c.Set("userRole", user.Role)
		c.Set("user", user)

		c.Next()
	}
}

// RequireAdmin middleware ensures user has admin role
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Check for both new format ("admin") and legacy format ("Admin")
		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid user role format"})
			c.Abort()
			return
		}

		if roleStr != models.RoleAdmin && roleStr != models.RoleAdminLegacy && roleStr != models.RoleSuperAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireVolunteer middleware ensures user has volunteer role
func RequireVolunteer() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Check for both new format ("volunteer") and legacy format ("Volunteer")
		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid user role format"})
			c.Abort()
			return
		}

		if roleStr != models.RoleVolunteer && roleStr != models.RoleVolunteerLegacy {
			c.JSON(http.StatusForbidden, gin.H{"error": "Volunteer access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// VolunteerApproved middleware ensures volunteer is approved
func VolunteerApproved() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Get user email first
		var user models.User
		if err := db.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if volunteer application is approved using email
		var application models.VolunteerApplication
		if err := db.DB.Where("email = ? AND status = ?", user.Email, "approved").First(&application).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Volunteer approval required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// WebSocketAuth handles authentication for WebSocket connections
// It checks for tokens in both Authorization header and query parameters
func WebSocketAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("WebSocket auth middleware called for path: %s", c.Request.URL.Path)

		var token string

		// First, try to get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		// If no header token, try query parameter (for WebSocket connections)
		if token == "" {
			token = c.Query("token")
		}

		// Also try the 'auth' query parameter (alternative)
		if token == "" {
			token = c.Query("auth")
		}

		if token == "" {
			log.Printf("Missing auth token for WebSocket path: %s", c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication token required"})
			c.Abort()
			return
		}

		log.Printf("WebSocket token found for path: %s", c.Request.URL.Path)

		// Validate the token
		claims, err := auth.ValidateToken(token)
		if err != nil {
			log.Printf("Invalid WebSocket token for path: %s, error: %v", c.Request.URL.Path, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		log.Printf("WebSocket token validated successfully for path: %s, userID: %d", c.Request.URL.Path, claims.UserID)

		// Get user from database
		var user models.User
		if err := db.DB.First(&user, claims.UserID).Error; err != nil {
			log.Printf("User not found for WebSocket token, userID: %d, error: %v", claims.UserID, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if user is active
		if user.Status == models.StatusInactive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account inactive"})
			c.Abort()
			return
		}

		// Set user context for handlers
		c.Set("currentUser", user)
		c.Set("userID", user.ID)
		c.Set("userRole", user.Role)

		c.Next()
	}
}

// AuthWithQueryParam middleware validates JWT tokens from both Authorization header and query parameter
// This is useful for document viewing endpoints where browsers can't set custom headers
func AuthWithQueryParam() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("AuthWithQueryParam middleware called for path: %s", c.Request.URL.Path)

		var token string

		// First try Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Check for Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
				log.Printf("Using token from Authorization header for path: %s", c.Request.URL.Path)
			}
		}

		// If no header token, try query parameter
		if token == "" {
			token = c.Query("token")
			if token != "" {
				log.Printf("Using token from query parameter for path: %s", c.Request.URL.Path)
			}
		}

		if token == "" {
			log.Printf("No token found in header or query for path: %s", c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			c.Abort()
			return
		}

		log.Printf("Validating token for path: %s", c.Request.URL.Path)

		// Validate token using auth package
		claims, err := auth.ValidateToken(token)
		if err != nil {
			log.Printf("Token validation failed for path: %s, error: %v", c.Request.URL.Path, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		log.Printf("Token validated successfully for path: %s, userID: %d", c.Request.URL.Path, claims.UserID)

		// Get user from database to ensure they still exist and are active
		var user models.User
		if err := db.DB.First(&user, claims.UserID).Error; err != nil {
			log.Printf("User not found in DB for path: %s, userID: %d, error: %v", c.Request.URL.Path, claims.UserID, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if user is active
		if user.Status == models.StatusInactive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account inactive"})
			c.Abort()
			return
		}

		// Store user info in context
		c.Set("userID", user.ID)
		c.Set("userRole", user.Role)
		c.Set("user", user)

		c.Next()
	}
}

// AuthRequired verifies the JWT token in the request
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For WebSocket connections, check for token in query parameters
		if c.Request.URL.Path[:4] == "/ws/" {
			token := c.Query("token")
			userId := c.Query("userId")

			if token != "" && userId != "" {
				handleTokenAuth(c, token)
				return
			}
		}

		// Check Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Parse the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		handleTokenAuth(c, tokenString)
	}
}

// RoleRequired middleware checks if the user has the specified roles
func RoleRequired(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("userRole")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		roleStr := userRole.(string)
		allowed := false
		for _, role := range allowedRoles {
			if roleStr == role {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// handleTokenAuth processes the JWT token and sets user info in the context
func handleTokenAuth(c *gin.Context, tokenString string) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		c.Abort()
		return
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Check if token is expired
		if exp, ok := claims["exp"].(float64); ok {
			if time.Unix(int64(exp), 0).Before(time.Now()) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
				c.Abort()
				return
			}
		}

		// Set user ID and role in context
		if userID, ok := claims["user_id"].(float64); ok {
			c.Set("userID", uint(userID))
		}

		if email, ok := claims["email"].(string); ok {
			c.Set("userEmail", email)
		}

		if role, ok := claims["role"].(string); ok {
			c.Set("userRole", role)
		} else {
			c.Set("userRole", models.RoleUser) // Default to user role
		}

		c.Next()
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		c.Abort()
		return
	}
}

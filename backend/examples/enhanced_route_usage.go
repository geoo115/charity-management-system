package examples

import (
	"errors"
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/routes"
	"github.com/gin-gonic/gin"
)

// This file demonstrates how to use the enhanced route system
// with validation, error handling, and performance monitoring

// ================================================================
// EXAMPLE HANDLER WITH ENHANCED FEATURES
// ================================================================

// UserRequest represents a validated user creation request
type UserRequest struct {
	FirstName string `json:"first_name" validate:"required,min=2,max=50,safe_string"`
	LastName  string `json:"last_name" validate:"required,min=2,max=50,safe_string"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone" validate:"phone"`
	Password  string `json:"password" validate:"required,min=8,max=100"`
	Role      string `json:"role" validate:"required,oneof=Admin Volunteer Donor Visitor"`
}

// UserResponse represents the response for user operations
type UserResponse struct {
	ID        uint      `json:"id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// EnhancedUserHandler demonstrates the enhanced route features
type EnhancedUserHandler struct {
	// In real implementation, this would include database, services, etc.
}

// Common error types
var (
	ErrRecordNotFound  = errors.New("record not found")
	ErrDuplicateRecord = errors.New("duplicate record")
)

// CreateUser demonstrates comprehensive error handling and validation
func (h *EnhancedUserHandler) CreateUser(c *gin.Context) {
	// 1. Validation is handled automatically by middleware
	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		routes.HandleValidationErrorInContext(c, "request", "Invalid request format", req)
		return
	}

	// 2. Track database operation performance
	var user UserResponse
	err := routes.TrackOperationDuration(c, "create_user_db", func() error {
		// Simulate database operation
		time.Sleep(50 * time.Millisecond) // Simulate DB time

		// In real implementation:
		// return h.db.Create(&user).Error

		// Mock successful creation
		user = UserResponse{
			ID:        123,
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
			Role:      req.Role,
			CreatedAt: time.Now(),
		}
		return nil
	})

	// 3. Handle errors with context
	if err != nil {
		routes.HandleInternalErrorInContext(c, "Failed to create user")
		return
	}

	// 4. Return success response
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
		"message": "User created successfully",
	})
}

// GetUser demonstrates not found error handling
func (h *EnhancedUserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	// Validate ID parameter (handled by middleware, but can add custom validation)
	if userID == "" {
		routes.HandleValidationErrorInContext(c, "id", "User ID is required", userID)
		return
	}

	// Track database query performance
	var user UserResponse
	err := routes.TrackOperationDuration(c, "get_user_db", func() error {
		// Simulate database query
		time.Sleep(20 * time.Millisecond)

		// Simulate user not found
		if userID == "999" {
			return ErrRecordNotFound
		}

		// Mock user found
		user = UserResponse{
			ID:        123,
			FirstName: "John",
			LastName:  "Doe",
			Email:     "john.doe@example.com",
			Role:      "Visitor",
			CreatedAt: time.Now(),
		}
		return nil
	})

	// Handle different error types
	if err != nil {
		if err == ErrRecordNotFound {
			routes.HandleNotFoundInContext(c, "User")
			return
		}
		routes.HandleInternalErrorInContext(c, "Failed to retrieve user")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateUser demonstrates conflict error handling
func (h *EnhancedUserHandler) UpdateUser(c *gin.Context) {
	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		routes.HandleValidationErrorInContext(c, "request", "Invalid request format", req)
		return
	}

	// Track update operation
	err := routes.TrackOperationDuration(c, "update_user_db", func() error {
		time.Sleep(30 * time.Millisecond)

		// Simulate email conflict
		if req.Email == "existing@example.com" {
			return ErrDuplicateRecord
		}

		return nil
	})

	if err != nil {
		if err == ErrDuplicateRecord {
			routes.HandleInternalErrorInContext(c, "Email address already in use")
			return
		}
		routes.HandleInternalErrorInContext(c, "Failed to update user")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User updated successfully",
	})
}

// ================================================================
// ROUTE SETUP WITH ENHANCED FEATURES
// ================================================================

// SetupEnhancedUserRoutes demonstrates how to set up routes with the new system
func SetupEnhancedUserRoutes(router *gin.Engine) {
	// Create enhanced configuration
	config := &routes.RouteConfig{
		EnableDebug:                 true, // Enable for development
		EnablePerformanceMonitoring: true,
		EnableSecurity:              true,
		MaxRequestSize:              10 * 1024 * 1024, // 10MB
		DefaultRateLimit:            100,
		DefaultTimeWindow:           time.Minute,
	}

	// Create middleware chains
	middlewares := routes.NewMiddlewareChains(config)

	// Create handler
	userHandler := &EnhancedUserHandler{}

	// Setup user routes with appropriate middleware
	userGroup := router.Group("/api/v1/users")
	{
		// Public routes (registration)
		userGroup.POST("/register",
			append(middlewares.Public(), userHandler.CreateUser)...)

		// Authenticated routes
		authenticated := userGroup.Group("")
		authenticated.Use(middlewares.Authenticated()...)
		{
			authenticated.GET("/:id", userHandler.GetUser)
			authenticated.PUT("/:id", userHandler.UpdateUser)
		}

		// Admin-only routes
		admin := userGroup.Group("/admin")
		admin.Use(middlewares.AdminOnly()...)
		{
			admin.GET("/", userHandler.ListAllUsers)     // Would be implemented
			admin.DELETE("/:id", userHandler.DeleteUser) // Would be implemented
		}
	}
}

// ================================================================
// TESTING EXAMPLE
// ================================================================

// ExampleUserTest demonstrates how to test the enhanced routes
func ExampleUserTest() {
	// This would be in a _test.go file
	/*
		func TestCreateUser(t *testing.T) {
			// Setup test suite
			suite := routes.NewTestSuite()
			suite.SetupRouter()
			suite.SetupTestAuth()

			// Generate mock data
			mockGen := routes.NewMockDataGenerator()
			userData := mockGen.GenerateUser("Visitor")

			// Execute request and assert response
			suite.NewRequest("POST", "/api/v1/users/register").
				WithBody(userData).
				ExecuteAndAssert(t).
				HasStatus(201).
				HasSuccess(true).
				HasJSONField("data.email", userData["email"])
		}

		func TestCreateUserValidationError(t *testing.T) {
			suite := routes.NewTestSuite()
			suite.SetupRouter()

			// Invalid data (missing required fields)
			invalidData := map[string]interface{}{
				"email": "invalid-email",
			}

			suite.NewRequest("POST", "/api/v1/users/register").
				WithBody(invalidData).
				ExecuteAndAssert(t).
				HasStatus(400).
				HasError().
				HasValidationError("first_name").
				HasValidationError("email")
		}

		func TestGetUserNotFound(t *testing.T) {
			suite := routes.NewTestSuite()
			suite.SetupRouter()
			suite.SetupTestAuth()

			suite.NewRequest("GET", "/api/v1/users/999").
				WithAuth(suite.GetAuthToken("Visitor")).
				ExecuteAndAssert(t).
				HasStatus(404).
				HasError().
				ContainsText("User not found")
		}
	*/
}

// ================================================================
// PERFORMANCE MONITORING EXAMPLE
// ================================================================

// ExamplePerformanceMonitoring shows how to use performance features
func ExamplePerformanceMonitoring(router *gin.Engine) {
	// Performance monitoring is automatically applied via middleware

	// Access performance data in handlers
	slowOperationHandler := func(c *gin.Context) {
		// Track a complex operation
		err := routes.TrackOperationDuration(c, "complex_calculation", func() error {
			// Simulate complex operation
			time.Sleep(200 * time.Millisecond)
			return nil
		})

		if err != nil {
			routes.HandleInternalErrorInContext(c, "Calculation failed")
			return
		}

		c.JSON(200, gin.H{"result": "calculated"})
	}

	router.GET("/api/v1/complex", slowOperationHandler)

	// Performance reports are available at:
	// GET /api/v1/admin/performance/report
	// GET /api/v1/admin/performance/slow-queries
	// POST /api/v1/admin/performance/reset
}

// Custom handler methods that would be implemented
func (h *EnhancedUserHandler) ListAllUsers(c *gin.Context) { /* Implementation */ }
func (h *EnhancedUserHandler) DeleteUser(c *gin.Context)   { /* Implementation */ }

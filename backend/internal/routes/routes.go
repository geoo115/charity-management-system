package routes

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	systemHandlers "github.com/geoo115/charity-management-system/internal/handlers_new/system"
	"github.com/geoo115/charity-management-system/internal/jobs"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/geoo115/charity-management-system/internal/services"
)

// RouteSetupError represents errors during route setup
type RouteSetupError struct {
	Component string
	Err       error
}

func (e RouteSetupError) Error() string {
	return fmt.Sprintf("route setup failed for %s: %v", e.Component, e.Err)
}

// RouteManager manages the entire route setup process
type RouteManager struct {
	config      *RouteConfig
	middlewares *MiddlewareChains
	router      *gin.Engine
}

// NewRouteManager creates a new route manager
func NewRouteManager(router *gin.Engine, config *RouteConfig) *RouteManager {
	if config == nil {
		config = DefaultRouteConfig()
	}

	return &RouteManager{
		config:      config,
		middlewares: NewMiddlewareChains(config),
		router:      router,
	}
}

// SetupRoutes configures all API routes for the Lewisham Charity
// This function organizes routes into logical groups with proper middleware and documentation
func SetupRoutes(r *gin.Engine) error {
	manager := NewRouteManager(r, DefaultRouteConfig())
	return manager.Setup()
}

// Setup performs the complete route setup process
func (rm *RouteManager) Setup() error {
	// Initialize system components
	if err := rm.initializeSystem(); err != nil {
		return RouteSetupError{Component: "system", Err: err}
	}

	// Setup security middleware (must be first)
	if err := rm.setupSecurityMiddleware(); err != nil {
		return RouteSetupError{Component: "security", Err: err}
	}

	// Setup core system routes
	if err := rm.setupSystemRoutes(); err != nil {
		return RouteSetupError{Component: "system_routes", Err: err}
	}

	// Setup public routes
	if err := rm.setupPublicRoutes(); err != nil {
		return RouteSetupError{Component: "public_routes", Err: err}
	}

	// Setup authentication routes
	if err := rm.setupAuthRoutes(); err != nil {
		return RouteSetupError{Component: "auth_routes", Err: err}
	}

	// Setup generic API routes (dashboard, help-requests)
	if err := rm.setupGenericRoutes(); err != nil {
		return RouteSetupError{Component: "generic_routes", Err: err}
	}

	// Setup role-specific routes
	if err := rm.setupRoleSpecificRoutes(); err != nil {
		return RouteSetupError{Component: "role_routes", Err: err}
	}

	// Setup real-time and WebSocket routes
	if err := rm.setupRealtimeRoutes(); err != nil {
		return RouteSetupError{Component: "realtime_routes", Err: err}
	}

	// Log successful setup
	rm.logSetupComplete()
	return nil
}

// ================================================================
// INITIALIZATION
// ================================================================

// initializeSystem initializes system components required for routing
func (rm *RouteManager) initializeSystem() error {
	// Configure development-specific middleware
	rm.setupDevelopmentMiddleware()

	return nil
}

// setupDevelopmentMiddleware configures development-specific middleware
func (rm *RouteManager) setupDevelopmentMiddleware() {
	if os.Getenv("APP_ENV") != "production" && rm.config.EnableLogging {
		log.Println("Request logging enabled (development mode)")
		rm.router.Use(middleware.RequestLogger())
	}

	if gin.Mode() == gin.DebugMode {
		rm.router.POST("/debug", systemHandlers.DebugRequest)
		log.Println("Debug endpoint enabled (development mode)")
	}
}

// ================================================================
// MIDDLEWARE SETUP
// ================================================================

// setupSecurityMiddleware configures all security-related middleware
func (rm *RouteManager) setupSecurityMiddleware() error {
	if !rm.config.EnableSecurity {
		log.Println("Security middleware disabled by configuration")
		return nil
	}

	// Apply CORS middleware FIRST - this is critical for proper request handling
	if rm.config.EnableCORS {
		rm.router.Use(middleware.CORS())
	}

	// Create and apply enhanced error handler
	errorHandler := NewErrorHandler(rm.config.EnableDebug, true)
	rm.router.Use(errorHandler.ErrorHandlerMiddleware())
	rm.router.Use(errorHandler.RecoveryMiddleware())

	// Create and apply performance monitor
	performanceMonitor := NewPerformanceMonitor(500*time.Millisecond, true, true)
	rm.router.Use(performanceMonitor.PerformanceMiddleware())

	// Create and apply validation middleware
	validationConfig := DefaultValidationConfig()
	validationMiddleware := NewValidationMiddleware(validationConfig)
	rm.router.Use(validationMiddleware.ValidateRequest())

	// Add security headers middleware
	rm.router.Use(rm.securityHeadersMiddleware())

	// Create and apply security validator
	securityValidator := middleware.NewSecurityValidator()
	rm.router.Use(securityValidator.ValidateRequest())
	rm.router.Use(middleware.SanitizeInput())

	// Apply global rate limiting (prefer Redis-backed if available)
	if rm.config.EnableRateLimit {
		if jobs.RedisClient != nil {
			rm.router.Use(middleware.RedisAPIRateLimit())
		} else {
			rm.router.Use(middleware.APIRateLimit())
		}
	}

	// Add query optimization middleware for enhanced performance
	rm.router.Use(services.OptimizedQueryMiddleware())

	// Store middleware instances in router for access by handlers
	rm.router.Use(func(c *gin.Context) {
		c.Set("error_handler", errorHandler)
		c.Set("performance_monitor", performanceMonitor)
		c.Set("validation_middleware", validationMiddleware)
		c.Next()
	})

	// Add performance monitoring endpoints for admins
	adminGroup := rm.router.Group("/api/v1/admin")
	adminGroup.Use(rm.middlewares.AdminOnly()...)
	{
		adminGroup.GET("/performance/report", performanceMonitor.PerformanceReportHandler())
		adminGroup.GET("/performance/slow-queries", performanceMonitor.SlowQueriesHandler())
		adminGroup.POST("/performance/reset", performanceMonitor.ResetMetricsHandler())
	}

	return nil
}

// securityHeadersMiddleware creates security headers middleware
func (rm *RouteManager) securityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'")

		// Remove server information
		c.Header("Server", "")

		c.Next()
	}
}

// ================================================================
// ROUTE SETUP METHODS
// ================================================================

// setupSystemRoutes configures health checks and documentation
func (rm *RouteManager) setupSystemRoutes() error {
	return SetupSystemRoutes(rm.router)
}

// setupPublicRoutes configures routes that don't require authentication
func (rm *RouteManager) setupPublicRoutes() error {
	return SetupPublicRoutes(rm.router)
}

// setupAuthRoutes configures authentication routes
func (rm *RouteManager) setupAuthRoutes() error {
	if !rm.config.EnableAuth {
		log.Println("Authentication routes disabled by configuration")
		return nil
	}

	if err := SetupAuthRoutes(rm.router); err != nil {
		return err
	}
	SetupUserRoutes(rm.router)
	return nil
}

// setupGenericRoutes configures generic API routes for load testing
func (rm *RouteManager) setupGenericRoutes() error {
	return SetupGenericRoutes(rm.router)
}

// setupRoleSpecificRoutes configures role-based routes
func (rm *RouteManager) setupRoleSpecificRoutes() error {
	// Visitor routes
	if err := SetupVisitorRoutes(rm.router); err != nil {
		return err
	}

	// Donor routes
	SetupDonorRoutes(rm.router)

	// Volunteer routes
	if err := SetupVolunteerRoutes(rm.router); err != nil {
		return err
	}

	// Admin routes
	if err := SetupAdminRoutes(rm.router); err != nil {
		return err
	}

	return nil
}

// setupRealtimeRoutes configures WebSocket and real-time routes
func (rm *RouteManager) setupRealtimeRoutes() error {
	SetupRealTimeRoutes(rm.router)
	return nil
}

// ================================================================
// HELPER METHODS
// ================================================================

// logSetupComplete logs successful route configuration
func (rm *RouteManager) logSetupComplete() {
	log.Printf("✅ Routes configured successfully")
	log.Printf("📚 API documentation: %s/swagger/index.html", rm.config.BaseURL)
	log.Printf("📋 API specification: %s/swagger.json", rm.config.BaseURL)
	log.Printf("🔗 Base API URL: %s", APIBasePath)
	log.Printf("🔧 Configuration: Auth=%v, CORS=%v, RateLimit=%v, Security=%v",
		rm.config.EnableAuth, rm.config.EnableCORS, rm.config.EnableRateLimit, rm.config.EnableSecurity)
}

// ================================================================
// LEGACY SUPPORT (for backward compatibility)
// ================================================================

// These functions maintain backward compatibility with existing code
// They are implemented in their respective route files

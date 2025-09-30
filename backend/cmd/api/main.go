package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/geoo115/charity-management-system/internal/config"
	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/jobs"
	"github.com/geoo115/charity-management-system/internal/middleware"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/observability"
	"github.com/geoo115/charity-management-system/internal/routes"
	"github.com/geoo115/charity-management-system/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Set up logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting Lewisham Hub API server...")

	// Load configuration
	cfg, err := loadConfiguration()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize services
	if err := initializeServices(cfg); err != nil {
		log.Fatalf("Failed to initialize services: %v", err)
	}

	// Initialize observability
	if err := initializeObservability(cfg); err != nil {
		log.Printf("Warning: Failed to initialize observability: %v", err)
	}

	// Initialize notifications
	if err := notifications.Initialize(); err != nil {
		log.Printf("Warning: Failed to initialize notification service: %v", err)
	}

	// Set up and start the server
	router := setupServer(cfg)
	startServer(router, cfg.Port)
}

// loadConfiguration loads environment variables and configuration
func loadConfiguration() (*config.Config, error) {
	// Load environment variables
	if err := loadEnvironment(); err != nil {
		log.Printf("Warning: %v", err)
	}

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("failed to load configuration: %v", err)
	}

	return cfg, nil
}

// loadEnvironment attempts to load environment variables from .env files
func loadEnvironment() error {
	projectRoot := findProjectRoot()
	envPaths := []string{
		filepath.Join(projectRoot, ".env"),
		filepath.Join(projectRoot, "backend", ".env"),
		".env",
	}

	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Environment variables loaded from %s", path)
			return nil
		}
	}

	return fmt.Errorf("no .env file found in any of the expected locations")
}

// initializeServices sets up all required services
func initializeServices(cfg *config.Config) error {
	// Initialize Redis (optional)
	if err := initializeRedis(cfg); err != nil {
		log.Printf("Warning: Redis initialization failed: %v - continuing without Redis", err)
	}

	// Initialize database
	log.Println("Connecting to database...")
	dbConn, err := db.Connect()
	if err != nil {
		return fmt.Errorf("failed to initialize database: %v", err)
	}
	log.Println("Database connection successful")

	// Initialize admin user
	log.Println("Checking admin user...")
	if err := db.InitAdmin(dbConn); err != nil {
		log.Printf("Warning: Failed to initialize admin user: %v", err)
	}

	// Seed database if enabled via environment variable
	if os.Getenv("SEED_DB") == "true" {
		log.Println("Seeding database with test data...")
		if err := db.SeedDatabase(dbConn); err != nil {
			log.Printf("Warning: Failed to seed database: %v", err)
		} else {
			log.Println("Database seeding completed successfully")
		}
	}

	return nil
}

// initializeRedis sets up the Redis connection
func initializeRedis(cfg *config.Config) error {
	if err := jobs.InitializeRedis(cfg.RedisAddr, cfg.RedisPassword, 0); err != nil {
		return err
	}

	log.Println("Redis connection established successfully")
	return nil
}

// initializeObservability sets up monitoring and observability services
func initializeObservability(cfg *config.Config) error {
	// Initialize metrics service
	log.Println("Initializing Prometheus metrics service...")
	observability.NewMetricsService()

	// Initialize cache service (it auto-initializes on first use)
	log.Println("Initializing cache service...")
	cacheService := services.GetCacheService()
	if cacheService != nil {
		log.Println("Cache service initialized successfully")
	} else {
		log.Println("Cache service initialization failed - continuing without cache")
	}

	// Initialize tracing if enabled
	if cfg.Environment != "test" {
		log.Println("Initializing distributed tracing...")
		tracingConfig := observability.LoadTracingConfig()
		if tracingService, err := observability.NewTracingService(tracingConfig); err != nil {
			log.Printf("Warning: Tracing initialization failed: %v - continuing without tracing", err)
		} else if tracingService != nil {
			log.Println("Distributed tracing initialized successfully")
		}
	}

	return nil
}

// setupServer configures and returns the Gin router
func setupServer(cfg *config.Config) *gin.Engine {
	// Set application mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
		log.Println("Running in production mode")
	} else {
		log.Println("Running in development mode")
	}

	// Create router with default middleware
	router := gin.Default()

	// Apply global middleware
	router.Use(middleware.CORS())

	// Add observability middleware
	if observability.GetMetricsService() != nil {
		router.Use(observability.MetricsMiddleware())
		log.Println("Prometheus HTTP metrics middleware enabled")
	}

	// Add tracing middleware if available
	if tracingService := observability.GetTracingService(); tracingService != nil {
		router.Use(middleware.TracingMiddleware())
		log.Println("Distributed tracing middleware enabled")
	}

	// Setup standard routes
	routes.SetupRoutes(router)

	// Setup observability routes
	routes.RegisterMetricsRoutes(router)
	log.Println("Routes registered successfully")

	// Initialize background jobs if Redis is available
	if jobs.RedisClient != nil {
		jobs.StartBackgroundJobs()
		log.Println("Background jobs started")
	}

	return router
}

// startServer starts the HTTP server with graceful shutdown
func startServer(router *gin.Engine, port string) {
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

// findProjectRoot attempts to locate the project root directory
func findProjectRoot() string {
	workDir, err := os.Getwd()
	if err != nil {
		log.Printf("Warning: Unable to determine working directory: %v", err)
		return ""
	}

	dir := workDir
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return workDir
}

package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

// DB is the global database connection instance
var DB *gorm.DB

// DatabaseConfig holds database configuration with validation
type DatabaseConfig struct {
	Host     string `validate:"required"`
	Port     string `validate:"required,numeric"`
	User     string `validate:"required"`
	Password string `validate:"required"`
	DBName   string `validate:"required"`
	SSLMode  string `validate:"oneof=disable require verify-ca verify-full"`

	// Connection pool settings
	MaxOpenConns    int           `validate:"min=1,max=1000"`
	MaxIdleConns    int           `validate:"min=1,max=100"`
	ConnMaxLifetime time.Duration `validate:"min=1m"`
	ConnMaxIdleTime time.Duration `validate:"min=1m"`

	// Timeouts
	ConnectTimeout time.Duration `validate:"min=5s"`
	QueryTimeout   time.Duration `validate:"min=1s"`
}

// ConnectionManager handles database connection lifecycle
type ConnectionManager struct {
	config *DatabaseConfig
	db     *gorm.DB
	logger *log.Logger
}

// NewConnectionManager creates a new connection manager with validated configuration
func NewConnectionManager() (*ConnectionManager, error) {
	config, err := loadAndValidateConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load database configuration: %w", err)
	}

	return &ConnectionManager{
		config: config,
		logger: log.New(os.Stdout, "[DB] ", log.LstdFlags|log.Lshortfile),
	}, nil
}

// Connect establishes database connection with comprehensive setup
func (cm *ConnectionManager) Connect() (*gorm.DB, error) {
	cm.logger.Printf("Establishing database connection to %s:%s/%s",
		cm.config.Host, cm.config.Port, cm.config.DBName)

	// Ensure database exists
	if err := cm.ensureDatabaseExists(); err != nil {
		return nil, fmt.Errorf("database existence check failed: %w", err)
	}

	// Connect to application database
	db, err := cm.connectToDatabase()
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}

	// Configure connection pool
	if err := cm.configureConnectionPool(db); err != nil {
		return nil, fmt.Errorf("connection pool configuration failed: %w", err)
	}

	// Handle clean start if requested
	if cm.shouldCleanStart() {
		if err := cm.performCleanStart(db); err != nil {
			return nil, fmt.Errorf("clean start failed: %w", err)
		}
	}

	// Run migrations
	cm.logger.Println("Running database migrations...")
	if err := RunMigrations(db); err != nil {
		return nil, fmt.Errorf("migrations failed: %w", err)
	}

	// Start health monitoring
	go cm.startHealthMonitoring(db)

	cm.db = db
	DB = db
	cm.logger.Println("Database connection established successfully")
	return db, nil
}

// loadAndValidateConfig loads configuration from environment with validation
func loadAndValidateConfig() (*DatabaseConfig, error) {
	config := &DatabaseConfig{
		Host:     getEnvWithDefault("DB_HOST", "localhost"),
		Port:     getEnvWithDefault("DB_PORT", "5432"),
		User:     getEnvWithDefault("DB_USER", "postgres"),
		Password: os.Getenv("DB_PASSWORD"),
		DBName:   getEnvWithDefault("DB_NAME", "lewisham_hub"),
		SSLMode:  getEnvWithDefault("DB_SSL_MODE", "disable"),

		// Connection pool defaults
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 100),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 10),
		ConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", time.Hour),
		ConnMaxIdleTime: getEnvDuration("DB_CONN_MAX_IDLE_TIME", 10*time.Minute),

		// Timeout defaults
		ConnectTimeout: getEnvDuration("DB_CONNECT_TIMEOUT", 30*time.Second),
		QueryTimeout:   getEnvDuration("DB_QUERY_TIMEOUT", 30*time.Second),
	}

	// Validate required fields
	if config.Password == "" {
		return nil, fmt.Errorf("DB_PASSWORD environment variable is required")
	}

	// Validate port is numeric
	if _, err := strconv.Atoi(config.Port); err != nil {
		return nil, fmt.Errorf("DB_PORT must be a valid number: %w", err)
	}

	// Validate SSL mode
	validSSLModes := []string{"disable", "require", "verify-ca", "verify-full"}
	isValidSSL := false
	for _, mode := range validSSLModes {
		if config.SSLMode == mode {
			isValidSSL = true
			break
		}
	}
	if !isValidSSL {
		return nil, fmt.Errorf("DB_SSL_MODE must be one of: %v", validSSLModes)
	}

	return config, nil
}

// ensureDatabaseExists creates the database if it doesn't exist
func (cm *ConnectionManager) ensureDatabaseExists() error {
	ctx, cancel := context.WithTimeout(context.Background(), cm.config.ConnectTimeout)
	defer cancel()

	// Connect to postgres system database
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=postgres sslmode=%s",
		cm.config.Host, cm.config.Port, cm.config.User, cm.config.Password, cm.config.SSLMode)

	pgdb, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres system database: %w", err)
	}
	defer func() {
		if closeErr := pgdb.Close(); closeErr != nil {
			cm.logger.Printf("Warning: Failed to close postgres connection: %v", closeErr)
		}
	}()

	// Test connection with timeout
	if err := pgdb.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping postgres database: %w", err)
	}

	// Check if application database exists
	var exists bool
	query := "SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1)"
	if err := pgdb.QueryRowContext(ctx, query, cm.config.DBName).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	// Create database if it doesn't exist
	if !exists {
		cm.logger.Printf("Database %s doesn't exist, creating...", cm.config.DBName)
		createQuery := fmt.Sprintf("CREATE DATABASE %s", cm.config.DBName)
		if _, err := pgdb.ExecContext(ctx, createQuery); err != nil {
			return fmt.Errorf("failed to create database %s: %w", cm.config.DBName, err)
		}
		cm.logger.Printf("Database %s created successfully", cm.config.DBName)
	}

	return nil
}

// connectToDatabase establishes connection to the application database
func (cm *ConnectionManager) connectToDatabase() (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cm.config.Host, cm.config.Port, cm.config.User, cm.config.Password,
		cm.config.DBName, cm.config.SSLMode)

	// Configure GORM with optimized performance settings
	gormConfig := &gorm.Config{
		Logger: logger.New(
			cm.logger,
			logger.Config{
				SlowThreshold:             50 * time.Millisecond, // Reduced from 200ms for better performance monitoring
				LogLevel:                  logger.Error,          // Only log errors in production for better performance
				IgnoreRecordNotFoundError: true,
				Colorful:                  false,
			},
		),
		DisableForeignKeyConstraintWhenMigrating: true,
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false, // Use plural table names
		},
		SkipDefaultTransaction: true, // Better performance - skip auto transactions
		PrepareStmt:            true, // Prepare statements for better performance
		QueryFields:            true, // Query with explicit field names for better performance
		CreateBatchSize:        1000, // Batch size for bulk operations
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	return db, nil
}

// configureConnectionPool sets up optimal connection pool settings
func (cm *ConnectionManager) configureConnectionPool(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Apply connection pool configuration
	sqlDB.SetMaxOpenConns(cm.config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cm.config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cm.config.ConnMaxLifetime)
	sqlDB.SetConnMaxIdleTime(cm.config.ConnMaxIdleTime)

	cm.logger.Printf("Connection pool configured: MaxOpen=%d, MaxIdle=%d, MaxLifetime=%v, MaxIdleTime=%v",
		cm.config.MaxOpenConns, cm.config.MaxIdleConns,
		cm.config.ConnMaxLifetime, cm.config.ConnMaxIdleTime)

	return nil
}

// shouldCleanStart determines if a clean database start is requested
func (cm *ConnectionManager) shouldCleanStart() bool {
	cleanStart := os.Getenv("DB_CLEAN_START")
	return strings.ToLower(cleanStart) == "true"
}

// performCleanStart drops all tables and exits
func (cm *ConnectionManager) performCleanStart(db *gorm.DB) error {
	cm.logger.Println("Performing clean database start - dropping existing tables...")

	manager := NewMigrationManager(db)
	if err := manager.CleanDropAllTables(db); err != nil {
		return fmt.Errorf("failed to drop tables: %w", err)
	}

	cm.logger.Println("All tables dropped successfully. Please set DB_CLEAN_START=false in .env and restart.")
	os.Exit(0)
	return nil // Never reached
}

// startHealthMonitoring starts background health monitoring
func (cm *ConnectionManager) startHealthMonitoring(db *gorm.DB) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		if metrics, err := CheckHealth(db); err != nil {
			cm.logger.Printf("Health check failed: %v", err)
		} else {
			if !metrics.IsConnected {
				cm.logger.Printf("WARNING: Database connection lost!")
			} else if metrics.ResponseTime > 1*time.Second {
				cm.logger.Printf("WARNING: Slow database response: %v", metrics.ResponseTime)
			}

			// Log detailed metrics every 15 minutes
			if time.Now().Minute()%15 == 0 {
				cm.logger.Printf("DB Health: Connected=%v, ResponseTime=%v, OpenConns=%d/%d, IndexEfficiency=%.1f%%",
					metrics.IsConnected, metrics.ResponseTime,
					metrics.OpenConnections, metrics.MaxConnections, metrics.IndexEfficiency)
			}
		}
	}
}

// Close gracefully closes the database connection
func (cm *ConnectionManager) Close() error {
	if cm.db == nil {
		return nil
	}

	sqlDB, err := cm.db.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	cm.logger.Println("Closing database connection...")
	return sqlDB.Close()
}

// Legacy functions for backward compatibility
func LoadConfig() *DatabaseConfig {
	config, err := loadAndValidateConfig()
	if err != nil {
		log.Fatalf("Failed to load database configuration: %v", err)
	}
	return config
}

func Connect() (*gorm.DB, error) {
	cm, err := NewConnectionManager()
	if err != nil {
		return nil, err
	}
	return cm.Connect()
}

func GetDB() *gorm.DB {
	return DB
}

func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	return sqlDB.Close()
}

// Utility functions
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

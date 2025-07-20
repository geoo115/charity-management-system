package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"gorm.io/gorm"
)

// CharityMigrationManager handles simplified charity database migrations
type CharityMigrationManager struct {
	db      *gorm.DB
	logger  *log.Logger
	timeout time.Duration
}

// NewCharityMigrationManager creates a new charity migration manager
func NewCharityMigrationManager(db *gorm.DB) *CharityMigrationManager {
	return &CharityMigrationManager{
		db:      db,
		logger:  log.New(log.Writer(), "[CharityMigration] ", log.LstdFlags),
		timeout: 30 * time.Second,
	}
}

// RunCharityMigrations runs all charity database migrations
func (cmm *CharityMigrationManager) RunCharityMigrations() error {
	ctx, cancel := context.WithTimeout(context.Background(), cmm.timeout)
	defer cancel()

	cmm.logger.Println("Starting charity database migrations...")

	// Create charity tables in dependency order
	charityModels := []interface{}{
		// Core user model (no dependencies)
		&models.CharityUser{},

		// Core charity models (depend on CharityUser)
		&models.CharityHelpRequest{},
		&models.CharityDonation{},
		&models.CharityShift{},
		&models.CharityShiftAssignment{},
		&models.CharityDocument{},
		&models.CharityNotification{},
		&models.CharityFeedback{},
		&models.CharityVisit{},
		&models.CharitySystemConfig{},
	}

	// Migrate each model
	for i, model := range charityModels {
		cmm.logger.Printf("Migrating charity model %d/%d", i+1, len(charityModels))
		if err := cmm.db.WithContext(ctx).AutoMigrate(model); err != nil {
			return fmt.Errorf("failed to migrate charity model %d: %w", i+1, err)
		}
	}

	// Initialize default charity data
	if err := cmm.initializeCharityData(ctx); err != nil {
		return fmt.Errorf("failed to initialize charity data: %w", err)
	}

	cmm.logger.Println("Charity database migrations completed successfully")
	return nil
}

// initializeCharityData sets up essential charity system data
func (cmm *CharityMigrationManager) initializeCharityData(ctx context.Context) error {
	cmm.logger.Println("Initializing charity system data...")

	// Check if default admin user exists
	var adminCount int64
	cmm.db.WithContext(ctx).Model(&models.CharityUser{}).Where("role = ?", "admin").Count(&adminCount)

	if adminCount == 0 {
		// Create default admin user
		adminUser := &models.CharityUser{
			FirstName:     "Admin",
			LastName:      "User",
			Email:         "admin@charity.org",
			Password:      "$2a$10$default_hash_here", // Will be set properly in auth
			Role:          "admin",
			Status:        "active",
			EmailVerified: true,
		}

		if err := cmm.db.WithContext(ctx).Create(adminUser).Error; err != nil {
			return fmt.Errorf("failed to create default admin user: %w", err)
		}
		cmm.logger.Println("Created default admin user")
	}

	// Initialize system configuration
	defaultConfigs := []models.CharitySystemConfig{
		{
			Key:         "charity_name",
			Value:       "Community Charity",
			Description: "Organization name",
		},
		{
			Key:         "charity_address",
			Value:       "123 Charity Street, City, Postcode",
			Description: "Organization address",
		},
		{
			Key:         "charity_phone",
			Value:       "+44 123 456 7890",
			Description: "Organization phone number",
		},
		{
			Key:         "charity_email",
			Value:       "info@charity.org",
			Description: "Organization email",
		},
		{
			Key:         "max_volunteers_per_shift",
			Value:       "5",
			Description: "Maximum volunteers per shift",
		},
		{
			Key:         "help_request_expiry_hours",
			Value:       "24",
			Description: "Hours before help request expires",
		},
	}

	for _, config := range defaultConfigs {
		var existingConfig models.CharitySystemConfig
		if err := cmm.db.WithContext(ctx).Where("key = ?", config.Key).First(&existingConfig).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := cmm.db.WithContext(ctx).Create(&config).Error; err != nil {
					return fmt.Errorf("failed to create config %s: %w", config.Key, err)
				}
			} else {
				return fmt.Errorf("failed to check config %s: %w", config.Key, err)
			}
		}
	}

	cmm.logger.Println("Charity system data initialized successfully")
	return nil
}

// CleanCharityDatabase drops all charity tables for clean start
func (cmm *CharityMigrationManager) CleanCharityDatabase() error {
	cmm.logger.Println("Cleaning charity database...")

	// Drop tables in reverse dependency order
	charityTables := []string{
		"charity_system_configs",
		"charity_visits",
		"charity_feedback",
		"charity_notifications",
		"charity_documents",
		"charity_shift_assignments",
		"charity_shifts",
		"charity_donations",
		"charity_help_requests",
		"charity_users",
	}

	for _, table := range charityTables {
		cmm.logger.Printf("Dropping table: %s", table)
		if err := cmm.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)).Error; err != nil {
			cmm.logger.Printf("Warning: Failed to drop table %s: %v", table, err)
		}
	}

	cmm.logger.Println("Charity database cleaned successfully")
	return nil
}

// GetCharityMigrationStatus returns the status of charity migrations
func (cmm *CharityMigrationManager) GetCharityMigrationStatus() (map[string]interface{}, error) {
	var userCount, helpRequestCount, donationCount, shiftCount int64

	cmm.db.Model(&models.CharityUser{}).Count(&userCount)
	cmm.db.Model(&models.CharityHelpRequest{}).Count(&helpRequestCount)
	cmm.db.Model(&models.CharityDonation{}).Count(&donationCount)
	cmm.db.Model(&models.CharityShift{}).Count(&shiftCount)

	return map[string]interface{}{
		"charity_users":         userCount,
		"charity_help_requests": helpRequestCount,
		"charity_donations":     donationCount,
		"charity_shifts":        shiftCount,
		"migration_status":      "completed",
	}, nil
}

// RunCharityMigrations is a convenience function to run charity migrations
func RunCharityMigrations(db *gorm.DB) error {
	cmm := NewCharityMigrationManager(db)
	return cmm.RunCharityMigrations()
}

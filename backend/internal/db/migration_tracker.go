package db

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

// MigrationRecord tracks applied migrations
type MigrationRecord struct {
	ID          uint      `gorm:"primaryKey"`
	Version     string    `gorm:"uniqueIndex;not null"`
	Description string    `gorm:"not null"`
	AppliedAt   time.Time `gorm:"not null"`
	Success     bool      `gorm:"not null;default:true"`
	ErrorMsg    string    `gorm:"type:text"`
	Duration    int64     `gorm:"not null"` // milliseconds
}

// Migration represents a database migration
type Migration struct {
	Version     string
	Description string
	Up          func(*gorm.DB) error
	Down        func(*gorm.DB) error
}

// GetAppliedMigrations returns list of applied migrations
func GetAppliedMigrations(db *gorm.DB) ([]MigrationRecord, error) {
	// Ensure migration tracking table exists
	if err := db.AutoMigrate(&MigrationRecord{}); err != nil {
		return nil, fmt.Errorf("failed to create migration tracking table: %w", err)
	}

	var migrations []MigrationRecord
	if err := db.Order("applied_at asc").Find(&migrations).Error; err != nil {
		return nil, fmt.Errorf("failed to get applied migrations: %w", err)
	}

	return migrations, nil
}

// RecordMigration records a successful migration
func RecordMigration(db *gorm.DB, version, description string, duration time.Duration) error {
	record := MigrationRecord{
		Version:     version,
		Description: description,
		AppliedAt:   time.Now(),
		Success:     true,
		Duration:    duration.Milliseconds(),
	}

	if err := db.Create(&record).Error; err != nil {
		return fmt.Errorf("failed to record migration %s: %w", version, err)
	}

	log.Printf("Recorded migration: %s - %s (took %v)", version, description, duration)
	return nil
}

// RecordMigrationError records a failed migration
func RecordMigrationError(db *gorm.DB, version, description string, migrationError error, duration time.Duration) error {
	record := MigrationRecord{
		Version:     version,
		Description: description,
		AppliedAt:   time.Now(),
		Success:     false,
		ErrorMsg:    migrationError.Error(),
		Duration:    duration.Milliseconds(),
	}

	if err := db.Create(&record).Error; err != nil {
		return fmt.Errorf("failed to record migration error for %s: %w", version, err)
	}

	log.Printf("Recorded migration error: %s - %s (took %v): %v", version, description, duration, migrationError)
	return nil
}

// IsMigrationApplied checks if a migration has been successfully applied
func IsMigrationApplied(db *gorm.DB, version string) (bool, error) {
	var count int64
	err := db.Model(&MigrationRecord{}).
		Where("version = ? AND success = ?", version, true).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check migration status for %s: %w", version, err)
	}

	return count > 0, nil
}

// RunTrackedMigration runs a migration and tracks its execution
func RunTrackedMigration(db *gorm.DB, migration Migration) error {
	// Check if already applied
	applied, err := IsMigrationApplied(db, migration.Version)
	if err != nil {
		return err
	}

	if applied {
		log.Printf("Migration %s already applied, skipping", migration.Version)
		return nil
	}

	log.Printf("Running migration %s: %s", migration.Version, migration.Description)
	start := time.Now()

	// Run the migration
	if err := migration.Up(db); err != nil {
		duration := time.Since(start)
		RecordMigrationError(db, migration.Version, migration.Description, err, duration)
		return fmt.Errorf("migration %s failed: %w", migration.Version, err)
	}

	duration := time.Since(start)
	if err := RecordMigration(db, migration.Version, migration.Description, duration); err != nil {
		log.Printf("Warning: Failed to record migration %s: %v", migration.Version, err)
	}

	return nil
}

// GetMigrationHistory returns formatted migration history
func GetMigrationHistory(db *gorm.DB) (string, error) {
	migrations, err := GetAppliedMigrations(db)
	if err != nil {
		return "", err
	}

	if len(migrations) == 0 {
		return "No migrations found", nil
	}

	history := "Migration History:\n"
	history += "Version\t\tDescription\t\tApplied At\t\tSuccess\tDuration\n"
	history += "-------\t\t-----------\t\t----------\t\t-------\t--------\n"

	for _, m := range migrations {
		status := "✓"
		if !m.Success {
			status = "✗"
		}
		history += fmt.Sprintf("%s\t\t%s\t\t%s\t%s\t%dms\n",
			m.Version,
			m.Description,
			m.AppliedAt.Format("2006-01-02 15:04:05"),
			status,
			m.Duration,
		)
	}

	return history, nil
}

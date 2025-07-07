package db

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"gorm.io/gorm"
)

// MigrationManager handles database migrations with enhanced capabilities
type MigrationManager struct {
	db      *gorm.DB
	logger  *log.Logger
	timeout time.Duration
}

// MigrationResult contains the result of a migration execution
type MigrationResult struct {
	Version     string        `json:"version"`
	Description string        `json:"description"`
	Success     bool          `json:"success"`
	Duration    time.Duration `json:"duration"`
	Error       string        `json:"error,omitempty"`
	Timestamp   time.Time     `json:"timestamp"`
}

// NewMigrationManager creates a new migration manager
func NewMigrationManager(db *gorm.DB) *MigrationManager {
	return &MigrationManager{
		db:      db,
		logger:  log.New(log.Writer(), "[DB-Migration] ", log.LstdFlags|log.Lshortfile),
		timeout: 30 * time.Minute, // Default timeout for migrations
	}
}

// RunMigrations performs all database migrations in the correct order with enhanced tracking
func (mm *MigrationManager) RunMigrations() error {
	mm.logger.Println("Starting database migrations with enhanced tracking...")

	ctx, cancel := context.WithTimeout(context.Background(), mm.timeout)
	defer cancel()

	// Initialize migration tracking
	if err := mm.initializeMigrationTracking(ctx); err != nil {
		return fmt.Errorf("failed to initialize migration tracking: %w", err)
	}

	// Define all migrations in order with validation
	migrations := mm.defineMigrations()

	// Validate migration sequence
	if err := mm.validateMigrations(migrations); err != nil {
		return fmt.Errorf("migration validation failed: %w", err)
	}

	// Run each migration with comprehensive tracking
	results := make([]MigrationResult, 0, len(migrations))
	for _, migration := range migrations {
		result := mm.runSingleMigration(ctx, migration)
		results = append(results, result)

		if !result.Success {
			mm.logMigrationSummary(results)
			return fmt.Errorf("migration %s failed: %s", result.Version, result.Error)
		}
	}

	// Log migration summary
	mm.logMigrationSummary(results)

	// Log migration history
	if history, err := mm.getMigrationHistory(); err == nil {
		mm.logger.Println(history)
	}

	mm.logger.Println("Database migrations completed successfully")
	return nil
}

// initializeMigrationTracking ensures migration tracking table exists
func (mm *MigrationManager) initializeMigrationTracking(ctx context.Context) error {
	if err := mm.db.WithContext(ctx).AutoMigrate(&MigrationRecord{}); err != nil {
		return fmt.Errorf("failed to create migration tracking table: %w", err)
	}
	return nil
}

// defineMigrations returns all migrations in the correct order
func (mm *MigrationManager) defineMigrations() []Migration {
	return []Migration{
		{
			Version:     "001_enum_types",
			Description: "Create custom PostgreSQL enum types",
			Up:          mm.createEnumTypes,
			Down:        mm.dropEnumTypes,
		},
		{
			Version:     "002_base_models",
			Description: "Create all application models",
			Up:          mm.migrateModels,
			Down:        mm.dropAllTables,
		},
		// Temporarily disabled to avoid transaction issues
		// {
		// 	Version:     "003_database_indexes",
		// 	Description: "Create performance indexes",
		// 	Up:          mm.createIndexes,
		// 	Down:        mm.dropIndexes,
		// },
		{
			Version:     "004_volunteer_roles",
			Description: "Add volunteer role hierarchy fields",
			Up:          migrateVolunteerRoleFields,
			Down:        mm.rollbackVolunteerRoleFields,
		},
		{
			Version:     "005_default_data",
			Description: "Initialize default system data",
			Up:          initializeDefaultData,
			Down:        mm.cleanupDefaultData,
		},
	}
}

// validateMigrations performs validation on the migration sequence
func (mm *MigrationManager) validateMigrations(migrations []Migration) error {
	versions := make(map[string]bool)

	for _, migration := range migrations {
		// Check for duplicate versions
		if versions[migration.Version] {
			return fmt.Errorf("duplicate migration version: %s", migration.Version)
		}
		versions[migration.Version] = true

		// Validate migration structure
		if migration.Version == "" {
			return fmt.Errorf("migration version cannot be empty")
		}
		if migration.Description == "" {
			return fmt.Errorf("migration description cannot be empty for version %s", migration.Version)
		}
		if migration.Up == nil {
			return fmt.Errorf("migration up function cannot be nil for version %s", migration.Version)
		}
	}

	mm.logger.Printf("Validated %d migrations successfully", len(migrations))
	return nil
}

// runSingleMigration executes a single migration with comprehensive tracking
func (mm *MigrationManager) runSingleMigration(ctx context.Context, migration Migration) MigrationResult {
	result := MigrationResult{
		Version:     migration.Version,
		Description: migration.Description,
		Timestamp:   time.Now(),
	}

	// Check if already applied
	applied, err := mm.isMigrationApplied(ctx, migration.Version)
	if err != nil {
		result.Error = fmt.Sprintf("failed to check migration status: %v", err)
		return result
	}

	if applied {
		mm.logger.Printf("Migration %s already applied, skipping", migration.Version)
		result.Success = true
		return result
	}

	mm.logger.Printf("Running migration %s: %s", migration.Version, migration.Description)
	start := time.Now()

	// Create a transaction for the migration
	tx := mm.db.WithContext(ctx).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			result.Error = fmt.Sprintf("migration panicked: %v", r)
			result.Duration = time.Since(start)
		}
	}()

	// Run the migration within transaction
	if err := migration.Up(tx); err != nil {
		tx.Rollback()
		result.Error = err.Error()
		result.Duration = time.Since(start)
		mm.recordMigrationError(migration.Version, migration.Description, err, result.Duration)
		return result
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		result.Error = fmt.Sprintf("failed to commit migration: %v", err)
		result.Duration = time.Since(start)
		mm.recordMigrationError(migration.Version, migration.Description, err, result.Duration)
		return result
	}

	result.Duration = time.Since(start)
	result.Success = true

	// Record successful migration
	if err := mm.recordMigration(migration.Version, migration.Description, result.Duration); err != nil {
		mm.logger.Printf("Warning: Failed to record migration %s: %v", migration.Version, err)
	}

	return result
}

// isMigrationApplied checks if a migration has been successfully applied
func (mm *MigrationManager) isMigrationApplied(ctx context.Context, version string) (bool, error) {
	var count int64
	err := mm.db.WithContext(ctx).Model(&MigrationRecord{}).
		Where("version = ? AND success = ?", version, true).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check migration status for %s: %w", version, err)
	}

	return count > 0, nil
}

// recordMigration records a successful migration
func (mm *MigrationManager) recordMigration(version, description string, duration time.Duration) error {
	record := MigrationRecord{
		Version:     version,
		Description: description,
		AppliedAt:   time.Now(),
		Success:     true,
		Duration:    duration.Milliseconds(),
	}

	if err := mm.db.Create(&record).Error; err != nil {
		return fmt.Errorf("failed to record migration %s: %w", version, err)
	}

	mm.logger.Printf("Recorded migration: %s - %s (took %v)", version, description, duration)
	return nil
}

// recordMigrationError records a failed migration
func (mm *MigrationManager) recordMigrationError(version, description string, migrationError error, duration time.Duration) error {
	record := MigrationRecord{
		Version:     version,
		Description: description,
		AppliedAt:   time.Now(),
		Success:     false,
		ErrorMsg:    migrationError.Error(),
		Duration:    duration.Milliseconds(),
	}

	if err := mm.db.Create(&record).Error; err != nil {
		return fmt.Errorf("failed to record migration error for %s: %w", version, err)
	}

	mm.logger.Printf("Recorded migration error: %s - %s (took %v): %v", version, description, duration, migrationError)
	return nil
}

// logMigrationSummary logs a summary of migration results
func (mm *MigrationManager) logMigrationSummary(results []MigrationResult) {
	successful := 0
	failed := 0
	totalDuration := time.Duration(0)

	for _, result := range results {
		if result.Success {
			successful++
		} else {
			failed++
		}
		totalDuration += result.Duration
	}

	mm.logger.Printf("Migration Summary: %d successful, %d failed, total time: %v",
		successful, failed, totalDuration)

	if failed > 0 {
		mm.logger.Println("Failed migrations:")
		for _, result := range results {
			if !result.Success {
				mm.logger.Printf("  - %s: %s", result.Version, result.Error)
			}
		}
	}
}

// getMigrationHistory returns formatted migration history
func (mm *MigrationManager) getMigrationHistory() (string, error) {
	var migrations []MigrationRecord
	if err := mm.db.Order("applied_at asc").Find(&migrations).Error; err != nil {
		return "", fmt.Errorf("failed to get migration history: %w", err)
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
			truncateString(m.Description, 30),
			m.AppliedAt.Format("2006-01-02 15:04:05"),
			status,
			m.Duration,
		)
	}

	return history, nil
}

// Migration implementation functions

// createEnumTypes creates custom PostgreSQL enum types
func (mm *MigrationManager) createEnumTypes(db *gorm.DB) error {
	mm.logger.Println("Creating custom enum types...")

	enums := []struct {
		name   string
		values string
	}{
		{
			name:   "donation_type",
			values: "('monetary', 'goods')",
		},
		{
			name:   "donation_status",
			values: "('pending', 'received', 'cancelled')",
		},
	}

	for _, enum := range enums {
		if err := mm.createEnumIfNotExists(db, enum.name, enum.values); err != nil {
			return fmt.Errorf("failed to create enum %s: %w", enum.name, err)
		}
	}

	return nil
}

// createEnumIfNotExists creates an enum type if it doesn't exist
func (mm *MigrationManager) createEnumIfNotExists(db *gorm.DB, enumName, values string) error {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = ?)"
	if err := db.Raw(query, enumName).Scan(&exists).Error; err != nil {
		return fmt.Errorf("failed to check if enum %s exists: %w", enumName, err)
	}

	if !exists {
		mm.logger.Printf("Creating enum type: %s", enumName)
		createQuery := fmt.Sprintf("CREATE TYPE %s AS ENUM %s", enumName, values)
		if err := db.Exec(createQuery).Error; err != nil {
			return fmt.Errorf("failed to create enum %s: %w", enumName, err)
		}
	}

	return nil
}

// dropEnumTypes drops custom PostgreSQL enum types (rollback function)
func (mm *MigrationManager) dropEnumTypes(db *gorm.DB) error {
	mm.logger.Println("Dropping custom enum types...")

	enumTypes := []string{"donation_type", "donation_status"}
	for _, enumType := range enumTypes {
		if err := db.Exec(fmt.Sprintf("DROP TYPE IF EXISTS %s CASCADE", enumType)).Error; err != nil {
			mm.logger.Printf("Warning: Failed to drop enum type %s: %v", enumType, err)
		}
	}

	return nil
}

// migrateModels runs AutoMigrate for all application models
func (mm *MigrationManager) migrateModels(db *gorm.DB) error {
	mm.logger.Println("Running AutoMigrate for all models...")

	// Define models in dependency order
	modelGroups := [][]interface{}{
		// Core user models (no dependencies)
		{
			&models.User{},
			&models.SystemConfig{},
			&models.VisitCapacity{},
		},
		// Profile models (depend on User)
		{
			&models.VolunteerApplication{},
			&models.VolunteerProfile{},
			&models.StaffProfile{},
			&models.VisitorProfile{},
			&models.DonorProfile{},
			&models.UserNote{},
		},
		// Staff management models (depend on StaffProfile)
		{
			&models.StaffAssignment{},
			&models.StaffPerformanceMetric{},
			&models.StaffSchedule{},
		},
		// Request and support models
		{
			&models.HelpRequest{},
			&models.Visit{},
			&models.QueueEntry{},
			&models.Ticket{},
		},
		// Donation models
		{
			&models.Donation{},
			&models.DonationAppeal{},
			&models.RecurringDonation{},
		},
		// Volunteer shift models
		{
			&models.Shift{},
			&models.ShiftAssignment{},
			&models.ShiftReassignment{},
			&models.ShiftCancellation{},
			&models.VolunteerNoShow{},
		},
		// Extended models
		{
			&models.Task{},
			&models.TrainingModule{},
			&models.UserTraining{},
			&models.Announcement{},
			&models.AnnouncementRead{},
			&models.NotificationSettings{},
			&models.VolunteerNote{},
		},
		// Role hierarchy models
		{
			&models.VolunteerTeam{},
			&models.VolunteerTask{},
			&models.VolunteerMentorship{},
		},
		// Document and verification models
		{
			&models.Document{},
			&models.DocumentVerificationResult{},
			&models.DocumentVerificationRequest{},
			&models.DocumentAccessLog{},
			&models.Verification{},
		},
		// Notification models
		{
			&models.NotificationPreferences{},
			&models.NotificationTypePreference{},
			&models.Notification{},
			&models.ScheduledNotification{},
			&models.InAppNotification{},
			&models.NotificationLog{},
			&models.NotificationTemplate{},
			&models.NotificationHistory{},
			&models.PushSubscription{},
		},
		// System models
		{
			&models.RefreshToken{},
			&models.PasswordReset{},
			&models.AuditLog{},
			&models.Feedback{},
			&models.VisitFeedback{},
			&models.UrgentNeed{},
		},
		// Emergency management models
		{
			&models.EmergencyWorkflow{},
			&models.EmergencyIncident{},
			&models.EmergencyAlert{},
			&models.EmergencyMessageTemplate{},
			&models.EmergencyResource{},
		},
	}

	// Migrate each group
	for i, group := range modelGroups {
		mm.logger.Printf("Migrating model group %d (%d models)", i+1, len(group))
		if err := db.AutoMigrate(group...); err != nil {
			return fmt.Errorf("failed to migrate model group %d: %w", i+1, err)
		}
	}

	return nil
}

// dropAllTables drops all tables (rollback function)
func (mm *MigrationManager) dropAllTables(db *gorm.DB) error {
	return mm.CleanDropAllTables(db)
}

// CleanDropAllTables drops all known tables for clean start
func (mm *MigrationManager) CleanDropAllTables(db *gorm.DB) error {
	mm.logger.Println("Performing clean database start - dropping existing tables...")

	// Drop tables in reverse dependency order
	tables := []string{
		// Dependent tables first
		"audit_logs",
		"notification_logs",
		"notification_templates",
		"notification_histories",
		"notifications",
		"shift_assignments",
		"volunteer_tasks",
		"volunteer_teams",
		"volunteer_mentorships",
		"visit_feedbacks",
		"visits",
		"queue_entries",
		"help_requests",
		"donations",
		"documents",
		"verifications",
		"volunteer_profiles",
		"visitor_profiles",
		"donor_profiles",
		"volunteer_applications",
		"shifts",
		"tickets",
		"user_notes",

		// Core tables last
		"users",
		"system_configs",
		"visit_capacities",
	}

	for _, table := range tables {
		mm.logger.Printf("Dropping table: %s", table)
		if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)).Error; err != nil {
			mm.logger.Printf("Warning: Failed to drop table %s: %v", table, err)
		}
	}

	// Drop custom enum types
	enumTypes := []string{"donation_type", "donation_status"}
	for _, enumType := range enumTypes {
		mm.logger.Printf("Dropping enum type: %s", enumType)
		if err := db.Exec(fmt.Sprintf("DROP TYPE IF EXISTS %s CASCADE", enumType)).Error; err != nil {
			mm.logger.Printf("Warning: Failed to drop enum type %s: %v", enumType, err)
		}
	}

	return nil
}

// migrateVolunteerRoleFields adds the new volunteer role hierarchy fields to existing database
func migrateVolunteerRoleFields(db *gorm.DB) error {
	log.Println("Starting volunteer role hierarchy migration...")

	// Check if the new fields already exist
	if db.Migrator().HasColumn(&models.VolunteerProfile{}, "role_level") {
		log.Println("Volunteer role fields already exist, skipping migration")
		return nil
	}

	// Add new columns to volunteer_profiles table
	log.Println("Adding new volunteer role hierarchy columns...")

	// Add role_level column
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "role_level"); err != nil {
		return fmt.Errorf("failed to add role_level column: %w", err)
	}

	// Add specializations column
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "specializations"); err != nil {
		return fmt.Errorf("failed to add specializations column: %w", err)
	}

	// Add leadership_skills column
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "leadership_skills"); err != nil {
		return fmt.Errorf("failed to add leadership_skills column: %w", err)
	}

	// Add mentor_id column
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "mentor_id"); err != nil {
		return fmt.Errorf("failed to add mentor_id column: %w", err)
	}

	// Add team_members column
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "team_members"); err != nil {
		return fmt.Errorf("failed to add team_members column: %w", err)
	}

	// Add permission columns
	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "can_train_others"); err != nil {
		return fmt.Errorf("failed to add can_train_others column: %w", err)
	}

	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "can_manage_shifts"); err != nil {
		return fmt.Errorf("failed to add can_manage_shifts column: %w", err)
	}

	if err := db.Migrator().AddColumn(&models.VolunteerProfile{}, "emergency_response"); err != nil {
		return fmt.Errorf("failed to add emergency_response column: %w", err)
	}

	// Set default values for existing records
	log.Println("Setting default values for existing volunteer profiles...")

	result := db.Model(&models.VolunteerProfile{}).
		Where("role_level IS NULL OR role_level = ''").
		Updates(map[string]interface{}{
			"role_level":         models.VolunteerRoleGeneral,
			"can_train_others":   false,
			"can_manage_shifts":  false,
			"emergency_response": false,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to set default values: %w", result.Error)
	}

	log.Printf("Updated %d existing volunteer profiles with default role values", result.RowsAffected)

	// Create the new volunteer role tables
	log.Println("Creating new volunteer role tables...")

	if err := db.AutoMigrate(
		&models.VolunteerTeam{},
		&models.VolunteerTask{},
		&models.VolunteerMentorship{},
	); err != nil {
		return fmt.Errorf("failed to create volunteer role tables: %w", err)
	}

	// Create some sample data for demonstration
	if err := createSampleVolunteerRoleData(db); err != nil {
		log.Printf("Warning: Failed to create sample volunteer role data: %v", err)
	}

	log.Println("Volunteer role hierarchy migration completed successfully!")
	return nil
}

// initializeDefaultData initializes all default data
func initializeDefaultData(db *gorm.DB) error {
	log.Println("Initializing default data...")

	// Create default admin user
	if err := createDefaultAdmin(db); err != nil {
		return fmt.Errorf("failed to initialize admin user: %w", err)
	}

	// Create default system configuration
	if err := createDefaultSystemConfig(db); err != nil {
		return fmt.Errorf("failed to initialize system config: %w", err)
	}

	// Create default visit capacities
	if err := createDefaultVisitCapacities(db); err != nil {
		return fmt.Errorf("failed to initialize visit capacities: %w", err)
	}

	log.Println("Default data initialization completed")
	return nil
}

// createSampleVolunteerRoleData creates sample data for the new volunteer role system
func createSampleVolunteerRoleData(db *gorm.DB) error {
	// Check if sample data already exists
	var teamCount int64
	if err := db.Model(&models.VolunteerTeam{}).Count(&teamCount).Error; err != nil {
		return err
	}

	if teamCount > 0 {
		log.Println("Sample volunteer role data already exists, skipping")
		return nil
	}

	// Find some existing volunteers to promote
	var volunteers []models.VolunteerProfile
	if err := db.Preload("User").Where("status = ?", "active").Limit(5).Find(&volunteers).Error; err != nil {
		return err
	}

	if len(volunteers) == 0 {
		log.Println("No active volunteers found for sample data creation")
		return nil
	}

	// Promote first volunteer to lead
	if len(volunteers) > 0 {
		lead := &volunteers[0]
		lead.RoleLevel = models.VolunteerRoleLead
		lead.CanManageShifts = true
		lead.CanTrainOthers = true
		lead.EmergencyResponse = true
		lead.LeadershipSkills = "Team coordination, Crisis management, Training delivery"

		if err := db.Save(lead).Error; err != nil {
			log.Printf("Failed to promote volunteer %d to lead: %v", lead.ID, err)
		} else {
			log.Printf("Promoted volunteer %d (%s) to Lead", lead.ID, lead.User.Email)

			// Create a sample team for the lead
			team := models.VolunteerTeam{
				Name:        "Community Outreach Team",
				Description: "Handles community outreach and special events",
				LeadID:      lead.UserID,
				Members:     fmt.Sprintf("[%d]", lead.UserID),
				Active:      true,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			if err := db.Create(&team).Error; err != nil {
				log.Printf("Failed to create sample team: %v", err)
			} else {
				log.Printf("Created sample team: %s", team.Name)
			}

			// Create a sample task
			task := models.VolunteerTask{
				Title:       "Organize Monthly Community Event",
				Description: "Plan and coordinate the monthly community outreach event",
				AssignedTo:  lead.UserID,
				AssignedBy:  lead.UserID,
				Priority:    "high",
				Status:      "in_progress",
				DueDate:     timePtr(time.Now().AddDate(0, 0, 14)), // 2 weeks from now
				Notes:       "Focus on family-friendly activities and food distribution",
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			if err := db.Create(&task).Error; err != nil {
				log.Printf("Failed to create sample task: %v", err)
			} else {
				log.Printf("Created sample task: %s", task.Title)
			}
		}
	}

	// Promote second volunteer to specialized
	if len(volunteers) > 1 {
		specialized := &volunteers[1]
		specialized.RoleLevel = models.VolunteerRoleSpecialized
		specialized.CanTrainOthers = true
		specialized.Specializations = "Food handling, Dietary requirements, Nutrition counseling"

		if err := db.Save(specialized).Error; err != nil {
			log.Printf("Failed to promote volunteer %d to specialized: %v", specialized.ID, err)
		} else {
			log.Printf("Promoted volunteer %d (%s) to Specialized", specialized.ID, specialized.User.Email)

			// Create mentorship relationship if we have a third volunteer
			if len(volunteers) > 2 {
				mentorship := models.VolunteerMentorship{
					MentorID:  specialized.UserID,
					MenteeID:  volunteers[2].UserID,
					StartDate: time.Now(),
					Status:    "active",
					Notes:     "New volunteer orientation and training",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}

				if err := db.Create(&mentorship).Error; err != nil {
					log.Printf("Failed to create sample mentorship: %v", err)
				} else {
					log.Printf("Created mentorship: %d mentoring %d", specialized.UserID, volunteers[2].UserID)
				}

				// Set mentor for the third volunteer
				volunteers[2].MentorID = &specialized.UserID
				if err := db.Save(&volunteers[2]).Error; err != nil {
					log.Printf("Failed to set mentor for volunteer %d: %v", volunteers[2].ID, err)
				}
			}
		}
	}

	log.Println("Sample volunteer role data created successfully")
	return nil
}

// timePtr returns a pointer to a time.Time value
func timePtr(t time.Time) *time.Time {
	return &t
}

// rollbackVolunteerRoleFields removes volunteer role hierarchy fields
func (mm *MigrationManager) rollbackVolunteerRoleFields(db *gorm.DB) error {
	mm.logger.Println("Rolling back volunteer role hierarchy fields...")

	// Drop the role hierarchy tables
	tables := []string{"volunteer_mentorships", "volunteer_tasks", "volunteer_teams"}
	for _, table := range tables {
		if err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", table)).Error; err != nil {
			mm.logger.Printf("Warning: Failed to drop table %s: %v", table, err)
		}
	}

	// Remove columns from volunteer_profiles (if they exist)
	columns := []string{"role_level", "specializations", "leadership_skills", "mentor_id",
		"team_members", "can_train_others", "can_manage_shifts", "emergency_response"}

	for _, column := range columns {
		if db.Migrator().HasColumn(&models.VolunteerProfile{}, column) {
			if err := db.Migrator().DropColumn(&models.VolunteerProfile{}, column); err != nil {
				mm.logger.Printf("Warning: Failed to drop column %s: %v", column, err)
			}
		}
	}

	return nil
}

// cleanupDefaultData removes default system data (rollback function)
func (mm *MigrationManager) cleanupDefaultData(db *gorm.DB) error {
	mm.logger.Println("Cleaning up default data...")

	// Remove default system configurations
	if err := db.Where("key IN ?", []string{
		"app_version", "max_daily_visits", "operating_hours_start",
		"operating_hours_end", "emergency_contact_email",
	}).Delete(&models.SystemConfig{}).Error; err != nil {
		mm.logger.Printf("Warning: Failed to cleanup system configs: %v", err)
	}

	// Remove default visit capacities
	if err := db.Where("1=1").Delete(&models.VisitCapacity{}).Error; err != nil {
		mm.logger.Printf("Warning: Failed to cleanup visit capacities: %v", err)
	}

	return nil
}

// Legacy functions for backward compatibility
func RunMigrations(db *gorm.DB) error {
	manager := NewMigrationManager(db)
	return manager.RunMigrations()
}

// Helper functions
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

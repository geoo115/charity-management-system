package models

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// MigrationHelper provides utilities for migrating from existing models to enhanced versions
type MigrationHelper struct {
	DB *gorm.DB
}

// NewMigrationHelper creates a new migration helper
func NewMigrationHelper(db *gorm.DB) *MigrationHelper {
	return &MigrationHelper{DB: db}
}

// MigrateUserToEnhanced migrates data from existing User model to UserEnhanced
func (mh *MigrationHelper) MigrateUserToEnhanced() error {
	// First, ensure the enhanced tables exist
	if err := mh.DB.AutoMigrate(&UserEnhanced{}); err != nil {
		return fmt.Errorf("failed to create enhanced user table: %w", err)
	}

	// Migrate data in batches
	batchSize := 100
	offset := 0

	for {
		var existingUsers []User
		result := mh.DB.Limit(batchSize).Offset(offset).Find(&existingUsers)
		if result.Error != nil {
			return fmt.Errorf("failed to fetch existing users: %w", result.Error)
		}

		if len(existingUsers) == 0 {
			break // No more users to migrate
		}

		// Convert to enhanced users
		var enhancedUsers []UserEnhanced
		for _, user := range existingUsers {
			enhanced := mh.convertUserToEnhanced(user)
			enhancedUsers = append(enhancedUsers, enhanced)
		}

		// Insert enhanced users
		if err := mh.DB.Create(&enhancedUsers).Error; err != nil {
			return fmt.Errorf("failed to create enhanced users: %w", err)
		}

		offset += batchSize
		fmt.Printf("Migrated %d users (offset: %d)\n", len(existingUsers), offset)
	}

	return nil
}

// convertUserToEnhanced converts a User to UserEnhanced
func (mh *MigrationHelper) convertUserToEnhanced(user User) UserEnhanced {
	enhanced := UserEnhanced{
		AuditableModel: AuditableModel{
			BaseModel: BaseModel{
				ID:        user.ID,
				CreatedAt: user.CreatedAt,
				UpdatedAt: user.UpdatedAt,
				DeletedAt: user.DeletedAt,
			},
		},
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Email:     user.Email,
		Phone:     user.Phone,
		ContactInfo: ContactInfo{
			Phone:    user.Phone,
			Email:    user.Email,
			Address:  user.Address,
			City:     user.City,
			Postcode: user.Postcode,
			Country:  "UK", // Default for existing users
		},
		Role:            mh.normalizeRole(user.Role),
		Password:        user.Password,
		Status:          mh.normalizeStatus(user.Status),
		FirstLogin:      user.FirstLogin,
		LastLogin:       user.LastLogin,
		EmailVerified:   user.EmailVerified,
		EmailVerifiedAt: user.EmailVerifiedAt,
		PhoneVerified:   user.PhoneVerified,
		PhoneVerifiedAt: user.PhoneVerifiedAt,
		Metadata:        make(MetaData),
	}

	return enhanced
}

// normalizeRole converts legacy role format to new format
func (mh *MigrationHelper) normalizeRole(role string) string {
	roleMap := map[string]string{
		RoleAdminLegacy:      RoleAdmin,
		RoleVolunteerLegacy:  RoleVolunteer,
		RoleDonorLegacy:      RoleDonor,
		RoleVisitorLegacy:    RoleVisitor,
		RoleSuperAdminLegacy: RoleSuperAdmin,
		RoleUserLegacy:       RoleUser,
	}

	if normalized, exists := roleMap[role]; exists {
		return normalized
	}

	// Default to lowercase if no mapping found
	return strings.ToLower(role)
}

// normalizeStatus converts legacy status format to new format
func (mh *MigrationHelper) normalizeStatus(status string) string {
	// Normalize to lowercase and replace any legacy formats
	normalized := strings.ToLower(status)

	// Handle specific legacy mappings if needed
	statusMap := map[string]string{
		"active":      StatusActive,
		"inactive":    StatusInactive,
		"pending":     StatusPending,
		"suspended":   StatusSuspended,
		"deactivated": StatusDeactivated,
	}

	if mapped, exists := statusMap[normalized]; exists {
		return mapped
	}

	return normalized
}

// ValidateDataIntegrity checks if the migration was successful
func (mh *MigrationHelper) ValidateDataIntegrity() error {
	// Count records in both tables
	var originalCount, enhancedCount int64

	if err := mh.DB.Model(&User{}).Count(&originalCount).Error; err != nil {
		return fmt.Errorf("failed to count original users: %w", err)
	}

	if err := mh.DB.Model(&UserEnhanced{}).Count(&enhancedCount).Error; err != nil {
		return fmt.Errorf("failed to count enhanced users: %w", err)
	}

	if originalCount != enhancedCount {
		return fmt.Errorf("record count mismatch: original=%d, enhanced=%d", originalCount, enhancedCount)
	}

	// Sample validation - check a few records
	var users []User
	if err := mh.DB.Limit(10).Find(&users).Error; err != nil {
		return fmt.Errorf("failed to fetch sample users: %w", err)
	}

	for _, user := range users {
		var enhanced UserEnhanced
		if err := mh.DB.Where("id = ?", user.ID).First(&enhanced).Error; err != nil {
			return fmt.Errorf("enhanced user not found for ID %d: %w", user.ID, err)
		}

		// Validate key fields match
		if enhanced.Email != user.Email {
			return fmt.Errorf("email mismatch for user ID %d: original=%s, enhanced=%s",
				user.ID, user.Email, enhanced.Email)
		}
	}

	fmt.Printf("Data integrity validation passed: %d records migrated successfully\n", originalCount)
	return nil
}

// BackupData creates a backup of existing data before migration
func (mh *MigrationHelper) BackupData() error {
	timestamp := time.Now().Format("20060102_150405")
	backupTable := fmt.Sprintf("users_backup_%s", timestamp)

	// Create backup table
	sql := fmt.Sprintf(`
		CREATE TABLE %s AS 
		SELECT * FROM users
	`, backupTable)

	if err := mh.DB.Exec(sql).Error; err != nil {
		return fmt.Errorf("failed to create backup table: %w", err)
	}

	fmt.Printf("Backup created: %s\n", backupTable)
	return nil
}

// CleanupAfterMigration removes temporary data and optimizes tables
func (mh *MigrationHelper) CleanupAfterMigration() error {
	// Add indexes for performance
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_users_enhanced_email ON users_enhanced(email)",
		"CREATE INDEX IF NOT EXISTS idx_users_enhanced_role_status ON users_enhanced(role, status)",
		"CREATE INDEX IF NOT EXISTS idx_users_enhanced_created_at ON users_enhanced(created_at)",
		"CREATE INDEX IF NOT EXISTS idx_users_enhanced_last_login ON users_enhanced(last_login)",
	}

	for _, indexSQL := range indexes {
		if err := mh.DB.Exec(indexSQL).Error; err != nil {
			fmt.Printf("Warning: failed to create index: %v\n", err)
			// Continue with other indexes
		}
	}

	// Analyze tables for better query planning
	if err := mh.DB.Exec("ANALYZE users_enhanced").Error; err != nil {
		fmt.Printf("Warning: failed to analyze table: %v\n", err)
	}

	fmt.Println("Cleanup completed successfully")
	return nil
}

// MigrationReport provides a summary of the migration
func (mh *MigrationHelper) MigrationReport() (*MigrationSummary, error) {
	summary := &MigrationSummary{
		StartTime: time.Now(),
	}

	// Count original records
	if err := mh.DB.Model(&User{}).Count(&summary.OriginalRecords).Error; err != nil {
		return nil, fmt.Errorf("failed to count original records: %w", err)
	}

	// Count enhanced records
	if err := mh.DB.Model(&UserEnhanced{}).Count(&summary.MigratedRecords).Error; err != nil {
		return nil, fmt.Errorf("failed to count migrated records: %w", err)
	}

	// Count records by status
	statusCounts := make(map[string]int64)
	rows, err := mh.DB.Model(&UserEnhanced{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Rows()
	if err != nil {
		return nil, fmt.Errorf("failed to get status counts: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return nil, fmt.Errorf("failed to scan status count: %w", err)
		}
		statusCounts[status] = count
	}

	summary.StatusCounts = statusCounts
	summary.EndTime = time.Now()
	summary.Success = summary.OriginalRecords == summary.MigratedRecords

	return summary, nil
}

// MigrationSummary contains migration statistics
type MigrationSummary struct {
	StartTime       time.Time        `json:"start_time"`
	EndTime         time.Time        `json:"end_time"`
	OriginalRecords int64            `json:"original_records"`
	MigratedRecords int64            `json:"migrated_records"`
	StatusCounts    map[string]int64 `json:"status_counts"`
	Success         bool             `json:"success"`
}

func (ms *MigrationSummary) Duration() time.Duration {
	return ms.EndTime.Sub(ms.StartTime)
}

func (ms *MigrationSummary) String() string {
	return fmt.Sprintf(`
Migration Summary:
=================
Duration: %v
Original Records: %d
Migrated Records: %d
Success: %t
Status Breakdown: %+v
`, ms.Duration(), ms.OriginalRecords, ms.MigratedRecords, ms.Success, ms.StatusCounts)
}

// RunFullMigration executes the complete migration process
func (mh *MigrationHelper) RunFullMigration() error {
	fmt.Println("Starting full migration process...")

	// Step 1: Backup existing data
	fmt.Println("Step 1: Creating backup...")
	if err := mh.BackupData(); err != nil {
		return fmt.Errorf("backup failed: %w", err)
	}

	// Step 2: Migrate data
	fmt.Println("Step 2: Migrating data...")
	if err := mh.MigrateUserToEnhanced(); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	// Step 3: Validate integrity
	fmt.Println("Step 3: Validating data integrity...")
	if err := mh.ValidateDataIntegrity(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	// Step 4: Cleanup and optimize
	fmt.Println("Step 4: Cleanup and optimization...")
	if err := mh.CleanupAfterMigration(); err != nil {
		return fmt.Errorf("cleanup failed: %w", err)
	}

	// Step 5: Generate report
	fmt.Println("Step 5: Generating migration report...")
	report, err := mh.MigrationReport()
	if err != nil {
		return fmt.Errorf("report generation failed: %w", err)
	}

	fmt.Println(report.String())
	fmt.Println("Migration completed successfully!")

	return nil
}

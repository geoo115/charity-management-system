package db

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// createDefaultAdmin creates a default admin user if none exists
func createDefaultAdmin(db *gorm.DB) error {
	// Check if admin credentials are provided in environment
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	adminFirstName := os.Getenv("ADMIN_FIRST_NAME")
	adminLastName := os.Getenv("ADMIN_LAST_NAME")

	// Support legacy ADMIN_NAME for backward compatibility
	if adminFirstName == "" && adminLastName == "" {
		adminName := os.Getenv("ADMIN_NAME")
		if adminName != "" {
			parts := strings.SplitN(adminName, " ", 2)
			adminFirstName = parts[0]
			if len(parts) > 1 {
				adminLastName = parts[1]
			} else {
				adminLastName = "Admin"
			}
		}
	}

	// Set defaults if still empty
	if adminFirstName == "" {
		adminFirstName = "System"
	}
	if adminLastName == "" {
		adminLastName = "Admin"
	}

	if adminEmail == "" || adminPassword == "" {
		log.Println("Admin credentials not found in environment variables. Skipping admin initialization.")
		return nil
	}

	// Check if admin already exists
	var count int64
	if err := db.Model(&models.User{}).Where("email = ? OR role = ?", adminEmail, models.RoleAdmin).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check existing admin: %w", err)
	}

	if count > 0 {
		log.Println("Admin user already exists. Skipping admin initialization.")
		return nil
	}

	// Hash the admin password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create admin user
	admin := models.User{
		FirstName:     adminFirstName,
		LastName:      adminLastName,
		Email:         adminEmail,
		Password:      string(hashedPassword),
		Role:          models.RoleAdmin,
		Status:        models.StatusActive,
		EmailVerified: true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := db.Create(&admin).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	log.Printf("Admin user created successfully with email: %s", adminEmail)
	return nil
}

// InitAdmin is an alias for createDefaultAdmin for compatibility
func InitAdmin(db *gorm.DB) error {
	return createDefaultAdmin(db)
}

// createDefaultSystemConfig creates default system configuration
func createDefaultSystemConfig(db *gorm.DB) error {
	// Check if system config already exists
	var count int64
	if err := db.Model(&models.SystemConfig{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check existing system config: %w", err)
	}

	if count > 0 {
		log.Println("System configuration already exists. Skipping initialization.")
		return nil
	}

	// Create default system configuration
	config := models.SystemConfig{
		Key:         "app_version",
		Value:       "1.0.0",
		Description: "Application version",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.Create(&config).Error; err != nil {
		return fmt.Errorf("failed to create default system config: %w", err)
	}

	// Create additional default configs
	defaultConfigs := []models.SystemConfig{
		{
			Key:         "max_daily_visits",
			Value:       "50",
			Description: "Maximum number of daily visits allowed",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Key:         "operating_hours_start",
			Value:       "09:00",
			Description: "Daily operating hours start time",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Key:         "operating_hours_end",
			Value:       "17:00",
			Description: "Daily operating hours end time",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Key:         "emergency_contact_email",
			Value:       "emergency@lewishamdonationhub.org",
			Description: "Emergency contact email address",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, cfg := range defaultConfigs {
		if err := db.Create(&cfg).Error; err != nil {
			log.Printf("Warning: Failed to create config %s: %v", cfg.Key, err)
		}
	}

	log.Printf("Created %d default system configurations", len(defaultConfigs)+1)
	return nil
}

// createDefaultVisitCapacities creates default visit capacities for the next week
func createDefaultVisitCapacities(db *gorm.DB) error {
	// Check if we already have capacity records
	var count int64
	if err := db.Model(&models.VisitCapacity{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check existing visit capacities: %w", err)
	}

	if count > 0 {
		log.Println("Visit capacities already exist. Skipping initialization.")
		return nil
	}

	// Create capacity for next 7 days
	capacities := make([]models.VisitCapacity, 0, 7)
	for i := 0; i < 7; i++ {
		date := time.Now().AddDate(0, 0, i)
		dayOfWeek := date.Weekday()

		// Operating days are Tuesday, Wednesday, Thursday (configurable)
		isOperating := dayOfWeek >= time.Tuesday && dayOfWeek <= time.Thursday

		capacity := models.VisitCapacity{
			Date:                 date,
			DayOfWeek:            date.Format("Monday"),
			MaxFoodVisits:        getMaxVisitsByDay(dayOfWeek, "food"),
			MaxGeneralVisits:     getMaxVisitsByDay(dayOfWeek, "general"),
			CurrentFoodVisits:    0,
			CurrentGeneralVisits: 0,
			IsOperatingDay:       isOperating,
			CreatedAt:            time.Now(),
			UpdatedAt:            time.Now(),
		}

		capacities = append(capacities, capacity)
	}

	// Batch create capacities
	if err := db.Create(&capacities).Error; err != nil {
		return fmt.Errorf("failed to create visit capacities: %w", err)
	}

	log.Printf("Created %d default visit capacity records", len(capacities))
	return nil
}

// getMaxVisitsByDay returns the maximum visits allowed for a specific day and type
func getMaxVisitsByDay(dayOfWeek time.Weekday, visitType string) int {
	// Default capacities based on day of week
	defaultCapacities := map[time.Weekday]map[string]int{
		time.Monday:    {"food": 0, "general": 0},   // Closed
		time.Tuesday:   {"food": 50, "general": 20}, // Full capacity
		time.Wednesday: {"food": 50, "general": 20}, // Full capacity
		time.Thursday:  {"food": 50, "general": 20}, // Full capacity
		time.Friday:    {"food": 0, "general": 0},   // Closed
		time.Saturday:  {"food": 0, "general": 0},   // Closed
		time.Sunday:    {"food": 0, "general": 0},   // Closed
	}

	if dayCapacities, exists := defaultCapacities[dayOfWeek]; exists {
		if capacity, exists := dayCapacities[visitType]; exists {
			return capacity
		}
	}

	// Fallback to default values
	if visitType == "food" {
		return 50
	}
	return 20
}

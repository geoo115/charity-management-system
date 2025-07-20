package db

import (
	"fmt"
	"log"
	"os"
	"strings"

	"gorm.io/gorm"
)

// ConnectAndMigrate establishes a connection to the database and performs migrations
func ConnectAndMigrate() (*gorm.DB, error) {
	// Use the connection module for database connection
	db, err := Connect()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Drop tables if DB_CLEAN_START is true (handled in connection.go)
	// But we need to handle it here for migration specific clean start
	if cleanStart := os.Getenv("DB_CLEAN_START"); strings.ToLower(cleanStart) == "true" {
		log.Println("DB_CLEAN_START detected, tables will be dropped by connection.go")
	}

	// Run migrations using the new modular approach
	log.Println("Running database migrations...")
	if err := RunMigrations(db); err != nil {
		// If migration fails, log the specific error
		log.Printf("Migration error details: %v", err)
		return nil, fmt.Errorf("error running migrations: %w", err)
	}

	log.Println("Database setup completed successfully")
	return db, nil
}

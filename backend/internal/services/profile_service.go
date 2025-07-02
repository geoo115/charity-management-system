package services

import (
	"time"

	"github.com/geoo115/charity-management-system/internal/models"

	"gorm.io/gorm"
)

// ProfileService handles user profile operations
type ProfileService struct {
	db *gorm.DB
}

// NewProfileService creates a new profile service
func NewProfileService(db *gorm.DB) *ProfileService {
	return &ProfileService{db: db}
}

// GetUserWithProfile retrieves a user with their profile
func (ps *ProfileService) GetUserWithProfile(userID uint) (*models.User, interface{}, error) {
	var user models.User
	if err := ps.db.First(&user, userID).Error; err != nil {
		return nil, nil, err
	}

	// Try to get visitor profile
	var visitorProfile models.VisitorProfile
	if err := ps.db.Where("user_id = ?", userID).First(&visitorProfile).Error; err != nil {
		// Profile doesn't exist, create a default one and return user with empty profile
		visitorProfile = models.VisitorProfile{
			UserID:              userID,
			HouseholdSize:       0,
			DietaryRequirements: "",
			AccessibilityNeeds:  "",
		}
		// Try to create the profile in the database
		if createErr := ps.db.Create(&visitorProfile).Error; createErr != nil {
			// If creation fails, just return the user with the default profile (don't fail the request)
			return &user, &visitorProfile, nil
		}
	}

	return &user, &visitorProfile, nil
}

// GetVisitorLastVisits retrieves the last visit dates for a visitor
func (ps *ProfileService) GetVisitorLastVisits(userID uint) (*time.Time, *time.Time, error) {
	var lastFoodVisit, lastGeneralVisit *time.Time

	// Simplified approach - get last visits directly without complex JOINs
	// Get last completed visit for food category
	var visits []models.Visit
	if err := ps.db.Where("visitor_id = ? AND status = ?", userID, "completed").
		Order("created_at DESC").
		Limit(10).
		Find(&visits).Error; err == nil {

		// Find the most recent food and general visits
		for _, visit := range visits {
			// For now, we'll determine food vs general based on visit pattern
			// This is a simplified approach until we have proper category tracking
			if lastFoodVisit == nil {
				lastFoodVisit = &visit.CreatedAt
			}
			if lastGeneralVisit == nil {
				lastGeneralVisit = &visit.CreatedAt
			}
			if lastFoodVisit != nil && lastGeneralVisit != nil {
				break
			}
		}
	}

	return lastFoodVisit, lastGeneralVisit, nil
}

// UpdateVisitorProfile updates a visitor's profile
func (ps *ProfileService) UpdateVisitorProfile(userID uint, data map[string]interface{}) error {
	var profile models.VisitorProfile
	if err := ps.db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		// Create new profile if it doesn't exist
		profile = models.VisitorProfile{UserID: userID}
	}

	// Update fields from data map
	if householdSize, ok := data["household_size"].(float64); ok {
		profile.HouseholdSize = int(householdSize)
	}
	if dietaryReqs, ok := data["dietary_requirements"].(string); ok {
		profile.DietaryRequirements = dietaryReqs
	}
	if accessibilityNeeds, ok := data["accessibility_needs"].(string); ok {
		profile.AccessibilityNeeds = accessibilityNeeds
	}

	return ps.db.Save(&profile).Error
}

package donor

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/handlers_new/shared"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/notifications"
	"github.com/geoo115/LDH/internal/utils"
	"github.com/gin-gonic/gin"
)

// Request types for donor endpoints
type (
	// DonorRegistrationRequest represents donor registration data
	DonorRegistrationRequest struct {
		FirstName         string `json:"first_name" binding:"required"`
		LastName          string `json:"last_name" binding:"required"`
		Email             string `json:"email" binding:"required,email"`
		Phone             string `json:"phone"`
		Address           string `json:"address"`
		Postcode          string `json:"postcode"`
		PreferredContact  string `json:"preferred_contact"`
		GiftAidEligible   bool   `json:"gift_aid_eligible"`
		AnonymousDonation bool   `json:"anonymous_donation"`
		Password          string `json:"password" binding:"required,min=8"`
	}

	// ItemDonationRequest represents an item donation request
	ItemDonationRequest struct {
		Items        []DonationItem `json:"items" binding:"required"`
		DropoffDate  string         `json:"dropoff_date" binding:"required"`
		DropoffTime  string         `json:"dropoff_time" binding:"required"`
		SpecialNotes string         `json:"special_notes"`
		ContactInfo  ContactInfo    `json:"contact_info" binding:"required"`
	}

	// MonetaryDonationRequest represents a monetary donation
	MonetaryDonationRequest struct {
		Amount          float64     `json:"amount" binding:"required,min=1"`
		Currency        string      `json:"currency"`
		PaymentMethod   string      `json:"payment_method" binding:"required"`
		Designation     string      `json:"designation"`
		Recurring       bool        `json:"recurring"`
		RecurringPeriod string      `json:"recurring_period"`
		ContactInfo     ContactInfo `json:"contact_info" binding:"required"`
	}

	// DonationItem represents a single item being donated
	DonationItem struct {
		Category  string `json:"category" binding:"required"`
		Type      string `json:"type" binding:"required"`
		Quantity  int    `json:"quantity" binding:"required,min=1"`
		Condition string `json:"condition"`
		Notes     string `json:"notes"`
	}

	// ContactInfo represents donor contact information
	ContactInfo struct {
		Name  string `json:"name" binding:"required"`
		Email string `json:"email" binding:"required,email"`
		Phone string `json:"phone"`
	}
)

// RegisterDonor handles donor registration
// @Summary Register a new donor
// @Description Register a new donor account in the system
// @Tags donors
// @Accept json
// @Produce json
// @Param request body DonorRegistrationRequest true "Donor registration information"
// @Success 201 {object} gin.H
// @Failure 400 {object} gin.H "Invalid request"
// @Failure 409 {object} gin.H "Email already exists"
// @Failure 500 {object} gin.H "Server error"
// @Router /donors/register [post]
func RegisterDonor(c *gin.Context) {
	var req DonorRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for existing email
	var existingUser models.User
	if err := db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "An account with this email already exists",
		})
		return
	}

	// Create donor user
	user := models.User{
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		Postcode:      req.Postcode,
		Role:          models.RoleDonor,
		Status:        models.StatusActive,
		Password:      req.Password,
		EmailVerified: false,
		// Note: PreferredContact, GiftAidEligible, AnonymousDonation will be added to User model later
	}

	if err := user.HashPassword(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process registration"})
		return
	}

	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create donor account"})
		return
	}

	// Send welcome email
	go sendDonorWelcomeEmail(user)

	// Create audit log
	utils.CreateAuditLog(c, "Register", "Donor", user.ID, fmt.Sprintf("New donor registration: %s", user.Email))

	c.JSON(http.StatusCreated, gin.H{
		"message": "Donor registration successful! Welcome to the Lewishame Charity community.",
		"user_id": user.ID,
		"next_steps": []string{
			"Browse urgent needs on our website",
			"Schedule your first donation",
			"Join our newsletter for updates",
		},
	})
}

// GetUrgentNeeds returns current urgent donation needs
// @Summary Get current urgent donation needs
// @Description Returns a list of items that are urgently needed for donations
// @Tags donations
// @Produce json
// @Success 200 {object} gin.H
// @Router /donations/needs [get]
func GetUrgentNeeds(c *gin.Context) {
	// Return hardcoded urgent needs without using inventory system
	needs := []gin.H{
		{
			"id":              1,
			"category":        "Food",
			"name":            "Canned Goods",
			"description":     "Non-perishable canned food items",
			"urgency":         "High",
			"quantity_needed": 50,
			"why_needed":      "Running very low",
		},
		{
			"id":              2,
			"category":        "Clothing",
			"name":            "Winter Coats",
			"description":     "Warm winter coats for adults and children",
			"urgency":         "Critical",
			"quantity_needed": 30,
			"why_needed":      "Completely out of stock",
		},
		{
			"id":              3,
			"category":        "Toiletries",
			"name":            "Soap and Shampoo",
			"description":     "Personal hygiene items",
			"urgency":         "Medium",
			"quantity_needed": 100,
			"why_needed":      "Below minimum stock level",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"urgent_needs": needs,
		"total_items":  len(needs),
		"last_updated": time.Now(),
		"categories":   []string{"Food", "Clothing", "Toiletries", "Household"},
	})
}

// SubmitItemDonation handles item donation submissions
func SubmitItemDonation(c *gin.Context) {
	var req ItemDonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate dropoff date/time
	dropoffDateTime, err := validateDropoffSlot(req.DropoffDate, req.DropoffTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           "Invalid dropoff time",
			"details":         err.Error(),
			"available_slots": getAvailableDropoffSlots(req.DropoffDate),
		})
		return
	}

	// Get or create donor user
	var donor models.User
	userID, exists := c.Get("userID")
	if exists {
		db.DB.First(&donor, userID)
	} else {
		// Create guest donor record
		donor = models.User{
			FirstName: req.ContactInfo.Name,
			Email:     req.ContactInfo.Email,
			Phone:     req.ContactInfo.Phone,
			Role:      models.RoleDonor,
			Status:    "guest",
		}
		db.DB.Create(&donor)
	}

	// Create donation record
	donation := models.Donation{
		ContactEmail: req.ContactInfo.Email,
		ContactPhone: req.ContactInfo.Phone,
		Type:         models.DonationTypeGoods,
		Status:       models.DonationStatusPending,
		DropoffDate:  &dropoffDateTime,
		// Note: DonorName, SpecialNotes, Reference will be added to Donation model later
	}

	if err := db.DB.Create(&donation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit donation"})
		return
	}

	// Create individual donation items (placeholder for now)
	for _, item := range req.Items {
		// Note: DonationItem model will be created later
		log.Printf("Donation item: %+v", item)
	}

	// Send confirmation email
	go sendItemDonationConfirmation(donation, donor, req.Items)

	// Create audit log
	utils.CreateAuditLog(c, "Submit", "ItemDonation", donation.ID,
		fmt.Sprintf("Item donation submitted by %s for %s", req.ContactInfo.Name, req.DropoffDate))

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Item donation submitted successfully!",
		"reference": generateDonationReference(),
		"dropoff_details": gin.H{
			"date":     req.DropoffDate,
			"time":     req.DropoffTime,
			"location": "Lewishame Charity, 123 Lewisham High Street, SE13 6AA",
			"contact":  "donations@lewisham-hub.org",
		},
		"what_to_expect": []string{
			"You'll receive a confirmation email shortly",
			"Our team will be ready to receive your donation at the scheduled time",
			"Please bring this reference number with you",
			"Allow 15-30 minutes for the dropoff process",
		},
	})
}

// SubmitMonetaryDonation handles monetary donation processing
func SubmitMonetaryDonation(c *gin.Context) {
	var req MonetaryDonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default currency if not provided
	if req.Currency == "" {
		req.Currency = "GBP"
	}

	// Get or create donor user
	var donor models.User
	userID, exists := c.Get("userID")
	if exists {
		db.DB.First(&donor, userID)
	} else {
		// Create guest donor record
		donor = models.User{
			FirstName: req.ContactInfo.Name,
			Email:     req.ContactInfo.Email,
			Phone:     req.ContactInfo.Phone,
			Role:      models.RoleDonor,
			Status:    "guest",
		}
		db.DB.Create(&donor)
	}

	// Create donation record
	donation := models.Donation{
		ContactEmail:  req.ContactInfo.Email,
		ContactPhone:  req.ContactInfo.Phone,
		Type:          models.DonationTypeMoney,
		Amount:        req.Amount,
		Currency:      req.Currency,
		PaymentMethod: req.PaymentMethod,
		Status:        models.DonationStatusPending,
		// Note: DonorName, Designation, Recurring, RecurringPeriod, Reference will be added to Donation model later
	}

	if err := db.DB.Create(&donation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit donation"})
		return
	}

	// Process payment (integrate with Stripe/PayPal)
	paymentResult := processPayment(donation, req.PaymentMethod)
	if !paymentResult.Success {
		donation.Status = "failed" // Using string until models.DonationStatusFailed is defined
		db.DB.Save(&donation)

		c.JSON(http.StatusPaymentRequired, gin.H{
			"error":   "Payment processing failed",
			"details": paymentResult.Error,
		})
		return
	}

	// Update donation with payment details
	donation.Status = models.DonationStatusReceived
	// Note: PaymentID and ProcessedAt will be added to Donation model later
	db.DB.Save(&donation)

	// Send receipt and thank you
	go sendDonationReceipt(donation, donor)

	// Create audit log
	utils.CreateAuditLog(c, "Submit", "MonetaryDonation", donation.ID,
		fmt.Sprintf("Monetary donation of £%.2f submitted by %s", req.Amount, req.ContactInfo.Name))

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Donation processed successfully! Thank you for your generosity.",
		"reference": generateDonationReference(),
		"amount":    req.Amount,
		"currency":  req.Currency,
		"receipt": gin.H{
			"payment_id":   paymentResult.PaymentID,
			"processed_at": paymentResult.ProcessedAt,
			"receipt_url":  fmt.Sprintf("/receipts/%s", generateDonationReference()),
		},
		"impact": calculateDonationImpact(req.Amount),
	})
}

// GetDonorDashboard returns donor dashboard with history and impact
func GetDonorDashboard(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get donor's donation history
	var donations []models.Donation
	db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(10).
		Find(&donations)

	// Calculate impact metrics
	var totalMonetary float64
	var totalItems int
	var impactStats DonorImpactStats

	for _, donation := range donations {
		if donation.Type == models.DonationTypeMoney {
			totalMonetary += donation.Amount
		} else {
			// Count items - placeholder logic
			totalItems += 5 // Estimate items per donation
		}
	}

	// Calculate estimated impact
	impactStats = calculateDonorImpact(userID.(uint))

	// Get donor stats
	var totalDonated float64
	var donationCount int64
	db.DB.Model(&models.Donation{}).
		Where("user_id = ? AND status = 'completed'", userID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalDonated)

	db.DB.Model(&models.Donation{}).
		Where("user_id = ?", userID).
		Count(&donationCount)

	// Calculate current streak (months of consecutive donations)
	currentStreak := calculateDonorStreak(userID.(uint))

	// Get urgent needs
	urgentNeeds := getUpcomingNeedsForDonor()

	// Get upcoming dropoffs
	upcomingDropoffs := getUpcomingDropoffs(userID.(uint))

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"totalDonated":        totalDonated,
			"donationCount":       donationCount,
			"lastDonation":        time.Now().AddDate(0, 0, -5).Format(time.RFC3339), // Mock
			"impactScore":         85,                                                // Mock calculation
			"currentStreak":       currentStreak,
			"monetaryDonations":   int64(len(donations) * 3 / 4), // Mock
			"itemDonations":       int64(len(donations) / 4),     // Mock
			"totalMonetaryAmount": totalMonetary,
			"totalItems":          totalItems,
		},
		"recentDonations":  transformDonationsForDashboard(donations),
		"upcomingDropoffs": upcomingDropoffs,
		"urgentNeeds":      urgentNeeds,
		"impactMetrics": gin.H{
			"familiesHelped": impactStats.FamiliesHelped,
			"mealsProvided":  impactStats.MealsProvided,
			"peopleHelped":   impactStats.PeopleSupported,
			"co2Saved":       impactStats.CO2SavedKg,
			"communityScore": 92, // Mock
		},
		"recognition": gin.H{
			"currentLevel":   "Community Hero",
			"nextLevel":      "Community Guardian",
			"progressToNext": 75,
			"badges":         getDonorBadges(userID.(uint)),
		},
		"communityImpact": gin.H{
			"totalCommunityDonations": 45000.00,
			"totalCommunityDonors":    1250,
			"monthlyGoal":             5000.00,
			"monthlyProgress":         4200.00,
			"topCauses": []gin.H{
				{"name": "Food Security", "amount": 18000.00, "percentage": 40},
				{"name": "Emergency Support", "amount": 13500.00, "percentage": 30},
				{"name": "Education", "amount": 9000.00, "percentage": 20},
				{"name": "Healthcare", "amount": 4500.00, "percentage": 10},
			},
		},
	})
}

// GetDonorHistory returns comprehensive donation history
func GetDonorHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var donations []models.Donation
	if err := db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&donations).Error; err != nil {
		log.Printf("Error fetching donor donations: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch donations"})
		return
	}

	// Calculate totals
	var totalAmount float64
	db.DB.Model(&models.Donation{}).
		Where("user_id = ? AND status = 'completed'", userID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount)

	// Transform donations for history view
	var donationHistory []gin.H
	for _, donation := range donations {
		historyItem := gin.H{
			"id":          donation.ID,
			"type":        donation.Type,
			"date":        donation.CreatedAt.Format(time.RFC3339),
			"status":      donation.Status,
			"description": getDonationDescription(donation),
			"receipt":     fmt.Sprintf("REC-%d", donation.ID),
			"impact":      getDonationImpact(donation),
		}

		if donation.Type == models.DonationTypeMoney {
			historyItem["amount"] = donation.Amount
		} else {
			historyItem["items"] = parseDonationItems(donation.Goods)
		}

		donationHistory = append(donationHistory, historyItem)
	}

	// Calculate average donation
	averageDonation := 0.0
	if len(donations) > 0 {
		averageDonation = totalAmount / float64(len(donations))
	}

	c.JSON(http.StatusOK, gin.H{
		"donations":       donationHistory,
		"totalDonations":  len(donationHistory),
		"totalAmount":     totalAmount,
		"averageDonation": averageDonation,
	})
}

// GetDonorImpact returns detailed impact data
func GetDonorImpact(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get total donated amount
	var totalDonated float64
	db.DB.Model(&models.Donation{}).
		Where("user_id = ? AND status = 'completed'", userID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalDonated)

	// Get donation count
	var donationCount int64
	db.DB.Model(&models.Donation{}).
		Where("user_id = ?", userID).
		Count(&donationCount)

	// Calculate impact metrics
	impactStats := calculateDonorImpact(userID.(uint))

	// Generate impact timeline (last 12 months)
	impactTimeline := generateImpactTimeline(userID.(uint))

	// Generate category breakdown
	categoryBreakdown := generateCategoryBreakdown(userID.(uint))

	c.JSON(http.StatusOK, gin.H{
		"personalImpact": gin.H{
			"totalDonated":   totalDonated,
			"familiesHelped": impactStats.FamiliesHelped,
			"mealsProvided":  impactStats.MealsProvided,
			"peopleHelped":   impactStats.PeopleSupported,
			"co2Saved":       impactStats.CO2SavedKg,
			"communityScore": 92, // Mock
		},
		"impactTimeline":    impactTimeline,
		"categoryBreakdown": categoryBreakdown,
	})
}

// GetDonorRecognition returns recognition and achievements data
func GetDonorRecognition(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get total donated amount
	var totalDonated float64
	db.DB.Model(&models.Donation{}).
		Where("user_id = ? AND status = 'completed'", userID).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalDonated)

	// Determine current level
	currentLevel := determineDonorLevel(totalDonated)
	nextLevel := getNextDonorLevel(currentLevel)
	progressToNext := calculateProgressToNextLevel(totalDonated, currentLevel)

	// Get badges and achievements
	badges := getDonorBadges(userID.(uint))
	achievements := getDonorAchievements(userID.(uint))

	c.JSON(http.StatusOK, gin.H{
		"currentLevel": gin.H{
			"name":                 currentLevel,
			"icon":                 "🏆",
			"description":          getLevelDescription(currentLevel),
			"progress":             progressToNext,
			"nextLevel":            nextLevel,
			"nextLevelRequirement": getNextLevelRequirement(currentLevel),
		},
		"badges":       badges,
		"achievements": achievements,
	})
}

// GetDonorProfile returns donor profile and preferences
func GetDonorProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Get user information
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Mock profile data - in real implementation, this would come from database
	profileData := gin.H{
		"personalInfo": gin.H{
			"firstName":   user.FirstName,
			"lastName":    user.LastName,
			"email":       user.Email,
			"phone":       user.Phone,
			"address":     user.Address,
			"postcode":    user.Postcode,
			"memberSince": user.CreatedAt.Format("2006-01-02"),
			"lastLogin":   time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
		},
		"preferences": gin.H{
			"emailNotifications":    true,
			"smsNotifications":      false,
			"marketingEmails":       true,
			"impactReports":         true,
			"donationReminders":     false,
			"preferredContact":      "email",
			"communicationLanguage": "en",
			"timezone":              "GMT",
		},
		"paymentMethods": []gin.H{
			{
				"id":          1,
				"type":        "card",
				"lastFour":    "1234",
				"expiryMonth": 12,
				"expiryYear":  2025,
				"isDefault":   true,
				"brand":       "Visa",
			},
		},
		"recurringDonations": []gin.H{
			{
				"id":          1,
				"amount":      25.00,
				"frequency":   "monthly",
				"nextPayment": time.Now().AddDate(0, 1, 0).Format("2006-01-02"),
				"status":      "active",
				"category":    "general",
				"startDate":   time.Now().AddDate(0, -6, 0).Format("2006-01-02"),
			},
		},
	}

	c.JSON(http.StatusOK, profileData)
}

// Helper types and functions for donor workflow

// DonorImpactStats represents impact statistics for a donor
type DonorImpactStats struct {
	FamiliesHelped  int     `json:"families_helped"`
	MealsProvided   int     `json:"meals_provided"`
	PeopleSupported int     `json:"people_supported"`
	CO2SavedKg      float64 `json:"co2_saved_kg"`
}

// PaymentResult represents the result of a payment processing operation
type PaymentResult struct {
	Success     bool      `json:"success"`
	PaymentID   string    `json:"payment_id"`
	ProcessedAt time.Time `json:"processed_at"`
	Error       string    `json:"error,omitempty"`
}

// validateDropoffSlot validates a donation dropoff date and time
func validateDropoffSlot(date, timeSlot string) (time.Time, error) {
	// Parse date
	dropoffDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date format")
	}

	// Check if date is in the future
	if dropoffDate.Before(time.Now().AddDate(0, 0, 1)) {
		return time.Time{}, fmt.Errorf("dropoff must be at least 24 hours in advance")
	}

	// Check if it's a valid dropoff day (weekends)
	if dropoffDate.Weekday() != time.Saturday && dropoffDate.Weekday() != time.Sunday {
		return time.Time{}, fmt.Errorf("donations are only accepted on weekends")
	}

	// Parse time slot
	timeSlots := map[string]string{
		"morning":   "10:00",
		"afternoon": "14:00",
		"evening":   "17:00",
	}

	timeStr, exists := timeSlots[timeSlot]
	if !exists {
		return time.Time{}, fmt.Errorf("invalid time slot")
	}

	// Combine date and time
	dropoffDateTime, err := time.Parse("2006-01-02 15:04", fmt.Sprintf("%s %s", date, timeStr))
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to parse datetime")
	}

	return dropoffDateTime, nil
}

func getAvailableDropoffSlots(_ string) []gin.H {
	return []gin.H{
		{"slot": "morning", "time": "10:00 AM - 12:00 PM", "available": true},
		{"slot": "afternoon", "time": "2:00 PM - 4:00 PM", "available": true},
		{"slot": "evening", "time": "5:00 PM - 7:00 PM", "available": true},
	}
}

func generateDonationReference() string {
	now := time.Now()
	var count int64
	today := now.Format("2006-01-02")
	db.DB.Model(&models.Donation{}).Where("DATE(created_at) = ?", today).Count(&count)

	return fmt.Sprintf("DON%s%04d", now.Format("0102"), count+1)
}

func processPayment(donation models.Donation, _ string) PaymentResult {
	// Placeholder for payment processing integration
	// In a real implementation, this would integrate with Stripe, PayPal, etc.

	// Simulate successful payment
	return PaymentResult{
		Success:     true,
		PaymentID:   fmt.Sprintf("pay_%d_%d", donation.ID, time.Now().Unix()),
		ProcessedAt: time.Now(),
	}
}

func calculateDonationImpact(amount float64) gin.H {
	// Rough estimates for impact calculation
	return gin.H{
		"meals_provided":  int(amount / 3.50),  // £3.50 per meal estimate
		"families_helped": int(amount / 25.00), // £25 helps one family
		"message": fmt.Sprintf("Your £%.2f donation could provide approximately %d meals to families in need!",
			amount, int(amount/3.50)),
	}
}

func calculateDonorImpact(_ uint) DonorImpactStats {
	// Placeholder for comprehensive impact calculation
	return DonorImpactStats{
		FamiliesHelped:  15,
		MealsProvided:   120,
		PeopleSupported: 45,
		CO2SavedKg:      75.5,
	}
}

func getDonorAchievements(_ uint) []gin.H {
	// Placeholder for donor achievements system
	return []gin.H{
		{"title": "First Donation", "description": "Made your first donation", "earned": true},
		{"title": "Regular Supporter", "description": "Donated for 3 consecutive months", "earned": false},
		{"title": "Community Champion", "description": "Helped 50+ families", "earned": false},
	}
}

func getUpcomingNeedsForDonor() []gin.H {
	// Return upcoming seasonal or urgent needs
	return []gin.H{
		{"category": "Winter Clothing", "urgency": "High", "needed_by": "2024-12-01"},
		{"category": "School Supplies", "urgency": "Medium", "needed_by": "2024-09-01"},
	}
}

func estimateDonationValue(donorID uint) float64 {
	// Estimate total value of all donations (monetary + estimated item value)
	var total float64
	var donations []models.Donation

	db.DB.Where("user_id = ?", donorID).Find(&donations)

	for _, donation := range donations {
		if donation.Type == models.DonationTypeMoney {
			total += donation.Amount
		} else {
			// Estimate value of goods (placeholder logic)
			total += 50.0 // Rough estimate per item donation
		}
	}

	return total
}

// Notification functions
func sendDonorWelcomeEmail(donor models.User) {
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               donor.Email,
			Subject:          "Welcome to Lewishame Charity!",
			TemplateType:     "donor_welcome",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"FirstName": donor.FirstName,
				"LastName":  donor.LastName,
			},
		}

		if err := notificationService.SendNotification(data, donor); err != nil {
			log.Printf("Failed to send donor welcome email: %v", err)
		}
	}
}

func sendItemDonationConfirmation(donation models.Donation, donor models.User, items []DonationItem) {
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		dropoffDate := "TBD"
		dropoffTime := "TBD"
		if donation.DropoffDate != nil {
			dropoffDate = donation.DropoffDate.Format("Monday, January 2, 2006")
			dropoffTime = donation.DropoffDate.Format("3:04 PM")
		}

		data := notifications.NotificationData{
			To:               donor.Email,
			Subject:          "Donation Confirmed - " + generateDonationReference(),
			TemplateType:     "item_donation_confirmation",
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"FirstName":   donor.FirstName,
				"LastName":    donor.LastName,
				"Reference":   generateDonationReference(),
				"DropoffDate": dropoffDate,
				"DropoffTime": dropoffTime,
				"Items":       items,
			},
		}

		if err := notificationService.SendNotification(data, donor); err != nil {
			log.Printf("Failed to send item donation confirmation: %v", err)
		}
	}
}

func sendDonationReceipt(donation models.Donation, donor models.User) {
	// Mock email sending
	log.Printf("Sending donation receipt to %s for donation %d", donor.Email, donation.ID)
}

// Helper functions for enhanced donor dashboard

func calculateDonorStreak(userID uint) int {
	// Mock calculation - in real implementation, this would calculate consecutive months with donations
	return 6
}

func getUpcomingDropoffs(userID uint) []gin.H {
	// Mock upcoming dropoffs
	return []gin.H{
		{
			"id":          1,
			"date":        time.Now().AddDate(0, 0, 5).Format(time.RFC3339),
			"time":        "10:00 AM",
			"description": "Household items and books",
			"location":    "Main Hub - Lewisham",
		},
		{
			"id":          2,
			"date":        time.Now().AddDate(0, 0, 10).Format(time.RFC3339),
			"time":        "2:00 PM",
			"description": "Baby clothes and toys",
			"location":    "Main Hub - Lewisham",
		},
	}
}

func transformDonationsForDashboard(donations []models.Donation) []gin.H {
	var result []gin.H
	for _, donation := range donations {
		item := gin.H{
			"id":          donation.ID,
			"type":        donation.Type,
			"date":        donation.CreatedAt.Format(time.RFC3339),
			"status":      donation.Status,
			"description": getDonationDescription(donation),
		}

		if donation.Type == models.DonationTypeMoney {
			item["amount"] = donation.Amount
		} else {
			item["items"] = parseDonationItems(donation.Goods)
		}

		result = append(result, item)
	}
	return result
}

func getDonorBadges(userID uint) []gin.H {
	// Mock badges - in real implementation, this would check actual achievements
	return []gin.H{
		{"id": 1, "name": "First Donation", "icon": "🎯", "earned": true, "date": "2023-06-15"},
		{"id": 2, "name": "Monthly Giver", "icon": "📅", "earned": true, "date": "2023-08-01"},
		{"id": 3, "name": "Food Security Champion", "icon": "🍎", "earned": true, "date": "2023-09-20"},
		{"id": 4, "name": "Winter Warmth Hero", "icon": "🧥", "earned": true, "date": "2023-12-10"},
		{"id": 5, "name": "Community Legend", "icon": "⭐", "earned": false, "requirement": "Donate £2,500+"},
		{"id": 6, "name": "Emergency Responder", "icon": "🚨", "earned": false, "requirement": "5 emergency donations"},
	}
}

func getDonationDescription(donation models.Donation) string {
	if donation.Type == models.DonationTypeMoney {
		return "Monetary donation"
	}
	return "Item donation"
}

func getDonationImpact(donation models.Donation) string {
	if donation.Type == models.DonationTypeMoney {
		meals := int(donation.Amount / 5) // £5 per meal estimate
		return fmt.Sprintf("Provided %d meals for families", meals)
	}
	return "Kept families warm and supported"
}

func parseDonationItems(goods string) []string {
	// Mock parsing - in real implementation, this would parse the goods JSON
	return []string{"Clothing", "Books", "Toys"}
}

func generateImpactTimeline(userID uint) []gin.H {
	// Mock timeline - in real implementation, this would generate actual timeline data
	return []gin.H{
		{"month": "Jan 2024", "donations": 3, "impact": "Helped 5 families"},
		{"month": "Dec 2023", "donations": 2, "impact": "Provided 40 meals"},
		{"month": "Nov 2023", "donations": 4, "impact": "Supported education program"},
	}
}

func generateCategoryBreakdown(userID uint) []gin.H {
	// Mock breakdown - in real implementation, this would calculate actual category distribution
	return []gin.H{
		{"category": "Food Security", "amount": 600.00, "percentage": 48},
		{"category": "Emergency Support", "amount": 400.00, "percentage": 32},
		{"category": "Education", "amount": 200.00, "percentage": 16},
		{"category": "Healthcare", "amount": 50.50, "percentage": 4},
	}
}

func determineDonorLevel(totalDonated float64) string {
	if totalDonated >= 2500 {
		return "Community Legend"
	} else if totalDonated >= 1000 {
		return "Community Guardian"
	} else if totalDonated >= 500 {
		return "Community Hero"
	} else if totalDonated >= 250 {
		return "Community Champion"
	}
	return "Community Supporter"
}

func getNextDonorLevel(currentLevel string) string {
	switch currentLevel {
	case "Community Supporter":
		return "Community Champion"
	case "Community Champion":
		return "Community Hero"
	case "Community Hero":
		return "Community Guardian"
	case "Community Guardian":
		return "Community Legend"
	default:
		return ""
	}
}

func calculateProgressToNextLevel(totalDonated float64, currentLevel string) int {
	switch currentLevel {
	case "Community Supporter":
		return int((totalDonated / 250) * 100)
	case "Community Champion":
		return int((totalDonated / 500) * 100)
	case "Community Hero":
		return int((totalDonated / 1000) * 100)
	case "Community Guardian":
		return int((totalDonated / 2500) * 100)
	default:
		return 100
	}
}

func getLevelDescription(level string) string {
	switch level {
	case "Community Legend":
		return "You've donated over £2,500 and helped 50+ families"
	case "Community Guardian":
		return "You've donated over £1,000 and helped 20+ families"
	case "Community Hero":
		return "You've donated over £500 and helped 15+ families"
	case "Community Champion":
		return "You've donated over £250 and helped 5+ families"
	default:
		return "You've started your journey of giving"
	}
}

func getNextLevelRequirement(currentLevel string) float64 {
	switch currentLevel {
	case "Community Supporter":
		return 250
	case "Community Champion":
		return 500
	case "Community Hero":
		return 1000
	case "Community Guardian":
		return 2500
	default:
		return 0
	}
}

// GetDonorUrgentNeeds retrieves urgent needs relevant to donors
func GetDonorUrgentNeeds(c *gin.Context) {
	var urgentNeeds []models.UrgentNeed

	// Get only public, active urgent needs
	if err := db.DB.Where("is_public = ? AND status = ?", true, "active").
		Order("urgency DESC, created_at DESC").
		Find(&urgentNeeds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve urgent needs"})
		return
	}

	// Transform for donor view
	response := make([]gin.H, len(urgentNeeds))
	for i, need := range urgentNeeds {
		response[i] = gin.H{
			"id":               need.ID,
			"name":             need.Name,
			"category":         need.Category,
			"description":      need.Description,
			"current_stock":    need.CurrentStock,
			"target_stock":     need.TargetStock,
			"urgency":          need.Urgency,
			"due_date":         need.DueDate,
			"stock_percentage": need.GetStockPercentage(),
			"quantity_needed":  need.GetQuantityNeeded(),
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

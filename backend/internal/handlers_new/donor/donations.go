package donor

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/notifications"

	"github.com/gin-gonic/gin"
)

// CreateDonationRequest represents the request body for creating a donation
type CreateDonationRequest struct {
	Name         string  `json:"name" binding:"required"`
	ContactEmail string  `json:"contactEmail" binding:"required,email"`
	ContactPhone string  `json:"contactPhone"`
	Type         string  `json:"type" binding:"required,oneof=monetary goods"` // Standardized to 'monetary' and 'goods'
	Amount       float64 `json:"amount"`
	Goods        string  `json:"goods"` // Changed from 'Items' to 'Goods'
	Notes        string  `json:"notes"`
}

// CreateDonation handles donation creation
func CreateDonation(c *gin.Context) {
	var req CreateDonationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate donation type specific fields
	if req.Type == "monetary" && req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount is required for monetary donations"})
		return
	}
	if req.Type == "goods" && req.Goods == "" { // Changed from 'item' and 'Items'
		c.JSON(http.StatusBadRequest, gin.H{"error": "Goods description is required for goods donations"})
		return
	}

	// Create donation record
	donation := models.Donation{
		Name:         req.Name,
		ContactEmail: req.ContactEmail,
		ContactPhone: req.ContactPhone,
		Type:         req.Type,
		Amount:       req.Amount,
		Goods:        req.Goods, // Changed from 'Items'
		Status:       "pending",
		Notes:        req.Notes,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Save to database
	if err := db.DB.Create(&donation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create donation"})
		return
	}

	// Get user if exists
	var user models.User
	db.DB.Where("email = ?", req.ContactEmail).First(&user)

	// Send confirmation email
	config := notifications.NotificationConfig{
		Enabled: true,
	}
	notificationService, err := notifications.NewNotificationService(config)
	if err != nil {
		log.Printf("Failed to initialize notification service: %v", err)
	} else {
		if err := notificationService.SendDonationReceipt(donation, user); err != nil {
			// Log error but don't fail the request
			log.Printf("Failed to send donation receipt: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Donation received successfully",
		"donation": donation,
	})
}

// GetUserDonations returns donations made by a specific user
func GetUserDonations(c *gin.Context) {
	// Get user ID from path parameter
	userID := c.Param("id")

	// Convert to uint
	id, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists before querying donations
	var user models.User
	if err := db.DB.First(&user, id).Error; err != nil {
		// Make sure to return the same error structure as GetUserProfile for consistency
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if requesting user is authorized to access these donations
	requestingUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Allow access only to own donations or if admin
	var requestingRole interface{}
	requestingRole, _ = c.Get("userRole")
	if requestingUserID != uint(id) && requestingRole != "Admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	// Get donations from database
	var donations []models.Donation
	if err := db.DB.Where("user_id = ?", id).Order("created_at DESC").Find(&donations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch donations"})
		return
	}

	// Format response
	results := make([]gin.H, 0, len(donations))
	for _, donation := range donations {
		results = append(results, gin.H{
			"id":          donation.ID,
			"type":        donation.Type,
			"amount":      donation.Amount,
			"goods":       donation.Goods,
			"quantity":    donation.Quantity,
			"status":      donation.Status,
			"date":        donation.CreatedAt.Format(time.RFC3339),
			"createdAt":   donation.CreatedAt,
			"impactScore": donation.ImpactScore,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": results,
	})
}

// GetCurrentUserDonations returns donations made by the current authenticated user
func GetCurrentUserDonations(c *gin.Context) {
	// Get current user ID from JWT token
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get donations from database
	var donations []models.Donation
	if err := db.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&donations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch donations"})
		return
	}

	// Format response
	results := make([]gin.H, 0, len(donations))
	for _, donation := range donations {
		results = append(results, gin.H{
			"id":          donation.ID,
			"type":        donation.Type,
			"amount":      donation.Amount,
			"goods":       donation.Goods,
			"quantity":    donation.Quantity,
			"status":      donation.Status,
			"date":        donation.CreatedAt.Format(time.RFC3339),
			"createdAt":   donation.CreatedAt,
			"impactScore": donation.ImpactScore,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": results,
	})
}

// AdminListDonations returns all donations for admin users
func AdminListDonations(c *gin.Context) {
	// Parse query parameters for pagination and filtering
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	status := c.Query("status")
	donationType := c.Query("type")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	offset := (page - 1) * perPage

	// Build query
	query := db.DB.Model(&models.Donation{})

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if donationType != "" {
		query = query.Where("type = ?", donationType)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get donations with pagination
	var donations []models.Donation
	if err := query.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&donations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch donations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"donations": donations,
		"total":     total,
		"page":      page,
		"per_page":  perPage,
	})
}

// AdminUpdateDonationStatus updates the status of a donation
func AdminUpdateDonationStatus(c *gin.Context) {
	donationID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending received canceled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update donation status
	var donation models.Donation
	if err := db.DB.First(&donation, donationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Donation not found"})
		return
	}

	donation.Status = req.Status
	donation.UpdatedAt = time.Now()

	if err := db.DB.Save(&donation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update donation status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Donation status updated successfully",
		"donation": donation,
	})
}

// AdminSendDonationReceipt sends a receipt for a donation
func AdminSendDonationReceipt(c *gin.Context) {
	donationID := c.Param("id")

	var donation models.Donation
	if err := db.DB.First(&donation, donationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Donation not found"})
		return
	}

	// Get user if exists
	var user models.User
	db.DB.Where("email = ?", donation.ContactEmail).First(&user)

	// Send receipt with proper config
	config := notifications.NotificationConfig{
		Enabled: true,
	}
	notificationService, err := notifications.NewNotificationService(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize notification service"})
		return
	}

	if err := notificationService.SendDonationReceipt(donation, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send receipt"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Receipt sent successfully",
	})
}

// ScheduleDonationPickup schedules a pickup for a donation
func ScheduleDonationPickup(c *gin.Context) {
	var req struct {
		DonationID uint      `json:"donationId" binding:"required"`
		PickupTime time.Time `json:"pickupTime" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update donation with pickup details
	var donation models.Donation
	if err := db.DB.First(&donation, req.DonationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Donation not found"})
		return
	}

	// Note: PickupTime field needs to be added to models.Donation
	// For now, use Notes field to store pickup information
	donation.Notes = fmt.Sprintf("Pickup scheduled for: %s", req.PickupTime.Format("2006-01-02 15:04"))
	donation.Status = "scheduled"
	donation.UpdatedAt = time.Now()

	if err := db.DB.Save(&donation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule pickup"})
		return
	}

	// Send confirmation notification using existing dropoff method
	config := notifications.NotificationConfig{
		Enabled: true,
	}
	notificationService, err := notifications.NewNotificationService(config)
	if err != nil {
		log.Printf("Failed to initialize notification service: %v", err)
	} else {
		// Get user for notification
		var user models.User
		db.DB.Where("email = ?", donation.ContactEmail).First(&user)

		// Use existing SendDropoffConfirmation method as substitute
		if err := notificationService.SendDropoffConfirmation(donation, req.PickupTime, user); err != nil {
			log.Printf("Failed to send pickup confirmation: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Pickup scheduled successfully",
		"donation": donation,
	})
}

// AdminGetDonationAnalytics provides donation analytics for admin dashboard
func AdminGetDonationAnalytics(c *gin.Context) {
	// Get current month for monthly totals
	now := time.Now()
	currentMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	currentMonthEnd := currentMonthStart.AddDate(0, 1, 0).Add(-time.Second)

	// Total donations count
	var totalDonations int64
	db.DB.Model(&models.Donation{}).Count(&totalDonations)

	// Total amount (monetary donations only)
	var totalAmount float64
	db.DB.Model(&models.Donation{}).
		Where("type = ? AND status = ?", "monetary", "completed").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount)

	// Monthly total amount
	var monthlyTotal float64
	db.DB.Model(&models.Donation{}).
		Where("type = ? AND status = ? AND created_at >= ? AND created_at <= ?",
			"monetary", "completed", currentMonthStart, currentMonthEnd).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&monthlyTotal)

	// Status counts
	var pendingCount, completedCount, failedCount, refundedCount int64
	db.DB.Model(&models.Donation{}).Where("status = ?", "pending").Count(&pendingCount)
	db.DB.Model(&models.Donation{}).Where("status = ?", "completed").Count(&completedCount)
	db.DB.Model(&models.Donation{}).Where("status = ?", "failed").Count(&failedCount)
	db.DB.Model(&models.Donation{}).Where("status = ?", "refunded").Count(&refundedCount)

	// Top donors (last 12 months)
	type TopDonor struct {
		Name          string  `json:"name"`
		TotalAmount   float64 `json:"total_amount"`
		DonationCount int64   `json:"donation_count"`
	}

	var topDonors []TopDonor
	yearAgo := now.AddDate(-1, 0, 0)
	db.DB.Model(&models.Donation{}).
		Select("users.name, SUM(donations.amount) as total_amount, COUNT(*) as donation_count").
		Joins("LEFT JOIN users ON donations.user_id = users.id").
		Where("donations.created_at >= ? AND donations.type = ? AND donations.status = ?",
			yearAgo, "monetary", "completed").
		Group("users.id, users.name").
		Order("total_amount DESC").
		Limit(5).
		Scan(&topDonors)

	// Monthly trends (last 12 months)
	type MonthlyTrend struct {
		Month  string  `json:"month"`
		Amount float64 `json:"amount"`
		Count  int64   `json:"count"`
	}

	var monthlyTrends []MonthlyTrend
	for i := 11; i >= 0; i-- {
		monthStart := now.AddDate(0, -i, 0)
		monthStart = time.Date(monthStart.Year(), monthStart.Month(), 1, 0, 0, 0, 0, monthStart.Location())
		monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Second)

		var monthAmount float64
		var monthCount int64

		db.DB.Model(&models.Donation{}).
			Where("type = ? AND status = ? AND created_at >= ? AND created_at <= ?",
				"monetary", "completed", monthStart, monthEnd).
			Select("COALESCE(SUM(amount), 0)").
			Scan(&monthAmount)

		db.DB.Model(&models.Donation{}).
			Where("created_at >= ? AND created_at <= ?", monthStart, monthEnd).
			Count(&monthCount)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month:  monthStart.Format("2006-01"),
			Amount: monthAmount,
			Count:  monthCount,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_donations": totalDonations,
		"total_amount":    totalAmount,
		"monthly_total":   monthlyTotal,
		"pending_count":   pendingCount,
		"completed_count": completedCount,
		"failed_count":    failedCount,
		"refunded_count":  refundedCount,
		"top_donors":      topDonors,
		"monthly_trends":  monthlyTrends,
	})
}

package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AdminListDonations returns a paginated list of donations for admin
func AdminListDonations(c *gin.Context) {
	// Get query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	status := c.Query("status")

	// Ensure page is at least 1
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	// For now, return mock data that matches the expected format
	mockDonations := []gin.H{
		{
			"id":             "don_001",
			"donor_name":     "John Smith",
			"donor_email":    "john.smith@example.com",
			"amount":         50.00,
			"currency":       "GBP",
			"status":         "completed",
			"donation_date":  "2024-06-28",
			"payment_method": "card",
			"is_anonymous":   false,
			"receipt_sent":   true,
			"type":           "monetary",
			"created_at":     "2024-06-28T10:30:00Z",
			"updated_at":     "2024-06-28T10:30:00Z",
		},
		{
			"id":             "don_002",
			"donor_name":     "Anonymous",
			"donor_email":    "",
			"amount":         25.00,
			"currency":       "GBP",
			"status":         "pending",
			"donation_date":  "2024-06-28",
			"payment_method": "paypal",
			"is_anonymous":   true,
			"receipt_sent":   false,
			"type":           "monetary",
			"created_at":     "2024-06-28T09:15:00Z",
			"updated_at":     "2024-06-28T09:15:00Z",
		},
	}

	// Filter by status if provided
	filteredDonations := mockDonations
	if status != "" && status != "all" {
		var filtered []gin.H
		for _, donation := range mockDonations {
			if donation["status"] == status {
				filtered = append(filtered, donation)
			}
		}
		filteredDonations = filtered
	}

	// Calculate pagination
	total := len(filteredDonations)
	start := (page - 1) * perPage
	end := start + perPage
	if end > total {
		end = total
	}
	if start > total {
		start = total
	}

	paginatedDonations := filteredDonations[start:end]

	c.JSON(http.StatusOK, gin.H{
		"donations": paginatedDonations,
		"total":     total,
		"page":      page,
		"per_page":  perPage,
	})
}

// AdminGetDonationAnalytics returns donation analytics data
func AdminGetDonationAnalytics(c *gin.Context) {
	analytics := gin.H{
		"total_donations": 150,
		"total_amount":    7500.00,
		"monthly_total":   450.00,
		"pending_count":   5,
		"completed_count": 140,
		"failed_count":    3,
		"refunded_count":  2,
		"top_donors": []gin.H{
			{
				"name":           "John Smith",
				"total_amount":   500.00,
				"donation_count": 10,
			},
		},
		"monthly_trends": []gin.H{
			{
				"month":  "2024-06",
				"amount": 450.00,
				"count":  18,
			},
		},
	}

	c.JSON(http.StatusOK, analytics)
}

// AdminUpdateDonationStatus updates the status of a donation
func AdminUpdateDonationStatus(c *gin.Context) {
	donationID := c.Param("id")

	var request struct {
		Status string `json:"status" binding:"required,oneof=pending completed failed refunded"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	// In a real implementation, this would update the database
	// For now, just return success
	c.JSON(http.StatusOK, gin.H{
		"message":     "Donation status updated successfully",
		"donation_id": donationID,
		"new_status":  request.Status,
	})
}

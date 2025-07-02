package visitor

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SubmitFeedback handles general feedback submission (not tied to specific visit)
func SubmitFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Subject     string `json:"subject" binding:"required"`
		Message     string `json:"message" binding:"required"`
		Category    string `json:"category"`
		Rating      int    `json:"rating" binding:"min=1,max=5"`
		ContactBack bool   `json:"contact_back"`
		Anonymous   bool   `json:"anonymous"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create general feedback record using available fields
	feedback := models.VisitFeedback{
		VisitorID:       userID.(uint),
		OverallRating:   req.Rating,
		ServiceCategory: req.Category,
		Status:          "submitted",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := db.DB.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit feedback"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Submit", "GeneralFeedback", feedback.ID,
		fmt.Sprintf("General feedback submitted: %s", req.Subject))

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Feedback submitted successfully",
		"feedback_id": feedback.ID,
		"next_steps": []string{
			"Thank you for your feedback",
			"We review all feedback within 2-3 business days",
		},
	})
}

// SubmitVisitorFeedback handles visitor feedback submission
func SubmitVisitorFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Subject     string `json:"subject" binding:"required"`
		Message     string `json:"message" binding:"required"`
		Category    string `json:"category"`
		Rating      int    `json:"rating" binding:"min=1,max=5"`
		ContactBack bool   `json:"contact_back"`
		Anonymous   bool   `json:"anonymous"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create feedback record using the Feedback model instead of VisitFeedback
	feedback := models.Feedback{
		UserID:      userID.(uint),
		Type:        models.FeedbackTypeGeneral,
		Rating:      req.Rating,
		Subject:     req.Subject,
		Message:     req.Message,
		Category:    req.Category,
		IsAnonymous: req.Anonymous,
		Status:      "submitted",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := db.DB.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit feedback"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Submit", "VisitorFeedback", feedback.ID,
		fmt.Sprintf("Visitor feedback submitted: %s", req.Subject))

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Feedback submitted successfully",
		"feedback_id": feedback.ID,
		"next_steps": []string{
			"Thank you for your feedback",
			"We review all feedback within 2-3 business days",
		},
	})
}

// GetVisitorFeedbackHistory returns feedback history for authenticated visitor
func GetVisitorFeedbackHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var feedbacks []models.Feedback
	if err := db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&feedbacks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve feedback history"})
		return
	}

	// Transform to response format
	var response []gin.H
	for _, feedback := range feedbacks {
		response = append(response, gin.H{
			"id":         feedback.ID,
			"subject":    feedback.Subject,
			"category":   feedback.Category,
			"rating":     feedback.Rating,
			"status":     feedback.Status,
			"created_at": feedback.CreatedAt,
			"response":   feedback.Response,
		})
	}

	c.JSON(http.StatusOK, response)
}

// GetVisitorDashboard returns visitor dashboard data
func GetVisitorDashboard(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("🔍 Dashboard Debug: UserID = %v (type: %T)\n", userID, userID)

	// Get visitor stats
	var stats struct {
		TotalVisits     int64 `json:"total_visits"`
		PendingRequests int64 `json:"pending_requests"`
		CompletedVisits int64 `json:"completed_visits"`
		UpcomingTickets int64 `json:"upcoming_tickets"`
	}

	// Count total visits with debugging
	visitResult := db.DB.Model(&models.Visit{}).Where("visitor_id = ?", userID).Count(&stats.TotalVisits)
	fmt.Printf("🔍 Dashboard Debug: Total visits query result: %v, count: %d\n", visitResult.Error, stats.TotalVisits)

	// Count pending help requests with debugging
	pendingResult := db.DB.Model(&models.HelpRequest{}).
		Where("visitor_id = ? AND status = ?", userID, models.HelpRequestStatusPending).
		Count(&stats.PendingRequests)
	fmt.Printf("🔍 Dashboard Debug: Pending requests query result: %v, count: %d\n", pendingResult.Error, stats.PendingRequests)

	// Count completed visits with debugging
	completedResult := db.DB.Model(&models.Visit{}).
		Where("visitor_id = ? AND check_out_time IS NOT NULL", userID).
		Count(&stats.CompletedVisits)
	fmt.Printf("🔍 Dashboard Debug: Completed visits query result: %v, count: %d\n", completedResult.Error, stats.CompletedVisits)

	// Count upcoming tickets with debugging
	upcomingResult := db.DB.Model(&models.HelpRequest{}).
		Where("visitor_id = ? AND status = ? AND visit_day >= ?",
			userID, models.HelpRequestStatusTicketIssued, time.Now().Format("2006-01-02")).
		Count(&stats.UpcomingTickets)
	fmt.Printf("🔍 Dashboard Debug: Upcoming tickets query result: %v, count: %d\n", upcomingResult.Error, stats.UpcomingTickets)

	// Check if there are ANY help requests for this user
	var totalHelpRequests int64
	totalResult := db.DB.Model(&models.HelpRequest{}).Where("visitor_id = ?", userID).Count(&totalHelpRequests)
	fmt.Printf("🔍 Dashboard Debug: Total help requests for user: %d (query result: %v)\n", totalHelpRequests, totalResult.Error)

	// Check if there are ANY visits for this user
	var totalVisitsCheck int64
	totalVisitsResult := db.DB.Model(&models.Visit{}).Where("visitor_id = ?", userID).Count(&totalVisitsCheck)
	fmt.Printf("🔍 Dashboard Debug: Total visits check for user: %d (query result: %v)\n", totalVisitsCheck, totalVisitsResult.Error)

	// Get recent activity
	var recentActivity []gin.H
	var helpRequests []models.HelpRequest
	if err := db.DB.Where("visitor_id = ?", userID).
		Order("created_at DESC").Limit(5).Find(&helpRequests).Error; err == nil {

		fmt.Printf("🔍 Dashboard Debug: Found %d recent help requests\n", len(helpRequests))
		for _, hr := range helpRequests {
			recentActivity = append(recentActivity, gin.H{
				"type":        "help_request",
				"description": fmt.Sprintf("%s support request", hr.Category),
				"status":      hr.Status,
				"date":        hr.CreatedAt.Format("2006-01-02"),
				"reference":   hr.Reference,
			})
		}
	} else {
		fmt.Printf("🔍 Dashboard Debug: Error fetching recent activity: %v\n", err)
	}

	// Get document verification status
	var docStatus struct {
		PhotoIDApproved      bool `json:"photo_id_approved"`
		ProofAddressApproved bool `json:"proof_address_approved"`
		VerificationComplete bool `json:"verification_complete"`
	}

	var documents []models.Document
	if err := db.DB.Where("user_id = ? AND type IN ?", userID,
		[]string{models.DocumentTypeID, models.DocumentTypeProofAddress}).Find(&documents).Error; err == nil {

		fmt.Printf("🔍 Dashboard Debug: Found %d documents\n", len(documents))
		for _, doc := range documents {
			fmt.Printf("🔍 Dashboard Debug: Document type: %s, status: %s\n", doc.Type, doc.Status)
			if doc.Status == models.DocumentStatusApproved {
				switch doc.Type {
				case models.DocumentTypeID:
					docStatus.PhotoIDApproved = true
				case models.DocumentTypeProofAddress:
					docStatus.ProofAddressApproved = true
				}
			}
		}
	} else {
		fmt.Printf("🔍 Dashboard Debug: Error fetching documents: %v\n", err)
	}
	docStatus.VerificationComplete = docStatus.PhotoIDApproved && docStatus.ProofAddressApproved

	// Get next steps
	nextSteps := getVisitorNextSteps(docStatus.VerificationComplete, stats.PendingRequests > 0, stats.UpcomingTickets > 0)

	response := gin.H{
		"stats":               stats,
		"recent_activity":     recentActivity,
		"verification_status": docStatus,
		"next_steps":          nextSteps,
		"quick_actions": []gin.H{
			{"title": "Submit Help Request", "path": "/visitor/help-request", "available": docStatus.VerificationComplete},
			{"title": "Upload Documents", "path": "/visitor/documents", "available": !docStatus.VerificationComplete},
			{"title": "View Visit History", "path": "/visitor/visits", "available": true},
			{"title": "Check Queue Status", "path": "/visitor/queue", "available": stats.UpcomingTickets > 0},
		},
	}

	fmt.Printf("🔍 Dashboard Debug: Final response: %+v\n", response)
	c.JSON(http.StatusOK, response)
}

// GetQueueStatus returns current queue status for visitors
func GetQueueStatus(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if user has active queue position
	var queuePosition *int
	var totalInQueue int64
	var estimatedWait *int

	// Get total people in queue
	db.DB.Model(&models.HelpRequest{}).
		Where("status = ? AND visit_day = ?", models.HelpRequestStatusTicketIssued, time.Now().Format("2006-01-02")).
		Count(&totalInQueue)

	// Check if user has active position
	var userRequest models.HelpRequest
	if err := db.DB.Where("visitor_id = ? AND status = ? AND visit_day = ?",
		userID, models.HelpRequestStatusTicketIssued, time.Now().Format("2006-01-02")).
		First(&userRequest).Error; err == nil {

		// Calculate position (simplified logic)
		var earlierRequests int64
		db.DB.Model(&models.HelpRequest{}).
			Where("status = ? AND visit_day = ? AND created_at < ?",
				models.HelpRequestStatusTicketIssued, time.Now().Format("2006-01-02"), userRequest.CreatedAt).
			Count(&earlierRequests)

		position := int(earlierRequests + 1)
		queuePosition = &position

		// Estimate wait time (10 minutes per person ahead)
		waitTime := position * 10
		estimatedWait = &waitTime
	}

	response := gin.H{
		"total_in_queue": totalInQueue,
		"queue_open":     true, // Simplified - should check actual operating hours
	}

	if queuePosition != nil {
		response["current_position"] = *queuePosition
	}
	if estimatedWait != nil {
		response["estimated_wait_time"] = *estimatedWait
	}
	// Remove the currentServing logic that was causing tautological condition
	response["current_serving"] = 1

	c.JSON(http.StatusOK, response)
}

// GetVisitorProfile returns visitor profile information
func GetVisitorProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get visitor profile if exists
	var visitorProfile models.VisitorProfile
	db.DB.Where("user_id = ?", userID).First(&visitorProfile)

	// Get verification status
	var documents []models.Document
	db.DB.Where("user_id = ?", userID).Find(&documents)

	// Determine verification status based on documents
	verificationStatus := "pending"
	photoIdApproved := false
	proofAddressApproved := false

	for _, doc := range documents {
		if doc.Type == "photo_id" && doc.Status == "approved" {
			photoIdApproved = true
		}
		if doc.Type == "proof_address" && doc.Status == "approved" {
			proofAddressApproved = true
		}
	}

	if photoIdApproved && proofAddressApproved {
		verificationStatus = "verified"
	}

	// Get last visit
	var lastVisit models.Visit
	var lastVisitStr *string
	if err := db.DB.Joins("JOIN tickets ON visits.ticket_id = tickets.id").
		Where("tickets.visitor_id = ?", userID).
		Order("visits.created_at DESC").
		First(&lastVisit).Error; err == nil {
		lastVisitTime := lastVisit.CreatedAt.Format("2006-01-02")
		lastVisitStr = &lastVisitTime
	}

	profile := gin.H{
		"id":                   user.ID,
		"first_name":           user.FirstName,
		"last_name":            user.LastName,
		"email":                user.Email,
		"phone":                user.Phone,
		"address":              user.Address,
		"city":                 user.City,
		"postcode":             user.Postcode,
		"household_size":       visitorProfile.HouseholdSize,
		"dietary_requirements": visitorProfile.DietaryRequirements,
		"accessibility_needs":  visitorProfile.AccessibilityNeeds,
		"emergency_contact":    visitorProfile.EmergencyContact,
		"verification_status":  verificationStatus,
		"registration_date":    user.CreatedAt.Format("2006-01-02"),
		"last_visit":           lastVisitStr,
		"member_since":         user.CreatedAt.Format("January 2006"),
		"documents":            documents,
	}

	c.JSON(http.StatusOK, profile)
}

// UpdateVisitorProfile updates visitor profile information
func UpdateVisitorProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var updates struct {
		FirstName           string `json:"first_name"`
		LastName            string `json:"last_name"`
		Phone               string `json:"phone"`
		Address             string `json:"address"`
		City                string `json:"city"`
		Postcode            string `json:"postcode"`
		HouseholdSize       int    `json:"household_size"`
		DietaryRequirements string `json:"dietary_requirements"`
		AccessibilityNeeds  string `json:"accessibility_needs"`
		EmergencyContact    string `json:"emergency_contact"`
	}

	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update user fields
	if updates.FirstName != "" {
		user.FirstName = updates.FirstName
	}
	if updates.LastName != "" {
		user.LastName = updates.LastName
	}
	if updates.Phone != "" {
		user.Phone = updates.Phone
	}
	if updates.Address != "" {
		user.Address = updates.Address
	}
	if updates.City != "" {
		user.City = updates.City
	}
	if updates.Postcode != "" {
		user.Postcode = updates.Postcode
	}

	user.UpdatedAt = time.Now()

	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile"})
		return
	}

	// Get or create visitor profile
	var visitorProfile models.VisitorProfile
	result := db.DB.Where("user_id = ?", userID).First(&visitorProfile)

	if result.Error != nil && result.Error == gorm.ErrRecordNotFound {
		// Create new visitor profile
		visitorProfile = models.VisitorProfile{
			UserID:              uint(userID.(uint)),
			HouseholdSize:       1, // Default value
			DietaryRequirements: updates.DietaryRequirements,
			AccessibilityNeeds:  updates.AccessibilityNeeds,
			EmergencyContact:    updates.EmergencyContact,
		}
	}

	// Update visitor profile fields
	if updates.HouseholdSize > 0 {
		visitorProfile.HouseholdSize = updates.HouseholdSize
	}
	if updates.DietaryRequirements != "" {
		visitorProfile.DietaryRequirements = updates.DietaryRequirements
	}
	if updates.AccessibilityNeeds != "" {
		visitorProfile.AccessibilityNeeds = updates.AccessibilityNeeds
	}
	if updates.EmergencyContact != "" {
		visitorProfile.EmergencyContact = updates.EmergencyContact
	}

	if err := db.DB.Save(&visitorProfile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update visitor profile"})
		return
	}

	// Create audit log
	utils.CreateAuditLog(c, "Update", "UserProfile", user.ID, "Visitor profile updated")

	// Return updated profile data
	profile := gin.H{
		"id":                   user.ID,
		"first_name":           user.FirstName,
		"last_name":            user.LastName,
		"email":                user.Email,
		"phone":                user.Phone,
		"address":              user.Address,
		"city":                 user.City,
		"postcode":             user.Postcode,
		"household_size":       visitorProfile.HouseholdSize,
		"dietary_requirements": visitorProfile.DietaryRequirements,
		"accessibility_needs":  visitorProfile.AccessibilityNeeds,
		"emergency_contact":    visitorProfile.EmergencyContact,
		"registration_date":    user.CreatedAt.Format("2006-01-02"),
		"member_since":         user.CreatedAt.Format("January 2006"),
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"profile": profile,
	})
}

// GetCurrentUserEligibility checks visitor eligibility for services
func GetCurrentUserEligibility(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check document verification status
	var photoIDApproved, proofAddressApproved bool
	var documents []models.Document
	if err := db.DB.Where("user_id = ? AND type IN ?", userID,
		[]string{models.DocumentTypeID, models.DocumentTypeProofAddress}).Find(&documents).Error; err == nil {

		for _, doc := range documents {
			if doc.Status == models.DocumentStatusApproved {
				switch doc.Type {
				case models.DocumentTypeID:
					photoIDApproved = true
				case models.DocumentTypeProofAddress:
					proofAddressApproved = true
				}
			}
		}
	}

	verificationComplete := photoIDApproved && proofAddressApproved

	// Check recent help requests
	var recentRequests int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	db.DB.Model(&models.HelpRequest{}).
		Where("visitor_id = ? AND created_at >= ?", userID, thirtyDaysAgo).
		Count(&recentRequests)

	// Determine basic eligibility (document verification + account active)
	baseEligible := verificationComplete && user.Status == models.StatusActive

	// Get visit history for detailed eligibility checking with business rules
	var helpRequests []models.HelpRequest
	db.DB.Where("visitor_id = ? AND status IN ?", userID,
		[]string{models.HelpRequestStatusCompleted, models.HelpRequestStatusTicketIssued}).
		Order("created_at DESC").
		Find(&helpRequests)

	// Calculate category-specific eligibility using business rules
	foodEligibility := calculateFoodEligibility(baseEligible, helpRequests)
	generalEligibility := calculateGeneralEligibility(baseEligible, helpRequests)

	// Overall eligibility is based on whether either category is available
	overallEligible := baseEligible && (foodEligibility["eligible"].(bool) || generalEligibility["eligible"].(bool))

	eligibility := gin.H{
		"eligible":               overallEligible,
		"verification_complete":  verificationComplete,
		"photo_id_approved":      photoIDApproved,
		"proof_address_approved": proofAddressApproved,
		"account_active":         user.Status == models.StatusActive,
		"recent_requests":        recentRequests,
		"categories": gin.H{
			"food":    foodEligibility,
			"general": generalEligibility,
		},
	}

	if !baseEligible {
		eligibility["next_steps"] = getEligibilityNextSteps(photoIDApproved, proofAddressApproved, user.Status)
	}

	c.JSON(http.StatusOK, eligibility)
}

// GetDetailedEligibility provides comprehensive eligibility checking with business rules
func GetDetailedEligibility(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check document verification status
	var photoIDApproved, proofAddressApproved bool
	var documents []models.Document
	if err := db.DB.Where("user_id = ? AND type IN ?", userID,
		[]string{models.DocumentTypeID, models.DocumentTypeProofAddress}).Find(&documents).Error; err == nil {

		for _, doc := range documents {
			if doc.Status == models.DocumentStatusApproved {
				switch doc.Type {
				case models.DocumentTypeID:
					photoIDApproved = true
				case models.DocumentTypeProofAddress:
					proofAddressApproved = true
				}
			}
		}
	}

	verificationComplete := photoIDApproved && proofAddressApproved
	accountActive := user.Status == models.StatusActive
	baseEligible := verificationComplete && accountActive

	// Get visit history for detailed eligibility checking
	var helpRequests []models.HelpRequest
	db.DB.Where("visitor_id = ? AND status IN ?", userID,
		[]string{models.HelpRequestStatusCompleted, models.HelpRequestStatusTicketIssued}).
		Order("created_at DESC").
		Find(&helpRequests)

	// Calculate category-specific eligibility
	foodEligibility := calculateFoodEligibility(baseEligible, helpRequests)
	generalEligibility := calculateGeneralEligibility(baseEligible, helpRequests)

	// Get recent requests count (for urgency level calculation)
	var recentRequests int64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	db.DB.Model(&models.HelpRequest{}).
		Where("visitor_id = ? AND created_at >= ?", userID, thirtyDaysAgo).
		Count(&recentRequests)

	// Get total historical requests for urgency calculation
	var totalRequests int64
	db.DB.Model(&models.HelpRequest{}).
		Where("visitor_id = ?", userID).
		Count(&totalRequests)

	// Calculate suggested urgency level
	var suggestedUrgency string
	if totalRequests == 0 {
		suggestedUrgency = "high" // First time visitor
	} else if totalRequests > 6 {
		suggestedUrgency = "low" // Frequent visitor
	} else {
		suggestedUrgency = "medium" // Regular visitor
	}

	eligibility := gin.H{
		"eligible":               baseEligible && (foodEligibility["eligible"].(bool) || generalEligibility["eligible"].(bool)),
		"verification_complete":  verificationComplete,
		"photo_id_approved":      photoIDApproved,
		"proof_address_approved": proofAddressApproved,
		"account_active":         accountActive,
		"recent_requests":        recentRequests,
		"total_requests":         totalRequests,
		"suggested_urgency":      suggestedUrgency,
		"is_first_time":          totalRequests == 0,
		"categories": gin.H{
			"food":    foodEligibility,
			"general": generalEligibility,
		},
	}

	if !baseEligible {
		eligibility["next_steps"] = getEligibilityNextSteps(photoIDApproved, proofAddressApproved, user.Status)
	}

	c.JSON(http.StatusOK, eligibility)
}

// calculateFoodEligibility implements food support business rules
func calculateFoodEligibility(baseEligible bool, helpRequests []models.HelpRequest) gin.H {
	now := time.Now()
	availableDays := []string{"Tuesday", "Wednesday", "Thursday"}
	availableTimes := []string{"11:30-14:30"}

	if !baseEligible {
		return gin.H{
			"eligible":         false,
			"reason":           "Complete document verification to access food support",
			"available_days":   availableDays,
			"available_times":  availableTimes,
			"visits_this_week": 0,
		}
	}

	// Check for food visits this week
	weekStart := getWeekStart(now)
	weekEnd := weekStart.AddDate(0, 0, 7)

	var visitsThisWeek int64
	var lastFoodVisit *time.Time

	for _, req := range helpRequests {
		if req.Category == "Food" {
			if lastFoodVisit == nil || req.CreatedAt.After(*lastFoodVisit) {
				lastFoodVisit = &req.CreatedAt
			}

			if req.CreatedAt.After(weekStart) && req.CreatedAt.Before(weekEnd) {
				visitsThisWeek++
			}
		}
	}

	// MAXIMUM 1 visit per week rule
	if visitsThisWeek >= 1 {
		nextEligibleDate := weekEnd.Format("2006-01-02")
		return gin.H{
			"eligible":           false,
			"reason":             "Maximum 1 food support visit per week. Next visit available next week.",
			"next_eligible_date": nextEligibleDate,
			"available_days":     availableDays,
			"available_times":    availableTimes,
			"visits_this_week":   visitsThisWeek,
			"last_visit_date":    formatOptionalDate(lastFoodVisit),
		}
	}

	return gin.H{
		"eligible":         true,
		"reason":           "You are eligible for food support",
		"available_days":   availableDays,
		"available_times":  availableTimes,
		"visits_this_week": visitsThisWeek,
		"last_visit_date":  formatOptionalDate(lastFoodVisit),
	}
}

// calculateGeneralEligibility implements general support business rules
func calculateGeneralEligibility(baseEligible bool, helpRequests []models.HelpRequest) gin.H {
	now := time.Now()
	availableDays := []string{"Tuesday", "Wednesday", "Thursday"}
	availableTimes := []string{"10:30-14:30"}

	if !baseEligible {
		return gin.H{
			"eligible":               false,
			"reason":                 "Complete document verification to access general support",
			"available_days":         availableDays,
			"available_times":        availableTimes,
			"is_first_time":          true,
			"weeks_since_last_visit": 0,
		}
	}

	// Find last general support visit
	var lastGeneralVisit *time.Time
	var hasGeneralVisit bool

	for _, req := range helpRequests {
		if req.Category == "General" {
			hasGeneralVisit = true
			if lastGeneralVisit == nil || req.CreatedAt.After(*lastGeneralVisit) {
				lastGeneralVisit = &req.CreatedAt
			}
		}
	}

	isFirstTime := !hasGeneralVisit

	// If first time, only allow Tuesday
	if isFirstTime {
		return gin.H{
			"eligible":               true,
			"reason":                 "First time general support - Tuesday only",
			"available_days":         []string{"Tuesday"},
			"available_times":        availableTimes,
			"is_first_time":          true,
			"weeks_since_last_visit": 0,
		}
	}

	// Check 4-week rule for returning visitors
	weeksSinceLastVisit := int(now.Sub(*lastGeneralVisit).Hours() / (24 * 7))

	if weeksSinceLastVisit < 4 {
		weeksRemaining := 4 - weeksSinceLastVisit
		nextEligibleDate := lastGeneralVisit.AddDate(0, 0, 28).Format("2006-01-02")

		return gin.H{
			"eligible":               false,
			"reason":                 fmt.Sprintf("Maximum 1 general support visit every 4 weeks. %d weeks remaining.", weeksRemaining),
			"next_eligible_date":     nextEligibleDate,
			"available_days":         availableDays,
			"available_times":        availableTimes,
			"is_first_time":          false,
			"weeks_since_last_visit": weeksSinceLastVisit,
			"last_visit_date":        formatOptionalDate(lastGeneralVisit),
		}
	}

	return gin.H{
		"eligible":               true,
		"reason":                 "You are eligible for general support",
		"available_days":         availableDays,
		"available_times":        availableTimes,
		"is_first_time":          false,
		"weeks_since_last_visit": weeksSinceLastVisit,
		"last_visit_date":        formatOptionalDate(lastGeneralVisit),
	}
}

// GetAvailableTimeSlots returns available time slots based on category and date
func GetAvailableTimeSlots(c *gin.Context) {
	category := c.Query("category")
	date := c.Query("date")

	if category == "" || date == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category and date are required"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	weekday := parsedDate.Weekday()

	// Check if date is Tuesday, Wednesday, or Thursday
	if weekday < time.Tuesday || weekday > time.Thursday {
		c.JSON(http.StatusOK, gin.H{
			"available":  false,
			"reason":     "Services only available Tuesday, Wednesday, and Thursday",
			"time_slots": []string{},
		})
		return
	}

	var timeSlots []gin.H

	switch strings.ToLower(category) {
	case "food":
		timeSlots = []gin.H{
			{"id": "food-morning", "label": "11:30 AM - 2:30 PM", "value": "11:30-14:30", "available": true},
		}
	case "general":
		timeSlots = []gin.H{
			{"id": "general-morning", "label": "10:30 AM - 2:30 PM", "value": "10:30-14:30", "available": true},
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"available":  true,
		"time_slots": timeSlots,
		"date":       date,
		"category":   category,
		"weekday":    weekday.String(),
	})
}

// GetVisitorDocuments returns documents for the authenticated visitor
func GetVisitorDocuments(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var documents []models.Document
	if err := db.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&documents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve documents"})
		return
	}

	// Transform documents to include file URLs if needed
	var responseDocuments []gin.H
	for _, doc := range documents {
		responseDoc := gin.H{
			"id":               doc.ID,
			"user_id":          doc.UserID,
			"type":             doc.Type,
			"name":             doc.Name,
			"title":            doc.Title,
			"file_path":        doc.FilePath,
			"file_type":        doc.FileType,
			"file_size":        doc.FileSize,
			"status":           doc.Status,
			"description":      doc.Description,
			"verified_by":      doc.VerifiedBy,
			"verified_at":      doc.VerifiedAt,
			"uploaded_at":      doc.UploadedAt,
			"rejection_reason": doc.RejectionReason,
			"notes":            doc.Notes,
			"expires_at":       doc.ExpiresAt,
			"is_private":       doc.IsPrivate,
			"checksum":         doc.Checksum,
			"created_at":       doc.CreatedAt,
			"updated_at":       doc.UpdatedAt,
		}

		// Add file URL if file path exists
		if doc.FilePath != "" {
			responseDoc["file_url"] = "/api/v1/documents/view/" + fmt.Sprintf("%d", doc.ID)
		}

		responseDocuments = append(responseDocuments, responseDoc)
	}

	c.JSON(http.StatusOK, responseDocuments)
}

// Helper functions
func getWeekStart(date time.Time) time.Time {
	weekday := date.Weekday()
	if weekday == time.Sunday {
		weekday = 7
	}
	days := int(weekday - time.Monday)
	return date.AddDate(0, 0, -days).Truncate(24 * time.Hour)
}

func formatOptionalDate(date *time.Time) *string {
	if date == nil {
		return nil
	}
	formatted := date.Format("2006-01-02")
	return &formatted
}

// Helper functions
func getVisitorNextSteps(verified, hasPending, hasUpcoming bool) []string {
	var steps []string

	if !verified {
		steps = append(steps, "Upload required documents for verification")
		steps = append(steps, "Wait for admin approval (2-3 business days)")
	} else if !hasPending && !hasUpcoming {
		steps = append(steps, "Submit a help request when you need support")
		steps = append(steps, "Check available appointment days")
	} else if hasPending {
		steps = append(steps, "Wait for help request approval")
		steps = append(steps, "Check back for ticket availability")
	} else if hasUpcoming {
		steps = append(steps, "Prepare for your upcoming visit")
		steps = append(steps, "Bring required documents and bags")
	}

	return steps
}

func getEligibilityNextSteps(photoID, proofAddress bool, status string) []string {
	var steps []string

	if status != models.StatusActive {
		steps = append(steps, "Contact admin to activate your account")
	}

	if !photoID {
		steps = append(steps, "Upload valid photo ID")
	}

	if !proofAddress {
		steps = append(steps, "Upload proof of address")
	}

	if len(steps) == 0 {
		steps = append(steps, "Wait for document verification to complete")
	}

	return steps
}

// GetFeedbackDetails retrieves detailed feedback information by ID
func GetFeedbackDetails(c *gin.Context) {
	feedbackID := c.Param("id")

	var feedback models.VisitFeedback
	if err := db.DB.Preload("Visit").Preload("Visit.HelpRequest").Preload("Visit.HelpRequest.Visitor").
		First(&feedback, feedbackID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Feedback not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    feedback,
	})
}

// CreateTestData creates sample data for testing visitor dashboard (DEV ONLY)
func CreateTestData(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("🔧 Creating test data for user ID: %v\n", userID)

	// Create sample help requests
	helpRequests := []models.HelpRequest{
		{
			VisitorID:     uint(userID.(uint)),
			VisitorName:   "Test User",
			Email:         "test@example.com",
			Category:      "Food",
			Details:       "Need food support for family",
			HouseholdSize: 3,
			Status:        models.HelpRequestStatusPending,
			RequestDate:   time.Now().AddDate(0, 0, -2),
			Reference:     fmt.Sprintf("REF-%d-001", time.Now().Unix()),
			VisitDay:      time.Now().AddDate(0, 0, 1).Format("2006-01-02"),
			TimeSlot:      "10:00",
			Priority:      "medium",
		},
		{
			VisitorID:     uint(userID.(uint)),
			VisitorName:   "Test User",
			Email:         "test@example.com",
			Category:      "General",
			Details:       "Need general assistance",
			HouseholdSize: 3,
			Status:        models.HelpRequestStatusTicketIssued,
			RequestDate:   time.Now().AddDate(0, 0, -5),
			Reference:     fmt.Sprintf("REF-%d-002", time.Now().Unix()),
			VisitDay:      time.Now().AddDate(0, 0, 2).Format("2006-01-02"),
			TimeSlot:      "14:00",
			Priority:      "low",
			ApprovedAt:    timePtr(time.Now().AddDate(0, 0, -4)),
			TicketNumber:  fmt.Sprintf("LDH-%d-001", time.Now().Unix()),
		},
		{
			VisitorID:     uint(userID.(uint)),
			VisitorName:   "Test User",
			Email:         "test@example.com",
			Category:      "Food",
			Details:       "Previous food support - completed",
			HouseholdSize: 3,
			Status:        models.HelpRequestStatusCompleted,
			RequestDate:   time.Now().AddDate(0, 0, -14),
			Reference:     fmt.Sprintf("REF-%d-003", time.Now().Unix()),
			VisitDay:      time.Now().AddDate(0, 0, -10).Format("2006-01-02"),
			TimeSlot:      "11:00",
			Priority:      "medium",
			ApprovedAt:    timePtr(time.Now().AddDate(0, 0, -13)),
			TicketNumber:  fmt.Sprintf("LDH-%d-002", time.Now().Unix()),
		},
	}

	for i, hr := range helpRequests {
		if err := db.DB.Create(&hr).Error; err != nil {
			fmt.Printf("❌ Error creating help request %d: %v\n", i+1, err)
		} else {
			fmt.Printf("✅ Created help request %d: %s\n", i+1, hr.Reference)
		}
	}

	// Create sample visits
	visits := []models.Visit{
		{
			VisitorID:    uint(userID.(uint)),
			TicketID:     1, // This should match a real ticket ID in production
			CheckInTime:  time.Now().AddDate(0, 0, -10).Add(-2 * time.Hour),
			CheckOutTime: timePtr(time.Now().AddDate(0, 0, -10).Add(-1 * time.Hour)),
			Status:       "completed",
			Duration:     intPtr(60),
			Notes:        "Successful visit for food support",
		},
		{
			VisitorID:    uint(userID.(uint)),
			TicketID:     2,
			CheckInTime:  time.Now().AddDate(0, 0, -5).Add(-1 * time.Hour),
			CheckOutTime: timePtr(time.Now().AddDate(0, 0, -5).Add(-30 * time.Minute)),
			Status:       "completed",
			Duration:     intPtr(30),
			Notes:        "Quick visit for general assistance",
		},
	}

	for i, visit := range visits {
		if err := db.DB.Create(&visit).Error; err != nil {
			fmt.Printf("❌ Error creating visit %d: %v\n", i+1, err)
		} else {
			fmt.Printf("✅ Created visit %d\n", i+1)
		}
	}

	// Create sample documents
	documents := []models.Document{
		{
			UserID:     uint(userID.(uint)),
			Type:       models.DocumentTypeID,
			Status:     models.DocumentStatusApproved,
			Name:       "photo_id.jpg",
			Title:      "Photo ID",
			FilePath:   "/uploads/documents/photo_id.jpg",
			FileSize:   1024000,
			FileType:   "image/jpeg",
			UploadedAt: time.Now().AddDate(0, 0, -20),
			VerifiedAt: timePtr(time.Now().AddDate(0, 0, -18)),
			VerifiedBy: uintPtr(1), // Admin user ID
		},
		{
			UserID:     uint(userID.(uint)),
			Type:       models.DocumentTypeProofAddress,
			Status:     models.DocumentStatusApproved,
			Name:       "proof_address.pdf",
			Title:      "Proof of Address",
			FilePath:   "/uploads/documents/proof_address.pdf",
			FileSize:   512000,
			FileType:   "application/pdf",
			UploadedAt: time.Now().AddDate(0, 0, -19),
			VerifiedAt: timePtr(time.Now().AddDate(0, 0, -17)),
			VerifiedBy: uintPtr(1), // Admin user ID
		},
	}

	for i, doc := range documents {
		if err := db.DB.Create(&doc).Error; err != nil {
			fmt.Printf("❌ Error creating document %d: %v\n", i+1, err)
		} else {
			fmt.Printf("✅ Created document %d: %s\n", i+1, doc.Name)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test data created successfully",
		"created": gin.H{
			"help_requests": len(helpRequests),
			"visits":        len(visits),
			"documents":     len(documents),
		},
	})
}

// Helper functions for test data creation
func timePtr(t time.Time) *time.Time {
	return &t
}

func intPtr(i int) *int {
	return &i
}

func uintPtr(i uint) *uint {
	return &i
}

// SearchVisitors handles visitor search functionality for assisted check-in
func SearchVisitors(c *gin.Context) {
	searchTerm := c.Query("term")
	if searchTerm == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search term is required"})
		return
	}

	// Search for visitors by name, email, phone, or postcode
	var users []models.User
	query := db.DB.Where("role = ?", "visitor")

	// Search across multiple fields
	searchPattern := "%" + strings.ToLower(searchTerm) + "%"
	query = query.Where(
		"LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(postcode) LIKE ?",
		searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
	)

	if err := query.Limit(20).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	// Transform results and check for valid tickets
	var results []gin.H
	today := time.Now().Format("2006-01-02")

	for _, user := range users {
		// Check if user has a valid ticket for today
		var ticket models.Ticket
		hasValidTicket := false
		ticketNumber := ""

		if err := db.DB.Where("visitor_id = ? AND status = ? AND DATE(visit_date) = ?",
			user.ID, "issued", today).First(&ticket).Error; err == nil {
			hasValidTicket = true
			ticketNumber = ticket.TicketNumber
		}

		// Get last visit date
		var lastVisit models.Visit
		lastVisitDate := ""
		if err := db.DB.Where("visitor_id = ?", user.ID).
			Order("check_in_time DESC").First(&lastVisit).Error; err == nil {
			lastVisitDate = lastVisit.CheckInTime.Format("2006-01-02")
		}

		results = append(results, gin.H{
			"id":            user.ID,
			"name":          user.FirstName + " " + user.LastName,
			"email":         user.Email,
			"phone":         user.Phone,
			"postcode":      user.Postcode,
			"last_visit":    lastVisitDate,
			"status":        user.Status,
			"has_ticket":    hasValidTicket,
			"ticket_number": ticketNumber,
			"visit_date":    today,
		})
	}

	c.JSON(http.StatusOK, results)
}

// GetCurrentUserQueuePosition returns the current user's queue position
func GetCurrentUserQueuePosition(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find active queue entry for the current user
	var queueEntry models.QueueEntry
	if err := db.DB.Where("visitor_id = ? AND status IN ?", userID, []string{"waiting", "called"}).
		First(&queueEntry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Not currently in queue",
		})
		return
	}

	// Get visitor info
	var visitor models.User
	db.DB.First(&visitor, userID)

	// Calculate estimated wait time
	estimatedMinutes := queueEntry.EstimatedMinutes
	if estimatedMinutes <= 0 {
		// Fallback calculation: 15 minutes per position for general, 10 for food
		baseTime := 15
		if queueEntry.Category == "food" {
			baseTime = 10
		}
		estimatedMinutes = (queueEntry.Position - 1) * baseTime
	}

	// Format estimated wait time
	var estimatedWait string
	if estimatedMinutes <= 0 {
		estimatedWait = "Now"
	} else if estimatedMinutes < 60 {
		estimatedWait = fmt.Sprintf("%d minutes", estimatedMinutes)
	} else {
		hours := estimatedMinutes / 60
		minutes := estimatedMinutes % 60
		if minutes == 0 {
			estimatedWait = fmt.Sprintf("%d hour(s)", hours)
		} else {
			estimatedWait = fmt.Sprintf("%d hour(s) %d minutes", hours, minutes)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                     queueEntry.ID,
		"position":               queueEntry.Position,
		"visitor_id":             queueEntry.VisitorID,
		"visitor_name":           visitor.FirstName + " " + visitor.LastName,
		"ticket_number":          "", // Will be filled if we have ticket info
		"reference":              queueEntry.Reference,
		"category":               queueEntry.Category,
		"check_in_time":          queueEntry.JoinedAt.Format("2006-01-02T15:04:05Z"),
		"estimated_wait_minutes": estimatedMinutes,
		"estimated_wait_time":    estimatedWait,
		"status":                 queueEntry.Status,
		"priority":               1, // Default priority
		"joined_at":              queueEntry.JoinedAt,
		"called_at":              queueEntry.CalledAt,
	})
}

package admin

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"

	"github.com/geoo115/charity-management-system/internal/handlers_new/shared"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Helper to send error responses and log
func respondWithError(c *gin.Context, status int, message string, details ...interface{}) {
	if len(details) > 0 {
		log.Printf("[AdminVisitor] %s: %v", message, details)
	} else {
		log.Printf("[AdminVisitor] %s", message)
	}
	c.JSON(status, gin.H{"error": message})
}

// AdminGetDashboard returns admin dashboard with KPIs and alerts
func AdminGetDashboard(c *gin.Context) {
	// Get today's date
	today := time.Now()
	todayStr := today.Format("2006-01-02")

	// Daily visit load
	var todayRequests int64
	db.DB.Model(&models.HelpRequest{}).Where("DATE(created_at) = ?", todayStr).Count(&todayRequests)

	var todayTickets int64
	db.DB.Model(&models.HelpRequest{}).Where("DATE(created_at) = ? AND status = ?",
		todayStr, models.HelpRequestStatusTicketIssued).Count(&todayTickets)

	// Pending help requests
	var pendingRequests int64
	db.DB.Model(&models.HelpRequest{}).Where("status = ?", models.HelpRequestStatusPending).Count(&pendingRequests)

	// Document verification pending
	var pendingVerifications int64
	db.DB.Model(&models.Document{}).Where("status = ?", models.DocumentStatusPending).Count(&pendingVerifications)

	// Volunteer coverage for today
	var todayShifts int64
	var assignedShifts int64
	db.DB.Model(&models.Shift{}).Where("DATE(date) = ?", todayStr).Count(&todayShifts)
	db.DB.Model(&models.ShiftAssignment{}).
		Joins("JOIN shifts ON shifts.id = shift_assignments.shift_id").
		Where("DATE(shifts.date) = ? AND shift_assignments.status = ?", todayStr, "Confirmed").
		Count(&assignedShifts)

	// Urgent inventory needs - using hardcoded data instead of inventory queries
	var urgentNeeds = []struct {
		ID           uint
		Category     string
		Name         string
		Description  string
		UrgencyLevel string
	}{
		{1, "Food", "Canned Goods", "Non-perishable food items", "Critical"},
		{2, "Clothing", "Winter Coats", "Warm winter coats", "High"},
		{3, "Toiletries", "Hygiene Products", "Soap, shampoo, etc.", "Medium"},
	}

	// Recent activity
	var recentRequests []models.HelpRequest
	db.DB.Preload("Visitor").Order("created_at DESC").Limit(10).Find(&recentRequests)

	// System alerts
	alerts := generateSystemAlerts(todayRequests, assignedShifts, todayShifts, len(urgentNeeds), pendingVerifications)

	c.JSON(http.StatusOK, gin.H{
		"kpis": gin.H{
			"today_requests":        todayRequests,
			"today_tickets":         todayTickets,
			"pending_requests":      pendingRequests,
			"pending_verifications": pendingVerifications,
			"volunteer_coverage":    calculateCoveragePercentage(assignedShifts, todayShifts),
			"urgent_needs":          len(urgentNeeds),
		},
		"alerts":           alerts,
		"recent_activity":  recentRequests,
		"urgent_inventory": urgentNeeds,
		"volunteer_stats": gin.H{
			"scheduled_shifts": todayShifts,
			"assigned_shifts":  assignedShifts,
			"coverage_gap":     todayShifts - assignedShifts,
		},
	})
}

// AdminUpdateHelpRequestStatus updates the status of a help request
func AdminUpdateHelpRequestStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid help request ID", err)
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	validStatuses := map[string]bool{"pending": true, "approved": true, "rejected": true, "ticket_issued": true, "checked_in": true, "completed": true, "cancelled": true, "in_progress": true}
	if !validStatuses[req.Status] {
		respondWithError(c, http.StatusBadRequest, "Invalid status value")
		return
	}

	var helpRequest models.HelpRequest
	if err := db.DB.First(&helpRequest, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			respondWithError(c, http.StatusNotFound, "Help request not found")
		} else {
			respondWithError(c, http.StatusInternalServerError, "Failed to fetch help request", err)
		}
		return
	}

	helpRequest.Status = req.Status
	helpRequest.UpdatedAt = time.Now()

	if err := db.DB.Save(&helpRequest).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to update help request status", err)
		return
	}

	log.Printf("Help request %d status updated to %s", id, req.Status)

	if err := db.DB.Preload("Visitor").First(&helpRequest, id).Error; err != nil {
		log.Printf("Error fetching updated help request: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Help request status updated successfully",
		"data":    helpRequest,
	})
}

// AdminGetHelpRequestStats returns statistics on help requests
func AdminGetHelpRequestStats(c *gin.Context) {
	var totalRequests, completedRequests, pendingRequests int64
	if err := db.DB.Model(&models.HelpRequest{}).Count(&totalRequests).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to count total requests", err)
		return
	}
	if err := db.DB.Model(&models.HelpRequest{}).Where("status = ?", "completed").Count(&completedRequests).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to count completed requests", err)
		return
	}
	if err := db.DB.Model(&models.HelpRequest{}).Where("status = ?", "pending").Count(&pendingRequests).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to count pending requests", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_requests":      totalRequests,
		"completed_requests":  completedRequests,
		"pending_requests":    pendingRequests,
		"today_requests":      getTodayRequestsCount(),
		"this_week_requests":  getWeekRequestsCount(),
		"this_month_requests": getMonthRequestsCount(),
	})
}

// getTodayRequestsCount returns the count of help requests created today
func getTodayRequestsCount() int64 {
	var count int64
	db.DB.Model(&models.HelpRequest{}).Where("DATE(created_at) = ?", time.Now().Format("2006-01-02")).Count(&count)
	return count
}

// getWeekRequestsCount returns the count of help requests created in the last week
func getWeekRequestsCount() int64 {
	var count int64
	db.DB.Model(&models.HelpRequest{}).Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).Count(&count)
	return count
}

// getMonthRequestsCount returns the count of help requests created in the last month
func getMonthRequestsCount() int64 {
	var count int64
	db.DB.Model(&models.HelpRequest{}).Where("created_at >= ?", time.Now().AddDate(0, -1, 0)).Count(&count)
	return count
}

// AdminListHelpRequests returns paginated help requests with filters
func AdminListHelpRequests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	status := c.Query("status")
	category := c.Query("category")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	search := c.Query("search")

	query := db.DB.Model(&models.HelpRequest{}).Preload("Visitor")
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if dateFrom != "" {
		query = query.Where("created_at >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("created_at <= ?", dateTo)
	}
	if search != "" {
		query = query.Where("visitor_name ILIKE ? OR email ILIKE ? OR reference ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to count help requests", err)
		return
	}

	var helpRequests []models.HelpRequest
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&helpRequests).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to retrieve help requests", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": helpRequests,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// AdminApproveHelpRequest approves a help request and potentially issues ticket
func AdminApproveHelpRequest(c *gin.Context) {
	requestID := c.Param("id")

	var req struct {
		Notes       string `json:"notes"`
		IssueTicket bool   `json:"issue_ticket"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	adminID, exists := c.Get("userID")
	if !exists {
		respondWithError(c, http.StatusUnauthorized, "Admin authentication required")
		return
	}

	tx := db.DB.Begin()

	var helpRequest models.HelpRequest
	if err := tx.Preload("Visitor").First(&helpRequest, requestID).Error; err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusNotFound, "Help request not found", err)
		return
	}

	if helpRequest.Status != models.HelpRequestStatusPending {
		tx.Rollback()
		respondWithError(c, http.StatusBadRequest, "Help request cannot be approved from current status", helpRequest.Status)
		return
	}

	if err := shared.CheckVisitEligibility(helpRequest.VisitorID); err != nil {
		respondWithError(c, http.StatusBadRequest, "Visitor not eligible for visit", err.Error())
		return
	}

	now := time.Now()
	adminIDVal := adminID.(uint)
	helpRequest.Status = models.HelpRequestStatusApproved
	helpRequest.ApprovedBy = &adminIDVal
	helpRequest.ApprovedAt = &now
	helpRequest.EligibilityNotes = req.Notes
	helpRequest.UpdatedAt = now

	if req.IssueTicket {
		if checkDailyCapacity(helpRequest.VisitDay, helpRequest.Category) {
			ticketNumber := shared.GenerateTicketNumber()
			qrCode, _ := shared.GenerateQRCode(ticketNumber)
			helpRequest.Status = models.HelpRequestStatusTicketIssued
			helpRequest.TicketNumber = ticketNumber
			helpRequest.QRCode = qrCode
			visitDay, _ := time.Parse("2006-01-02", helpRequest.VisitDay)
			if err := shared.UpdateDailyCapacity(visitDay, helpRequest.Category, 1); err != nil {
				tx.Rollback()
				respondWithError(c, http.StatusInternalServerError, "Failed to update daily capacity", err)
				return
			}
		} else {
			tx.Rollback()
			respondWithError(c, http.StatusConflict, "Daily capacity reached for requested visit day", helpRequest.VisitDay, helpRequest.Category)
			return
		}
	}

	if err := tx.Save(&helpRequest).Error; err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusInternalServerError, "Failed to approve help request", err)
		return
	}

	if err := tx.Commit().Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to commit approval", err)
		return
	}

	go sendApprovalNotification(helpRequest, helpRequest.Visitor)

	utils.CreateAuditLog(c, "Approve", "HelpRequest", helpRequest.ID,
		fmt.Sprintf("Help request approved by admin for %s support%s",
			helpRequest.Category,
			map[bool]string{true: " with ticket issued", false: ""}[req.IssueTicket]))

	response := gin.H{
		"message":   "Help request approved successfully",
		"status":    helpRequest.Status,
		"reference": helpRequest.Reference,
	}
	if req.IssueTicket {
		response["ticket_number"] = helpRequest.TicketNumber
		response["qr_code"] = helpRequest.QRCode
	}
	c.JSON(http.StatusOK, response)
}

// AdminRejectHelpRequest rejects a help request with reason
func AdminRejectHelpRequest(c *gin.Context) {
	requestID := c.Param("id")

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	adminID, exists := c.Get("userID")
	if !exists {
		respondWithError(c, http.StatusUnauthorized, "Admin authentication required")
		return
	}

	var helpRequest models.HelpRequest
	if err := db.DB.Preload("Visitor").First(&helpRequest, requestID).Error; err != nil {
		respondWithError(c, http.StatusNotFound, "Help request not found", err)
		return
	}

	if helpRequest.Status != models.HelpRequestStatusPending {
		respondWithError(c, http.StatusBadRequest, "Help request cannot be rejected from current status", helpRequest.Status)
		return
	}

	now := time.Now()
	adminIDVal := adminID.(uint)
	helpRequest.Status = models.HelpRequestStatusRejected
	helpRequest.RejectedBy = &adminIDVal
	helpRequest.RejectedAt = &now
	helpRequest.RejectionReason = req.Reason
	helpRequest.UpdatedAt = now

	if err := db.DB.Save(&helpRequest).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to reject help request", err)
		return
	}

	go sendRejectionNotification(helpRequest, helpRequest.Visitor)

	utils.CreateAuditLog(c, "Reject", "HelpRequest", helpRequest.ID,
		fmt.Sprintf("Help request rejected by admin. Reason: %s", req.Reason))

	c.JSON(http.StatusOK, gin.H{
		"message": "Help request rejected",
		"reason":  req.Reason,
	})
}

// AdminIssueTickets issues tickets for approved help requests (batch operation)
func AdminIssueTickets(c *gin.Context) {
	var req struct {
		VisitDay   string `json:"visit_day" binding:"required"`
		Category   string `json:"category"`
		MaxTickets int    `json:"max_tickets"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	query := db.DB.Where("status = ? AND visit_day = ?", models.HelpRequestStatusApproved, req.VisitDay)
	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}

	var approvedRequests []*models.HelpRequest
	if err := query.Order("created_at ASC").Find(&approvedRequests).Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to retrieve approved requests", err)
		return
	}

	if len(approvedRequests) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message":   "No approved requests found for the specified criteria",
			"visit_day": req.VisitDay,
			"category":  req.Category,
		})
		return
	}

	availableCapacity := getDailyCapacity(req.VisitDay, req.Category)
	ticketsToIssue := len(approvedRequests)
	if req.MaxTickets > 0 && req.MaxTickets < ticketsToIssue {
		ticketsToIssue = req.MaxTickets
	}
	if availableCapacity < ticketsToIssue {
		ticketsToIssue = availableCapacity
	}

	tx := db.DB.Begin()
	var issuedTickets []models.HelpRequest
	for i := 0; i < ticketsToIssue; i++ {
		request := approvedRequests[i]
		ticketNumber := shared.GenerateTicketNumber()
		qrCode, _ := shared.GenerateQRCode(ticketNumber)
		request.Status = models.HelpRequestStatusTicketIssued
		request.TicketNumber = ticketNumber
		request.QRCode = qrCode
		request.UpdatedAt = time.Now()
		if err := tx.Save(request).Error; err != nil {
			tx.Rollback()
			respondWithError(c, http.StatusInternalServerError, "Failed to issue tickets", err)
			return
		}
		issuedTickets = append(issuedTickets, *request)
	}

	visitDay, _ := time.Parse("2006-01-02", req.VisitDay)
	if err := shared.UpdateDailyCapacity(visitDay, req.Category, ticketsToIssue); err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusInternalServerError, "Failed to update capacity", err)
		return
	}

	if err := tx.Commit().Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to commit ticket issuance", err)
		return
	}

	for _, ticket := range issuedTickets {
		go sendTicketIssuedNotification(ticket)
	}

	utils.CreateAuditLog(c, "IssueTickets", "HelpRequest", 0,
		fmt.Sprintf("Issued %d tickets for %s (%s)", len(issuedTickets), req.VisitDay, req.Category))

	c.JSON(http.StatusOK, gin.H{
		"message":        fmt.Sprintf("Successfully issued %d tickets", len(issuedTickets)),
		"issued_count":   len(issuedTickets),
		"total_approved": len(approvedRequests),
		"visit_day":      req.VisitDay,
		"category":       req.Category,
		"tickets":        issuedTickets,
	})
}

// AdminVerifyVisitorDocuments handles document verification
func AdminVerifyVisitorDocuments(c *gin.Context) {
	userID := c.Param("id")

	var req struct {
		PhotoIDApproved      bool   `json:"photo_id_approved"`
		ProofAddressApproved bool   `json:"proof_address_approved"`
		Notes                string `json:"notes"`
		RejectionReason      string `json:"rejection_reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithError(c, http.StatusBadRequest, "Invalid request body", err)
		return
	}

	adminID, exists := c.Get("userID")
	if !exists {
		respondWithError(c, http.StatusUnauthorized, "Admin authentication required")
		return
	}

	tx := db.DB.Begin()

	var user models.User
	if err := tx.First(&user, userID).Error; err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusNotFound, "User not found", err)
		return
	}

	var documents []models.Document
	if err := tx.Where("user_id = ? AND type IN ?", userID,
		[]string{models.DocumentTypeID, models.DocumentTypeProofAddress}).Find(&documents).Error; err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusInternalServerError, "Failed to retrieve documents", err)
		return
	}

	now := time.Now()
	for _, doc := range documents {
		switch doc.Type {
		case models.DocumentTypeID:
			if req.PhotoIDApproved {
				doc.Status = models.DocumentStatusApproved
			} else {
				doc.Status = models.DocumentStatusRejected
				doc.RejectionReason = req.RejectionReason
			}
		case models.DocumentTypeProofAddress:
			if req.ProofAddressApproved {
				doc.Status = models.DocumentStatusApproved
			} else {
				doc.Status = models.DocumentStatusRejected
				doc.RejectionReason = req.RejectionReason
			}
		}
		adminIDVal := adminID.(uint)
		doc.VerifiedBy = &adminIDVal
		doc.VerifiedAt = &now
		doc.UpdatedAt = now
		if err := tx.Save(&doc).Error; err != nil {
			tx.Rollback()
			respondWithError(c, http.StatusInternalServerError, "Failed to update document status", err)
			return
		}
	}

	if req.PhotoIDApproved && req.ProofAddressApproved {
		user.Status = models.StatusActive
		user.EmailVerified = true
		user.EmailVerifiedAt = &now
	} else {
		user.Status = "verification_rejected"
	}
	user.UpdatedAt = now

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		respondWithError(c, http.StatusInternalServerError, "Failed to update user status", err)
		return
	}

	if err := tx.Commit().Error; err != nil {
		respondWithError(c, http.StatusInternalServerError, "Failed to commit verification", err)
		return
	}

	go sendVerificationResultNotification(user, req.PhotoIDApproved && req.ProofAddressApproved, req.RejectionReason)

	status := "rejected"
	if req.PhotoIDApproved && req.ProofAddressApproved {
		status = "approved"
	}
	utils.CreateAuditLog(c, "VerifyDocuments", "User", user.ID,
		fmt.Sprintf("Document verification %s for user %s %s", status, user.FirstName, user.LastName))

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Document verification completed - %s", status),
		"user_status": user.Status,
	})
}

// Helper functions for admin workflow

func generateSystemAlerts(todayRequests, assignedShifts, todayShifts int64, urgentNeeds int, pendingVerifications int64) []gin.H {
	var alerts []gin.H

	if todayRequests > 50 {
		alerts = append(alerts, gin.H{
			"type":    "warning",
			"message": fmt.Sprintf("High volume of requests today: %d", todayRequests),
		})
	}

	coveragePercent := calculateCoveragePercentage(assignedShifts, todayShifts)
	if coveragePercent < 80 {
		alerts = append(alerts, gin.H{
			"type":    "error",
			"message": fmt.Sprintf("Low volunteer coverage: %d%%", coveragePercent),
		})
	}

	if urgentNeeds > 3 {
		alerts = append(alerts, gin.H{
			"type":    "warning",
			"message": fmt.Sprintf("%d urgent inventory needs require attention", urgentNeeds),
		})
	}

	if pendingVerifications > 10 {
		alerts = append(alerts, gin.H{
			"type":    "info",
			"message": fmt.Sprintf("%d document verifications pending", pendingVerifications),
		})
	}

	return alerts
}

func calculateCoveragePercentage(assigned, total int64) int {
	if total == 0 {
		return 100
	}
	return int((assigned * 100) / total)
}

func checkDailyCapacity(visitDay, category string) bool {
	// Get or create visit capacity record
	var capacity models.VisitCapacity
	visitDate, _ := time.Parse("2006-01-02", visitDay)

	if err := db.DB.Where("date = ?", visitDate).First(&capacity).Error; err != nil {
		// Create default capacity
		capacity = models.VisitCapacity{
			Date:                 visitDate,
			DayOfWeek:            visitDate.Format("Monday"),
			MaxFoodVisits:        50,
			MaxGeneralVisits:     20,
			CurrentFoodVisits:    0,
			CurrentGeneralVisits: 0,
			IsOperatingDay:       true,
		}
		db.DB.Create(&capacity)
	}

	return capacity.HasCapacity(category)
}

func GenerateTicketNumber() string {
	now := time.Now()
	// Get count of tickets issued today
	var count int64
	today := now.Format("2006-01-02")
	db.DB.Model(&models.HelpRequest{}).
		Where("DATE(updated_at) = ? AND ticket_number IS NOT NULL", today).
		Count(&count)

	return fmt.Sprintf("LDH%s%03d", now.Format("0102"), count+1)
}

func GenerateQRCode(ticketNumber string) string {
	// Generate QR code using the ticket format for consistency
	// This should ideally be replaced with proper QR code image generation
	return fmt.Sprintf("LDH-TICKET:%s:checkin:%s", ticketNumber, time.Now().Format("2006-01-02"))
}

func sendApprovalNotification(helpRequest models.HelpRequest, user models.User) {
	notificationService := shared.GetNotificationService() // Get the shared service
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Help Request Approved - " + helpRequest.Reference,
			TemplateType:     "help_request_approval", // Use string instead of enum type
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":         user.FirstName + " " + user.LastName,
				"Reference":    helpRequest.Reference,
				"Category":     helpRequest.Category,
				"VisitDay":     helpRequest.VisitDay,
				"TicketNumber": helpRequest.TicketNumber,
				"QRCode":       helpRequest.QRCode,
				"Instructions": shared.GetVisitInstructions(),
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send approval notification: %v", err)
		}
	}
}

func sendRejectionNotification(helpRequest models.HelpRequest, user models.User) {
	notificationService := shared.GetNotificationService() // Get the shared service
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Help Request Update - " + helpRequest.Reference,
			TemplateType:     "help_request_rejection", // Use string instead of enum type
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":      user.FirstName + " " + user.LastName,
				"Reference": helpRequest.Reference,
				"Category":  helpRequest.Category,
				"Reason":    helpRequest.RejectionReason,
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send rejection notification: %v", err)
		}
	}
}

func sendTicketIssuedNotification(helpRequest models.HelpRequest) {
	notificationService := shared.GetNotificationService() // Get the shared service
	var user models.User
	if err := db.DB.First(&user, helpRequest.VisitorID).Error; err != nil {
		log.Printf("Failed to find user for ticket notification: %v", err)
		return
	}

	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Your Visit Ticket is Ready - " + helpRequest.TicketNumber,
			TemplateType:     "ticket_issued", // Use string instead of enum type
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":         user.FirstName + " " + user.LastName,
				"TicketNumber": helpRequest.TicketNumber,
				"Reference":    helpRequest.Reference,
				"Category":     helpRequest.Category,
				"VisitDay":     helpRequest.VisitDay,
				"TimeSlot":     helpRequest.TimeSlot,
				"QRCode":       helpRequest.QRCode,
				"Instructions": shared.GetVisitInstructions(),
				"Requirements": shared.GetVisitRequirements(),
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send ticket issued notification: %v", err)
		}
	}
}

func sendVerificationResultNotification(user models.User, approved bool, reason string) {
	notificationService := shared.GetNotificationService() // Get the shared service
	if notificationService != nil {
		templateType := "document_approved"
		subject := "Documents Verified - Welcome to Lewisham Charity"

		if !approved {
			templateType = "document_rejected"
			subject = "Document Verification Required"
		}

		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          subject,
			TemplateType:     notifications.TemplateType(templateType), // Cast string to TemplateType
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"Name":     user.FirstName + " " + user.LastName,
				"Approved": approved,
				"Reason":   reason,
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			log.Printf("Failed to send verification result notification: %v", err)
		}
	}
}

// getDailyCapacity returns available capacity for a given visit day and category
func getDailyCapacity(visitDay, category string) int {
	visitDate, err := time.Parse("2006-01-02", visitDay)
	if err != nil {
		return 0
	}

	var capacity models.VisitCapacity
	if err := db.DB.Where("date = ?", visitDate).First(&capacity).Error; err != nil {
		// Return default capacity if no record exists
		switch category {
		case models.CategoryFood:
			return 50
		case models.CategoryGeneral:
			return 20
		default:
			return 10
		}
	}

	// Calculate available capacity
	switch category {
	case models.CategoryFood:
		return capacity.MaxFoodVisits - capacity.CurrentFoodVisits
	case models.CategoryGeneral:
		return capacity.MaxGeneralVisits - capacity.CurrentGeneralVisits
	default:
		return 0
	}
}

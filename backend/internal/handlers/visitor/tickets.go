package visitor

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/handlers/shared"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/notifications"
	"github.com/geoo115/charity-management-system/internal/utils"
	"github.com/gin-gonic/gin"
)

// GetTicketDetails retrieves ticket information
func GetTicketDetails(c *gin.Context) {
	ticketNumber := c.Param("ticketNumber")

	// Get current user ID for access validation
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	// Query ticket from database with relationships
	var ticket models.Ticket
	if err := db.DB.Preload("Visitor").Preload("HelpRequest").
		Where("ticket_number = ?", ticketNumber).
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Ticket not found",
		})
		return
	}

	// Validate user access to ticket (owner or admin)
	userRole, _ := c.Get("userRole")
	if userRole != "Admin" && ticket.VisitorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Access denied - not your ticket",
		})
		return
	}

	// Generate instructions based on category
	instructions := gin.H{
		"location":      "Lewisham Charity", // Use hardcoded value
		"arrivalTime":   "Please arrive 15 minutes before your slot",
		"contactNumber": "+44 20 8692 0000",
	}

	switch ticket.Category {
	case models.CategoryFood:
		instructions["whatToBring"] = []string{"Valid ID", "Proof of address", "Reusable bags for food"}
	case models.CategoryGeneral:
		instructions["whatToBring"] = []string{"Valid ID", "Proof of address"}
	default:
		instructions["whatToBring"] = []string{"Valid ID", "Proof of address"}
	}

	// Replace all occurrences of ticket.Visitor.Name
	visitorName := ticket.Visitor.FirstName + " " + ticket.Visitor.LastName

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"ticketNumber": ticket.TicketNumber,
			"visitorName":  visitorName,
			"category":     ticket.Category,
			"visitDate":    ticket.VisitDate, // Already a string
			"timeSlot":     ticket.TimeSlot,
			"status":       ticket.Status,
			"qrCode":       ticket.QRCode,
			"instructions": instructions,
			"issuedAt":     ticket.IssuedAt.Format(time.RFC3339),
			"expiresAt":    ticket.ExpiresAt.Format(time.RFC3339),
			"canBeUsed":    ticket.CanBeUsed(),
			"isValid":      ticket.IsValid(),
		},
	})
}

// ValidateTicketNumber validates a ticket number
func ValidateTicketNumber(c *gin.Context) {
	ticketNumber := c.Param("ticketNumber")

	var validation struct {
		CheckInTime string `json:"check_in_time"`
		StaffID     string `json:"staff_id"`
	}

	if err := c.ShouldBindJSON(&validation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid validation format",
		})
		return
	}

	// Get ticket from database with visitor details
	var ticket models.Ticket
	if err := db.DB.Preload("Visitor").Where("ticket_number = ?", ticketNumber).First(&ticket).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"valid":   false,
			"error":   "Ticket not found",
		})
		return
	}

	// Check if ticket exists and is valid
	isValid := ticket.IsValid()
	canUse := ticket.CanBeUsed()

	// Check if ticket hasn't been used
	hasBeenUsed := ticket.Status == models.TicketStatusUsed

	// Check if ticket is within valid time window (for today) - fix type mismatch
	today := time.Now().Format("2006-01-02")
	visitDay := ticket.VisitDate.Format("2006-01-02")
	isValidToday := today == visitDay

	// Record validation attempt in audit log
	staffIDInt, _ := strconv.Atoi(validation.StaffID)
	utils.CreateAuditLog(c, "ValidateTicket", "Ticket", ticket.ID,
		fmt.Sprintf("Ticket %s validation attempt by staff %d - Valid: %v, Can Use: %v",
			ticketNumber, staffIDInt, isValid && canUse && !hasBeenUsed, isValidToday))

	// Determine overall validity
	overallValid := isValid && canUse && !hasBeenUsed && isValidToday

	// Update validation response
	response := gin.H{
		"success": true,
		"valid":   overallValid,
		"data": gin.H{
			"ticketNumber": ticket.TicketNumber,
			"visitorName":  ticket.Visitor.FirstName + " " + ticket.Visitor.LastName,
			"category":     ticket.Category,
			"timeSlot":     ticket.TimeSlot,
			"status":       ticket.Status,
			"canUse":       canUse && !hasBeenUsed,
			"validatedAt":  time.Now().Format(time.RFC3339),
			"validatedBy":  validation.StaffID,
			"visitDate":    ticket.VisitDate, // Already a string
			"isExpired":    ticket.IsExpired(),
		},
	}

	if !overallValid {
		if hasBeenUsed {
			response["error"] = "Ticket has already been used"
		} else if !isValidToday {
			response["error"] = "Ticket is not valid for today"
		} else if ticket.IsExpired() {
			response["error"] = "Ticket has expired"
		} else if !isValid {
			response["error"] = "Ticket is not valid"
		}
	}

	c.JSON(http.StatusOK, response)
}

// UseTicket marks a ticket as used
func UseTicket(c *gin.Context) {
	ticketNumber := c.Param("ticketNumber")

	var usage struct {
		StaffID       string `json:"staff_id" binding:"required"`
		CheckInTime   string `json:"check_in_time"`
		Notes         string `json:"notes"`
		QueuePosition int    `json:"queue_position"`
	}

	if err := c.ShouldBindJSON(&usage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid usage format",
		})
		return
	}

	// Parse staff ID
	staffID, err := strconv.ParseUint(usage.StaffID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid staff ID",
		})
		return
	}
	staffIDUint := uint(staffID)

	// Begin transaction for ticket usage
	tx := db.DB.Begin()

	// Get ticket from database
	var ticket models.Ticket
	if err := tx.Preload("Visitor").Where("ticket_number = ?", ticketNumber).First(&ticket).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Ticket not found",
		})
		return
	}

	// Validate ticket can be used
	if !ticket.CanBeUsed() {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Ticket cannot be used - invalid, expired, or already used",
			"status":  ticket.Status,
		})
		return
	}

	// Mark ticket as used
	now := time.Now()
	ticket.Status = models.TicketStatusUsed
	ticket.UsedAt = &now
	// Remove UsedBy field since it doesn't exist
	ticket.UpdatedAt = now

	if err := tx.Save(&ticket).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update ticket",
		})
		return
	}

	// Create visit record
	visit := models.Visit{
		VisitorID:     ticket.VisitorID,
		TicketID:      ticket.ID,
		CheckInTime:   now,
		CheckInMethod: "staff_entry",
		CheckedInBy:   &staffIDUint,
		Status:        "checked_in",
		Notes:         usage.Notes,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := tx.Create(&visit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create visit record",
		})
		return
	}

	// Calculate queue position if not provided
	queuePosition := usage.QueuePosition
	if queuePosition == 0 {
		var count int64
		tx.Model(&models.Visit{}).
			Where("DATE(check_in_time) = ? AND check_out_time IS NULL", now.Format("2006-01-02")).
			Count(&count)
		queuePosition = int(count)
	}

	// Add visitor to queue
	queue := models.QueueEntry{
		VisitorID:        ticket.VisitorID,
		Reference:        ticket.TicketNumber,
		Category:         ticket.Category,
		Position:         queuePosition,
		Status:           "waiting",
		JoinedAt:         now,
		EstimatedMinutes: queuePosition * 5, // 5 minutes per position estimate
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := tx.Create(&queue).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to add to queue",
		})
		return
	}

	// Record usage in audit log
	// Update audit log message
	utils.CreateAuditLog(c, "UseTicket", "Ticket", ticket.ID,
		fmt.Sprintf("Ticket %s used by staff %d for visitor %s", ticketNumber, staffIDUint,
			ticket.Visitor.FirstName+" "+ticket.Visitor.LastName))

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to complete ticket usage",
		})
		return
	}

	// Update ticket use response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Ticket used successfully",
		"data": gin.H{
			"ticketNumber":  ticket.TicketNumber,
			"usedAt":        now.Format(time.RFC3339),
			"usedBy":        usage.StaffID,
			"queuePosition": queuePosition,
			"estimatedWait": fmt.Sprintf("%d minutes", queuePosition*5),
			"visitId":       visit.ID,
			"status":        "checked_in",
			"visitorName":   ticket.Visitor.FirstName + " " + ticket.Visitor.LastName,
			"category":      ticket.Category,
		},
	})
}

// AdminBulkIssueTickets handles bulk ticket issuance
func AdminBulkIssueTickets(c *gin.Context) {
	var request struct {
		Date     string `json:"date" binding:"required"`
		TimeSlot string `json:"time_slot" binding:"required"`
		Capacity int    `json:"capacity" binding:"required"`
		Category string `json:"category" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// Validate date format
	visitDate, err := time.Parse("2006-01-02", request.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid date format (use YYYY-MM-DD)",
		})
		return
	}

	// Get admin user ID
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Admin authentication required",
		})
		return
	}
	adminIDUint := adminID.(uint)

	// Begin transaction
	tx := db.DB.Begin()

	// Get approved help requests for the specified date and category
	var approvedRequests []models.HelpRequest
	query := tx.Where("status = ? AND visit_day = ?", models.HelpRequestStatusApproved, request.Date)
	if request.Category != "" {
		query = query.Where("category = ?", request.Category)
	}

	if err := query.Order("created_at ASC").Limit(request.Capacity).Find(&approvedRequests).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve approved requests",
		})
		return
	}

	if len(approvedRequests) == 0 {
		tx.Rollback()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "No approved requests found for the specified criteria",
			"data": gin.H{
				"date":          request.Date,
				"timeSlot":      request.TimeSlot,
				"category":      request.Category,
				"ticketsIssued": 0,
				"tickets":       []gin.H{},
			},
		})
		return
	}

	// Generate tickets for approved requests
	ticketsIssued := make([]gin.H, 0)
	now := time.Now()

	for i, helpRequest := range approvedRequests {
		if i >= request.Capacity {
			break
		}

		// Generate ticket number and QR code
		ticketNumber := shared.GenerateTicketNumber()
		qrCode, _ := shared.GenerateQRCode(ticketNumber)

		// Create ticket record - fix type assignment
		ticket := models.Ticket{
			VisitorID:    helpRequest.VisitorID,
			TicketNumber: ticketNumber,
			QRCode:       qrCode,
			Category:     helpRequest.Category,
			VisitDate:    visitDate, // Keep as time.Time
			TimeSlot:     request.TimeSlot,
			Status:       models.TicketStatusActive,
			IssuedAt:     now,
			ExpiresAt:    visitDate.AddDate(0, 0, 1), // Expires day after visit
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		if err := tx.Create(&ticket).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   fmt.Sprintf("Failed to create ticket for request %d", helpRequest.ID),
			})
			return
		}

		// Update help request status
		helpRequest.Status = models.HelpRequestStatusTicketIssued
		helpRequest.TicketNumber = ticketNumber
		helpRequest.QRCode = qrCode
		helpRequest.UpdatedAt = now

		if err := tx.Save(&helpRequest).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   fmt.Sprintf("Failed to update help request %d", helpRequest.ID),
			})
			return
		}

		ticketsIssued = append(ticketsIssued, gin.H{
			"ticketNumber": ticketNumber,
			"assignedTo":   helpRequest.VisitorName,
			"email":        helpRequest.Email,
			"timeSlot":     request.TimeSlot,
			"category":     helpRequest.Category,
			"reference":    helpRequest.Reference,
			"qrCode":       qrCode,
		})

		// Send notification to visitor (async)
		go sendTicketNotification(helpRequest, ticket)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to commit bulk ticket issuance",
		})
		return
	}

	// Record bulk issuance in audit log
	utils.CreateAuditLog(c, "BulkIssueTickets", "Ticket", 0,
		fmt.Sprintf("Bulk issued %d tickets for %s (%s) on %s", len(ticketsIssued), request.Category, request.TimeSlot, request.Date))

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": fmt.Sprintf("Bulk tickets issued successfully - %d tickets created", len(ticketsIssued)),
		"data": gin.H{
			"date":          request.Date,
			"timeSlot":      request.TimeSlot,
			"category":      request.Category,
			"ticketsIssued": len(ticketsIssued),
			"tickets":       ticketsIssued,
			"issuedAt":      now.Format(time.RFC3339),
			"issuedBy":      adminIDUint,
		},
	})
}

// AdminGetTicketAnalytics provides ticket analytics
func AdminGetTicketAnalytics(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	// Default to last 30 days if no dates provided
	if startDate == "" {
		startDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}
	if endDate == "" {
		endDate = time.Now().Format("2006-01-02")
	}

	// Parse dates
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid start date format (use YYYY-MM-DD)",
		})
		return
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid end date format (use YYYY-MM-DD)",
		})
		return
	}

	// Query overall ticket statistics
	var totalIssued, totalUsed, cancelled int64
	var noShows int64

	// Total tickets issued in period
	db.DB.Model(&models.Ticket{}).
		Where("issued_at BETWEEN ? AND ?", start, end.AddDate(0, 0, 1)).
		Count(&totalIssued)

	// Total tickets used in period
	db.DB.Model(&models.Ticket{}).
		Where("used_at BETWEEN ? AND ? AND status = ?", start, end.AddDate(0, 0, 1), models.TicketStatusUsed).
		Count(&totalUsed)

	// Cancelled tickets
	db.DB.Model(&models.Ticket{}).
		Where("issued_at BETWEEN ? AND ? AND status = ?", start, end.AddDate(0, 0, 1), models.TicketStatusCancelled).
		Count(&cancelled)

	// No-shows (tickets issued but expired without being used)
	db.DB.Model(&models.Ticket{}).
		Where("issued_at BETWEEN ? AND ? AND status = ? AND expires_at < ?",
			start, end.AddDate(0, 0, 1), models.TicketStatusActive, time.Now()).
		Count(&noShows)

	// Calculate utilization rate
	utilizationRate := 0.0
	if totalIssued > 0 {
		utilizationRate = float64(totalUsed) / float64(totalIssued) * 100
	}

	// Query statistics by category
	categoryStats := make(map[string]gin.H)
	categories := []string{models.CategoryFood, models.CategoryGeneral}

	for _, category := range categories {
		var issued, used int64

		db.DB.Model(&models.Ticket{}).
			Where("issued_at BETWEEN ? AND ? AND category = ?", start, end.AddDate(0, 0, 1), category).
			Count(&issued)

		db.DB.Model(&models.Ticket{}).
			Where("used_at BETWEEN ? AND ? AND status = ? AND category = ?",
				start, end.AddDate(0, 0, 1), models.TicketStatusUsed, category).
			Count(&used)

		rate := 0.0
		if issued > 0 {
			rate = float64(used) / float64(issued) * 100
		}

		categoryStats[category] = gin.H{
			"issued": issued,
			"used":   used,
			"rate":   rate,
		}
	}

	// Query daily trends for the period
	type DailyStats struct {
		Date            string  `json:"date"`
		Issued          int64   `json:"issued"`
		Used            int64   `json:"used"`
		UtilizationRate float64 `json:"utilization_rate"`
	}

	var trends []DailyStats
	currentDate := start
	for currentDate.Before(end.AddDate(0, 0, 1)) {
		dateStr := currentDate.Format("2006-01-02")
		nextDay := currentDate.AddDate(0, 0, 1)

		var dailyIssued, dailyUsed int64

		db.DB.Model(&models.Ticket{}).
			Where("DATE(issued_at) = ?", dateStr).
			Count(&dailyIssued)

		db.DB.Model(&models.Ticket{}).
			Where("DATE(used_at) = ? AND status = ?", dateStr, models.TicketStatusUsed).
			Count(&dailyUsed)

		dailyRate := 0.0
		if dailyIssued > 0 {
			dailyRate = float64(dailyUsed) / float64(dailyIssued) * 100
		}

		trends = append(trends, DailyStats{
			Date:            dateStr,
			Issued:          dailyIssued,
			Used:            dailyUsed,
			UtilizationRate: dailyRate,
		})

		currentDate = nextDay
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"period": gin.H{
				"startDate": startDate,
				"endDate":   endDate,
			},
			"statistics": gin.H{
				"totalIssued":     totalIssued,
				"totalUsed":       totalUsed,
				"noShows":         noShows,
				"cancelled":       cancelled,
				"utilizationRate": utilizationRate,
			},
			"byCategory": categoryStats,
			"trends":     trends,
		},
	})
}

// AdminCancelTicket cancels a ticket
func AdminCancelTicket(c *gin.Context) {
	ticketID := c.Param("id")

	var cancellation struct {
		Reason     string `json:"reason" binding:"required"`
		AdminNotes string `json:"admin_notes"`
		NotifyUser bool   `json:"notify_user"`
	}

	if err := c.ShouldBindJSON(&cancellation); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid cancellation format",
		})
		return
	}

	// Get admin user ID
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Admin authentication required",
		})
		return
	}
	adminIDUint := adminID.(uint)

	// Parse ticket ID
	ticketIDInt, err := strconv.ParseUint(ticketID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid ticket ID",
		})
		return
	}

	// Begin transaction
	tx := db.DB.Begin()

	// Get ticket with relationships
	var ticket models.Ticket
	if err := tx.Preload("Visitor").Preload("HelpRequest").
		Where("id = ?", ticketIDInt).First(&ticket).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Ticket not found",
		})
		return
	}

	// Check if ticket can be cancelled
	if ticket.Status == models.TicketStatusUsed {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Cannot cancel a ticket that has already been used",
		})
		return
	}

	if ticket.Status == models.TicketStatusCancelled {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Ticket is already cancelled",
		})
		return
	}

	// Update ticket status
	now := time.Now()
	ticket.Status = models.TicketStatusCancelled
	ticket.UpdatedAt = now

	if err := tx.Save(&ticket).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to cancel ticket",
		})
		return
	}

	// Update associated help request if needed
	if ticket.HelpRequest.Status == models.HelpRequestStatusTicketIssued {
		ticket.HelpRequest.Status = models.HelpRequestStatusApproved
		ticket.HelpRequest.TicketNumber = ""
		ticket.HelpRequest.QRCode = ""
		ticket.HelpRequest.UpdatedAt = now

		if err := tx.Save(&ticket.HelpRequest).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update help request status",
			})
			return
		}
	}

	// Create audit log
	utils.CreateAuditLog(c, "CancelTicket", "Ticket", ticket.ID,
		fmt.Sprintf("Ticket %s cancelled by admin %d. Reason: %s", ticket.TicketNumber, adminIDUint, cancellation.Reason))

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to commit ticket cancellation",
		})
		return
	}

	// Send notification to visitor if requested
	if cancellation.NotifyUser {
		go func() {
			notificationService := shared.GetNotificationService()
			if notificationService != nil {
				// Update notification data
				data := notifications.NotificationData{
					To:               ticket.Visitor.Email,
					Subject:          "Visit Ticket Cancelled - " + ticket.TicketNumber,
					TemplateType:     notifications.TemplateType("ticket_cancelled"),
					NotificationType: notifications.EmailNotification,
					TemplateData: map[string]interface{}{
						"FirstName":        ticket.Visitor.FirstName,
						"LastName":         ticket.Visitor.LastName,
						"TicketNumber":     ticket.TicketNumber,
						"Category":         ticket.Category,
						"VisitDate":        ticket.VisitDate.Format("2006-01-02"),
						"Reason":           cancellation.Reason,
						"OrganizationName": "Lewisham Charity",
					},
				}

				if err := notificationService.SendNotification(data, ticket.Visitor); err != nil {
					fmt.Printf("Failed to send cancellation notification: %v\n", err)
				}
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Ticket cancelled successfully",
		"data": gin.H{
			"ticketId":     ticket.ID,
			"ticketNumber": ticket.TicketNumber,
			"status":       ticket.Status,
			"reason":       cancellation.Reason,
			"cancelledAt":  now.Format(time.RFC3339),
			"cancelledBy":  adminIDUint,
			"userNotified": cancellation.NotifyUser,
		},
	})
}

// Helper functions for ticket operations

// sendTicketNotification sends a notification to the visitor about their ticket
func sendTicketNotification(helpRequest models.HelpRequest, ticket models.Ticket) {
	// Get visitor details
	var user models.User
	if err := db.DB.First(&user, helpRequest.VisitorID).Error; err != nil {
		fmt.Printf("Failed to find user for ticket notification: %v\n", err)
		return
	}

	// No need to concatenate name here, pass FirstName and LastName separately
	notificationService := shared.GetNotificationService()
	if notificationService != nil {
		data := notifications.NotificationData{
			To:               user.Email,
			Subject:          "Your Visit Ticket is Ready - " + ticket.TicketNumber,
			TemplateType:     notifications.TemplateType("ticket_issued"),
			NotificationType: notifications.EmailNotification,
			TemplateData: map[string]interface{}{
				"FirstName":        user.FirstName,
				"LastName":         user.LastName,
				"TicketNumber":     ticket.TicketNumber,
				"Reference":        helpRequest.Reference,
				"Category":         ticket.Category,
				"VisitDay":         ticket.VisitDate, // Already a string
				"TimeSlot":         ticket.TimeSlot,
				"QRCode":           ticket.QRCode,
				"OrganizationName": "Lewisham Charity",
			},
		}

		if err := notificationService.SendNotification(data, user); err != nil {
			fmt.Printf("Failed to send ticket notification: %v\n", err)
		}
	}
}

// Helper functions
/*
func getTicketInstructions(category string) []string {
	switch category {
	case models.CategoryFood:
		return []string{
			"Arrive during your allocated time slot",
			"Bring this ticket and valid photo ID",
			"Bring bags for food collection",
			"Be prepared to wait in queue",
		}
	case models.CategoryGeneral:
		return []string{
			"Arrive during your allocated time slot",
			"Bring this ticket and valid photo ID",
			"Be prepared to wait in queue",
		}
	default:
		return []string{
			"Bring this ticket and valid photo ID",
			"Arrive on time",
		}
	}
}

func getTicketRequirements(category string) []string {
	requirements := []string{
		"Valid photo ID (passport, driving license, etc.)",
		"Proof of address (utility bill, bank statement, etc.)",
	}

	if category == models.CategoryFood {
		requirements = append(requirements, "Bags or containers for food items")
	}

	return requirements
}
*/

// GetVisitorTicketHistory retrieves ticket history for the authenticated visitor
func GetVisitorTicketHistory(c *gin.Context) {
	// Get current user ID for access validation
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Authentication required",
		})
		return
	}

	fmt.Printf("GetVisitorTicketHistory: Querying tickets for user ID: %v\n", userID)

	// Query help requests with tickets for the authenticated visitor
	var helpRequests []models.HelpRequest
	if err := db.DB.Where("visitor_id = ? AND (ticket_number IS NOT NULL AND ticket_number != '' OR status IN (?, ?))",
		userID, models.HelpRequestStatusApproved, models.HelpRequestStatusTicketIssued).
		Order("created_at DESC").
		Find(&helpRequests).Error; err != nil {
		fmt.Printf("GetVisitorTicketHistory: Database error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve ticket history",
		})
		return
	}

	fmt.Printf("GetVisitorTicketHistory: Found %d help requests with tickets\n", len(helpRequests))

	// Also check total help requests for this user
	var totalHelpRequests []models.HelpRequest
	db.DB.Where("visitor_id = ?", userID).Find(&totalHelpRequests)
	fmt.Printf("GetVisitorTicketHistory: Total help requests for user: %d\n", len(totalHelpRequests))

	// Show some details about the help requests
	for i, hr := range helpRequests {
		fmt.Printf("Help Request %d: ID=%d, Status=%s, TicketNumber=%s, Category=%s\n",
			i+1, hr.ID, hr.Status, hr.TicketNumber, hr.Category)
	}

	// Format tickets for response
	var ticketHistory []gin.H
	for _, helpRequest := range helpRequests {
		ticketNumber := helpRequest.TicketNumber
		if ticketNumber == "" {
			// Generate a placeholder ticket number for approved requests without tickets
			ticketNumber = fmt.Sprintf("PENDING-%s", helpRequest.Reference)
		}

		ticketHistory = append(ticketHistory, gin.H{
			"id":            helpRequest.ID,
			"ticket_number": ticketNumber,
			"service_type":  helpRequest.Category,
			"date":          helpRequest.VisitDay,
			"status":        helpRequest.Status,
			"issued_at":     helpRequest.CreatedAt.Format("2006-01-02"),
			"time_slot":     helpRequest.TimeSlot,
			"reference":     helpRequest.Reference,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ticketHistory,
	})
}

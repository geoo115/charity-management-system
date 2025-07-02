package system

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/geoo115/LDH/internal/utils"
	"github.com/geoo115/LDH/internal/websocket"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"
)

// getOriginFromEnv returns allowed origins from environment variable
func getOriginFromEnvRealtime() []string {
	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins == "" {
		// Default to common development origins if not set
		corsOrigins = "http://localhost:3000,http://localhost:5173,http://localhost:8080"
	}
	return strings.Split(corsOrigins, ",")
}

// isOriginAllowed checks if the origin is in the allowed list
func isOriginAllowedRealtime(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	return false
}

// WebSocket upgrader with proper origin validation
var upgrader = gorilla.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := getOriginFromEnvRealtime()

		// In production, strictly validate origins
		if os.Getenv("APP_ENV") == "production" {
			return isOriginAllowedRealtime(origin, allowedOrigins)
		}

		// In development, be more permissive but still check basic origins
		if origin == "" {
			return true // Allow same-origin requests
		}

		return isOriginAllowedRealtime(origin, allowedOrigins)
	},
	EnableCompression: true,
}

// StaffCallRequest represents a call-next request
type StaffCallRequest struct {
	StaffID   uint   `json:"staff_id" binding:"required"`
	Action    string `json:"action" binding:"required,oneof=call_next mark_no_show complete_visit"`
	VisitorID uint   `json:"visitor_id,omitempty"`
	Notes     string `json:"notes"`
}

// QueueUpdateMessage represents real-time queue updates
type QueueUpdateMessage struct {
	Type         string `json:"type"`
	TicketNumber string `json:"ticket_number,omitempty"`
	Position     int    `json:"position,omitempty"`
	WaitTime     string `json:"wait_time,omitempty"`
	Status       string `json:"status"`
	Message      string `json:"message"`
	Timestamp    int64  `json:"timestamp"`
}

// RealTimeQueueWebSocket handles WebSocket connections for real-time queue updates
func RealTimeQueueWebSocket(c *gin.Context) {
	// Get user info from context (set by middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role required"})
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Get categories from query params
	categories := []string{}
	if category := c.Query("category"); category != "" {
		categories = append(categories, category)
	}
	if userRole == models.RoleAdmin || userRole == models.RoleSuperAdmin {
		categories = append(categories, "admin_queue", "staff_updates")
	}

	// Add connection to manager
	metadata := map[string]interface{}{
		"connection_type": "queue",
		"ip":              c.ClientIP(),
		"user_agent":      c.GetHeader("User-Agent"),
	}

	managedConn, err := websocket.GetGlobalManager().AddConnection(
		conn,
		userID.(uint),
		userRole.(string),
		categories,
		metadata,
	)
	if err != nil {
		log.Printf("Failed to add connection to manager: %v", err)
		conn.Close()
		return
	}

	log.Printf("Real-time queue WebSocket connection established for user %v", userID)

	// Send initial queue status
	initialStatus := getCurrentQueueStatus("system")
	if err := websocket.GetGlobalManager().BroadcastToUser(userID.(uint), initialStatus); err != nil {
		log.Printf("Failed to send initial status: %v", err)
	}

	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
}

// GetRealTimeQueueStatus provides polling-based queue updates for non-WebSocket clients
func GetRealTimeQueueStatus(c *gin.Context) {
	ticketNumber := c.Query("ticket_number")
	if ticketNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ticket number required"})
		return
	}

	status := getCurrentQueueStatus(ticketNumber)
	c.JSON(http.StatusOK, status)
}

// StaffCallNextSystem handles the staff call-next functionality
func StaffCallNextSystem(c *gin.Context) {
	var req StaffCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.Action {
	case "call_next":
		result := callNextVisitor(req.StaffID, req.Notes)
		c.JSON(http.StatusOK, result)
	case "mark_no_show":
		result := markVisitorNoShow(req.VisitorID, req.StaffID, req.Notes)
		c.JSON(http.StatusOK, result)
	case "complete_visit":
		result := completeVisitorService(req.VisitorID, req.StaffID, req.Notes)
		c.JSON(http.StatusOK, result)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
	}
}

// GetStaffQueueDashboard provides real-time dashboard for staff
func GetStaffQueueDashboard(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	// Get current queue
	var currentQueue []models.Visit
	db.DB.Preload("Visitor").Preload("Ticket").
		Where("DATE(check_in_time) = ? AND check_out_time IS NULL", today).
		Order("check_in_time ASC").
		Find(&currentQueue)

	// Get today's stats
	var dailyStats struct {
		TotalCheckedIn int64 `json:"total_checked_in"`
		TotalCompleted int64 `json:"total_completed"`
		AvgWaitTime    int   `json:"avg_wait_time_minutes"`
		CurrentInQueue int   `json:"current_in_queue"`
	}

	db.DB.Model(&models.Visit{}).
		Where("DATE(check_in_time) = ?", today).
		Count(&dailyStats.TotalCheckedIn)

	db.DB.Model(&models.Visit{}).
		Where("DATE(check_in_time) = ? AND check_out_time IS NOT NULL", today).
		Count(&dailyStats.TotalCompleted)

	dailyStats.CurrentInQueue = len(currentQueue)

	// Calculate average wait time
	if dailyStats.TotalCompleted > 0 {
		var avgWaitMinutes float64
		db.DB.Raw(`
			SELECT AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60) 
			FROM visits 
			WHERE DATE(check_in_time) = ? AND check_out_time IS NOT NULL
		`, today).Scan(&avgWaitMinutes)
		dailyStats.AvgWaitTime = int(avgWaitMinutes)
	}

	// Format queue for display
	var queueDisplay []gin.H
	for i, visit := range currentQueue {
		waitTime := time.Since(visit.CheckInTime)

		queueItem := gin.H{
			"position":      i + 1,
			"visitor_id":    visit.VisitorID,
			"visitor_name":  visit.Visitor.FirstName + " " + visit.Visitor.LastName,
			"category":      visit.Ticket.Category,
			"check_in_time": visit.CheckInTime,
			"wait_time":     fmt.Sprintf("%d minutes", int(waitTime.Minutes())),
			"status":        "waiting",
		}

		queueItem["ticket_number"] = visit.Ticket.TicketNumber

		// Highlight long waits
		if waitTime.Minutes() > 30 {
			queueItem["priority"] = "high"
		} else if waitTime.Minutes() > 15 {
			queueItem["priority"] = "medium"
		} else {
			queueItem["priority"] = "normal"
		}

		queueDisplay = append(queueDisplay, queueItem)
	}

	c.JSON(http.StatusOK, gin.H{
		"queue":       queueDisplay,
		"stats":       dailyStats,
		"last_update": time.Now(),
		"alerts":      getQueueAlerts(currentQueue),
	})
}

// BroadcastQueueUpdate sends real-time updates to connected clients
func BroadcastQueueUpdate(updateType, ticketNumber string, data interface{}) {
	message := QueueUpdateMessage{
		Type:         updateType,
		TicketNumber: ticketNumber,
		Status:       "updated",
		Message:      fmt.Sprintf("Queue %s", updateType),
		Timestamp:    time.Now().Unix(),
	}

	// Add specific data based on update type
	if position, ok := data.(int); ok {
		message.Position = position
	}

	// Broadcast to queue topic
	if err := websocket.GetGlobalManager().BroadcastToTopic("queue_updates", message); err != nil {
		log.Printf("Failed to broadcast queue update: %v", err)
	}

	// Also broadcast to admin channels
	if err := websocket.GetGlobalManager().BroadcastToRole(models.RoleAdmin, message); err != nil {
		log.Printf("Failed to broadcast to admins: %v", err)
	}
}

// RealtimeGetQueueStatus returns the current status of a queue category with WebSocket support
// Renamed from GetQueueStatus to avoid conflict
// @Summary Get queue status with WebSocket info
// @Description Returns the current status of a specified queue category with WebSocket support
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param category query string true "Queue category (e.g., 'food', 'general')"
// @Success 200 {object} map[string]interface{} "Queue status"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/realtime [get]
func RealtimeGetQueueStatus(c *gin.Context) {
	today := time.Now().Format("2006-01-02")

	// Get queue category from query parameter
	category := c.Query("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Queue category is required"})
		return
	}

	// Get current queue for the category
	var currentQueue []models.Visit
	db.DB.Preload("Visitor").Preload("Ticket").
		Where("DATE(check_in_time) = ? AND check_out_time IS NULL AND tickets.category = ?", today, category).
		Joins("JOIN tickets ON visits.ticket_id = tickets.id").
		Order("check_in_time ASC").
		Find(&currentQueue)

	// Format queue for display
	var queueDisplay []gin.H
	for i, visit := range currentQueue {
		waitTime := time.Since(visit.CheckInTime)

		queueItem := gin.H{
			"position":      i + 1,
			"visitor_id":    visit.VisitorID,
			"visitor_name":  visit.Visitor.FirstName + " " + visit.Visitor.LastName,
			"category":      visit.Ticket.Category,
			"check_in_time": visit.CheckInTime,
			"wait_time":     fmt.Sprintf("%d minutes", int(waitTime.Minutes())),
			"status":        "waiting",
		}

		queueItem["ticket_number"] = visit.Ticket.TicketNumber

		// Highlight long waits
		if waitTime.Minutes() > 30 {
			queueItem["priority"] = "high"
		} else if waitTime.Minutes() > 15 {
			queueItem["priority"] = "medium"
		} else {
			queueItem["priority"] = "normal"
		}

		queueDisplay = append(queueDisplay, queueItem)
	}

	c.JSON(http.StatusOK, gin.H{
		"queue":       queueDisplay,
		"last_update": time.Now(),
		"alerts":      getQueueAlerts(currentQueue),
	})
}

// RealtimeJoinQueue allows a visitor to join the queue with WebSocket updates
// Renamed from JoinQueue to avoid conflict
// @Summary Join queue with realtime updates
// @Description Adds a visitor to the specified queue category with WebSocket support
// @Tags Queue Management
// @Accept json
// @Produce json
// @Param request body object true "Join queue request"
// @Success 200 {object} map[string]interface{} "Queue position"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Server error"
// @Router /api/v1/queue/realtime/join [post]
func RealtimeJoinQueue(c *gin.Context) {
	var req struct {
		Category  string `json:"category"`
		Notes     string `json:"notes"`
		Reference string `json:"reference"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Verify reference exists if provided
	var helpRequest models.HelpRequest
	if req.Reference != "" {
		if err := db.DB.Where("reference = ?", req.Reference).First(&helpRequest).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid reference code"})
			return
		}
	}

	// Check if user is already in queue
	var existingEntry models.QueueEntry
	err := db.DB.Where("visitor_id = ? AND status IN ('waiting', 'called')", userID).
		First(&existingEntry).Error

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already in queue"})
		return
	}

	// Calculate next position
	var maxPosition int
	db.DB.Model(&models.QueueEntry{}).
		Where("status = 'waiting' AND category = ?", req.Category).
		Select("COALESCE(MAX(position), 0)").
		Scan(&maxPosition)

	position := maxPosition + 1
	now := time.Now()

	// Calculate estimated wait time based on position and average service time
	var settings models.QueueSettings
	estimatedMinutes := position * 15 // Default 15 minutes per person
	if err := db.DB.Where("category = ?", req.Category).First(&settings).Error; err == nil {
		estimatedMinutes = position * settings.AverageServiceTime / settings.ConcurrentServiceDesks
	}

	// Create queue entry
	queueEntry := models.QueueEntry{
		Reference:        req.Reference,
		VisitorID:        userID.(uint),
		Category:         req.Category,
		Position:         position,
		EstimatedMinutes: estimatedMinutes,
		Status:           "waiting",
		JoinedAt:         now,
		Notes:            req.Notes,
	}

	// Set HelpRequestID if we have a help request
	if req.Reference != "" {
		queueEntry.HelpRequestID = helpRequest.ID
	}

	if err := db.DB.Create(&queueEntry).Error; err != nil {
		log.Printf("Error creating queue entry: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join queue"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Successfully joined queue",
		"position":       queueEntry.Position,
		"queue_id":       queueEntry.ID,
		"estimated_wait": queueEntry.EstimatedMinutes,
	})
}

// Helper functions

func getCurrentQueueStatus(identifier string) gin.H {
	today := time.Now().Format("2006-01-02")

	// If it's a ticket number, get visitor's position
	if len(identifier) > 6 && (identifier[:3] == "LDH" || identifier[:3] == "EMG") {
		var visit models.Visit
		err := db.DB.Preload("Visitor").Preload("Ticket").
			Joins("JOIN tickets ON tickets.id = visits.ticket_id").
			Where("tickets.ticket_number = ? AND DATE(visits.check_in_time) = ?", identifier, today).
			First(&visit).Error

		if err != nil {
			return gin.H{
				"status":  "not_found",
				"message": "Ticket not found in today's queue",
			}
		}

		// Get position in queue
		var position int64
		db.DB.Model(&models.Visit{}).
			Where("DATE(check_in_time) = ? AND check_in_time <= ? AND check_out_time IS NULL",
				today, visit.CheckInTime).
			Count(&position)

		waitTime := time.Since(visit.CheckInTime)
		estimatedWait := calculateEstimatedWaitTime(int(position))

		// Replace visit.Visitor.Name
		visitorName := visit.Visitor.FirstName + " " + visit.Visitor.LastName

		return gin.H{
			"status":         "in_queue",
			"position":       position,
			"wait_time":      fmt.Sprintf("%d minutes", int(waitTime.Minutes())),
			"estimated_wait": estimatedWait,
			"ticket_number":  identifier,
			"visitor_name":   visitorName,
			"category":       visit.Ticket.Category,
		}
	}

	// For staff clients, return full queue status
	if identifier == "staff" {
		var queueCount int64
		db.DB.Model(&models.Visit{}).
			Where("DATE(check_in_time) = ? AND check_out_time IS NULL", today).
			Count(&queueCount)

		return gin.H{
			"status":      "staff_view",
			"queue_count": queueCount,
			"timestamp":   time.Now(),
		}
	}

	return gin.H{
		"status":  "unknown",
		"message": "Invalid identifier",
	}
}

func callNextVisitor(staffID uint, notes string) gin.H {
	today := time.Now().Format("2006-01-02")

	// Get next visitor in queue
	var nextVisit models.Visit
	err := db.DB.Preload("Visitor").Preload("Ticket").
		Where("DATE(check_in_time) = ? AND check_out_time IS NULL", today).
		Order("check_in_time ASC").
		First(&nextVisit).Error

	if err != nil {
		return gin.H{
			"status":  "no_visitors",
			"message": "No visitors in queue",
		}
	}

	// Update visit to indicate being served
	now := time.Now()
	nextVisit.Notes = fmt.Sprintf("Called for service by staff %d at %s. %s",
		staffID, now.Format("15:04:05"), notes)
	nextVisit.Status = "in_service"
	nextVisit.UpdatedAt = now

	db.DB.Save(&nextVisit)

	// Create audit log
	utils.CreateAuditLog(nil, "CallNext", "Visit", nextVisit.ID,
		fmt.Sprintf("Staff %d called next visitor: %s", staffID, nextVisit.Visitor.FirstName+" "+nextVisit.Visitor.LastName))

	// Broadcast update
	ticketNumber := nextVisit.Ticket.TicketNumber
	BroadcastQueueUpdate("visitor_called", ticketNumber, 1)

	// Remove the problematic assignment that uses non-existent FullName field
	// Instead, directly use FirstName + LastName in the return statement
	return gin.H{
		"status": "success",
		"visitor": gin.H{
			"id":            nextVisit.Visitor.ID,
			"name":          nextVisit.Visitor.FirstName + " " + nextVisit.Visitor.LastName,
			"ticket_number": ticketNumber,
		},
		"message":   "Next visitor called successfully",
		"called_at": now,
	}
}

// markVisitorNoShow marks a visitor as a no-show in the queue
func markVisitorNoShow(visitorID, staffID uint, notes string) gin.H {
	today := time.Now().Format("2006-01-02")
	var visit models.Visit
	err := db.DB.Where("visitor_id = ? AND DATE(check_in_time) = ?", visitorID, today).
		First(&visit).Error
	if err != nil {
		return gin.H{
			"status":  "not_found",
			"message": "Visitor not found in today's queue",
		}
	}
	// Mark as no-show
	now := time.Now()
	visit.CheckOutTime = &now
	visit.Notes = fmt.Sprintf("Marked as no-show by staff %d. %s", staffID, notes)
	visit.Status = "no_show"
	visit.CheckedOutBy = &staffID
	visit.UpdatedAt = now
	db.DB.Save(&visit)
	// Create audit log
	utils.CreateAuditLog(nil, "MarkNoShow", "Visit", visit.ID,
		fmt.Sprintf("Visitor %d marked as no-show by staff %d", visitorID, staffID))
	// Broadcast queue update
	BroadcastQueueUpdate("no_show", "", nil)
	return gin.H{
		"status":     "success",
		"message":    "Visitor marked as no-show",
		"visitor_id": visitorID,
	}
}

// completeVisitorService marks a visitor's service as completed
func completeVisitorService(visitorID, staffID uint, notes string) gin.H {
	today := time.Now().Format("2006-01-02")
	var visit models.Visit
	err := db.DB.Where("visitor_id = ? AND DATE(check_in_time) = ?", visitorID, today).
		First(&visit).Error
	if err != nil {
		return gin.H{
			"status":  "not_found",
			"message": "Visitor not found in today's queue",
		}
	}
	// Complete the visit using the model's Complete method
	visit.Complete(staffID, fmt.Sprintf("Service completed by staff %d. %s", staffID, notes))
	db.DB.Save(&visit)

	// Create audit log
	utils.CreateAuditLog(nil, "CompleteVisit", "Visit", visit.ID,
		fmt.Sprintf("Visit completed for visitor %d by staff %d", visitorID, staffID))
	// Broadcast queue update
	BroadcastQueueUpdate("visit_completed", "", nil)
	return gin.H{
		"status":     "success",
		"message":    "Visit completed successfully",
		"visitor_id": visitorID,
		"duration":   visit.CheckOutTime.Sub(visit.CheckInTime).Minutes(),
	}
}

// calculateEstimatedWaitTime estimates wait time based on position
func calculateEstimatedWaitTime(position int) string {
	minutes := position * 8 // Estimate 8 minutes per visitor
	if minutes <= 60 {
		return fmt.Sprintf("%d minutes", minutes)
	}
	hours := minutes / 60
	remainingMinutes := minutes % 60
	return fmt.Sprintf("%d hours %d minutes", hours, remainingMinutes)
}

// getQueueAlerts returns alerts for queue status
func getQueueAlerts(queue []models.Visit) []gin.H {
	var alerts []gin.H
	if len(queue) > 15 {
		alerts = append(alerts, gin.H{
			"type":    "warning",
			"message": fmt.Sprintf("High queue volume: %d visitors waiting", len(queue)),
		})
	}
	// Check for long wait times
	longWaits := 0
	for _, visit := range queue {
		if time.Since(visit.CheckInTime).Minutes() > 30 {
			longWaits++
		}
	}
	if longWaits > 0 {
		alerts = append(alerts, gin.H{
			"type":    "error",
			"message": fmt.Sprintf("%d visitors waiting over 30 minutes", longWaits),
		})
	}
	return alerts
}

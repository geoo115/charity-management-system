package system

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/geoo115/charity-management-system/internal/db"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/websocket"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"
)

var documentWebSocketUpgrader = gorilla.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In development, allow all origins
		// In production, you should validate against allowed origins
		return true
	},
	EnableCompression: true,
}

// QueueUpdate represents a queue status update
type QueueUpdate struct {
	Type          string    `json:"type"` // "position_change", "called", "wait_time_update"
	UserID        int       `json:"user_id"`
	Position      int       `json:"position"`
	EstimatedWait string    `json:"estimated_wait"`
	TotalInQueue  int       `json:"total_in_queue"`
	Timestamp     time.Time `json:"timestamp"`
	Message       string    `json:"message,omitempty"`
}

// NotificationUpdate represents a real-time notification
type NotificationUpdate struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Priority  string    `json:"priority"`
	ActionURL string    `json:"action_url,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// WebSocketStatusResponse represents the status of the WebSocket service
type WebSocketStatusResponse struct {
	Available       bool      `json:"available"`
	ActiveSessions  int       `json:"active_sessions"`
	Endpoints       []string  `json:"endpoints"`
	ServerTimestamp time.Time `json:"server_timestamp"`
}

// HandleWebSocketStatus returns information about the WebSocket server status
func HandleWebSocketStatus(c *gin.Context) {
	// Get stats from the WebSocket manager
	stats := websocket.GetGlobalManager().GetConnectionStats()

	// Prepare response
	response := WebSocketStatusResponse{
		Available:      true,
		ActiveSessions: stats.TotalConnections,
		Endpoints: []string{
			"/ws/notifications",
			"/ws/queue/updates",
			"/ws/documents",
			"/ws/volunteer/notifications",
			"/ws/volunteer/queue",
		},
		ServerTimestamp: time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

// HandleWebSocketHeartbeat provides a simple endpoint to check if the WebSocket server is accessible
func HandleWebSocketHeartbeat(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":      "online",
		"timestamp":   time.Now(),
		"server_info": websocket.GetGlobalManager().GetServerInfo(),
	})
}

// HandlePendingNotifications returns unread notifications for polling fallback
func HandlePendingNotifications(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Query for unread notifications
	var notifications []models.InAppNotification
	if err := db.DB.Where("user_id = ? AND read = ? AND created_at > ?",
		userID, false, time.Now().Add(-15*time.Minute)).
		Order("created_at DESC").
		Limit(10).
		Find(&notifications).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		log.Printf("Failed to fetch pending notifications for user %v: %v", userID, err)
		return
	}

	// Return notifications
	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"timestamp":     time.Now(),
	})
}

// HandleQueueWebSocket handles WebSocket connections for admin queue management
func HandleQueueWebSocket(c *gin.Context) {
	// Delegate to the websocket package's queue handler
	websocket.HandleQueueWebSocket(c)
}

// HandleQueueUpdates handles WebSocket connections for queue updates using the centralized manager
func HandleQueueUpdates(c *gin.Context) {
	// Delegate to the real-time queue handler
	RealTimeQueueWebSocket(c)
}

// HandleNotificationUpdates handles WebSocket connections for notifications using the centralized manager
func HandleNotificationUpdates(c *gin.Context) {
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
	conn, err := documentWebSocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Notification WebSocket upgrade failed: %v", err)
		return
	}

	// Add connection to centralized manager
	categories := []string{"notifications", "general"}
	if userRole == models.RoleVolunteer {
		categories = append(categories, "volunteer_notifications")
	}
	if userRole == models.RoleAdmin || userRole == models.RoleSuperAdmin {
		categories = append(categories, "admin_notifications")
	}

	metadata := map[string]interface{}{
		"connection_type": "notifications",
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
		log.Printf("Failed to add notification connection to manager: %v", err)
		conn.Close()
		return
	}
	log.Printf("Notification WebSocket connection established for user %v", userID)

	// Don't send welcome message immediately - let the connection stabilize first
	// Send existing unread notifications in a separate goroutine
	go func() {
		// Wait a bit longer for connection to stabilize
		time.Sleep(500 * time.Millisecond)

		log.Printf("Sending welcome message to user %v", userID)
		// Send welcome message
		welcome := NotificationUpdate{
			Type:      "connection_established",
			Title:     "Notifications Connected",
			Message:   "You will receive real-time notifications here",
			Priority:  "info",
			Timestamp: time.Now(),
		}

		if err := websocket.GetGlobalManager().BroadcastToUser(userID.(uint), welcome); err != nil {
			log.Printf("Failed to send welcome message to user %v: %v", userID, err)
		} else {
			log.Printf("Welcome message sent successfully to user %v", userID)
		}

		// Small delay before sending unread notifications
		time.Sleep(100 * time.Millisecond)
		log.Printf("Sending unread notifications to user %v", userID)
		sendUnreadNotifications(userID.(uint))
		log.Printf("Finished sending unread notifications to user %v", userID)
	}()

	log.Printf("Waiting for connection context to close for user %v", userID)
	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
	log.Printf("WebSocket connection context done for user %v", userID)
}

// sendUnreadNotifications sends existing unread notifications to a user
func sendUnreadNotifications(userID uint) {
	var unreadNotifications []models.InAppNotification
	if err := db.DB.Where("user_id = ? AND read = false", userID).Find(&unreadNotifications).Error; err != nil {
		log.Printf("Error fetching unread notifications: %v", err)
		return
	}

	for _, notification := range unreadNotifications {
		notificationUpdate := NotificationUpdate{
			ID:        int(notification.ID),
			UserID:    int(notification.UserID),
			Type:      notification.Type,
			Title:     notification.Title,
			Message:   notification.Message,
			Priority:  notification.Priority,
			ActionURL: notification.ActionURL,
			Timestamp: notification.CreatedAt,
		}

		if err := websocket.GetGlobalManager().BroadcastToUser(userID, notificationUpdate); err != nil {
			log.Printf("Error sending unread notification: %v", err)
		}
	}
}

// HandleDocumentWebSocket handles WebSocket connections for document updates using centralized manager
func HandleDocumentWebSocket(c *gin.Context) {
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
	conn, err := documentWebSocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Document WebSocket upgrade failed: %v", err)
		return
	}

	// Add connection to centralized manager
	categories := []string{"documents"}
	if userRole == models.RoleAdmin || userRole == models.RoleSuperAdmin {
		categories = append(categories, "admin_documents", "document_verification")
	}

	metadata := map[string]interface{}{
		"connection_type": "documents",
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
		log.Printf("Failed to add document connection to manager: %v", err)
		conn.Close()
		return
	}

	log.Printf("Document WebSocket connection established for user %v", userID)

	// Send initial document stats through manager
	stats := getDocumentStatsForUser(userID.(uint))
	if err := websocket.GetGlobalManager().BroadcastToUser(userID.(uint), map[string]interface{}{
		"type": "document_stats",
		"data": stats,
	}); err != nil {
		log.Printf("Failed to send initial document stats: %v", err)
	}

	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
}

// getDocumentStatsForUser returns document statistics for a specific user
func getDocumentStatsForUser(userID uint) map[string]interface{} {
	var stats struct {
		Total    int64 `json:"total"`
		Pending  int64 `json:"pending"`
		Approved int64 `json:"approved"`
		Rejected int64 `json:"rejected"`
	}

	// Query database for user-specific stats
	db.DB.Model(&models.Document{}).Where("user_id = ?", userID).Count(&stats.Total)
	db.DB.Model(&models.Document{}).Where("user_id = ? AND status = ?", userID, "pending").Count(&stats.Pending)
	db.DB.Model(&models.Document{}).Where("user_id = ? AND status = ?", userID, "approved").Count(&stats.Approved)
	db.DB.Model(&models.Document{}).Where("user_id = ? AND status = ?", userID, "rejected").Count(&stats.Rejected)

	return map[string]interface{}{
		"stats": stats,
	}
}

// HandleVolunteerNotifications handles WebSocket connections for volunteer notifications
func HandleVolunteerNotifications(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identification required"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role required"})
		return
	}

	// Upgrade connection to WebSocket
	conn, err := documentWebSocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Volunteer notifications WebSocket upgrade failed: %v", err)
		return
	}

	// Add to manager with volunteer-specific categories
	categories := []string{"volunteer_notifications", "general"}
	metadata := map[string]interface{}{
		"connection_type": "volunteer_notifications",
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
		log.Printf("Failed to add volunteer connection to manager: %v", err)
		conn.Close()
		return
	}

	log.Printf("Volunteer notifications WebSocket connection established for user: %v", userID)

	// Send connection confirmation through manager
	welcome := NotificationUpdate{
		Type:      "connection_established",
		Title:     "Notifications Connected",
		Message:   "You will receive real-time volunteer notifications here",
		Priority:  "info",
		Timestamp: time.Now(),
	}

	if err := websocket.GetGlobalManager().BroadcastToUser(userID.(uint), welcome); err != nil {
		log.Printf("Error sending welcome message: %v", err)
	}

	// Send existing unread notifications
	sendUnreadNotifications(userID.(uint))

	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
}

// HandleVolunteerQueueWebSocket handles WebSocket connections for volunteer queue updates
func HandleVolunteerQueueWebSocket(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identification required"})
		return
	}

	userRole, exists := c.Get("userRole")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User role required"})
		return
	}

	// Upgrade connection to WebSocket
	conn, err := documentWebSocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Volunteer queue WebSocket upgrade failed: %v", err)
		return
	}

	// Add to manager with queue-specific categories
	categories := []string{"volunteer_queue", "queue_updates"}
	metadata := map[string]interface{}{
		"connection_type": "volunteer_queue",
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
		log.Printf("Failed to add volunteer queue connection to manager: %v", err)
		conn.Close()
		return
	}

	log.Printf("Volunteer queue WebSocket connection established for user: %v", userID)

	// Send initial queue status through manager
	initialStatus := map[string]interface{}{
		"type":      "volunteer_queue_status",
		"user_id":   userID,
		"connected": true,
		"timestamp": time.Now(),
	}

	if err := websocket.GetGlobalManager().BroadcastToUser(userID.(uint), initialStatus); err != nil {
		log.Printf("Error sending initial volunteer queue status: %v", err)
	}

	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
}

// HandlePublicWebSocket handles public (unauthenticated) WebSocket connections
func HandlePublicWebSocket(c *gin.Context) {
	// Upgrade connection to WebSocket
	conn, err := documentWebSocketUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Public WebSocket upgrade failed: %v", err)
		return
	}

	// Generate a client ID for the anonymous connection
	clientID := generateAnonymousClientID(c.ClientIP())

	// Create metadata for the connection
	metadata := map[string]interface{}{
		"connection_type": "public",
		"ip":              c.ClientIP(),
		"user_agent":      c.GetHeader("User-Agent"),
	}

	// Add connection to centralized manager with a guest role
	// We're using 0 as the userID for anonymous/public connections
	categories := []string{"public"}
	managedConn, err := websocket.GetGlobalManager().AddConnection(
		conn,
		0,       // Anonymous user ID
		"guest", // Guest role
		categories,
		metadata,
	)
	if err != nil {
		log.Printf("Failed to add public connection to manager: %v", err)
		conn.Close()
		return
	}

	log.Printf("Public WebSocket connection established for client: %s", clientID)

	// Send welcome message
	welcome := map[string]interface{}{
		"type":      "connection_established",
		"client_id": clientID,
		"message":   "Connected to public WebSocket channel",
		"timestamp": time.Now(),
	}

	// Send directly to the connection since we can't use BroadcastToUser for anonymous connections
	welcomeJSON, _ := json.Marshal(welcome)
	conn.WriteMessage(gorilla.TextMessage, welcomeJSON)

	// Wait for connection to close (handled by manager)
	<-managedConn.Context.Done()
	log.Printf("Public WebSocket connection closed for client: %s", clientID)
}

// generateAnonymousClientID creates a unique ID for anonymous WebSocket clients
func generateAnonymousClientID(clientIP string) string {
	ipHash := sha256.Sum256([]byte(clientIP))
	timestamp := time.Now().UnixNano()
	idString := fmt.Sprintf("guest-%x-%d", ipHash[:4], timestamp)
	return idString
}

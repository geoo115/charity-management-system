package websocket

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/geoo115/LDH/internal/db"
	"github.com/geoo115/LDH/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
	Conn   *websocket.Conn
	UserID uint
	// Add any additional client metadata here
}

// Message represents a WebSocket message
type Message struct {
	Type      string      `json:"type"`
	Queue     interface{} `json:"queue,omitempty"`
	Reference string      `json:"reference,omitempty"`
	Category  string      `json:"category,omitempty"`
	Message   string      `json:"message,omitempty"`
	// Add other fields as needed
}

// NewClient creates a new WebSocket client
func NewClient(conn *websocket.Conn, userID uint) *Client {
	return &Client{
		Conn:   conn,
		UserID: userID,
	}
}

// SendJSON sends a JSON message to the client
func (c *Client) SendJSON(v interface{}) error {
	// Add write deadline to prevent hanging connections
	c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	err := c.Conn.WriteJSON(v)
	if err != nil {
		log.Printf("Error sending message to client %d: %v", c.UserID, err)
	}
	return err
}

// QueueManager maintains WebSocket connections and distributes queue updates
type QueueManager struct {
	// Map of category -> slice of clients
	clients     map[string][]*Client
	queueData   map[string][]interface{} // Stores queue data by category
	clientMutex sync.RWMutex
	queueMutex  sync.RWMutex
}

var (
	queueManager *QueueManager
	queueOnce    sync.Once
)

// GetQueueManager returns the singleton queue manager instance
func GetQueueManager() *QueueManager {
	queueOnce.Do(func() {
		queueManager = &QueueManager{
			clients:   make(map[string][]*Client),
			queueData: make(map[string][]interface{}),
		}
	})
	return queueManager
}

// RegisterClient registers a new WebSocket client for a category
func (qm *QueueManager) RegisterClient(client *Client, category string) {
	qm.clientMutex.Lock()
	defer qm.clientMutex.Unlock()

	if qm.clients[category] == nil {
		qm.clients[category] = make([]*Client, 0)
	}
	qm.clients[category] = append(qm.clients[category], client)

	log.Printf("Client %d registered for category %s. Total clients: %d",
		client.UserID, category, len(qm.clients[category]))
}

// UnregisterClient removes a client from all categories
func (qm *QueueManager) UnregisterClient(client *Client, category string) {
	qm.clientMutex.Lock()
	defer qm.clientMutex.Unlock()

	if clients, exists := qm.clients[category]; exists {
		for i, c := range clients {
			if c == client {
				// Remove client from slice
				qm.clients[category] = append(clients[:i], clients[i+1:]...)
				log.Printf("Client %d unregistered from category %s. Remaining: %d",
					client.UserID, category, len(qm.clients[category]))
				break
			}
		}

		// Clean up empty categories
		if len(qm.clients[category]) == 0 {
			delete(qm.clients, category)
		}
	}
}

// GetQueue returns the current queue data for a category
func (qm *QueueManager) GetQueue(category string) interface{} {
	qm.queueMutex.RLock()
	defer qm.queueMutex.RUnlock()

	if queue, exists := qm.queueData[category]; exists {
		return queue
	}

	// Return fresh queue data from database
	return qm.loadQueueFromDatabase(category)
}

// UpdateQueue updates the queue data and notifies all clients
func (qm *QueueManager) UpdateQueue(category string, queue interface{}) {
	qm.queueMutex.Lock()
	qm.queueData[category] = queue.([]interface{})
	qm.queueMutex.Unlock()

	// Broadcast to all clients in this category
	qm.BroadcastToCategory(category, Message{
		Type:     "queue_update",
		Category: category,
		Queue:    queue,
	})
}

// BroadcastToCategory sends a message to all clients in a category
func (qm *QueueManager) BroadcastToCategory(category string, message Message) {
	qm.clientMutex.RLock()
	clients := qm.clients[category]
	qm.clientMutex.RUnlock()

	if len(clients) == 0 {
		return
	}

	var disconnectedClients []*Client

	for _, client := range clients {
		if err := client.SendJSON(message); err != nil {
			log.Printf("Failed to send message to client %d: %v", client.UserID, err)
			disconnectedClients = append(disconnectedClients, client)
		}
	}

	// Remove disconnected clients
	for _, client := range disconnectedClients {
		qm.UnregisterClient(client, category)
	}
}

// loadQueueFromDatabase fetches current queue state from database
func (qm *QueueManager) loadQueueFromDatabase(category string) []interface{} {
	var queueEntries []models.QueueEntry

	err := db.DB.Preload("Visitor").
		Where("category = ? AND status IN ?", category, []string{"waiting", "called"}).
		Order("position ASC").
		Find(&queueEntries).Error

	if err != nil {
		log.Printf("Error loading queue from database: %v", err)
		return []interface{}{}
	}

	queue := make([]interface{}, len(queueEntries))
	for i, entry := range queueEntries {
		queue[i] = map[string]interface{}{
			"id":             entry.ID,
			"reference":      entry.Reference,
			"visitor_id":     entry.VisitorID,
			"visitor_name":   entry.Visitor.FirstName + " " + entry.Visitor.LastName,
			"position":       entry.Position,
			"status":         entry.Status,
			"estimated_wait": entry.EstimatedMinutes,
			"joined_at":      entry.JoinedAt,
			"called_at":      entry.CalledAt,
		}
	}

	return queue
}

// ClientInfo stores information about a connected client
type ClientInfo struct {
	ID          string    `json:"id"`
	UserID      uint      `json:"user_id"`
	Category    string    `json:"category"`
	Reference   string    `json:"reference,omitempty"`
	ConnectedAt time.Time `json:"connected_at"`
}

// QueuePosition represents a visitor's position in the queue
type QueuePosition struct {
	Position      int       `json:"position"`
	EstimatedWait int       `json:"estimated_wait_minutes"`
	AheadCount    int       `json:"ahead_count"`
	TotalInQueue  int       `json:"total_in_queue"`
	Status        string    `json:"status"`
	LastUpdate    time.Time `json:"last_update"`
}

// QueueUpdate represents a message sent to clients about queue changes
type QueueUpdate struct {
	Type      string         `json:"type"`
	Reference string         `json:"reference,omitempty"`
	Category  string         `json:"category"`
	Position  *QueuePosition `json:"position,omitempty"`
	Message   string         `json:"message,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
}

// HandleQueueWebSocket upgrades HTTP connection to WebSocket for queue updates
func HandleQueueWebSocket(c *gin.Context) {
	// Get parameters
	category := c.Query("category")
	reference := c.Query("reference")

	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category parameter required"})
		return
	}

	// Get user from context (set by auth middleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	user, ok := userInterface.(models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user context"})
		return
	}

	// Create upgrader instance
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// Use the same origin check as handlers
			origin := r.Header.Get("Origin")
			allowedOrigins := []string{
				"http://localhost:3000",
				"http://localhost:5173",
				"http://localhost:8080",
			}

			if corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); corsOrigins != "" {
				allowedOrigins = strings.Split(corsOrigins, ",")
			}

			for _, allowed := range allowedOrigins {
				if strings.TrimSpace(allowed) == origin {
					return true
				}
			}
			return origin == "" // Allow same-origin
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Create client and register
	client := NewClient(conn, user.ID)
	queueManager := GetQueueManager()

	queueManager.RegisterClient(client, category)
	defer queueManager.UnregisterClient(client, category)

	log.Printf("WebSocket connection established for user %d in category %s", user.ID, category)

	// Send initial queue state
	initialQueue := queueManager.GetQueue(category)
	client.SendJSON(Message{
		Type:     "initial_state",
		Category: category,
		Queue:    initialQueue,
	})

	// Handle messages and keep connection alive
	processWebSocketMessage(client, category, reference, user)
}

// processWebSocketMessage handles incoming WebSocket messages
func processWebSocketMessage(client *Client, category, reference string, user models.User) {
	for {
		var message map[string]interface{}
		if err := client.Conn.ReadJSON(&message); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		msgType, _ := message["type"].(string)

		switch msgType {
		case "ping":
			client.SendJSON(Message{Type: "pong"})

		case "get_position":
			if reference != "" {
				sendPositionUpdate(client, reference, category)
			}

		case "join_queue":
			if user.Role == models.RoleVisitor {
				joinQueue(client, category, reference, user.ID)
			}

		case "call_next":
			// Only admins and volunteers can call visitors
			if user.Role == models.RoleAdmin || user.Role == models.RoleVolunteer {
				callVisitor(client, category, user.ID)
			}

		case "mark_served":
			// Only admins and volunteers can mark as served
			if user.Role == models.RoleAdmin || user.Role == models.RoleVolunteer {
				visitorID, _ := message["visitor_id"].(float64)
				markVisitorServed(client, category, uint(visitorID), user.ID)
			}

		case "cancel_position":
			if reference != "" {
				cancelQueuePosition(client, category, reference, user.ID)
			}

		default:
			log.Printf("Unknown message type: %s", msgType)
		}
	}
}

// Helper functions for queue operations
func sendPositionUpdate(client *Client, reference, category string) {
	var queueEntry models.QueueEntry
	err := db.DB.Where("reference = ? AND category = ? AND status IN ?",
		reference, category, []string{"waiting", "called"}).First(&queueEntry).Error

	if err != nil {
		client.SendJSON(Message{
			Type:    "error",
			Message: "Not in queue",
		})
		return
	}

	position := &QueuePosition{
		Position:      queueEntry.Position,
		EstimatedWait: queueEntry.EstimatedMinutes,
		Status:        queueEntry.Status,
		LastUpdate:    time.Now(),
	}

	// Count total in queue
	var totalCount int64
	db.DB.Model(&models.QueueEntry{}).
		Where("category = ? AND status = ?", category, "waiting").
		Count(&totalCount)
	position.TotalInQueue = int(totalCount)
	position.AheadCount = queueEntry.Position - 1

	client.SendJSON(QueueUpdate{
		Type:      "position_update",
		Reference: reference,
		Category:  category,
		Position:  position,
		Timestamp: time.Now(),
	})
}

func joinQueue(client *Client, category, reference string, userID uint) {
	// Check if already in queue
	var existing models.QueueEntry
	if err := db.DB.Where("reference = ? AND category = ? AND status IN ?",
		reference, category, []string{"waiting", "called"}).First(&existing).Error; err == nil {
		client.SendJSON(Message{
			Type:    "error",
			Message: "Already in queue",
		})
		return
	}

	// Get next position
	var maxPosition int
	db.DB.Model(&models.QueueEntry{}).
		Where("category = ? AND status = ?", category, "waiting").
		Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)

	// Create queue entry
	queueEntry := models.QueueEntry{
		Reference:        reference,
		VisitorID:        userID,
		Category:         category,
		Position:         maxPosition + 1,
		EstimatedMinutes: (maxPosition + 1) * 15, // 15 min per person
		Status:           "waiting",
		JoinedAt:         time.Now(),
	}

	if err := db.DB.Create(&queueEntry).Error; err != nil {
		client.SendJSON(Message{Type: "error", Message: "Failed to join queue"})
		return
	}

	// Broadcast queue update
	queueManager := GetQueueManager()
	queueManager.UpdateQueue(category, queueManager.loadQueueFromDatabase(category))

	client.SendJSON(Message{
		Type:    "joined_queue",
		Message: "Successfully joined queue",
	})
}

func callVisitor(client *Client, category string, userID uint) {
	// Get user to verify role
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		client.SendJSON(Message{Type: "error", Message: "User not found"})
		return
	}

	// Verify user is admin or volunteer
	if user.Role != models.RoleAdmin && user.Role != models.RoleVolunteer {
		client.SendJSON(Message{Type: "error", Message: "Admin or volunteer access required"})
		return
	}

	// Get next visitor in queue
	var nextEntry models.QueueEntry
	err := db.DB.Preload("Visitor").
		Where("category = ? AND status = ?", category, "waiting").
		Order("position ASC").
		First(&nextEntry).Error

	if err != nil {
		client.SendJSON(Message{Type: "info", Message: "No visitors in queue"})
		return
	}

	// Update status to called
	nextEntry.Status = "called"
	now := time.Now()
	nextEntry.CalledAt = &now
	db.DB.Save(&nextEntry)

	// Create audit log
	createSystemAuditLog("CallVisitor", "QueueEntry", nextEntry.ID,
		fmt.Sprintf("Visitor called by %s %d", user.Role, userID))

	// Broadcast update
	queueManager := GetQueueManager()
	queueManager.BroadcastToCategory(category, Message{
		Type:     "visitor_called",
		Category: category,
		Message:  fmt.Sprintf("Visitor %s called by %s", nextEntry.Visitor.FirstName, user.Role),
	})

	// Update queue data
	queueManager.UpdateQueue(category, queueManager.loadQueueFromDatabase(category))
}

func markVisitorServed(client *Client, category string, visitorID, userID uint) {
	// Get user to verify role
	var user models.User
	if err := db.DB.First(&user, userID).Error; err != nil {
		client.SendJSON(Message{Type: "error", Message: "User not found"})
		return
	}

	// Verify user is admin or volunteer
	if user.Role != models.RoleAdmin && user.Role != models.RoleVolunteer {
		client.SendJSON(Message{Type: "error", Message: "Admin or volunteer access required"})
		return
	}

	var queueEntry models.QueueEntry
	err := db.DB.Where("visitor_id = ? AND category = ? AND status = ?",
		visitorID, category, "called").First(&queueEntry).Error

	if err != nil {
		client.SendJSON(Message{Type: "error", Message: "Visitor not found or not called"})
		return
	}

	// Mark as served
	queueEntry.Status = "served"
	now := time.Now()
	queueEntry.ServedAt = &now
	db.DB.Save(&queueEntry)

	// Update positions for remaining visitors
	db.DB.Exec(`
		UPDATE queue_entries 
		SET position = position - 1, updated_at = ?
		WHERE category = ? AND status = 'waiting' AND position > ?
	`, time.Now(), category, queueEntry.Position)

	// Create audit log
	createSystemAuditLog("MarkServed", "QueueEntry", queueEntry.ID,
		fmt.Sprintf("Visitor marked as served by %s %d", user.Role, userID))

	// Broadcast update
	queueManager := GetQueueManager()
	queueManager.UpdateQueue(category, queueManager.loadQueueFromDatabase(category))

	client.SendJSON(Message{Type: "success", Message: "Visitor marked as served"})
}

func cancelQueuePosition(client *Client, category, reference string, userID uint) {
	var queueEntry models.QueueEntry
	err := db.DB.Where("reference = ? AND category = ? AND status IN ?",
		reference, category, []string{"waiting", "called"}).First(&queueEntry).Error

	if err != nil {
		client.SendJSON(Message{Type: "error", Message: "Not in queue"})
		return
	}

	// Check ownership (unless admin)
	if queueEntry.VisitorID != userID {
		var user models.User
		if err := db.DB.First(&user, userID).Error; err != nil || user.Role != models.RoleAdmin {
			client.SendJSON(Message{Type: "error", Message: "Unauthorized"})
			return
		}
	}

	// Cancel position
	queueEntry.Status = "cancelled"
	now := time.Now()
	queueEntry.CancelledAt = &now
	db.DB.Save(&queueEntry)

	// Update positions for visitors behind
	db.DB.Exec(`
		UPDATE queue_entries 
		SET position = position - 1, updated_at = ?
		WHERE category = ? AND status = 'waiting' AND position > ?
	`, time.Now(), category, queueEntry.Position)

	// Broadcast update
	queueManager := GetQueueManager()
	queueManager.UpdateQueue(category, queueManager.loadQueueFromDatabase(category))

	client.SendJSON(Message{Type: "success", Message: "Position cancelled"})
}

func createSystemAuditLog(action, entityType string, entityID uint, details string) {
	auditLog := models.AuditLog{
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Description: details,
		IPAddress:   "system",
		UserAgent:   "websocket-system",
	}
	db.DB.Create(&auditLog)
}

// StartQueueCleanupService starts a background goroutine to clean up stale queue entries
func StartQueueCleanupService() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			cleanupStaleQueueEntries()
		}
	}()
	log.Println("Queue cleanup service started")
}

// cleanupStaleQueueEntries removes entries that have been in "called" status for too long
func cleanupStaleQueueEntries() {
	cutoff := time.Now().Add(-10 * time.Minute) // 10 minutes timeout

	var staleEntries []models.QueueEntry
	db.DB.Where("status = ? AND called_at < ?", "called", cutoff).Find(&staleEntries)

	for _, entry := range staleEntries {
		entry.Status = "no_show"
		now := time.Now()
		entry.CancelledAt = &now // Use CancelledAt field instead of NoShowAt
		db.DB.Save(&entry)

		// Update positions for remaining visitors
		db.DB.Exec(`
			UPDATE queue_entries 
			SET position = position - 1, updated_at = ?
			WHERE category = ? AND status = 'waiting' AND position > ?
		`, time.Now(), entry.Category, entry.Position)

		// Broadcast update
		queueManager := GetQueueManager()
		queueManager.UpdateQueue(entry.Category, queueManager.loadQueueFromDatabase(entry.Category))

		log.Printf("Marked queue entry %d as no-show due to timeout", entry.ID)
	}
}

// WebSocket connections for real-time queue updates

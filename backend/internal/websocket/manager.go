package websocket

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// WebSocketManager centralizes WebSocket connection management
type WebSocketManager struct {
	connections     map[string]*ManagedConnection
	subscriptions   map[string]map[string]*ManagedConnection // topic -> connectionID -> connection
	userConnections map[uint]map[string]*ManagedConnection   // userID -> connectionID -> connection
	mutex           sync.RWMutex
	broadcastChan   chan BroadcastMessage
	ctx             context.Context
	cancel          context.CancelFunc
	maxConnections  int
	messageBuffer   int
	startTime       time.Time // Time when the manager was created
}

// ManagedConnection represents a managed WebSocket connection
type ManagedConnection struct {
	ID           string
	Conn         *websocket.Conn
	UserID       uint
	UserRole     string
	Categories   []string
	LastActivity time.Time
	SendChan     chan []byte
	Context      context.Context
	Cancel       context.CancelFunc
	Metadata     map[string]interface{}
	IsActive     bool
	mutex        sync.RWMutex
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	Category   string      `json:"category"`
	Message    interface{} `json:"message"`
	Priority   string      `json:"priority"`
	ClientIDs  []string    `json:"client_ids,omitempty"`
	ExcludeIDs []string    `json:"exclude_ids,omitempty"`
	UserIDs    []uint      `json:"user_ids,omitempty"`
	Roles      []string    `json:"roles,omitempty"`
	Timestamp  time.Time   `json:"timestamp"`
}

// ConnectionStats provides statistics about WebSocket connections
type ConnectionStats struct {
	TotalConnections      int                    `json:"total_connections"`
	ConnectionsByRole     map[string]int         `json:"connections_by_role"`
	ConnectionsByCategory map[string]int         `json:"connections_by_category"`
	ConnectionsByUser     map[uint]int           `json:"connections_by_user"`
	AverageUptime         time.Duration          `json:"average_uptime"`
	MessageThroughput     int                    `json:"messages_per_minute"`
	SubscriptionCount     int                    `json:"subscription_count"`
	ActiveBroadcasts      int                    `json:"active_broadcasts"`
	MemoryUsage           map[string]interface{} `json:"memory_usage"`
}

// NewWebSocketManager creates a new WebSocket manager instance
func NewWebSocketManager() *WebSocketManager {
	ctx, cancel := context.WithCancel(context.Background())

	manager := &WebSocketManager{
		connections:     make(map[string]*ManagedConnection),
		subscriptions:   make(map[string]map[string]*ManagedConnection),
		userConnections: make(map[uint]map[string]*ManagedConnection),
		broadcastChan:   make(chan BroadcastMessage, 10000), // Increased buffer
		ctx:             ctx,
		cancel:          cancel,
		maxConnections:  10000,      // Configurable limit
		messageBuffer:   1000,       // Configurable buffer size
		startTime:       time.Now(), // Initialize the start time
	}

	// Start background processes
	go manager.handleBroadcasts()
	go manager.performMaintenance()
	go manager.monitorHealth()

	return manager
}

// AddConnection adds a new WebSocket connection to management
func (wsm *WebSocketManager) AddConnection(conn *websocket.Conn, userID uint, userRole string, categories []string, metadata map[string]interface{}) (*ManagedConnection, error) {
	wsm.mutex.Lock()
	defer wsm.mutex.Unlock()

	// Log connection attempt with detailed info
	log.Printf("WebSocket connection attempt from IP: %s, UserID: %d, Role: %s",
		metadata["ip"], userID, userRole)

	// Check connection limits
	if len(wsm.connections) >= wsm.maxConnections {
		log.Printf("Connection limit exceeded for user %d", userID)
		return nil, errors.New("connection limit exceeded")
	}

	// Check per-user connection limits
	if userConnections, exists := wsm.userConnections[userID]; exists && len(userConnections) >= 5 {
		log.Printf("Per-user connection limit exceeded for user %d: %d connections",
			userID, len(userConnections))
		return nil, errors.New("per-user connection limit exceeded")
	}

	// Generate unique connection ID
	connID := generateUniqueID(userID, userRole)

	// Create context for this connection
	ctx, cancel := context.WithCancel(wsm.ctx)

	managedConn := &ManagedConnection{
		ID:           connID,
		Conn:         conn,
		UserID:       userID,
		UserRole:     userRole,
		Categories:   categories,
		LastActivity: time.Now(),
		SendChan:     make(chan []byte, wsm.messageBuffer),
		Context:      ctx,
		Cancel:       cancel,
		Metadata:     metadata,
		IsActive:     true,
	}

	// Add to connections map
	wsm.connections[connID] = managedConn

	// Add to user connections map
	if _, exists := wsm.userConnections[userID]; !exists {
		wsm.userConnections[userID] = make(map[string]*ManagedConnection)
	}
	wsm.userConnections[userID][connID] = managedConn

	// Subscribe to categories
	for _, category := range categories {
		wsm.subscribeToTopic(connID, category, managedConn)
	}

	// Start connection handlers asynchronously
	go wsm.handleConnection(managedConn)

	// Log successful connection
	log.Printf("WebSocket connection established: %s (User: %d, Role: %s, Categories: %v, IP: %v)",
		connID, userID, userRole, categories, metadata["ip"])

	return managedConn, nil
}

// RemoveConnection removes a WebSocket connection from management
func (wsm *WebSocketManager) RemoveConnection(connID string) {
	wsm.mutex.Lock()
	defer wsm.mutex.Unlock()

	if managedConn, exists := wsm.connections[connID]; exists {
		// Mark as inactive
		managedConn.mutex.Lock()
		managedConn.IsActive = false
		managedConn.mutex.Unlock()

		// Cancel connection context
		managedConn.Cancel()

		// Remove from subscriptions
		for topic, subscribers := range wsm.subscriptions {
			delete(subscribers, connID)
			if len(subscribers) == 0 {
				delete(wsm.subscriptions, topic)
			}
		}

		// Remove from user connections
		if userConnections, exists := wsm.userConnections[managedConn.UserID]; exists {
			delete(userConnections, connID)
			if len(userConnections) == 0 {
				delete(wsm.userConnections, managedConn.UserID)
			}
		}

		// Close connection safely
		if err := managedConn.Conn.Close(); err != nil {
			log.Printf("Error closing connection %s: %v", connID, err)
		}

		// Close send channel
		close(managedConn.SendChan)

		// Remove from connections map
		delete(wsm.connections, connID)

		log.Printf("Removed WebSocket connection: %s", connID)
	}
}

// BroadcastToTopic sends a message to all connections subscribed to a topic
func (wsm *WebSocketManager) BroadcastToTopic(topic string, message interface{}) error {
	broadcast := BroadcastMessage{
		Category:  topic,
		Message:   message,
		Priority:  "normal",
		Timestamp: time.Now(),
	}

	select {
	case wsm.broadcastChan <- broadcast:
		return nil
	case <-time.After(5 * time.Second):
		return errors.New("broadcast channel timeout")
	}
}

// BroadcastToUser sends a message to all connections of a specific user
func (wsm *WebSocketManager) BroadcastToUser(userID uint, message interface{}) error {
	wsm.mutex.RLock()
	userConnections, exists := wsm.userConnections[userID]
	if !exists {
		wsm.mutex.RUnlock()
		return errors.New("user not connected")
	}

	// Create a copy to avoid holding the lock during message sending
	targetConnections := make([]*ManagedConnection, 0, len(userConnections))
	for _, conn := range userConnections {
		if conn.IsActive {
			targetConnections = append(targetConnections, conn)
		}
	}
	wsm.mutex.RUnlock()

	messageData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	// Send to all user connections concurrently
	var wg sync.WaitGroup
	for _, conn := range targetConnections {
		wg.Add(1)
		go func(c *ManagedConnection) {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Recovered from panic sending to connection %s: %v", c.ID, r)
				}
			}()

			// Check if connection is still active and channel is not closed
			c.mutex.RLock()
			isActive := c.IsActive
			c.mutex.RUnlock()

			if !isActive {
				return
			}

			select {
			case c.SendChan <- messageData:
				// Message sent successfully
			case <-time.After(2 * time.Second):
				log.Printf("Timeout sending message to user %d connection %s", userID, c.ID)
			case <-c.Context.Done():
				// Connection closed, that's normal
			}
		}(conn)
	}

	// Wait for all sends to complete
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		return nil
	case <-time.After(10 * time.Second):
		return errors.New("broadcast timeout")
	}
}

// BroadcastToRole sends a message to all connections with a specific role
func (wsm *WebSocketManager) BroadcastToRole(role string, message interface{}) error {
	broadcast := BroadcastMessage{
		Message:   message,
		Priority:  "normal",
		Roles:     []string{role},
		Timestamp: time.Now(),
	}

	select {
	case wsm.broadcastChan <- broadcast:
		return nil
	case <-time.After(5 * time.Second):
		return errors.New("broadcast channel timeout")
	}
}

// GetServerInfo returns basic information about the WebSocket server
func (wsm *WebSocketManager) GetServerInfo() map[string]interface{} {
	wsm.mutex.RLock()
	defer wsm.mutex.RUnlock()

	return map[string]interface{}{
		"version":     "1.0",
		"uptime":      time.Since(wsm.startTime).String(),
		"connections": len(wsm.connections),
		"topics":      len(wsm.subscriptions),
	}
}

// GetConnectionStats returns statistics about the current WebSocket connections
func (wsm *WebSocketManager) GetConnectionStats() ConnectionStats {
	wsm.mutex.RLock()
	defer wsm.mutex.RUnlock()

	stats := ConnectionStats{
		TotalConnections:      len(wsm.connections),
		ConnectionsByRole:     make(map[string]int),
		ConnectionsByCategory: make(map[string]int),
		ConnectionsByUser:     make(map[uint]int),
		SubscriptionCount:     len(wsm.subscriptions),
		ActiveBroadcasts:      len(wsm.broadcastChan),
		MemoryUsage:           make(map[string]interface{}),
	}

	// Count connections by role
	for _, conn := range wsm.connections {
		stats.ConnectionsByRole[conn.UserRole]++
	}

	// Count connections by user
	for userID, userConns := range wsm.userConnections {
		stats.ConnectionsByUser[userID] = len(userConns)
	}

	// Count connections by category
	for category, subscribers := range wsm.subscriptions {
		stats.ConnectionsByCategory[category] = len(subscribers)
	}

	// Calculate average uptime
	if len(wsm.connections) > 0 {
		totalUptime := time.Duration(0)
		now := time.Now()
		for range wsm.connections {
			// Use the manager's start time as the connection start time approximation
			// In a real implementation, you'd track individual connection start times
			totalUptime += now.Sub(wsm.startTime)
		}
		stats.AverageUptime = totalUptime / time.Duration(len(wsm.connections))
	}

	// Calculate message throughput (approximate)
	// This is a simplified calculation - in production you'd track actual messages per minute
	minutesSinceStart := int(time.Since(wsm.startTime).Minutes())
	if minutesSinceStart > 0 {
		stats.MessageThroughput = len(wsm.broadcastChan) * 60 / minutesSinceStart
	} else {
		stats.MessageThroughput = 0
	}
	if stats.MessageThroughput < 0 {
		stats.MessageThroughput = 0
	}

	return stats
}

// handleConnection manages an individual WebSocket connection
func (wsm *WebSocketManager) handleConnection(managedConn *ManagedConnection) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in handleConnection for %s: %v", managedConn.ID, r)
		}
		wsm.RemoveConnection(managedConn.ID)
	}()

	// Start message sender goroutine
	go wsm.handleOutgoingMessages(managedConn)

	// Set up pong handler for ping/pong keepalive
	managedConn.Conn.SetPongHandler(func(string) error {
		if err := managedConn.Conn.SetReadDeadline(time.Now().Add(30 * time.Second)); err != nil {
			log.Printf("Failed to set pong read deadline for %s: %v", managedConn.ID, err)
		}
		return nil
	})

	// Enable periodic ping to keep connection alive - MOVED OUTSIDE THE LOOP
	go func() {
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-managedConn.Context.Done():
				return
			case <-ticker.C:
				// Check if connection exists and is active
				managedConn.mutex.RLock()
				isActive := managedConn.IsActive
				managedConn.mutex.RUnlock()

				if managedConn.Conn == nil || !isActive {
					return
				}

				// Send ping and update last activity time
				if err := managedConn.Conn.WriteControl(
					websocket.PingMessage,
					[]byte{},
					time.Now().Add(5*time.Second),
				); err != nil {
					// Avoid logging normal closures
					if !websocket.IsCloseError(err, websocket.CloseNormalClosure) &&
						!websocket.IsCloseError(err, websocket.CloseGoingAway) {
						log.Printf("Failed to send ping to %s: %v", managedConn.ID, err)
					}
					return
				}

				// Update last activity time to prevent cleanup
				managedConn.mutex.Lock()
				managedConn.LastActivity = time.Now()
				managedConn.mutex.Unlock()
			}
		}
	}()

	// Handle incoming messages with proper error handling
	for {
		select {
		case <-managedConn.Context.Done():
			return
		default:
			// Set a longer read deadline to be more tolerant of idle connections
			if err := managedConn.Conn.SetReadDeadline(time.Now().Add(30 * time.Second)); err != nil {
				log.Printf("Failed to set read deadline for %s: %v", managedConn.ID, err)
			}

			_, message, err := managedConn.Conn.ReadMessage()
			if err != nil {
				// Check if it's a normal closure
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Printf("WebSocket closed normally for %s", managedConn.ID)
					return
				}
				// Check if it's a network timeout (expected for idle notification connections)
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					// Just continue for timeouts - notification connections are mostly one-way
					continue
				}
				// For other unexpected errors
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket read error for %s: %v", managedConn.ID, err)
				}
				return
			}

			// Update last activity
			managedConn.mutex.Lock()
			managedConn.LastActivity = time.Now()
			managedConn.mutex.Unlock()

			// Process message in a separate goroutine to avoid blocking
			go wsm.processMessage(managedConn, message)
		}
	}
}

// handleOutgoingMessages manages sending messages to a connection
func (wsm *WebSocketManager) handleOutgoingMessages(managedConn *ManagedConnection) {
	pingTicker := time.NewTicker(30 * time.Second)
	defer pingTicker.Stop()

	for {
		select {
		case <-managedConn.Context.Done():
			return
		case message, ok := <-managedConn.SendChan:
			if !ok {
				// Channel closed
				return
			}

			managedConn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := managedConn.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error sending message to %s: %v", managedConn.ID, err)
				return
			}
		case <-pingTicker.C:
			managedConn.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := managedConn.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Error sending ping to %s: %v", managedConn.ID, err)
				return
			}
		}
	}
}

// handleBroadcasts processes broadcast messages
func (wsm *WebSocketManager) handleBroadcasts() {
	for {
		select {
		case <-wsm.ctx.Done():
			return
		case broadcast := <-wsm.broadcastChan:
			wsm.processBroadcast(broadcast)
		}
	}
}

// processBroadcast sends a broadcast message to appropriate connections
func (wsm *WebSocketManager) processBroadcast(broadcast BroadcastMessage) {
	messageData, err := json.Marshal(map[string]interface{}{
		"type":      "broadcast",
		"category":  broadcast.Category,
		"message":   broadcast.Message,
		"priority":  broadcast.Priority,
		"timestamp": broadcast.Timestamp,
	})
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}

	wsm.mutex.RLock()
	defer wsm.mutex.RUnlock()

	var targetConnections []*ManagedConnection

	// Collect target connections based on broadcast criteria
	if broadcast.Category != "" {
		// Send to topic subscribers
		if subscribers, exists := wsm.subscriptions[broadcast.Category]; exists {
			for _, conn := range subscribers {
				if conn.IsActive {
					targetConnections = append(targetConnections, conn)
				}
			}
		}
	}

	// Add specific client IDs
	for _, clientID := range broadcast.ClientIDs {
		if conn, exists := wsm.connections[clientID]; exists && conn.IsActive {
			targetConnections = append(targetConnections, conn)
		}
	}

	// Add specific user IDs
	for _, userID := range broadcast.UserIDs {
		if userConnections, exists := wsm.userConnections[userID]; exists {
			for _, conn := range userConnections {
				if conn.IsActive {
					targetConnections = append(targetConnections, conn)
				}
			}
		}
	}

	// Add specific roles
	for _, role := range broadcast.Roles {
		for _, conn := range wsm.connections {
			if conn.IsActive && conn.UserRole == role {
				targetConnections = append(targetConnections, conn)
			}
		}
	}

	// Remove duplicates and excluded connections
	uniqueConnections := wsm.removeDuplicateAndExcludedConnections(targetConnections, broadcast.ExcludeIDs)

	// Send to all target connections concurrently
	var wg sync.WaitGroup
	for _, conn := range uniqueConnections {
		wg.Add(1)
		go func(c *ManagedConnection) {
			defer wg.Done()
			select {
			case c.SendChan <- messageData:
			case <-time.After(2 * time.Second):
				log.Printf("Timeout sending broadcast to connection %s", c.ID)
			case <-c.Context.Done():
				// Connection closed
			}
		}(conn)
	}

	wg.Wait()
}

// processMessage handles incoming messages from clients
func (wsm *WebSocketManager) processMessage(managedConn *ManagedConnection, message []byte) {
	// Implement message processing logic based on your requirements
	// This could include parsing JSON messages and routing to appropriate handlers

	var msg map[string]interface{}
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error unmarshaling message from %s: %v", managedConn.ID, err)
		return
	}

	msgType, ok := msg["type"].(string)
	if !ok {
		log.Printf("Message type not found for connection %s", managedConn.ID)
		return
	}

	log.Printf("Received message type '%s' from connection %s", msgType, managedConn.ID)

	// Route message to appropriate handler
	switch msgType {
	case "ping":
		wsm.sendPong(managedConn)
	case "subscribe":
		wsm.handleSubscribe(managedConn, msg)
	case "unsubscribe":
		wsm.handleUnsubscribe(managedConn, msg)
	default:
		log.Printf("Unknown message type '%s' from connection %s", msgType, managedConn.ID)
	}
}

// performMaintenance performs periodic maintenance tasks
func (wsm *WebSocketManager) performMaintenance() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-wsm.ctx.Done():
			return
		case <-ticker.C:
			wsm.cleanupStaleConnections()
		}
	}
}

// cleanupStaleConnections removes connections that haven't been active
func (wsm *WebSocketManager) cleanupStaleConnections() {
	wsm.mutex.Lock()
	defer wsm.mutex.Unlock()

	cutoff := time.Now().Add(-10 * time.Minute)
	staleConnections := make([]string, 0)

	for connID, conn := range wsm.connections {
		if conn.LastActivity.Before(cutoff) {
			staleConnections = append(staleConnections, connID)
		}
	}

	for _, connID := range staleConnections {
		if conn, exists := wsm.connections[connID]; exists {
			conn.Cancel()
			delete(wsm.connections, connID)
			log.Printf("Cleaned up stale connection: %s", connID)
		}
	}

	if len(staleConnections) > 0 {
		log.Printf("Cleaned up %d stale connections", len(staleConnections))
	}
}

// Utility methods

func (wsm *WebSocketManager) subscribeToTopic(connID, topic string, managedConn *ManagedConnection) {
	if _, exists := wsm.subscriptions[topic]; !exists {
		wsm.subscriptions[topic] = make(map[string]*ManagedConnection)
	}
	wsm.subscriptions[topic][connID] = managedConn
}

func (wsm *WebSocketManager) sendPong(managedConn *ManagedConnection) {
	// Check if connection is still active
	managedConn.mutex.RLock()
	isActive := managedConn.IsActive
	managedConn.mutex.RUnlock()

	if !isActive {
		log.Printf("Skipping pong to inactive connection %s", managedConn.ID)
		return
	}

	// Enhanced pong response with more info
	pong := map[string]interface{}{
		"type":      "pong",
		"timestamp": time.Now().Unix(),
		"message":   "Connection alive",
	}

	// Debug log for pong response
	log.Printf("Sending pong response to connection %s", managedConn.ID)

	if data, err := json.Marshal(pong); err == nil {
		// Use non-blocking send with timeout
		select {
		case managedConn.SendChan <- data:
			log.Printf("Pong sent successfully to connection %s", managedConn.ID)
		case <-time.After(2 * time.Second):
			log.Printf("Timeout sending pong to connection %s", managedConn.ID)
		case <-managedConn.Context.Done():
			log.Printf("Connection %s context closed, skipping pong", managedConn.ID)
		}
	} else {
		log.Printf("Failed to marshal pong message for connection %s: %v", managedConn.ID, err)
	}

	// Make sure to update last activity time to prevent cleanup
	managedConn.mutex.Lock()
	managedConn.LastActivity = time.Now()
	managedConn.mutex.Unlock()
}

func (wsm *WebSocketManager) handleSubscribe(managedConn *ManagedConnection, msg map[string]interface{}) {
	topic, ok := msg["topic"].(string)
	if !ok {
		log.Printf("Invalid subscribe message from %s: missing topic", managedConn.ID)
		return
	}

	wsm.mutex.Lock()
	wsm.subscribeToTopic(managedConn.ID, topic, managedConn)
	wsm.mutex.Unlock()

	log.Printf("Connection %s subscribed to topic: %s", managedConn.ID, topic)
}

func (wsm *WebSocketManager) handleUnsubscribe(managedConn *ManagedConnection, msg map[string]interface{}) {
	topic, ok := msg["topic"].(string)
	if !ok {
		log.Printf("Invalid unsubscribe message from %s: missing topic", managedConn.ID)
		return
	}

	wsm.mutex.Lock()
	if subscribers, exists := wsm.subscriptions[topic]; exists {
		delete(subscribers, managedConn.ID)
		if len(subscribers) == 0 {
			delete(wsm.subscriptions, topic)
		}
	}
	wsm.mutex.Unlock()

	log.Printf("Connection %s unsubscribed from topic: %s", managedConn.ID, topic)
}

func generateUniqueID(userID uint, userRole string) string {
	return fmt.Sprintf("%s_%d_%d", userRole, userID, time.Now().UnixNano())
}

// Shutdown gracefully closes all connections and stops the manager
func (wsm *WebSocketManager) Shutdown() {
	log.Println("Shutting down WebSocket manager...")

	wsm.cancel()

	wsm.mutex.Lock()
	for connID := range wsm.connections {
		wsm.RemoveConnection(connID)
	}
	wsm.mutex.Unlock()

	log.Println("WebSocket manager shutdown complete")
}

// monitorHealth periodically checks the health of the WebSocket manager
func (wsm *WebSocketManager) monitorHealth() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-wsm.ctx.Done():
			return
		case <-ticker.C:
			stats := wsm.GetConnectionStats()
			log.Printf("WebSocket Health: %d connections, %d subscriptions, %d broadcasts queued",
				stats.TotalConnections, stats.SubscriptionCount, stats.ActiveBroadcasts)

			// Alert if queue is getting full
			if stats.ActiveBroadcasts > 8000 {
				log.Printf("WARNING: Broadcast queue is %d%% full", (stats.ActiveBroadcasts*100)/10000)
			}
		}
	}
}

// removeDuplicateAndExcludedConnections removes duplicates and excluded connections
func (wsm *WebSocketManager) removeDuplicateAndExcludedConnections(connections []*ManagedConnection, excludeIDs []string) []*ManagedConnection {
	seen := make(map[string]bool)
	excluded := make(map[string]bool)

	for _, id := range excludeIDs {
		excluded[id] = true
	}

	var unique []*ManagedConnection
	for _, conn := range connections {
		if !seen[conn.ID] && !excluded[conn.ID] {
			seen[conn.ID] = true
			unique = append(unique, conn)
		}
	}

	return unique
}

package websocket

import (
	"log"
	"sync"
)

// Global WebSocket manager instance
var (
	globalManager *WebSocketManager
	once          sync.Once
)

// GetGlobalManager returns the global WebSocket manager instance
func GetGlobalManager() *WebSocketManager {
	once.Do(func() {
		globalManager = NewWebSocketManager()
		log.Println("Global WebSocket manager initialized")
	})
	return globalManager
}

// InitializeGlobalManager initializes the global WebSocket manager (deprecated, use GetGlobalManager)
func InitializeGlobalManager() *WebSocketManager {
	return GetGlobalManager()
}

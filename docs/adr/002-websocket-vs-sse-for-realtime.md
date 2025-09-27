# ADR-002: WebSocket vs Server-Sent Events for Real-time Communication

## Status
**Status**: Accepted  
**Date**: 2025-09-26  
**Authors**: Development Team  
**Reviewers**: Frontend and Backend Teams

## Context
The Charity Management System requires real-time communication for several critical features:
- **Live Notifications**: Help request updates, donation confirmations, volunteer shift changes
- **Dashboard Updates**: Real-time metrics for admin dashboards, volunteer activity tracking
- **Interactive Features**: Live chat for help requests, instant feedback on form submissions
- **System Alerts**: Emergency notifications, system maintenance announcements

The system serves multiple user types with varying real-time needs:
- **Visitors**: Help request status updates, queue position notifications
- **Volunteers**: Shift notifications, help request assignments
- **Donors**: Donation processing status, impact updates
- **Staff/Admins**: System-wide notifications, user activity monitoring

Requirements include bidirectional communication, connection persistence across page navigation, and reliable message delivery.

## Decision
We will use **WebSocket connections** with Gorilla WebSocket library for all real-time communication needs, implemented with connection pooling, automatic reconnection, and message queuing.

**Implementation Strategy:**
- WebSocket server using `gorilla/websocket` with connection management
- Client-side automatic reconnection with exponential backoff
- Message queuing for offline users with Redis persistence
- Channel-based routing for user-specific and broadcast messages
- Rate limiting specifically tuned for WebSocket connections

## Alternatives Considered

### Option 1: Server-Sent Events (SSE)
- **Pros**: 
  - Simpler implementation and debugging
  - Automatic reconnection built into EventSource API
  - HTTP-based, easier firewall/proxy handling
  - Lower server complexity for one-way communication
- **Cons**: 
  - Unidirectional communication only (server-to-client)
  - Limited browser connection limits (6 per domain)
  - No native binary data support
  - Cannot send custom headers after connection establishment
- **Why not chosen**: Need bidirectional communication for interactive features like help request chat

### Option 2: HTTP Long Polling
- **Pros**: 
  - Simple to implement and debug
  - Works through all proxies and firewalls
  - Stateless server design
  - Easy to scale horizontally
- **Cons**: 
  - Higher latency for real-time updates
  - Resource intensive with many concurrent connections
  - Complex timeout handling
  - Not suitable for high-frequency updates
- **Why not chosen**: Inadequate for real-time dashboard updates and interactive features

### Option 3: GraphQL Subscriptions
- **Pros**: 
  - Type-safe real-time queries
  - Integrates with existing GraphQL API
  - Flexible subscription filtering
  - Good tooling support
- **Cons**: 
  - Additional complexity layer
  - Would require GraphQL server implementation
  - Overkill for simple notification needs
  - WebSocket under the hood anyway
- **Why not chosen**: System doesn't use GraphQL, would add unnecessary complexity

## Consequences

### Positive
- **Bidirectional Communication**: Enables interactive features like real-time chat
- **Low Latency**: Immediate message delivery for time-sensitive notifications
- **Efficient**: Single persistent connection per client reduces overhead
- **Flexible**: Supports both text and binary data transmission
- **Scalable**: Connection pooling and Redis message queuing handle growth
- **User Experience**: Real-time updates improve perceived system responsiveness

### Negative
- **Connection Management Complexity**: Requires robust reconnection logic
- **Stateful Server**: Must track active connections and user sessions
- **Debugging Complexity**: Harder to debug than simple HTTP requests
- **Proxy Issues**: Some corporate firewalls may block WebSocket connections
- **Resource Usage**: Persistent connections consume server memory

### Neutral
- **Browser Support**: Modern browsers have excellent WebSocket support
- **Mobile Performance**: Connection stability depends on network quality
- **Development Overhead**: Initial setup complexity, but well-established patterns

## Implementation Notes

**Current WebSocket Implementation:**
```go
// internal/websocket/manager.go
type ConnectionManager struct {
    connections map[string]*websocket.Conn
    broadcast   chan []byte
    register    chan *Client
    unregister  chan *Client
}
```

**Client-Side Connection Management:**
```typescript
// hooks/useWebSocket.ts
- Automatic reconnection with exponential backoff
- Message queuing during disconnections
- Connection state management
- Type-safe message handling
```

**Message Routing Strategy:**
- **User-specific messages**: Routed by user ID to specific connections
- **Role-based broadcasting**: Messages to all volunteers, donors, etc.
- **System-wide alerts**: Broadcast to all connected users
- **Channel subscriptions**: Users subscribe to relevant notification types

**Rate Limiting for WebSocket:**
```go
// More lenient than API rate limiting
// 100 connections per 5 minutes for development/testing
WebSocketRateLimit(): 100 connections per 5 minutes
```

**Message Persistence:**
- Failed deliveries stored in Redis with TTL
- Offline users receive queued messages on reconnection
- Critical messages (emergency alerts) persist longer

**Performance Considerations:**
- Connection pooling with configurable limits
- Message compression for large payloads
- Heartbeat/ping-pong for connection health
- Graceful degradation when WebSocket unavailable

## References
- [Gorilla WebSocket Documentation](https://github.com/gorilla/websocket)
- [WebSocket Rate Limiting Implementation](../backend/internal/middleware/rate_limiter.go)
- [Frontend WebSocket Hook](../frontend/hooks/useWebSocket.ts)
- [Connection Manager Implementation](../backend/internal/websocket/)

---
*This ADR establishes WebSocket as the standard for real-time communication while acknowledging the complexity trade-offs.*
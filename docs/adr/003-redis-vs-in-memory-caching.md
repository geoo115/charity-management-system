# ADR-003: Redis vs In-Memory Caching Strategy

## Status
**Status**: Accepted  
**Date**: 2025-09-26  
**Authors**: Backend Team  
**Reviewers**: DevOps and Performance Teams

## Context
The Charity Management System requires efficient caching to handle:
- **Database Query Results**: User profiles, help request data, donation records
- **Session Management**: JWT refresh tokens, user authentication state
- **Computed Analytics**: Dashboard metrics, volunteer statistics, donation summaries
- **Rate Limiting State**: API rate limiting counters across distributed instances
- **Real-time Data**: WebSocket connection mapping, notification queues
- **External API Responses**: Geocoding results, payment processing status

Performance requirements include sub-100ms response times for cached data, persistence across server restarts, and horizontal scalability for production deployments.

Current system handles moderate load but needs to prepare for scaling during peak periods (holiday donations, emergency help requests).

## Decision
We will use **Redis as the primary caching layer** with a hybrid approach that includes strategic in-memory caching for frequently accessed, small datasets.

**Implementation Strategy:**
- **Redis**: Primary cache for persistent data, session management, and distributed state
- **In-Memory**: Secondary cache for hot data with short TTL (user permissions, configuration)
- **Cache-Aside Pattern**: Application manages cache population and invalidation
- **Namespace Strategy**: Organized cache keys by domain (user:, help:, donation:, metrics:)

## Alternatives Considered

### Option 1: Pure In-Memory Caching (sync.Map, go-cache)
- **Pros**: 
  - Zero network latency
  - No additional infrastructure required
  - Simple implementation and debugging
  - No serialization overhead
- **Cons**: 
  - Lost on server restart
  - Cannot share between multiple instances
  - Limited by server memory
  - No persistence for critical data (sessions)
- **Why not chosen**: Does not support distributed architecture or persistence requirements

### Option 2: Database-Only with Query Optimization
- **Pros**: 
  - Simplified architecture
  - ACID consistency guarantees
  - No cache invalidation complexity
  - Single source of truth
- **Cons**: 
  - Higher latency for repeated queries
  - Database load increases with traffic
  - Limited scalability for read-heavy workloads
  - No support for session management patterns
- **Why not chosen**: Insufficient performance for real-time dashboard updates and analytics

### Option 3: Memcached
- **Pros**: 
  - Simple key-value caching
  - High performance for simple operations
  - Mature and stable
  - Lower memory overhead than Redis
- **Cons**: 
  - No data persistence
  - Limited data structures (strings only)
  - No built-in clustering
  - Cannot handle complex rate limiting or session management
- **Why not chosen**: Lacks advanced data structures needed for WebSocket management and complex caching patterns

### Option 4: Embedded Caches (BadgerDB, BoltDB)
- **Pros**: 
  - Persistence without external dependencies
  - ACID transactions
  - No network overhead
  - Good performance for single instance
- **Cons**: 
  - Single instance limitation
  - No distributed caching
  - File I/O overhead
  - Complex backup and replication
- **Why not chosen**: Cannot support distributed deployment or horizontal scaling

## Consequences

### Positive
- **Performance**: Sub-10ms cache responses with Redis
- **Persistence**: Survives server restarts and deployments
- **Scalability**: Supports distributed caching across multiple instances
- **Advanced Features**: Supports complex data structures (sets, hashes, lists)
- **Session Management**: Perfect fit for JWT refresh token management
- **Rate Limiting**: Atomic operations ideal for distributed rate limiting
- **WebSocket Support**: Excellent for connection management and message queuing

### Negative
- **Additional Infrastructure**: Requires Redis deployment and maintenance
- **Network Latency**: Small network overhead compared to in-memory
- **Memory Usage**: Redis memory consumption needs monitoring
- **Complexity**: Cache invalidation and consistency management
- **Single Point of Failure**: Redis outage affects performance (with graceful degradation)

### Neutral
- **Development Overhead**: Established patterns and libraries available
- **Monitoring**: Redis provides excellent metrics and monitoring capabilities
- **Cost**: Moderate infrastructure cost increase

## Implementation Notes

**Current Redis Implementation:**
```go
// Redis connection with connection pooling
redis.NewClient(&redis.Options{
    Addr:         config.RedisAddr,
    Password:     config.RedisPassword,
    DB:           0,
    PoolSize:     10,
    MinIdleConns: 5,
})
```

**Cache Key Naming Strategy:**
```
user:profile:{userID}           # User profile data
user:permissions:{userID}       # User role and permissions
help:request:{requestID}        # Help request details
help:queue:active              # Active help request queue
donation:stats:daily:{date}    # Daily donation statistics
metrics:dashboard:{userRole}   # Role-specific dashboard data
session:refresh:{tokenID}      # JWT refresh tokens
ratelimit:{endpoint}:{clientID} # Rate limiting counters
websocket:connections          # Active WebSocket connections
```

**TTL Strategy:**
- **User Data**: 1 hour (frequently changing)
- **System Configuration**: 24 hours (rarely changing)
- **Dashboard Metrics**: 5 minutes (real-time requirements)
- **Session Tokens**: Based on JWT expiration
- **Rate Limiting**: Based on rate limit window
- **Help Request Queue**: 30 seconds (high volatility)

**Hybrid Caching Pattern:**
```go
// Check in-memory first (hot data)
if data, exists := inMemoryCache.Get(key); exists {
    return data
}

// Check Redis second (persistent cache)
if data, err := redisClient.Get(ctx, key).Result(); err == nil {
    inMemoryCache.Set(key, data, shortTTL) // Populate in-memory
    return data
}

// Fall back to database
data, err := database.Query(...)
if err == nil {
    redisClient.Set(ctx, key, data, longTTL)        // Populate Redis
    inMemoryCache.Set(key, data, shortTTL)          // Populate in-memory
}
return data
```

**Cache Invalidation Patterns:**
- **Write-Through**: Update cache when database is updated
- **Event-Driven**: Invalidate related caches on domain events
- **TTL-Based**: Automatic expiration for time-sensitive data
- **Manual**: Admin endpoints to clear specific cache namespaces

**Monitoring and Metrics:**
- Cache hit/miss rates by namespace
- Response time distribution
- Memory usage and eviction rates
- Connection pool statistics
- Error rates and types

## References
- [Redis Go Client Documentation](https://redis.uptrace.dev/)
- [Cache Implementation](../backend/internal/services/)
- [Observability Guide - Cache Metrics](../backend/OBSERVABILITY_GUIDE.md)
- [Rate Limiting Implementation](../backend/internal/middleware/rate_limiter.go)

---
*This ADR establishes Redis as the primary caching strategy while maintaining flexibility for performance optimization.*
# ADR-005: Multi-tier Rate Limiting Strategy

## Status
**Status**: Accepted  
**Date**: 2025-09-26  
**Authors**: Backend and Security Teams  
**Reviewers**: DevOps and Frontend Teams

## Context
The Charity Management System requires sophisticated rate limiting to protect against abuse while ensuring legitimate users have smooth access to critical charity services:

**Attack Vectors to Protect Against:**
- **API Abuse**: Excessive help request submissions, donation form spam
- **Authentication Attacks**: Brute force login attempts, credential stuffing
- **Resource Exhaustion**: Database overload, WebSocket connection exhaustion
- **Business Logic Abuse**: Volunteer shift hogging, duplicate donation attempts

**Legitimate Usage Patterns:**
- **Volunteers**: Moderate API usage during shifts, burst activity during emergencies
- **Donors**: Occasional heavy usage during donation campaigns
- **Staff/Admins**: High-volume administrative operations
- **Visitors**: Help request submissions, form interactions

**System Requirements:**
- Different limits for different user roles and endpoints
- Distributed rate limiting across multiple server instances
- Grace periods for legitimate burst usage
- Administrative overrides for emergency situations

## Decision
We will implement a **multi-tier rate limiting strategy** with role-based limits, endpoint-specific rules, and distributed state management using Redis.

**Rate Limiting Tiers:**
1. **Authentication Endpoints**: Strict limits to prevent brute force
2. **General API**: Role-based limits for regular operations
3. **WebSocket Connections**: Connection-based limits with longer windows
4. **Strict Operations**: Very restrictive for sensitive actions
5. **Frontend Rate Limiting**: Client-side throttling with cache integration

## Alternatives Considered

### Option 1: Single Global Rate Limit
- **Pros**: 
  - Simple to implement and understand
  - Consistent behavior across all endpoints
  - Easy to configure and monitor
- **Cons**: 
  - Doesn't account for different endpoint sensitivity
  - May block legitimate admin operations
  - Poor user experience for different roles
  - No flexibility for varying usage patterns
- **Why not chosen**: Too rigid for diverse charity workflows and user types

### Option 2: IP-Based Rate Limiting Only
- **Pros**: 
  - Simple implementation
  - Works for anonymous users
  - Standard approach
- **Cons**: 
  - Shared IPs (offices, public wifi) penalize legitimate users
  - Easy to bypass with proxy rotation
  - No differentiation for authenticated users
  - Cannot handle role-based requirements
- **Why not chosen**: Inadequate for authenticated user differentiation and shared network environments

### Option 3: Third-party Rate Limiting Service (Kong, AWS API Gateway)
- **Pros**: 
  - Professional-grade features
  - Managed infrastructure
  - Advanced analytics and monitoring
  - Battle-tested implementations
- **Cons**: 
  - Additional infrastructure cost
  - Vendor lock-in concerns
  - Latency overhead for external calls
  - Over-engineered for current scale
- **Why not chosen**: Cost and complexity not justified for current requirements

### Option 4: Application-Level Rate Limiting Only
- **Pros**: 
  - Full control over logic
  - Easy integration with business rules
  - No external dependencies
  - Cost-effective
- **Cons**: 
  - Doesn't protect against network-level attacks
  - Limited effectiveness against distributed attacks
  - Performance overhead on application servers
  - Complex to implement correctly
- **Why not chosen**: Insufficient protection and scalability limitations

## Consequences

### Positive
- **Flexible Protection**: Different limits for different threats and user types
- **User Experience**: Legitimate users rarely hit limits
- **Scalability**: Distributed state allows horizontal scaling
- **Business Alignment**: Rate limits match charity operational patterns
- **Cost Effective**: Uses existing Redis infrastructure
- **Observable**: Comprehensive metrics and monitoring

### Negative
- **Configuration Complexity**: Multiple tiers require careful tuning
- **Redis Dependency**: Rate limiting fails if Redis is unavailable
- **Development Overhead**: More complex than simple rate limiting
- **Debugging Complexity**: Multiple rules can make troubleshooting harder

### Neutral
- **Performance Impact**: Minimal overhead with Redis-based implementation
- **Maintenance**: Requires periodic review and adjustment of limits

## Implementation Notes

**Current Rate Limiting Tiers:**

```go
// 1. Authentication Rate Limiting (Strictest)
AuthRateLimit(): 5 attempts per 15 minutes
// Protects login, registration, password reset

// 2. API Rate Limiting (Role-based)
APIRateLimit(): 100 requests per minute (general users)
// Different limits by user role:
// - Basic users: 100/minute
// - Volunteers: 200/minute  
// - Staff: 500/minute
// - Admins: 1000/minute

// 3. WebSocket Rate Limiting (Connection-based)
WebSocketRateLimit(): 100 connections per 5 minutes
// Allows for development/testing, more generous timeframe

// 4. Strict Rate Limiting (Most Restrictive) 
StrictRateLimit(): 10 requests per hour
// For sensitive operations like password changes, admin actions
```

**Redis-Based Distributed Implementation:**
```go
// Rate limiting key structure
ratelimit:auth:{clientIP}:{userID}
ratelimit:api:{userID}:{endpoint}
ratelimit:websocket:{clientIP}
ratelimit:strict:{userID}:{operation}

// Atomic Redis operations for thread safety
pipe := redisClient.Pipeline()
pipe.Incr(ctx, key)
pipe.Expire(ctx, key, window)
results, err := pipe.Exec(ctx)
```

**Frontend Rate Limiting Integration:**
```typescript
// Client-side rate limiting with API integration
export const apiRateLimiter = APIRateLimiter.getInstance();

// Automatic request throttling and caching
const executeRequest = async (endpoint, options) => {
  return apiRateLimiter.executeRequest(
    endpoint,
    () => fetch(endpoint, options),
    { maxRequests: 10, windowMs: 60000 }
  );
};
```

**Rate Limiting by Endpoint Sensitivity:**
```
High Sensitivity (Strict limits):
- POST /api/v1/auth/* (authentication)
- PUT /api/v1/users/password (password changes)
- POST /api/v1/admin/* (admin operations)

Medium Sensitivity (API limits):
- POST /api/v1/help-requests (help request submission)
- POST /api/v1/donations (donation processing)
- PUT /api/v1/volunteers/shifts (shift management)

Low Sensitivity (Generous limits):
- GET /api/v1/dashboard (dashboard data)
- GET /api/v1/help-requests (viewing requests)
- WebSocket connections (real-time features)
```

**Grace Period Implementation:**
- **Burst Allowance**: Users can exceed limits briefly (2x limit for 30 seconds)
- **Emergency Override**: Admin can disable rate limiting for specific users
- **Progressive Penalties**: Temporary increases to limits after violations
- **User Notification**: Clear error messages with retry timing

**Monitoring and Metrics:**
```prometheus
# Rate limiting metrics
rate_limit_exceeded_total{tier="auth", endpoint="/login"}
rate_limit_current_usage{user_id="123", tier="api"} 
rate_limit_redis_errors_total{operation="incr"}
```

**Configuration Management:**
```yaml
# Environment-based rate limiting
development:
  auth_rate_limit: 10/minute    # More generous for testing
  api_rate_limit: 1000/minute
  
production:
  auth_rate_limit: 5/15minutes  # Strict for security  
  api_rate_limit: 100/minute
```

## References
- [Rate Limiting Middleware Implementation](../backend/internal/middleware/rate_limiter.go)
- [Frontend Rate Limiter](../frontend/lib/utils/api-rate-limiter.ts)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Security Validation Middleware](../backend/internal/middleware/security_validator.go)

---
*This ADR establishes a comprehensive rate limiting strategy that balances security, usability, and operational efficiency.*
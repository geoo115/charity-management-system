# Lewisham Charity Backend - Observability Guide

## Overview

This guide covers the comprehensive observability enhancements implemented for the Lewisham Charity Backend, including:

- **Full Redis Cache Implementation** - Production-ready caching with metrics
- **Distributed Tracing** - OpenTelemetry integration (ready for deployment)
- **Prometheus Metrics** - Comprehensive application and infrastructure monitoring
- **Load Testing** - Automated performance benchmarking with k6

## 🚀 Quick Start

### 1. Start the Complete Observability Stack

```bash
# Start all monitoring services
make observability-setup

# Or start components individually
make monitoring-up
make load-test-setup
```

### 2. Access Monitoring Dashboards

- **Application**: http://localhost:8080
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Jaeger Tracing**: http://localhost:16686
- **AlertManager**: http://localhost:9093

### 3. Run Load Tests

```bash
# Run all load tests
make load-test

# Run specific test types
make load-test-baseline  # Baseline performance
make load-test-stress    # Stress testing
make load-test-spike     # Spike testing
```

## 📊 Metrics Collection

### Application Metrics

The system collects comprehensive metrics across multiple dimensions:

#### HTTP Metrics
- Request count by method, route, status code, and user role
- Response time histograms (95th percentile tracking)
- Request/response size distributions
- Active connection counts

#### Database Metrics
- Query duration and count by operation and table
- Connection pool statistics (open, idle, in-use)
- Query success/failure rates

#### Cache Metrics (Redis)
- Hit/miss rates and operation counts
- Operation duration histograms
- Cache size and memory usage
- Connection pool statistics

#### Business Metrics
- Help request counts by category and priority
- Volunteer activity tracking
- Donation metrics by type and status
- Queue management statistics
- WebSocket connection counts

#### System Metrics
- Memory and CPU usage
- Goroutine counts
- Error rates by component and severity
- Health status per service component

### Viewing Metrics

```bash
# View application metrics directly
make metrics

# View cache statistics
make cache-stats

# View database statistics
make db-stats

# Check overall health
make health
```

## 🏗️ Cache Implementation

### Redis Integration

The cache service provides:

- **Automatic JSON serialization/deserialization**
- **Connection pooling and health monitoring**
- **Pipeline operations for bulk operations**
- **Pattern-based cache invalidation**
- **Comprehensive metrics and statistics**

### Cache Usage Examples

```go
// Get cache service
cache := services.GetCacheService()

// Basic operations
err := cache.Set("key", data, time.Hour)
var result MyStruct
err := cache.Get("key", &result)

// User-specific caching
cache.CacheVolunteer(userID, profile)
profile, err := cache.GetVolunteerFromCache(userID)

// Dashboard metrics caching
cache.CacheDashboardMetrics(userID, "7d", metrics)
err := cache.GetDashboardMetricsFromCache(userID, "7d", &metrics)

// Bulk operations
data := map[string]interface{}{
    "key1": value1,
    "key2": value2,
}
cache.SetMultiple(data, time.Hour)

// Pattern-based invalidation
cache.InvalidateUserCache(userID)  // Removes all user-related cache
cache.DeletePattern("session:*")   // Removes all session cache
```

### Cache Statistics

Access detailed cache performance metrics:

```bash
curl http://localhost:8080/api/v1/cache/stats
```

Returns metrics including:
- Hit/miss rates and counts
- Operation timings
- Redis memory usage
- Connection pool statistics
- Uptime and error counts

## 📈 Load Testing

### Test Scenarios

The load testing suite includes multiple realistic scenarios:

#### Baseline Test (2-10 users, 9 minutes)
- Normal user authentication flows
- CRUD operations across all user roles
- Realistic think times and usage patterns

#### Stress Test (10-100 users, 15 minutes)  
- High concurrent load
- Database-intensive operations
- Cache performance under load
- WebSocket connection stress

#### Spike Test (Configurable)
- Sudden traffic spikes
- System recovery testing
- Resource limit testing

### Running Load Tests

```bash
# Run all test scenarios
./load-testing/run-load-tests.sh all

# Run specific scenarios
./load-testing/run-load-tests.sh baseline
./load-testing/run-load-tests.sh stress

# Custom target URL
./load-testing/run-load-tests.sh -u http://staging.api.com stress

# With cleanup of old results
./load-testing/run-load-tests.sh --cleanup all
```

### Test Results

Results are saved with timestamps in `load-testing/results/`:

- **JSON files**: Detailed metrics for analysis
- **CSV files**: Time-series data for graphing
- **Summary reports**: Markdown reports with key findings

### Performance Thresholds

The tests include predefined performance thresholds:

- 95% of requests under 2 seconds
- Error rate under 10%
- Authentication failure rate under 5%
- Minimum WebSocket connections maintained
- Business operation volume targets

## 🔍 Distributed Tracing (Ready for Deployment)

### OpenTelemetry Setup

The tracing infrastructure is implemented and ready for deployment:

```go
// Initialize tracing
tracing, err := observability.InitializeTracing()
if err != nil {
    log.Fatal(err)
}
defer tracing.Shutdown(context.Background())
```

### Trace Context Propagation

- **HTTP requests**: Automatic trace context extraction/injection
- **Database operations**: Instrumented with operation metadata
- **Cache operations**: Redis calls traced with keys and operations
- **WebSocket connections**: Real-time connection tracing
- **Queue operations**: Message processing traces

### Jaeger UI Features

Access the Jaeger UI at http://localhost:16686 to:

- View end-to-end request traces
- Analyze service dependencies
- Identify performance bottlenecks
- Debug distributed system issues

## 🚨 Alerting

### Alert Rules

Comprehensive alerting rules cover:

#### Application Health
- High error rates (>5% for 2 minutes)
- High response times (95th percentile >2s for 3 minutes)
- API downtime (>1 minute)
- High authentication failure rates

#### Infrastructure Health
- Database connection issues
- Redis downtime or low hit rates
- High memory/CPU usage
- Low disk space

#### Business Metrics
- Queue length growing rapidly
- High help request volume
- Low WebSocket connections
- Container restart frequency

### Alert Configuration

Alerts are configured in `monitoring/rules/api-alerts.yml` and can be customized for your environment.

## 🐛 Troubleshooting

### Common Issues

#### Cache Connection Issues
```bash
# Check Redis status
docker exec ldh2_redis redis-cli ping

# View cache service logs
make monitoring-logs
```

#### High Response Times
```bash
# Check database performance
make db-stats

# View slow query logs
docker logs ldh2_postgres

# Profile application performance
make profile-cpu
make profile-memory
```

#### Load Test Failures
```bash
# Check API health before testing
curl http://localhost:8080/health

# Run with health check skip for troubleshooting
./load-testing/run-load-tests.sh --skip-health baseline
```

### Performance Tuning

#### Database Optimization
- Monitor connection pool usage: `make db-stats`
- Adjust `MAX_OPEN_CONNS` in configuration
- Review slow queries in Prometheus/Grafana

#### Cache Optimization
- Monitor hit rates in cache statistics
- Adjust TTL values based on data patterns
- Use pipeline operations for bulk cache operations

#### Application Scaling
- Monitor goroutine counts: `make metrics`
- Review memory usage patterns
- Scale based on load test results

## 📚 Configuration

### Environment Variables

#### Observability Configuration
```env
# Metrics
PROMETHEUS_METRICS_ENABLED=true

# Tracing (when ready for deployment)
OTEL_TRACING_ENABLED=true
OTEL_SERVICE_NAME=lewisham-hub-api
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

#### Load Testing Configuration
```env
# Target for load testing
BASE_URL=http://localhost:8080

# Test user credentials (ensure these exist in your test database)
ADMIN_EMAIL=admin@lewisham-hub.org
VOLUNTEER_EMAIL=volunteer@test.com
```

## 🎯 Best Practices

### Metrics
1. **Use labels wisely** - Don't create high-cardinality label combinations
2. **Monitor business metrics** - Track what matters to users
3. **Set meaningful thresholds** - Base alerts on user impact
4. **Review metrics regularly** - Optimize based on actual usage patterns

### Caching
1. **Cache hot data** - Focus on frequently accessed, slow-to-compute data
2. **Set appropriate TTLs** - Balance freshness with performance
3. **Handle cache misses gracefully** - Always have fallback logic
4. **Monitor hit rates** - Aim for >80% hit rate for cached operations

### Load Testing
1. **Test regularly** - Include in CI/CD pipeline
2. **Use realistic data** - Test with production-like datasets
3. **Test incrementally** - Start with baseline, then stress test
4. **Monitor during tests** - Watch metrics and logs during test execution

### Tracing
1. **Sample appropriately** - Use lower sampling in production
2. **Add meaningful attributes** - Include user context and business data
3. **Avoid sensitive data** - Don't trace PII or secrets
4. **Monitor trace volume** - Balance observability with performance

## 🔗 Integration Examples

### Adding Custom Metrics

```go
// In your handler
func (h *Handler) CreateHelpRequest(c *gin.Context) {
    // Record business metric
    metrics := observability.GetMetricsService()
    metrics.RecordHelpRequest(category, priority, "created")
    
    // Add trace attributes
    span := middleware.GetSpanFromContext(c)
    observability.AddSpanAttributes(span, 
        attribute.String("help_request.category", category),
        attribute.String("help_request.priority", priority),
    )
    
    // Cache the result
    cache := services.GetCacheService()
    cache.Set(fmt.Sprintf("help_request:%d", id), result, time.Hour)
}
```

### Custom Load Test Scenarios

```javascript
// Add to k6-load-test.js
export function customBusinessScenario() {
    const token = authenticateUser('volunteer');
    
    group('Custom Business Flow', () => {
        // Your specific business logic testing
        const response = makeAuthenticatedRequest('POST', '/custom-endpoint', token, payload);
        check(response, {
            'custom operation successful': (r) => r.status === 200,
        });
        
        businessOperations.add(1);
    });
}
```

This observability stack provides production-ready monitoring, caching, and performance testing capabilities that will scale with your application and provide deep insights into system behavior and user experience. 
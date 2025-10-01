# Understanding Observability: Prometheus, Grafana & Jaeger

## 📚 Table of Contents
1. [Overview](#overview)
2. [Prometheus - Metrics Collection](#prometheus)
3. [Grafana - Visualization](#grafana)
4. [Jaeger - Distributed Tracing](#jaeger)
5. [How They Work Together](#integration)
6. [Your Implementation](#your-implementation)
7. [Practical Examples](#examples)

---

## Overview

Your charity management system uses three powerful observability tools to monitor, visualize, and troubleshoot the application:

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Metrics    │  │    Traces    │  │     Logs     │  │
│  │  (counters,  │  │  (requests,  │  │   (events,   │  │
│  │  histograms) │  │   spans)     │  │    errors)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                  │                             │
└─────────┼──────────────────┼─────────────────────────────┘
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │  Prometheus  │   │    Jaeger    │
   │   (Store &   │   │  (Trace DB)  │
   │    Query)    │   │              │
   └──────┬───────┘   └──────┬───────┘
          │                  │
          └────────┬─────────┘
                   │
                   ▼
            ┌──────────────┐
            │   Grafana    │
            │ (Dashboard & │
            │ Visualization)│
            └──────────────┘
```

---

## Prometheus - Metrics Collection

### What is Prometheus?

Prometheus is a **time-series database** that collects and stores metrics from your application. Think of it as a data collector that regularly asks your app: "How are you doing?"

### Key Concepts

#### 1. **Metrics Types**

```go
// COUNTER - Only goes up (like a car odometer)
// Example: Total HTTP requests
httpRequests.Inc()  // 1, 2, 3, 4, 5...

// GAUGE - Can go up or down (like a thermometer)
// Example: Current active connections
activeConnections.Set(42)  // 42, 39, 45, 41...

// HISTOGRAM - Measures distributions (like exam scores)
// Example: Response times
httpDuration.Observe(0.234)  // Groups into buckets: <100ms, <500ms, <1s...

// SUMMARY - Similar to histogram but calculates percentiles
// Example: 95th percentile response time
```

#### 2. **Labels** - Add dimensions to metrics

```go
// Without labels: Just a number
httpRequests.Inc()  // Total: 1000

// With labels: Numbers by category
httpRequests.WithLabelValues("GET", "/api/volunteers", "200", "admin").Inc()
// Now you can answer:
// - How many GET requests?
// - How many 200 responses?
// - How many admin requests?
```

### How Prometheus Works in Your App

#### Step 1: Metrics are Registered
```go
// From: backend/internal/observability/metrics.go

// Create a counter for HTTP requests
httpRequests = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total number of HTTP requests",
    },
    []string{"method", "route", "status_code", "user_role"},
)
```

#### Step 2: Metrics are Recorded
```go
// When a request happens:
func (ms *MetricsService) RecordHTTPRequest(
    method, route, statusCode, userRole string,
    duration time.Duration,
    requestSize, responseSize int,
) {
    // Increment counter
    ms.httpRequests.WithLabelValues(method, route, statusCode, userRole).Inc()
    
    // Record duration
    ms.httpDuration.WithLabelValues(method, route, statusCode).Observe(duration.Seconds())
    
    // Record sizes
    ms.httpRequestSize.WithLabelValues(method, route).Observe(float64(requestSize))
    ms.httpResponseSize.WithLabelValues(method, route, statusCode).Observe(float64(responseSize))
}
```

#### Step 3: Prometheus Scrapes Metrics
```
Every 15 seconds (configurable):
Prometheus → HTTP GET → http://your-app:8080/metrics
                     ← Returns all metrics in text format:

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/volunteers",status_code="200",user_role="admin"} 150
http_requests_total{method="POST",route="/api/volunteers",status_code="201",user_role="admin"} 25
http_requests_total{method="GET",route="/api/donations",status_code="200",user_role="donor"} 340
```

### What Metrics Your App Collects

```go
// 1. HTTP METRICS
- http_requests_total              // Total requests by method/route/status/role
- http_request_duration_seconds    // How long requests take
- http_request_size_bytes          // Request payload sizes
- http_response_size_bytes         // Response payload sizes
- http_active_connections          // Current active connections

// 2. DATABASE METRICS
- database_queries_total           // Total queries by operation/table
- database_query_duration_seconds  // Query execution time
- database_connections             // Connection pool stats (open/idle/in-use)
- database_connection_pool         // Pool statistics

// 3. CACHE METRICS (Redis)
- cache_operations_total           // Total cache ops (get/set/delete)
- cache_operation_duration_seconds // Cache operation latency
- cache_hit_rate                   // Cache effectiveness (%)
- cache_size_bytes                 // Current cache memory usage

// 4. BUSINESS METRICS
- help_requests_total              // Help requests by category/priority
- volunteer_activity_total         // Volunteer activities
- donations_total                  // Donations by type/status
- queue_metrics                    // Queue lengths and wait times
- websocket_connections            // Active WebSocket connections

// 5. SYSTEM METRICS
- system_health                    // Component health (1=healthy, 0=unhealthy)
- errors_total                     // Errors by type/component/severity
- memory_usage_bytes               // Application memory usage
- goroutines_total                 // Number of goroutines
```

### Querying Prometheus

Prometheus has its own query language called **PromQL**:

```promql
# How many requests in the last 5 minutes?
rate(http_requests_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) 
/ 
rate(http_request_duration_seconds_count[5m])

# Cache hit rate percentage
(cache_operations_total{status="hit"} / cache_operations_total) * 100

# 95th percentile response time
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Error rate by endpoint
rate(errors_total[5m])
```

---

## Grafana - Visualization

### What is Grafana?

Grafana is a **visualization platform** that turns Prometheus metrics into beautiful, interactive dashboards. If Prometheus is the data collector, Grafana is the artist that paints the picture.

### Key Features

#### 1. **Dashboards** - Visual representations of metrics

```
┌────────────────────────────────────────────────────────┐
│ 🎯 Lewisham Charity - System Overview                  │
├────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│ │ Total       │ │ Active      │ │ Response    │      │
│ │ Requests    │ │ Users       │ │ Time (avg)  │      │
│ │ 45,231      │ │ 127         │ │ 234ms       │      │
│ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                        │
│ 📊 Request Rate (5 min)                               │
│ ┌────────────────────────────────────────────┐        │
│ │         ╱╲    ╱╲                            │        │
│ │        ╱  ╲  ╱  ╲╲                          │        │
│ │    ╲  ╱    ╲╱    ╲    ╱╲                   │        │
│ │     ╲╱              ╲╱  ╲                  │        │
│ └────────────────────────────────────────────┘        │
│                                                        │
│ 🔥 Top Endpoints                                       │
│ ┌────────────────────────────────────────────┐        │
│ │ /api/volunteers      ████████████ 1,234    │        │
│ │ /api/donations       ████████ 892          │        │
│ │ /api/help-requests   ██████ 654            │        │
│ └────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────┘
```

#### 2. **Panels** - Individual visualizations

```
Types of panels:
- Time Series: Line/area charts for trends
- Gauge: Single value with thresholds
- Bar Chart: Compare values
- Stat: Big numbers with sparklines
- Table: Tabular data
- Heatmap: Dense data patterns
```

#### 3. **Alerts** - Get notified when things go wrong

```
Alert Rule Example:
IF response_time_p95 > 1000ms
FOR 5 minutes
THEN send notification to Slack/Email/PagerDuty
```

### How to Use Grafana with Your App

#### 1. Access Grafana
```bash
# Open in browser
http://localhost:3001

# Default credentials
Username: admin
Password: admin123
```

#### 2. Create a Dashboard

**Step-by-step:**

1. Click **"Create"** → **"Dashboard"**
2. Click **"Add new panel"**
3. Select **Prometheus** as data source
4. Write a query in PromQL:
   ```promql
   rate(http_requests_total[5m])
   ```
5. Choose visualization type (Time Series, Gauge, etc.)
6. Customize:
   - Title: "HTTP Request Rate"
   - Y-axis: "Requests/sec"
   - Legend: Show labels
7. Click **"Apply"**

#### 3. Example Dashboard Queries

```promql
# Panel 1: Request Rate
sum(rate(http_requests_total[5m])) by (route)

# Panel 2: Error Rate
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100

# Panel 3: P95 Response Time
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)

# Panel 4: Cache Hit Rate
(
  sum(rate(cache_operations_total{status="hit"}[5m]))
  /
  sum(rate(cache_operations_total[5m]))
) * 100

# Panel 5: Database Query Duration
rate(database_query_duration_seconds_sum[5m])
/
rate(database_query_duration_seconds_count[5m])

# Panel 6: Active Connections
http_active_connections

# Panel 7: Memory Usage
memory_usage_bytes / 1024 / 1024  # Convert to MB
```

### Pre-built Dashboards

You can import community dashboards:

1. Go to grafana.com/dashboards
2. Search for "Go Application" or "Gin Framework"
3. Copy dashboard ID
4. In Grafana: **Import** → Enter ID → **Load**

---

## Jaeger - Distributed Tracing

### What is Jaeger?

Jaeger is a **distributed tracing system** that tracks requests as they flow through your application. Think of it as a GPS tracker for your HTTP requests - it shows you exactly where a request went and how long each step took.

### Key Concepts

#### 1. **Trace** - The complete journey of a request

```
Trace: "User creates volunteer shift"
Duration: 342ms
Status: Success
```

#### 2. **Span** - A single operation within a trace

```
Trace ID: abc123
├─ Span: HTTP POST /api/shifts                    [0-342ms]
   ├─ Span: Validate Request                       [0-5ms]
   ├─ Span: Check User Permissions                 [5-45ms]
   │  └─ Span: Database Query - users table        [8-42ms]
   ├─ Span: Create Shift                           [45-320ms]
   │  ├─ Span: Database Insert - shifts table      [50-280ms]
   │  └─ Span: Update Cache - volunteer schedule   [280-315ms]
   │     └─ Span: Redis SET operation              [282-314ms]
   └─ Span: Send Notification                      [320-342ms]
      └─ Span: WebSocket Broadcast                 [322-340ms]
```

#### 3. **Tags** - Metadata about operations

```
Span: Database Query
├─ Tags:
│  ├─ db.system: postgresql
│  ├─ db.operation: SELECT
│  ├─ db.table: volunteers
│  ├─ user.id: 123
│  └─ user.role: admin
├─ Duration: 34ms
└─ Status: OK
```

### How Tracing Works in Your App

#### Step 1: Tracing is Initialized
```go
// From: backend/internal/observability/tracing.go

tracingService, err := NewTracingService(TracingConfig{
    ServiceName:    "lewisham-hub-api",
    ServiceVersion: "1.0.0",
    Environment:    "production",
    JaegerEndpoint: "http://jaeger:14268/api/traces",
    SamplingRatio:  0.1,  // Trace 10% of requests
    Enabled:        true,
})
```

#### Step 2: Requests are Traced
```go
// From: backend/internal/middleware/tracing_middleware.go

func TracingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Start a new trace for this HTTP request
        ctx, span := tracer.Start(c.Request.Context(), 
            "POST /api/volunteers",
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                semconv.HTTPMethodKey.String("POST"),
                semconv.HTTPRouteKey.String("/api/volunteers"),
                attribute.String("user.role", "admin"),
            ),
        )
        defer span.End()
        
        // Process the request
        c.Next()
        
        // Add response information
        span.SetAttributes(
            semconv.HTTPStatusCodeKey.Int(c.Writer.Status()),
            attribute.Int64("http.duration_ms", time.Since(start).Milliseconds()),
        )
    }
}
```

#### Step 3: Child Spans are Created
```go
// In your handlers or services:

func CreateVolunteer(ctx context.Context, data VolunteerData) error {
    // Start a child span for database operation
    ctx, span := tracer.Start(ctx, "db.insert.volunteers")
    defer span.End()
    
    // Perform database operation
    err := db.Create(&volunteer).Error
    
    if err != nil {
        // Record error in span
        span.RecordError(err)
        span.SetStatus(codes.Error, "Failed to create volunteer")
        return err
    }
    
    span.SetStatus(codes.Ok, "")
    return nil
}
```

#### Step 4: Traces are Sent to Jaeger
```
Your App → Batch Processor → Jaeger Collector → Storage → Jaeger UI
                ↓
           (Every 5 seconds,
            send batch of spans)
```

### Using Jaeger UI

#### 1. Access Jaeger
```bash
# Open in browser
http://localhost:16686
```

#### 2. Search for Traces

```
Filter by:
- Service: lewisham-hub-api
- Operation: POST /api/volunteers
- Tags: user.role=admin
- Min Duration: 1000ms (find slow requests)
- Max Duration: 5000ms
- Lookback: Last hour
```

#### 3. Analyze a Trace

```
┌─────────────────────────────────────────────────────────┐
│ Trace: POST /api/volunteers/123/shifts                  │
│ Duration: 542ms                                          │
│ Spans: 8                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ POST /api/volunteers/123/shifts          [0-542ms] ████│
│   ├─ Auth Middleware                      [0-12ms]   █  │
│   ├─ Database: Get Volunteer            [12-78ms]  ███  │
│   ├─ Database: Check Conflicts         [78-145ms] ████  │
│   ├─ Database: Insert Shift           [145-489ms] █████ │ ← SLOW!
│   ├─ Cache: Update Schedule            [489-523ms] ███  │
│   └─ Notification: Send                [523-542ms]  ██  │
│                                                          │
└─────────────────────────────────────────────────────────┘

Click on "Database: Insert Shift" to see:
- SQL Query
- Table name
- Duration breakdown
- Error messages (if any)
```

### What to Look For

1. **Slow Operations** - Which span took the most time?
2. **Errors** - Which operation failed?
3. **Bottlenecks** - Where do requests get stuck?
4. **Dependencies** - How do services interact?
5. **Patterns** - Do all slow requests hit the same code?

---

## Integration: How They Work Together

### The Observability Pipeline

```
┌────────────────────────────────────────────────────────┐
│                  Your Application                       │
│                                                         │
│  User Request → Handler → Database → Cache → Response  │
│       │           │         │         │         │       │
│       └───────────┴─────────┴─────────┴─────────┘       │
│                     │                                   │
│                     ↓                                   │
│        ┌────────────┴────────────┐                     │
│        │                         │                     │
│        ↓                         ↓                     │
│  ┌─────────────┐         ┌──────────────┐             │
│  │   Metrics   │         │    Traces    │             │
│  │  (Numbers)  │         │   (Journeys) │             │
│  └──────┬──────┘         └──────┬───────┘             │
└─────────┼─────────────────────────┼──────────────────────┘
          │                         │
          ↓                         ↓
   ┌──────────────┐          ┌──────────────┐
   │  Prometheus  │          │    Jaeger    │
   │              │          │              │
   │  • Stores    │          │  • Stores    │
   │    metrics   │          │    traces    │
   │  • Queries   │          │  • Queries   │
   │  • Alerts    │          │  • Search    │
   └──────┬───────┘          └──────┬───────┘
          │                         │
          └───────────┬─────────────┘
                      │
                      ↓
               ┌──────────────┐
               │   Grafana    │
               │              │
               │  • Dashboards│
               │  • Alerts    │
               │  • Both!     │
               └──────────────┘
```

### Example Debugging Scenario

**Problem:** "The /api/volunteers endpoint is slow"

#### Step 1: Check Metrics (Prometheus/Grafana)
```promql
# Is it really slow?
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket{route="/api/volunteers"}[5m])
)
# Result: 2.3 seconds (95th percentile)

# How often does this happen?
rate(http_requests_total{route="/api/volunteers"}[5m])
# Result: 50 requests/minute

# Are there errors?
rate(errors_total{component="volunteers"}[5m])
# Result: 0 errors/minute
```

**Finding:** Slow, but no errors. Need more detail.

#### Step 2: Check Traces (Jaeger)
```
1. Open Jaeger UI
2. Search:
   - Service: lewisham-hub-api
   - Operation: GET /api/volunteers
   - Min Duration: 2000ms
3. Click on a slow trace
```

**Trace shows:**
```
GET /api/volunteers                    [0-2300ms]
├─ Auth Middleware                     [0-50ms]    ✓ Fast
├─ Database: Get Volunteers          [50-2250ms]  ❌ SLOW!
│  └─ Query: SELECT * FROM volunteers WHERE...
└─ Response Serialization           [2250-2300ms] ✓ Fast
```

**Finding:** Database query is taking 2.2 seconds!

#### Step 3: Check Database Metrics
```promql
# Database query duration
rate(database_query_duration_seconds_sum{table="volunteers"}[5m])
/
rate(database_query_duration_seconds_count{table="volunteers"}[5m])
# Result: 2.1 seconds average

# Check cache hit rate
cache_hit_rate
# Result: 15% (very low!)
```

**Finding:** Cache hit rate is low, causing too many database queries.

#### Step 4: Solution
```
Problem: Low cache hit rate → Too many DB queries → Slow responses
Solution: 
1. Increase cache TTL
2. Add cache warming
3. Add database index on volunteers table
```

---

## Your Implementation

### Architecture Overview

```go
// File structure:
backend/internal/observability/
├── metrics.go      // Prometheus metrics
├── tracing.go      // Jaeger tracing
└── (used by middleware)

backend/internal/middleware/
├── tracing_middleware.go      // Adds tracing to requests
└── enhanced_context.go         // Adds metrics to requests

backend/internal/routes/
└── metrics_routes.go           // Exposes /metrics endpoint
```

### Key Files Explained

#### 1. **metrics.go** - Metrics Definition
```go
// Defines all metrics
type MetricsService struct {
    httpRequests   *prometheus.CounterVec
    httpDuration   *prometheus.HistogramVec
    dbQueries      *prometheus.CounterVec
    // ... and many more
}

// Records metrics
func (ms *MetricsService) RecordHTTPRequest(...) {
    ms.httpRequests.WithLabelValues(...).Inc()
    ms.httpDuration.WithLabelValues(...).Observe(duration.Seconds())
}
```

#### 2. **tracing.go** - Tracing Configuration
```go
// Initializes OpenTelemetry
func NewTracingService(config TracingConfig) (*TracingService, error) {
    // Create Jaeger exporter
    exporter, _ := jaeger.New(jaeger.WithCollectorEndpoint(...))
    
    // Create trace provider
    provider := trace.NewTracerProvider(
        trace.WithSampler(trace.TraceIDRatioBased(0.1)),  // Sample 10%
        trace.WithBatcher(exporter),
    )
    
    return &TracingService{...}
}

// Helper functions for creating spans
func (ts *TracingService) StartHTTPSpan(...)
func (ts *TracingService) StartDatabaseSpan(...)
func (ts *TracingService) StartCacheSpan(...)
```

#### 3. **tracing_middleware.go** - Request Tracing
```go
func TracingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Start span for request
        ctx, span := tracer.Start(c.Request.Context(), spanName)
        defer span.End()
        
        // Process request
        c.Next()
        
        // Add response info to span
        span.SetAttributes(
            semconv.HTTPStatusCodeKey.Int(c.Writer.Status()),
        )
    }
}
```

#### 4. **metrics_routes.go** - Exposing Metrics
```go
func RegisterMetricsRoutes(router *gin.Engine) {
    // Prometheus endpoint
    router.GET("/metrics", gin.WrapH(
        observability.GetMetricsService().GetHandler(),
    ))
    
    // Custom endpoints
    router.GET("/api/v1/cache/stats", CacheStatsHandler)
    router.GET("/health/detailed", DetailedHealthHandler)
}
```

---

## Practical Examples

### Example 1: Monitor Volunteer Shift Creation

#### 1. Add Metrics
```go
// In your shift creation handler:
func CreateShift(c *gin.Context) {
    start := time.Now()
    
    // Your business logic
    err := createShiftInDB(shift)
    
    // Record metrics
    metrics := observability.GetMetricsService()
    metrics.volunteerActivity.WithLabelValues("shift_created", "volunteer").Inc()
    
    if err != nil {
        metrics.errorRate.WithLabelValues("database", "shifts", "error").Inc()
    }
    
    metrics.RecordHTTPRequest("POST", "/api/shifts", "201", "volunteer", 
        time.Since(start), requestSize, responseSize)
}
```

#### 2. Add Tracing
```go
func CreateShift(c *gin.Context) {
    ctx := c.Request.Context()
    
    // Start trace
    ctx, span := tracer.Start(ctx, "CreateShift")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("shift.type", shift.Type),
        attribute.String("shift.date", shift.Date),
    )
    
    // Database operation with child span
    ctx, dbSpan := tracer.Start(ctx, "db.insert.shifts")
    err := db.WithContext(ctx).Create(&shift).Error
    dbSpan.End()
    
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Failed to create shift")
    }
}
```

#### 3. View in Grafana
```promql
# Panel: Shifts Created per Hour
rate(volunteer_activity_total{activity_type="shift_created"}[1h]) * 3600

# Panel: Shift Creation Success Rate
(
  volunteer_activity_total{activity_type="shift_created"} 
  - 
  errors_total{component="shifts"}
) 
/ 
volunteer_activity_total{activity_type="shift_created"} 
* 100
```

#### 4. View in Jaeger
```
1. Search for: Operation = "CreateShift"
2. Filter by: duration > 1000ms
3. Click on slow trace
4. See timeline:
   - Which part was slow?
   - Database? Cache? Validation?
```

### Example 2: Monitor Cache Effectiveness

#### 1. Metrics Already Collected
```go
// These are already in your code:
- cache_operations_total{operation="get", status="hit"}
- cache_operations_total{operation="get", status="miss"}
- cache_operation_duration_seconds{operation="get"}
```

#### 2. Create Grafana Dashboard

**Panel 1: Cache Hit Rate**
```promql
(
  rate(cache_operations_total{status="hit"}[5m])
  /
  rate(cache_operations_total{operation="get"}[5m])
) * 100
```

**Panel 2: Cache Operations per Second**
```promql
sum(rate(cache_operations_total[5m])) by (operation, status)
```

**Panel 3: Cache Latency**
```promql
histogram_quantile(0.95, 
  rate(cache_operation_duration_seconds_bucket[5m])
) * 1000  # Convert to milliseconds
```

**Panel 4: Top Cached Keys**
```bash
# Call your custom endpoint:
curl http://localhost:8080/api/v1/cache/stats
```

### Example 3: Alert on High Error Rate

#### 1. Create Prometheus Alert Rule
```yaml
# prometheus-alerts.yml
groups:
  - name: charity_app_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(errors_total[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"
          
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "95th percentile response time is too high"
          description: "P95 latency is {{ $value }}s"
```

#### 2. Configure AlertManager
```yaml
# alertmanager.yml
route:
  receiver: 'team-email'
  
receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@charity.org'
        from: 'alerts@charity.org'
        smarthost: 'smtp.gmail.com:587'
```

### Example 4: Correlate Metrics and Traces

**Scenario:** High response time alert fires

#### 1. Check Metrics
```
Grafana shows spike in response time at 14:30
```

#### 2. Find Affected Requests
```promql
# Which endpoint?
topk(5, rate(http_request_duration_seconds_sum[5m]) 
    / 
    rate(http_request_duration_seconds_count[5m]))
```

#### 3. Jump to Traces
```
1. Copy the time range: 14:25-14:35
2. Open Jaeger
3. Search:
   - Service: lewisham-hub-api
   - Operation: <slow_endpoint>
   - Time Range: 14:25-14:35
4. Sort by: Duration (descending)
5. Click slowest trace
```

#### 4. Analyze Root Cause
```
Trace shows:
- HTTP Request: 5200ms
  ├─ Database Query: 5000ms ← Problem here!
  │  └─ SQL: SELECT * FROM volunteers WHERE status = 'active'
  └─ Other: 200ms

Solution: Add index on volunteers.status column
```

---

## Quick Reference

### Essential Endpoints
```bash
# Prometheus metrics
curl http://localhost:8080/metrics

# Cache statistics  
curl http://localhost:8080/api/v1/cache/stats

# Detailed health check
curl http://localhost:8080/health/detailed

# Metrics summary
curl http://localhost:8080/api/v1/observability/metrics/summary
```

### Essential PromQL Queries
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(errors_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
(rate(cache_operations_total{status="hit"}[5m]) 
/ 
rate(cache_operations_total{operation="get"}[5m])) * 100

# Database connections
database_connections{state="in_use"}
```

### Essential Commands
```bash
# Start observability stack
docker-compose up -d

# View logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f jaeger

# Stop services
docker-compose down

# View metrics in terminal
curl -s http://localhost:8080/metrics | grep http_requests_total
```

---

## Learn More

### Official Documentation
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **Jaeger**: https://www.jaegertracing.io/docs/
- **OpenTelemetry**: https://opentelemetry.io/docs/

### Tutorials
- Prometheus: https://prometheus.io/docs/prometheus/latest/getting_started/
- Grafana: https://grafana.com/tutorials/
- PromQL: https://prometheus.io/docs/prometheus/latest/querying/basics/

### Your Project Docs
- `/docs/backend/OBSERVABILITY_GUIDE.md` - Complete setup guide
- `/docs/performance/` - Performance testing and optimization
- `/backend/internal/observability/` - Source code

---

## Summary

### 🎯 Key Takeaways

1. **Prometheus** = Numbers (How many? How fast? How much?)
2. **Grafana** = Pictures (Visualize those numbers)
3. **Jaeger** = Journey (Where did the request go?)

### 🚀 Getting Started

```bash
# 1. Start services
docker-compose up -d

# 2. Generate some traffic
curl http://localhost:8080/api/volunteers

# 3. View metrics
open http://localhost:9090  # Prometheus
open http://localhost:3001  # Grafana
open http://localhost:16686 # Jaeger

# 4. Explore!
```

### 📊 What to Monitor

- **Golden Signals:**
  - **Latency**: How long requests take
  - **Traffic**: How many requests
  - **Errors**: How many failures
  - **Saturation**: How full are resources

- **Your App Specific:**
  - Help requests created
  - Volunteer sign-ups
  - Donation amounts
  - Queue wait times
  - Cache effectiveness

Now go explore your observability stack! 🎉

# Observability Quick Reference Cheat Sheet

## 🚀 Quick Access URLs

```bash
Application:  http://localhost:8080
Prometheus:   http://localhost:9090
Grafana:      http://localhost:3001  (admin/admin123)
Jaeger:       http://localhost:16686
```

## 📊 Essential PromQL Queries

### Request Metrics
```promql
# Request rate (req/sec)
rate(http_requests_total[5m])

# Requests by endpoint
sum(rate(http_requests_total[5m])) by (route)

# Requests by status code
sum(rate(http_requests_total[5m])) by (status_code)

# Total requests in last hour
increase(http_requests_total[1h])
```

### Response Time
```promql
# P95 response time (seconds)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 response time (seconds)
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# P95 in milliseconds
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) * 1000
```

### Error Rate
```promql
# Error percentage
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# 4xx errors
sum(rate(http_requests_total{status_code=~"4.."}[5m]))

# 5xx errors
sum(rate(http_requests_total{status_code=~"5.."}[5m]))

# Error rate by endpoint
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route)
```

### Cache Metrics
```promql
# Cache hit rate (percentage)
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100

# Cache misses per second
rate(cache_operations_total{status="miss"}[5m])

# Cache operation latency (ms)
rate(cache_operation_duration_seconds_sum[5m]) / rate(cache_operation_duration_seconds_count[5m]) * 1000

# Cache size (MB)
cache_size_bytes / 1024 / 1024
```

### Database Metrics
```promql
# Average query duration (ms)
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m]) * 1000

# Query duration by table
rate(database_query_duration_seconds_sum[5m]) by (table) / rate(database_query_duration_seconds_count[5m]) by (table) * 1000

# Queries per second
rate(database_queries_total[5m])

# Connection pool usage (%)
database_connections{state="in_use"} / database_connections{state="open"} * 100

# Idle connections
database_connections{state="idle"}

# Slow queries (>100ms)
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m]) > 0.1
```

### System Health
```promql
# Memory usage (MB)
memory_usage_bytes / 1024 / 1024

# Memory usage (GB)
memory_usage_bytes / 1024 / 1024 / 1024

# Goroutine count
goroutines_total

# Component health (1=healthy, 0=unhealthy)
system_health{component="database"}
system_health{component="redis"}
system_health{component="websocket"}

# Active connections
http_active_connections
```

### Business Metrics
```promql
# Help requests per hour
rate(help_requests_total[1h]) * 3600

# Help requests by category
sum(rate(help_requests_total[1h])) by (category) * 3600

# Volunteer activities per day
rate(volunteer_activity_total[24h]) * 86400

# Donations per hour
rate(donations_total[1h]) * 3600

# Queue length
queue_metrics{metric="length"}

# Average wait time
queue_metrics{metric="wait_time"}

# Active WebSocket connections
sum(websocket_connections)

# WebSocket connections by role
websocket_connections by (user_role)
```

### Top-K Queries
```promql
# Top 10 endpoints by traffic
topk(10, sum(rate(http_requests_total[5m])) by (route))

# Top 5 slowest endpoints
topk(5, rate(http_request_duration_seconds_sum[5m]) by (route) / rate(http_request_duration_seconds_count[5m]) by (route))

# Top 10 error-prone endpoints
topk(10, rate(errors_total[5m]) by (component))

# Slowest database tables
topk(5, rate(database_query_duration_seconds_sum[5m]) by (table) / rate(database_query_duration_seconds_count[5m]) by (table))
```

## 🔍 Jaeger Search Patterns

### Basic Searches
```
Service:     lewisham-hub-api
Operation:   POST /api/volunteers
Lookback:    Last 1 hour
Limit:       20 traces
```

### Advanced Filters
```
# Find slow requests
Min Duration: 1000ms (1 second)
Max Duration: 5000ms (5 seconds)

# Find errors
Tags: error=true

# Find specific user requests
Tags: user.id=123

# Find admin requests
Tags: user.role=admin

# Find database operations
Tags: db.operation=SELECT

# Find cache misses
Tags: cache.status=miss
```

### Common Operations to Search
```
GET /api/volunteers
POST /api/volunteers
GET /api/help-requests
POST /api/help-requests
POST /api/donations
GET /api/dashboard
POST /api/auth/login
```

## 🛠️ Useful curl Commands

### Check Metrics
```bash
# Get all metrics
curl http://localhost:8080/metrics

# Count total metrics
curl -s http://localhost:8080/metrics | wc -l

# Search for specific metric
curl -s http://localhost:8080/metrics | grep http_requests_total

# Get cache statistics
curl http://localhost:8080/api/v1/cache/stats | jq

# Health check
curl http://localhost:8080/health/detailed | jq
```

### Generate Test Traffic
```bash
# Simple load test
for i in {1..100}; do curl http://localhost:8080/api/volunteers; done

# With timing
for i in {1..100}; do
  time curl -s http://localhost:8080/api/volunteers > /dev/null
done

# Parallel requests
seq 1 100 | xargs -P 10 -I {} curl -s http://localhost:8080/api/volunteers > /dev/null
```

### Test Error Scenarios
```bash
# 404 errors
curl http://localhost:8080/api/nonexistent

# 401 errors (no auth)
curl http://localhost:8080/api/admin/users

# Large payload
curl -X POST http://localhost:8080/api/volunteers \
  -H "Content-Type: application/json" \
  -d '{"name":"test","data":"'$(head -c 10000 /dev/urandom | base64)'"}'
```

## 📈 Grafana Panel Types & When to Use

```
Time Series      → Trends over time (response time, request rate)
Stat             → Single number with sparkline (current hit rate, active users)
Gauge            → Single value with thresholds (CPU %, memory %)
Bar Gauge        → Compare multiple values (top endpoints, error counts)
Table            → Detailed data (slow queries, error logs)
Heatmap          → Distribution patterns (response time distribution)
Pie Chart        → Proportions (requests by endpoint %)
```

## 🎯 Alert Thresholds (Recommendations)

```yaml
Response Time (P95):
  Warning:  > 1 second
  Critical: > 2 seconds

Error Rate:
  Warning:  > 1%
  Critical: > 5%

Cache Hit Rate:
  Warning:  < 70%
  Critical: < 50%

Database Query Time:
  Warning:  > 100ms average
  Critical: > 500ms average

Connection Pool Usage:
  Warning:  > 70%
  Critical: > 90%

Memory Usage:
  Warning:  > 1GB
  Critical: > 2GB

Goroutines:
  Warning:  > 500
  Critical: > 1000
```

## 🔥 Common Issues & Quick Fixes

### High Response Time
```promql
# Check which endpoint is slow
topk(5, rate(http_request_duration_seconds_sum[5m]) by (route) / rate(http_request_duration_seconds_count[5m]) by (route))

# Check database queries
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])

# Check cache effectiveness
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
```

### High Error Rate
```promql
# Which endpoints are failing?
rate(http_requests_total{status_code=~"5.."}[5m]) by (route)

# What types of errors?
rate(errors_total[5m]) by (type, component)

# Recent errors spike?
increase(errors_total[15m])
```

### Low Cache Hit Rate
```bash
# Check cache stats
curl http://localhost:8080/api/v1/cache/stats

# Check Redis connection
redis-cli -h localhost -p 6380 ping

# Check cache TTL
redis-cli -h localhost -p 6380 ttl "your:cache:key"
```

### Database Slow
```promql
# Slowest tables
topk(5, rate(database_query_duration_seconds_sum[5m]) by (table) / rate(database_query_duration_seconds_count[5m]) by (table))

# Connection pool exhausted?
database_connections{state="in_use"} / database_connections{state="open"}

# Query types distribution
rate(database_queries_total[5m]) by (operation)
```

## 📚 Metric Naming Conventions in Your App

```
Format: <namespace>_<name>_<unit>_<suffix>

http_requests_total              → Counter
http_request_duration_seconds    → Histogram
http_active_connections          → Gauge
database_queries_total           → Counter
cache_operations_total           → Counter
cache_hit_rate                   → Gauge
memory_usage_bytes               → Gauge
goroutines_total                 → Gauge
```

## 🎨 Grafana Color Schemes

```yaml
Thresholds:
  Good (Green):    80-100
  Warning (Yellow): 50-80
  Critical (Red):   0-50

Response Time:
  Fast (Green):    0-500ms
  Medium (Yellow): 500-1000ms
  Slow (Red):      >1000ms

Error Rate:
  Good (Green):    0-1%
  Warning (Yellow): 1-5%
  Critical (Red):   >5%
```

## 💡 Pro Tips

### Prometheus
- Use recording rules for expensive queries
- Set appropriate scrape intervals (15s is good default)
- Use federation for multiple Prometheus servers
- Enable remote write for long-term storage

### Grafana
- Use dashboard variables for flexibility
- Create separate dashboards for different audiences
- Set up notification channels early
- Export dashboards as JSON for backup

### Jaeger
- Adjust sampling rate based on traffic
- Use tags liberally for better filtering
- Keep traces for at least 7 days
- Correlate trace IDs with logs

### General
- Monitor the monitors (meta-monitoring)
- Document your alerts and runbooks
- Review dashboards regularly
- Train your team on the tools

## 🚨 Emergency Response

```bash
# 1. Check if app is responding
curl -I http://localhost:8080/health

# 2. Check error rate
curl -s http://localhost:9090/api/v1/query?query='rate(errors_total[5m])' | jq

# 3. Check recent traces in Jaeger
open http://localhost:16686

# 4. Check logs
docker logs charity-backend

# 5. Check resource usage
docker stats charity-backend
```

## 📖 Learn More

- Full Guide: `/docs/OBSERVABILITY_EXPLAINED.md`
- Tutorial: `/docs/OBSERVABILITY_TUTORIAL.md`
- Architecture: `/docs/architecture/observability-flow.mermaid`
- Examples: `/docs/examples/`

---

**Print this and keep it handy!** 📋

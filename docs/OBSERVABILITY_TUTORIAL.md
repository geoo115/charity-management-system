# Hands-On Tutorial: Using Prometheus, Grafana & Jaeger

This tutorial will walk you through actually using the observability tools in your charity management system.

## Prerequisites

```bash
# Make sure your services are running
cd /home/george/Documents/github/charity-management-system
docker-compose up -d

# Start your backend
cd backend
go run cmd/api/main.go
```

---

## Part 1: Exploring Prometheus

### Step 1: Access Prometheus UI

1. Open browser to: http://localhost:9090
2. You should see the Prometheus interface

### Step 2: View Available Metrics

1. Click on the "Graph" tab
2. Click the "Open metrics explorer" button (globe icon)
3. Scroll through the list of available metrics from your app:
   - `http_requests_total`
   - `http_request_duration_seconds`
   - `cache_operations_total`
   - `database_queries_total`
   - etc.

### Step 3: Run Your First Query

**Query 1: Total HTTP Requests**
```promql
http_requests_total
```
Click "Execute" and switch to "Table" view.

**What you see:**
```
http_requests_total{method="GET",route="/api/volunteers",status_code="200",user_role="admin"} 42
http_requests_total{method="POST",route="/api/volunteers",status_code="201",user_role="admin"} 5
```

**Query 2: Request Rate (per second)**
```promql
rate(http_requests_total[5m])
```
Click "Execute" and switch to "Graph" view. This shows requests/second over the last 5 minutes.

**Query 3: Requests by Endpoint**
```promql
sum(rate(http_requests_total[5m])) by (route)
```
This groups requests by endpoint (route).

### Step 4: Check Response Times

**Query: 95th Percentile Response Time**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

This tells you: "95% of requests complete faster than X seconds"

**Query: Average Response Time**
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### Step 5: Monitor Cache Performance

**Query: Cache Hit Rate**
```promql
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
```

Higher percentage = better cache performance

**Query: Cache Operations by Type**
```promql
sum(rate(cache_operations_total[5m])) by (operation, status)
```

### Step 6: Database Monitoring

**Query: Slow Database Queries**
```promql
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m]) > 0.1
```

This shows queries taking more than 100ms on average.

**Query: Database Connection Pool Usage**
```promql
database_connections{state="in_use"} / database_connections{state="open"} * 100
```

High percentage might indicate connection pool exhaustion.

---

## Part 2: Creating Grafana Dashboards

### Step 1: Access Grafana

1. Open browser to: http://localhost:3001
2. Login:
   - Username: `admin`
   - Password: `admin123`

### Step 2: Add Prometheus as Data Source

1. Click on ⚙️ (Configuration) → Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Configure:
   - URL: `http://prometheus:9090` (if in Docker) or `http://localhost:9090`
   - Access: Server (default)
5. Click "Save & Test"

You should see: "Data source is working"

### Step 3: Create Your First Dashboard

1. Click ➕ → Dashboard
2. Click "Add new panel"

**Panel 1: Request Rate**

1. In the query field, enter:
   ```promql
   sum(rate(http_requests_total[5m]))
   ```
2. Panel settings:
   - Title: "Total Request Rate"
   - Description: "Requests per second across all endpoints"
3. Visualization: Time series (default)
4. Y-axis label: "req/sec"
5. Click "Apply"

**Panel 2: Response Time Distribution**

1. Add another panel
2. Query:
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   ```
3. Add another query (click "+ Query"):
   ```promql
   histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
   ```
4. Settings:
   - Title: "Response Time (P95 & P50)"
   - Legend: "95th percentile" and "50th percentile"
5. Click "Apply"

**Panel 3: Cache Hit Rate Gauge**

1. Add another panel
2. Query:
   ```promql
   (rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
   ```
3. Change visualization to: **Stat**
4. Settings:
   - Title: "Cache Hit Rate"
   - Unit: Percent (0-100)
   - Thresholds:
     - Red: 0-50
     - Yellow: 50-80
     - Green: 80-100
5. Click "Apply"

**Panel 4: Top Endpoints**

1. Add another panel
2. Query:
   ```promql
   topk(10, sum(rate(http_requests_total[5m])) by (route))
   ```
3. Change visualization to: **Bar gauge**
4. Settings:
   - Title: "Top 10 Endpoints by Traffic"
   - Orientation: Horizontal
5. Click "Apply"

### Step 4: Save Your Dashboard

1. Click 💾 (Save dashboard) at the top
2. Name it: "Charity System Overview"
3. Click "Save"

### Step 5: Set Auto-Refresh

1. Click the 🕐 dropdown (top right)
2. Select "Last 15 minutes"
3. Set auto-refresh to "10s"

Now your dashboard updates every 10 seconds!

### Step 6: Create an Alert

1. Edit the "Response Time" panel
2. Click the "Alert" tab
3. Create alert rule:
   ```
   WHEN last() OF query(A, 5m, now) IS ABOVE 2
   ```
4. Configure notification:
   - Send to: Default channel
   - Message: "Response time is too high!"
5. Save

---

## Part 3: Tracing with Jaeger

### Step 1: Access Jaeger UI

1. Open browser to: http://localhost:16686
2. You should see the Jaeger search interface

### Step 2: Generate Some Traces

First, let's make some requests to your API:

```bash
# Create some volunteer activity
curl -X POST http://localhost:8080/api/volunteers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "skills": ["cooking", "teaching"]
  }'

# Get volunteers list
curl http://localhost:8080/api/volunteers

# Create a help request
curl -X POST http://localhost:8080/api/help-requests \
  -H "Content-Type: application/json" \
  -d '{
    "category": "food",
    "description": "Need food assistance"
  }'
```

### Step 3: Search for Traces

1. In Jaeger UI, select:
   - Service: `lewisham-hub-api`
   - Operation: `POST /api/volunteers` (or any operation)
   - Lookback: Last hour
2. Click "Find Traces"

### Step 4: Analyze a Trace

Click on any trace to see details:

```
Trace Timeline:
┌─────────────────────────────────────────────────────────┐
│ POST /api/volunteers                         [0-234ms]  │
│ ├─ Auth Middleware                           [0-12ms]   │
│ ├─ Validate Request                         [12-18ms]   │
│ ├─ Database: Check Existing                [18-78ms]   │ ← Click to see SQL
│ ├─ Database: Insert Volunteer             [78-210ms]   │ ← Slow!
│ ├─ Cache: Invalidate                      [210-225ms]   │
│ └─ Response Serialization                 [225-234ms]   │
└─────────────────────────────────────────────────────────┘
```

**What to look for:**
- Which span took the longest?
- Are there any errors?
- What was the SQL query?
- What user made the request?

### Step 5: Compare Traces

1. Find a fast trace (e.g., 50ms)
2. Find a slow trace (e.g., 500ms)
3. Click "Compare" to see them side-by-side

**Analysis:**
```
Fast Trace (50ms):
- Database query: 30ms
- Cache hit: 5ms

Slow Trace (500ms):
- Database query: 480ms  ← Problem here!
- Cache miss: 10ms
```

### Step 6: Filter by Tags

You can filter traces by specific attributes:

1. Add tag filter:
   - `user.role=admin`
   - `http.status_code=500`
   - `error=true`

This helps find specific types of requests.

---

## Part 4: Real-World Scenarios

### Scenario 1: Investigating Slow Requests

**Problem:** Users complain that volunteer signup is slow.

**Step 1: Check Metrics (Grafana)**
```promql
# Response time for volunteer endpoint
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{route="/api/volunteers"}[5m]))
```
**Result:** P95 is 2.5 seconds (too slow!)

**Step 2: Find Slow Traces (Jaeger)**
1. Service: `lewisham-hub-api`
2. Operation: `POST /api/volunteers`
3. Min Duration: 2000ms
4. Find Traces

**Step 3: Analyze**
Click on slowest trace:
```
POST /api/volunteers [0-2500ms]
├─ Auth [0-50ms] ✓
├─ Database: Check Email [50-2450ms] ❌ SLOW!
│  SQL: SELECT * FROM volunteers WHERE email = ?
│  Duration: 2400ms
└─ Insert [2450-2500ms] ✓
```

**Root Cause:** No index on `volunteers.email` column!

**Solution:**
```sql
CREATE INDEX idx_volunteers_email ON volunteers(email);
```

### Scenario 2: Cache Not Working

**Step 1: Check Cache Hit Rate (Grafana)**
```promql
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
```
**Result:** Only 15% (should be >70%)

**Step 2: Check Cache Stats**
```bash
curl http://localhost:8080/api/v1/cache/stats
```

**Result:**
```json
{
  "hits": 150,
  "misses": 850,
  "hit_rate": 15.0,
  "total_operations": 1000
}
```

**Step 3: Check Traces**
Look for cache spans in Jaeger - are they missing? Taking too long?

**Step 4: Check Metrics for Cache Operations**
```promql
rate(cache_operations_total[5m])
```

**Possible Issues:**
1. Cache TTL too short
2. Cache not being used for right data
3. Cache keys are incorrect
4. Redis connection issues

### Scenario 3: High Error Rate Alert

**Alert:** "Error rate above 5% for last 2 minutes"

**Step 1: Check Error Rate (Grafana)**
```promql
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100
```
**Result:** 8% error rate

**Step 2: Which Endpoints Are Failing?**
```promql
rate(http_requests_total{status_code=~"5.."}[5m])
```
**Result:** `/api/donations` is failing

**Step 3: Check Error Types (Prometheus)**
```promql
rate(errors_total{component="donations"}[5m])
```

**Step 4: Find Failed Traces (Jaeger)**
1. Service: `lewisham-hub-api`
2. Operation: `POST /api/donations`
3. Tags: `error=true`

**Step 5: Analyze Error Trace**
```
POST /api/donations [0-150ms] ❌
├─ Validate [0-10ms] ✓
├─ Database: Insert [10-140ms] ❌
│  Error: "duplicate key violation"
│  SQL: INSERT INTO donations...
└─ Error Response [140-150ms]
```

**Root Cause:** Application not handling duplicate donations!

---

## Part 5: Creating Useful Dashboards

### Dashboard 1: System Health

**Panels to include:**
1. Overall request rate
2. Error rate
3. P95/P99 response time
4. Active connections
5. Database connection pool usage
6. Cache hit rate
7. Memory usage
8. Goroutine count

### Dashboard 2: Business Metrics

**Panels to include:**
1. Help requests created (per hour)
2. Volunteer signups (per day)
3. Donations received (count and amount)
4. Queue lengths
5. Average wait times
6. WebSocket connections by role

### Dashboard 3: Performance Deep Dive

**Panels to include:**
1. Response time by endpoint
2. Database query duration by table
3. Cache operation latency
4. Request size distribution
5. Response size distribution
6. Slow query count

---

## Tips & Best Practices

### Prometheus Tips

1. **Use rate() for counters:**
   ```promql
   rate(http_requests_total[5m])  ✓
   http_requests_total              ✗
   ```

2. **Use histogram_quantile for percentiles:**
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   ```

3. **Aggregate with sum() and by():**
   ```promql
   sum(rate(http_requests_total[5m])) by (route, method)
   ```

### Grafana Tips

1. **Use variables for dynamic dashboards:**
   - Create variable: `$endpoint`
   - Use in query: `rate(http_requests_total{route="$endpoint"}[5m])`

2. **Set appropriate time ranges:**
   - Real-time monitoring: Last 15 minutes, 10s refresh
   - Trend analysis: Last 24 hours
   - Capacity planning: Last 30 days

3. **Use color thresholds:**
   - Green: Good
   - Yellow: Warning
   - Red: Critical

### Jaeger Tips

1. **Use sampling in production:**
   - Development: 100% (trace everything)
   - Production: 10% (trace 1 in 10 requests)

2. **Add meaningful tags:**
   ```go
   span.SetAttributes(
       attribute.String("user.id", userID),
       attribute.String("tenant.id", tenantID),
       attribute.String("feature.flag", "new_checkout"),
   )
   ```

3. **Look for patterns:**
   - Do all slow traces hit the same database table?
   - Do errors only occur for specific users?
   - Are there time-of-day patterns?

---

## Next Steps

1. **Set up alerts** for critical metrics
2. **Create team dashboards** for different roles
3. **Document common queries** for your team
4. **Set up notification channels** (Slack, email, PagerDuty)
5. **Review metrics weekly** to identify trends
6. **Correlate metrics and traces** when investigating issues

---

## Useful Resources

### Your Project
- Main docs: `/docs/backend/OBSERVABILITY_GUIDE.md`
- Architecture: `/docs/architecture/`
- This guide: `/docs/OBSERVABILITY_EXPLAINED.md`

### External Resources
- Prometheus Query Examples: https://prometheus.io/docs/prometheus/latest/querying/examples/
- Grafana Tutorials: https://grafana.com/tutorials/
- Jaeger Architecture: https://www.jaegertracing.io/docs/architecture/

### Commands Reference

```bash
# Check metrics
curl http://localhost:8080/metrics

# Check cache stats
curl http://localhost:8080/api/v1/cache/stats

# Health check
curl http://localhost:8080/health/detailed

# Generate load for testing
for i in {1..100}; do
  curl http://localhost:8080/api/volunteers
done
```

Happy monitoring! 🎉

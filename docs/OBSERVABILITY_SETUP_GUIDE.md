# Quick Start: Observability Stack Setup

This guide will help you verify that Prometheus, Grafana, and Jaeger are working with your backend.

## Prerequisites

Make sure you have:
- Docker and Docker Compose installed
- Go installed (for running the backend)
- Backend environment configured (.env file)

## Step-by-Step Setup

### 1. Start Infrastructure Services (Docker)

```bash
# From project root
cd /home/george/Documents/github/charity-management-system

# Start PostgreSQL, Redis, Prometheus, Grafana, and Jaeger
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# - postgres (port 5433)
# - redis (port 6380)
# - prometheus (port 9090) - if configured
# - grafana (port 3001) - if configured
# - jaeger (port 16686) - if configured
```

### 2. Start the Backend

```bash
# Open a new terminal
cd backend

# Make sure .env file exists and has correct DB settings
# DB_HOST=localhost
# DB_PORT=5433
# DB_USER=usr
# DB_PASSWORD=pwd
# DB_NAME=lewisham_hub

# Run the backend
go run cmd/api/main.go

# You should see:
# ✓ "Initializing Prometheus metrics service..."
# ✓ "Prometheus metrics service initialized"
# ✓ "Prometheus HTTP metrics middleware enabled"
# ✓ "Distributed tracing middleware enabled" (if Jaeger configured)
# ✓ "Starting server on port 8080"
```

### 3. Verify Observability Endpoints

Open a new terminal and test the endpoints:

```bash
# Test 1: Check backend is running
curl http://localhost:8080/health
# Expected: {"status":"healthy"}

# Test 2: Check Prometheus metrics endpoint
curl http://localhost:8080/metrics
# Expected: Long list of metrics in Prometheus format

# Test 3: Check cache statistics
curl http://localhost:8080/api/v1/cache/stats
# Expected: JSON with cache statistics

# Test 4: Check detailed health
curl http://localhost:8080/health/detailed
# Expected: JSON with component health status

# Test 5: Generate some traffic
for i in {1..10}; do curl -s http://localhost:8080/health > /dev/null; done
echo "Generated 10 requests"

# Test 6: Verify metrics are being collected
curl -s http://localhost:8080/metrics | grep http_requests_total | head -3
# Expected: You should see counters with values > 0
```

### 4. Access the Monitoring UIs

#### Prometheus (Metrics Database)
```bash
# Open in browser:
http://localhost:9090

# Try these queries in the Prometheus UI:
1. http_requests_total
2. rate(http_requests_total[5m])
3. histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### Grafana (Visualization)
```bash
# Open in browser:
http://localhost:3001

# Login credentials:
Username: admin
Password: admin123 (or admin)

# First time setup:
1. Add Prometheus as data source:
   - URL: http://prometheus:9090 (if in Docker) or http://localhost:9090
2. Create a new dashboard
3. Add a panel with query: rate(http_requests_total[5m])
```

#### Jaeger (Distributed Tracing)
```bash
# Open in browser:
http://localhost:16686

# To see traces:
1. Select service: "lewisham-hub-api"
2. Click "Find Traces"
3. Click on any trace to see details
```

## What You Should See

### In the Backend Logs:
```
Starting Lewisham Hub API server...
Environment variables loaded from .env
Connecting to database...
Database connection successful
Checking admin user...
Initializing Prometheus metrics service...
Prometheus metrics service initialized
Initializing cache service...
Cache service initialized successfully
Initializing distributed tracing...
Distributed tracing initialized successfully
Running in development mode
Prometheus HTTP metrics middleware enabled
Distributed tracing middleware enabled
Routes registered successfully
Starting server on port 8080
```

### In Prometheus Metrics (/metrics):
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200",user_role=""} 10

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.005"} 10

# HELP cache_operations_total Total number of cache operations
# TYPE cache_operations_total counter
cache_operations_total{operation="get",status="hit"} 5
cache_operations_total{operation="get",status="miss"} 2

# HELP database_queries_total Total number of database queries
# TYPE database_queries_total counter
database_queries_total{operation="SELECT",table="users",status="success"} 15
```

### In Jaeger UI:
- Service: `lewisham-hub-api`
- Operations: `GET /health`, `POST /api/volunteers`, etc.
- Traces showing request flow through middleware, handlers, database, cache

## Troubleshooting

### Backend not starting?
```bash
# Check if port 8080 is already in use
lsof -i :8080

# Check database connection
docker-compose ps postgres
psql -h localhost -p 5433 -U usr -d lewisham_hub

# Check environment variables
cat backend/.env
```

### No metrics showing?
```bash
# Verify metrics service is initialized
curl http://localhost:8080/metrics | head -20

# Make sure you've generated some traffic
for i in {1..20}; do curl -s http://localhost:8080/health > /dev/null; done

# Check backend logs for errors
# Look for "Prometheus metrics service initialized"
```

### Prometheus can't reach backend?
```bash
# If Prometheus is in Docker, it needs to use the host network
# Check docker-compose.yml for proper network configuration

# Test from Prometheus container
docker exec -it <prometheus-container> wget -O- http://host.docker.internal:8080/metrics
```

### Jaeger not showing traces?
```bash
# Check if tracing is enabled in logs
# Look for "Distributed tracing initialized successfully"

# Verify Jaeger endpoint (if using)
echo $JAEGER_ENDPOINT
# Should be something like: http://localhost:14268/api/traces

# Check if traces are being sampled
# In development, sampling should be 100%
```

### Grafana can't connect to Prometheus?
```bash
# In Grafana data source settings:
# If both in Docker: http://prometheus:9090
# If Grafana in Docker, Prometheus on host: http://host.docker.internal:9090
# If both on host: http://localhost:9090

# Test connection
curl http://localhost:9090/api/v1/query?query=up
```

## Environment Variables for Tracing

Add these to your `.env` file to enable Jaeger:

```bash
# OpenTelemetry/Jaeger Configuration
OTEL_TRACING_ENABLED=true
OTEL_SERVICE_NAME=lewisham-hub-api
OTEL_SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_SAMPLING_RATIO=1.0  # 1.0 = 100% in development

# In production, use lower sampling:
# OTEL_SAMPLING_RATIO=0.1  # 10% sampling
```

## Running the Full Stack

### Option 1: Everything in Docker
```bash
# Edit docker-compose.yml to include your backend service
docker-compose up -d
```

### Option 2: Hybrid (Infrastructure in Docker, Backend on host)
```bash
# Start infrastructure
docker-compose up -d postgres redis

# Start backend
cd backend
go run cmd/api/main.go

# Access monitoring (if in Docker)
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
# Jaeger: http://localhost:16686
```

## Quick Test Script

Run the automated test:
```bash
cd backend
./test-observability.sh
```

This will check:
- ✓ Backend is running
- ✓ Metrics endpoint is accessible
- ✓ All observability endpoints respond correctly
- ✓ Metrics contain expected data
- ✓ External services (Prometheus, Grafana, Jaeger) are accessible

## Next Steps

Once everything is running:

1. **Read the documentation**
   - `/docs/OBSERVABILITY_EXPLAINED.md` - Learn concepts
   - `/docs/OBSERVABILITY_TUTORIAL.md` - Hands-on exercises
   - `/docs/OBSERVABILITY_CHEATSHEET.md` - Quick reference

2. **Create your first dashboard**
   - Follow the tutorial in Part 2
   - Use example queries from the cheatsheet

3. **Set up alerts**
   - Use examples from `/docs/examples/prometheus-alerts.yml`
   - Configure notification channels in Grafana

4. **Explore traces**
   - Make some API requests
   - View them in Jaeger UI
   - Understand the request flow

## Verification Checklist

- [ ] Backend starts without errors
- [ ] Can access http://localhost:8080/metrics
- [ ] Metrics show data (values > 0)
- [ ] Can access http://localhost:8080/api/v1/cache/stats
- [ ] Prometheus UI accessible at http://localhost:9090
- [ ] Can query metrics in Prometheus
- [ ] Grafana UI accessible at http://localhost:3001
- [ ] Can add Prometheus as data source in Grafana
- [ ] Jaeger UI accessible at http://localhost:16686
- [ ] Traces appear in Jaeger after making requests

## Success!

If all checks pass, your observability stack is fully operational! 🎉

You now have:
- ✓ **Prometheus** collecting metrics every 15 seconds
- ✓ **Grafana** ready to visualize your data
- ✓ **Jaeger** tracking request traces
- ✓ **50+ metrics** being automatically collected
- ✓ Custom endpoints for cache stats and health checks

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review backend logs for error messages
3. Verify all services are running: `docker-compose ps`
4. Check the documentation in `/docs/`

Happy monitoring! 📊

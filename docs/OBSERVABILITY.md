# 📊 Observability - Complete Guide

> **Production-grade monitoring, metrics, and distributed tracing for the Charity Management System**

This is your comprehensive guide to understanding and using the observability stack implemented in this project. Whether you're debugging issues, optimizing performance, or monitoring production systems, this guide has you covered.

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Documentation Hub](#-documentation-hub)
- [Tech Stack](#-tech-stack)
- [Access Points](#-access-points)
- [Key Metrics](#-key-metrics)
- [Common Use Cases](#-common-use-cases)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### 1. Start the Observability Stack

```bash
# Start all monitoring services
docker-compose up -d prometheus grafana jaeger

# Or use the convenience script
./start-observability.sh
```

### 2. Verify Services

```bash
# Check all services are running
docker-compose ps

# Test backend metrics endpoint
curl http://localhost:8080/metrics

# Or use the test script
./test-observability.sh
```

### 3. Access Dashboards

- **Prometheus**: http://localhost:9090 - Metrics storage and queries
- **Grafana**: http://localhost:3001 - Visualization dashboards (admin/admin123)
- **Jaeger**: http://localhost:16686 - Distributed tracing UI

---

## 📚 Documentation Hub

We've created comprehensive documentation covering every aspect of observability:

### 🎓 Learning Resources

#### 1. [**OBSERVABILITY_EXPLAINED.md**](./OBSERVABILITY_EXPLAINED.md)
**Purpose**: Deep dive into observability concepts  
**Audience**: Developers new to observability  
**Contents**:
- What is observability?
- The Three Pillars (Metrics, Logs, Traces)
- Prometheus architecture and data model
- Grafana visualization concepts
- Jaeger distributed tracing
- Real-world use cases

**Start here if**: You want to understand the fundamentals

---

#### 2. [**OBSERVABILITY_TUTORIAL.md**](./OBSERVABILITY_TUTORIAL.md)
**Purpose**: Hands-on practical exercises  
**Audience**: Developers wanting to practice  
**Contents**:
- Step-by-step guided tutorials
- Writing PromQL queries
- Creating Grafana dashboards
- Analyzing traces in Jaeger
- Performance troubleshooting exercises
- Integration with application code

**Start here if**: You learn by doing

---

#### 3. [**OBSERVABILITY_CHEATSHEET.md**](./OBSERVABILITY_CHEATSHEET.md)
**Purpose**: Quick reference guide  
**Audience**: Practitioners needing quick answers  
**Contents**:
- Common PromQL queries
- Dashboard templates
- Alerting rules
- Command reference
- Common troubleshooting steps
- One-liners and snippets

**Start here if**: You need quick answers

---

### 🛠️ Setup & Configuration

#### 4. [**OBSERVABILITY_SETUP_GUIDE.md**](./OBSERVABILITY_SETUP_GUIDE.md)
**Purpose**: Installation and configuration  
**Audience**: DevOps/SRE setting up monitoring  
**Contents**:
- Docker Compose setup
- Prometheus configuration
- Grafana provisioning
- Jaeger integration
- Production deployment
- Security considerations
- Scaling strategies

**Start here if**: You're setting up observability infrastructure

---

#### 5. [**OBSERVABILITY_STATUS.md**](./OBSERVABILITY_STATUS.md)
**Purpose**: Current implementation status  
**Audience**: Project contributors and maintainers  
**Contents**:
- What's implemented
- Available metrics (50+)
- Dashboard inventory
- Integration status
- Known limitations
- Roadmap and future improvements

**Start here if**: You want to know what's currently available

---

### 🗂️ Reference Materials

#### 6. [**OBSERVABILITY_INDEX.md**](./OBSERVABILITY_INDEX.md)
**Purpose**: Complete index of all observability resources  
**Audience**: Everyone  
**Contents**:
- Document cross-references
- Metrics catalog
- Dashboard directory
- Alert definitions
- Related documentation links
- External resources

**Start here if**: You need to find something specific

---

#### 7. [**OBSERVABILITY_README.md**](./OBSERVABILITY_README.md)
**Purpose**: Quick overview and getting started  
**Audience**: First-time users  
**Contents**:
- Project overview
- Quick start guide
- Navigation to other docs
- FAQ
- Support resources

**Start here if**: It's your first time here

---

## 🛠️ Tech Stack

### Metrics Collection: Prometheus

- **Purpose**: Time-series metrics database
- **Port**: 9090
- **Data Source**: Backend `/metrics` endpoint
- **Scrape Interval**: 15 seconds
- **Retention**: 15 days (configurable)

**Configuration**: `monitoring/prometheus.yml`

### Visualization: Grafana

- **Purpose**: Metrics dashboards and alerts
- **Port**: 3001
- **Credentials**: admin / admin123
- **Data Source**: Prometheus (auto-configured)
- **Dashboards**: Pre-provisioned (optional)

**Configuration**: `monitoring/grafana/`

### Distributed Tracing: Jaeger

- **Purpose**: Request tracing across services
- **Port**: 16686 (UI), 14268 (collector)
- **Protocol**: OpenTelemetry
- **Sampling**: Configurable rate
- **Storage**: In-memory (development)

**Configuration**: Backend `.env` (OTEL_* variables)

---

## 🌐 Access Points

### Service URLs

```bash
# Backend API
http://localhost:8080

# Metrics Endpoint
http://localhost:8080/metrics

# Health Check
http://localhost:8080/health

# Prometheus
http://localhost:9090

# Grafana
http://localhost:3001

# Jaeger
http://localhost:16686
```

### Grafana Login

```
Username: admin
Password: admin123
```

(Change default password on first login in production)

---

## 📈 Key Metrics

### Application Metrics (50+ available)

#### HTTP Performance
```promql
# Request rate
rate(http_requests_total[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

#### Database
```promql
# Query duration
rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])

# Active connections
db_connections_active

# Slow queries
increase(db_slow_queries_total[5m])
```

#### Cache (Redis)
```promql
# Hit rate
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100

# Operation latency
rate(cache_operation_duration_seconds_sum[5m]) / rate(cache_operation_duration_seconds_count[5m])
```

#### Business Metrics
```promql
# Donations created
increase(donations_created_total[1h])

# Help requests processed
increase(help_requests_processed_total{status="completed"}[1h])

# Volunteer activities
increase(volunteer_activities_total[1h])
```

#### System Health
```promql
# Memory usage
go_memstats_alloc_bytes / 1024 / 1024

# Goroutines
go_goroutines

# CPU usage
rate(process_cpu_seconds_total[5m])
```

**Complete metrics catalog**: [OBSERVABILITY_INDEX.md](./OBSERVABILITY_INDEX.md)

---

## 🎯 Common Use Cases

### 1. Debug a Slow Endpoint

**Problem**: Users report slow response times

**Solution**:
1. Check response times in Prometheus:
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{path="/api/v1/donations"}[5m]))
   ```

2. Identify slow database queries:
   ```promql
   topk(5, rate(db_query_duration_seconds_sum[5m]) by (query))
   ```

3. View distributed trace in Jaeger:
   - Go to Jaeger UI
   - Search for service: `charity-backend`
   - Filter by operation: `/api/v1/donations`
   - Find slow traces (sort by duration)
   - Inspect timeline and span details

**Tutorial**: [OBSERVABILITY_TUTORIAL.md - Exercise 4](./OBSERVABILITY_TUTORIAL.md#exercise-4-performance-troubleshooting)

---

### 2. Monitor Cache Performance

**Problem**: Want to verify cache is working effectively

**Solution**:
1. Check cache hit rate:
   ```promql
   (rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
   ```

2. View cache operations:
   ```promql
   sum by (operation) (rate(cache_operations_total[5m]))
   ```

3. Check cache latency:
   ```promql
   histogram_quantile(0.95, rate(cache_operation_duration_seconds_bucket[5m]))
   ```

**Expected**: 70%+ hit rate, <1ms latency

**Cheatsheet**: [OBSERVABILITY_CHEATSHEET.md - Cache Queries](./OBSERVABILITY_CHEATSHEET.md#cache-metrics)

---

### 3. Analyze Traffic Patterns

**Problem**: Need to understand usage patterns

**Solution**:
1. Overall request rate:
   ```promql
   sum(rate(http_requests_total[5m]))
   ```

2. Requests by endpoint:
   ```promql
   sum by (path) (rate(http_requests_total[5m]))
   ```

3. Status code distribution:
   ```promql
   sum by (status) (rate(http_requests_total[5m]))
   ```

4. Peak traffic times (use Graph view in Prometheus)

**Dashboard**: Create in Grafana or see pre-built templates

---

### 4. Investigate Errors

**Problem**: Error rate increased

**Solution**:
1. Error rate by endpoint:
   ```promql
   sum by (path) (rate(http_requests_total{status=~"5.."}[5m]))
   ```

2. Database errors:
   ```promql
   rate(db_errors_total[5m])
   ```

3. Find error traces in Jaeger:
   - Search with tag: `error=true`
   - Inspect error messages and stack traces

**Tutorial**: [OBSERVABILITY_TUTORIAL.md - Exercise 5](./OBSERVABILITY_TUTORIAL.md#exercise-5-debugging-with-traces)

---

### 5. Performance Testing Validation

**Problem**: Running load tests, need to verify performance

**Solution**:
1. Monitor during test:
   ```bash
   # Terminal 1: Run load test
   cd backend/load-testing
   k6 run tests/baseline-test.js
   
   # Terminal 2: Watch metrics
   watch -n 1 'curl -s http://localhost:8080/metrics | grep http_request'
   ```

2. Check key metrics:
   - Response time P95: Should be < 200ms
   - Error rate: Should be < 0.1%
   - Throughput: Target 1000+ req/s

3. Analyze results in Grafana dashboard

**Load Testing Docs**: [docs/performance/FINAL_PERFORMANCE_RESULTS.md](./performance/FINAL_PERFORMANCE_RESULTS.md)

---

## 🔧 Troubleshooting

### Services Not Accessible

```bash
# Check if services are running
docker-compose ps

# Check logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs jaeger

# Restart services
docker-compose restart prometheus grafana jaeger

# Verify ports not in use
lsof -i :9090
lsof -i :3001
lsof -i :16686
```

### No Metrics in Prometheus

```bash
# Check backend is exposing metrics
curl http://localhost:8080/metrics

# Check Prometheus targets
# Go to: http://localhost:9090/targets
# Should see: backend endpoint (Status: UP)

# Check Prometheus config
cat monitoring/prometheus.yml

# Restart Prometheus
docker-compose restart prometheus
```

### Grafana Can't Connect to Prometheus

```bash
# Check Grafana data sources
# Go to: http://localhost:3001/datasources

# Should show: Prometheus (URL: http://prometheus:9090)

# Test connection in Grafana UI
# Settings > Data Sources > Prometheus > Save & Test

# Check provisioning config
cat monitoring/grafana/provisioning/datasources/prometheus.yml
```

### No Traces in Jaeger

```bash
# Check backend tracing is enabled
grep OTEL_TRACING_ENABLED backend/.env

# Should be: OTEL_TRACING_ENABLED=true

# Check Jaeger collector endpoint
grep JAEGER_ENDPOINT backend/.env

# Restart backend
docker-compose restart backend

# Generate some traffic
curl http://localhost:8080/api/v1/health
```

**Complete troubleshooting**: [OBSERVABILITY_SETUP_GUIDE.md - Troubleshooting](./OBSERVABILITY_SETUP_GUIDE.md#troubleshooting)

---

## 📚 Additional Resources

### Documentation

- **[Backend Observability Guide](./backend/OBSERVABILITY_GUIDE.md)** - Backend-specific implementation
- **[Performance Results](./performance/FINAL_PERFORMANCE_RESULTS.md)** - Load testing results
- **[Architecture Decisions](./adr/004-observability-stack-selection.md)** - Why we chose these tools

### External Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Go](https://opentelemetry.io/docs/instrumentation/go/)

### Scripts

```bash
# Start observability stack
./start-observability.sh

# Test all components
./test-observability.sh

# Backend load testing
cd backend/load-testing
./run-load-tests.sh baseline
```

---

## 🎯 Next Steps

### New to Observability?
1. Read: [OBSERVABILITY_EXPLAINED.md](./OBSERVABILITY_EXPLAINED.md)
2. Do: [OBSERVABILITY_TUTORIAL.md](./OBSERVABILITY_TUTORIAL.md)
3. Reference: [OBSERVABILITY_CHEATSHEET.md](./OBSERVABILITY_CHEATSHEET.md)

### Setting Up?
1. Follow: [OBSERVABILITY_SETUP_GUIDE.md](./OBSERVABILITY_SETUP_GUIDE.md)
2. Check: [OBSERVABILITY_STATUS.md](./OBSERVABILITY_STATUS.md)
3. Verify: `./test-observability.sh`

### Daily Use?
1. Bookmark: [OBSERVABILITY_CHEATSHEET.md](./OBSERVABILITY_CHEATSHEET.md)
2. Reference: [OBSERVABILITY_INDEX.md](./OBSERVABILITY_INDEX.md)
3. Troubleshoot: Check this guide's troubleshooting section

---

## 🤝 Contributing

Found an issue or want to improve observability?

1. Check [OBSERVABILITY_STATUS.md](./OBSERVABILITY_STATUS.md) for current state
2. See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines
3. Create an issue or pull request

---

## 📄 License

This documentation is part of the Charity Management System project, licensed under the MIT License.

---

<div align="center">

**📊 Happy Monitoring! 📊**

Built with ❤️ using Prometheus, Grafana, and Jaeger

[Report Issue](https://github.com/geoo115/charity-management-system/issues) · [Documentation Hub](./README.md) · [Main README](../README.md)

</div>

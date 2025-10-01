# 🚀 Quick Start Guide

> **Get the Charity Management System up and running in 5 minutes**

This guide will help you set up and run the complete system locally for development or testing.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Docker Desktop** installed ([Download](https://www.docker.com/products/docker-desktop/))
- ✅ **Git** installed ([Download](https://git-scm.com/downloads))
- ✅ **8GB RAM** minimum (16GB recommended)
- ✅ **5GB disk space** available

**Optional for local development:**
- Go 1.21+ ([Download](https://go.dev/dl/))
- Node.js 18+ ([Download](https://nodejs.org/))

---

## 🎯 Option 1: Docker Compose (Recommended)

**Perfect for**: Testing, demos, or quick evaluation

### Step 1: Clone the Repository

```bash
git clone https://github.com/geoo115/charity-management-system.git
cd charity-management-system
```

### Step 2: Start All Services

```bash
# Start everything (backend, frontend, database, Redis, monitoring)
docker-compose up -d

# View logs to confirm startup
docker-compose logs -f
```

**Wait for**: `Server is running on port 8080` message (~30 seconds)

### Step 3: Access the Application

Open your browser and navigate to:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | See demo accounts below |
| **Backend API** | http://localhost:8080 | - |
| **Swagger Docs** | http://localhost:8080/swagger/index.html | - |
| **Prometheus** | http://localhost:9090 | None |
| **Grafana** | http://localhost:3001 | admin / admin123 |
| **Jaeger** | http://localhost:16686 | None |

### Step 4: Login with Demo Account

Use any of these pre-seeded test accounts:

**Admin:**
```
Email: admin@lewishamhub.org
Password: Admin123!
```

**Donor:**
```
Email: donor@example.com
Password: Donor123!
```

**Volunteer:**
```
Email: volunteer@example.com
Password: Volunteer123!
```

**Visitor:**
```
Email: visitor@example.com
Password: Visitor123!
```

### Step 5: Verify Everything Works

```bash
# Check all services are running
docker-compose ps

# Should see: backend, frontend, postgres, redis, prometheus, grafana, jaeger (all "Up")

# Test backend health
curl http://localhost:8080/health

# Test metrics endpoint
curl http://localhost:8080/metrics
```

### 🎉 You're Ready!

- Browse the frontend at http://localhost:3000
- Explore the API at http://localhost:8080/swagger/index.html
- Monitor metrics at http://localhost:3001 (Grafana)

---

## 🛠️ Option 2: Local Development Setup

**Perfect for**: Contributing, development, or customization

### Step 1: Clone and Setup

```bash
git clone https://github.com/geoo115/charity-management-system.git
cd charity-management-system
```

### Step 2: Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, and monitoring services
docker-compose up -d postgres redis prometheus grafana jaeger

# Verify services are running
docker-compose ps
```

### Step 3: Setup Backend

```bash
cd backend

# Copy environment variables
cp .env.example .env

# Install Go dependencies
go mod download

# Run database migrations
go run cmd/api/main.go migrate

# Start the backend server
go run cmd/api/main.go
```

**Expected output**: `Server is running on port 8080`

### Step 4: Setup Frontend (New Terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output**: `Ready on http://localhost:3000`

### Step 5: Verify Setup

```bash
# Test backend
curl http://localhost:8080/health

# Test frontend (open in browser)
open http://localhost:3000

# Test Swagger docs
open http://localhost:8080/swagger/index.html
```

---

## 🧪 Testing the System

### Quick API Test

```bash
# Login as admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lewishamhub.org","password":"Admin123!"}'

# Copy the token from response, then:
export TOKEN="your_token_here"

# Get user list
curl http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### Run Automated Tests

```bash
# Backend tests
cd backend
make test

# Frontend tests
cd frontend
npm run test

# Load tests (requires k6)
cd backend/load-testing
./run-load-tests.sh baseline
```

---

## 🔧 Common Tasks

### Restart a Service

```bash
# Restart backend
docker-compose restart backend

# Restart frontend
docker-compose restart frontend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Stop All Services

```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Stop, remove containers, and delete data
docker-compose down -v
```

### Rebuild a Service

```bash
# Rebuild backend after code changes
docker-compose up -d --build backend

# Rebuild everything
docker-compose up -d --build
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm charity-management-system_postgres_data

# Start again (will re-seed)
docker-compose up -d
```

---

## 🎨 Frontend Walkthrough

### 1. Landing Page (http://localhost:3000)
- View system overview
- Access login/register
- Learn about services

### 2. Login Page
- Use demo accounts listed above
- Each role has different dashboard

### 3. Admin Dashboard
- View system statistics
- Manage users and requests
- Access analytics

### 4. Donor Dashboard
- View donation history
- Track impact
- Generate tax receipts

### 5. Volunteer Dashboard
- View available shifts
- Track hours
- Manage applications

### 6. Visitor Dashboard
- Submit help requests
- Check eligibility
- Track request status

---

## 📊 Backend API Walkthrough

### 1. Open Swagger UI
Navigate to: http://localhost:8080/swagger/index.html

### 2. Authenticate
1. Click "Authorize" button (top right)
2. Login to get a token:
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@lewishamhub.org","password":"Admin123!"}'
   ```
3. Copy the `token` from response
4. Enter `Bearer YOUR_TOKEN` in the authorization dialog
5. Click "Authorize"

### 3. Try Endpoints
- **GET /api/v1/admin/dashboard** - View admin dashboard data
- **GET /api/v1/admin/users** - List all users
- **GET /api/v1/admin/analytics** - System analytics
- **POST /api/v1/donations** - Create a donation
- **GET /api/v1/help-requests** - List help requests

### 4. Explore WebSocket
Open browser console and try:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/notifications');
ws.onmessage = (event) => console.log('Notification:', event.data);
```

---

## 📈 Monitoring Walkthrough

### 1. Prometheus (http://localhost:9090)

**Try these queries:**

```promql
# Request rate
rate(http_requests_total[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
(rate(cache_operations_total{status="hit"}[5m]) / rate(cache_operations_total{operation="get"}[5m])) * 100
```

### 2. Grafana (http://localhost:3001)

**Login:** admin / admin123

**Create a Dashboard:**
1. Click "+" → "Dashboard"
2. Click "Add visualization"
3. Select "Prometheus" as data source
4. Enter query: `rate(http_requests_total[5m])`
5. Click "Apply"

### 3. Jaeger (http://localhost:16686)

**View Traces:**
1. Select service: `charity-backend`
2. Click "Find Traces"
3. Click on a trace to see detailed timeline
4. Inspect individual spans

---

## 🐛 Troubleshooting

### Backend Won't Start

**Problem:** Database connection error

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection settings in backend/.env
cat backend/.env | grep DB_

# Should see:
# DB_HOST=localhost
# DB_PORT=5433
# DB_USER=usr
# DB_PASSWORD=test123
# DB_NAME=lewisham_hub
```

---

### Frontend Can't Reach Backend

**Problem:** API calls failing

**Solution:**
```bash
# Verify backend is running
curl http://localhost:8080/health

# Check frontend environment variables
cat frontend/.env.local | grep NEXT_PUBLIC_

# Should point to: http://localhost:8080
```

---

### Port Already in Use

**Problem:** `Error: Port 8080 already in use`

**Solution:**
```bash
# Find what's using the port
lsof -i :8080

# Kill the process (replace PID with actual number)
kill -9 PID

# Or use a different port in backend/.env
PORT=8081
```

---

### Services Not Starting

**Problem:** Docker containers failing

**Solution:**
```bash
# Check Docker is running
docker ps

# Check disk space
df -h

# Check Docker logs
docker-compose logs backend
docker-compose logs postgres

# Restart Docker Desktop
# Then try again:
docker-compose down
docker-compose up -d
```

---

### No Data in Frontend

**Problem:** Empty dashboards

**Solution:**
```bash
# Re-seed database
cd backend
make seed

# Or restart with fresh data
docker-compose down -v
docker-compose up -d
```

---

## 📚 Next Steps

### Learn More

✅ **Read the full README**: [README.md](../README.md)  
✅ **Explore API docs**: http://localhost:8080/swagger/index.html  
✅ **Learn observability**: [docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md)  
✅ **Read architecture docs**: [docs/backend/ARCHITECTURE.md](./docs/backend/ARCHITECTURE.md)

### Contribute

✅ **Read contribution guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)  
✅ **Check open issues**: [GitHub Issues](https://github.com/geoo115/charity-management-system/issues)  
✅ **Join discussions**: [GitHub Discussions](https://github.com/geoo115/charity-management-system/discussions)

### Deploy

✅ **Deploy to Render**: [render.yaml](../render.yaml)  
✅ **Deploy with Docker**: Use production docker-compose  
✅ **Deploy to Kubernetes**: [k8s/](../k8s/) (if available)

---

## 🆘 Getting Help

### Documentation
- **Main Docs**: [docs/README.md](./docs/README.md)
- **API Reference**: [docs/backend/API_DOCUMENTATION.md](./docs/backend/API_DOCUMENTATION.md)
- **Workflows**: [docs/workflows/](./docs/workflows/)

### Support
- **GitHub Issues**: [Report bugs or request features](https://github.com/geoo115/charity-management-system/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/geoo115/charity-management-system/discussions)

---

## ✅ Checklist

After completing this guide, you should be able to:

- [ ] Access frontend at http://localhost:3000
- [ ] Login with demo accounts
- [ ] Access backend API at http://localhost:8080
- [ ] View Swagger docs at http://localhost:8080/swagger/index.html
- [ ] Query Prometheus at http://localhost:9090
- [ ] View Grafana at http://localhost:3001
- [ ] See traces in Jaeger at http://localhost:16686
- [ ] Run backend tests: `cd backend && make test`
- [ ] Run frontend tests: `cd frontend && npm test`
- [ ] Make API requests with curl or Swagger UI
- [ ] View logs: `docker-compose logs -f`
- [ ] Stop services: `docker-compose down`

---

<div align="center">

**🎉 Congratulations! You're all set! 🎉**

**Ready to explore the system and make it your own**

[View Full Documentation](./docs/README.md) · [Report Issue](https://github.com/geoo115/charity-management-system/issues) · [Contribute](../CONTRIBUTING.md)

</div>

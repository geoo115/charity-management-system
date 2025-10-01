#!/bin/bash

# Startup script for the complete observability stack

echo "🚀 Starting Charity Management System with Observability"
echo "=========================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Start infrastructure services
echo -e "${BLUE}Step 1: Starting infrastructure services (PostgreSQL, Redis, Prometheus, Grafana, Jaeger)...${NC}"
docker-compose up -d postgres redis prometheus grafana jaeger

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check if services are running
echo ""
echo -e "${BLUE}Checking service health...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✓ Infrastructure services started!${NC}"
echo ""

# Step 2: Show URLs
echo "=========================================================="
echo -e "${GREEN}🎉 All Services Started Successfully!${NC}"
echo "=========================================================="
echo ""
echo "Access your services at:"
echo ""
echo "  📊 Prometheus (Metrics):"
echo "     http://localhost:9090"
echo ""
echo "  📈 Grafana (Dashboards):"
echo "     http://localhost:3001"
echo "     Username: admin"
echo "     Password: admin123"
echo ""
echo "  🔍 Jaeger (Tracing):"
echo "     http://localhost:16686"
echo ""
echo "  💾 PostgreSQL:"
echo "     Host: localhost:5433"
echo "     Database: lewisham_hub"
echo ""
echo "  ⚡ Redis:"
echo "     Host: localhost:6380"
echo ""
echo "=========================================================="
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  1. Start your backend:"
echo "     cd backend"
echo "     go run cmd/api/main.go"
echo ""
echo "  2. Backend will be available at:"
echo "     http://localhost:8080"
echo ""
echo "  3. View metrics at:"
echo "     http://localhost:8080/metrics"
echo ""
echo "  4. Make some requests to generate data:"
echo "     curl http://localhost:8080/health"
echo ""
echo "  5. View metrics in Prometheus:"
echo "     Query: http_requests_total"
echo ""
echo "  6. Create dashboards in Grafana"
echo ""
echo "  7. View traces in Jaeger"
echo ""
echo "=========================================================="
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo "  docker-compose down"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "  docker-compose logs -f prometheus"
echo "  docker-compose logs -f grafana"
echo "  docker-compose logs -f jaeger"
echo ""

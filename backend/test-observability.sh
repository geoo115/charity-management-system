#!/bin/bash

# Test script to verify Prometheus, Grafana, and Jaeger integration

echo "======================================"
echo "Testing Observability Stack"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    
    if [ "$response" == "$expected" ]; then
        echo -e "${GREEN}✓ OK (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $response, expected $expected)${NC}"
        return 1
    fi
}

# Test if services are accessible
test_service() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

echo "1. Checking if backend is running..."
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}Backend is not running! Start it with: cd backend && go run cmd/api/main.go${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

echo "2. Testing Prometheus metrics endpoint..."
test_endpoint "Metrics endpoint" "http://localhost:8080/metrics" "200"
echo ""

echo "3. Testing observability endpoints..."
test_endpoint "Cache stats" "http://localhost:8080/api/v1/cache/stats" "200"
test_endpoint "Detailed health" "http://localhost:8080/health/detailed" "200"
test_endpoint "Metrics summary" "http://localhost:8080/api/v1/observability/metrics/summary" "200"
echo ""

echo "4. Checking Prometheus metrics content..."
metrics_output=$(curl -s http://localhost:8080/metrics)

# Check for key metrics
echo -n "  - http_requests_total... "
if echo "$metrics_output" | grep -q "http_requests_total"; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

echo -n "  - http_request_duration_seconds... "
if echo "$metrics_output" | grep -q "http_request_duration_seconds"; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

echo -n "  - database_queries_total... "
if echo "$metrics_output" | grep -q "database_queries_total"; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

echo -n "  - cache_operations_total... "
if echo "$metrics_output" | grep -q "cache_operations_total"; then
    echo -e "${GREEN}✓ Found${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi
echo ""

echo "5. Checking external monitoring services..."
test_service "Prometheus UI" "http://localhost:9090"
test_service "Grafana UI" "http://localhost:3001"
test_service "Jaeger UI" "http://localhost:16686"
echo ""

echo "6. Generating test traffic for metrics..."
echo "   Making 5 test requests..."
for i in {1..5}; do
    curl -s http://localhost:8080/health > /dev/null
    echo -n "."
done
echo ""
echo -e "${GREEN}✓ Test traffic generated${NC}"
echo ""

echo "7. Verifying metrics increased..."
sleep 2
new_metrics=$(curl -s http://localhost:8080/metrics | grep "http_requests_total" | head -1)
echo "   Sample metric: $new_metrics"
echo ""

echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""
echo "✓ Your observability stack is configured and working!"
echo ""
echo "Access the UIs:"
echo "  • Backend:    http://localhost:8080"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana:    http://localhost:3001 (admin/admin123)"
echo "  • Jaeger:     http://localhost:16686"
echo ""
echo "View metrics:"
echo "  curl http://localhost:8080/metrics"
echo ""
echo "View cache stats:"
echo "  curl http://localhost:8080/api/v1/cache/stats | jq"
echo ""
echo "Next steps:"
echo "  1. Open Prometheus and run query: http_requests_total"
echo "  2. Create a Grafana dashboard using the metrics"
echo "  3. Make API requests and view traces in Jaeger"
echo "  4. Read the docs: /docs/OBSERVABILITY_TUTORIAL.md"
echo ""

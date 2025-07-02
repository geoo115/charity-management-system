# Makefile for Lewisham Charity Backend

# Variables
BINARY_NAME=lewisham-hub-api
MAIN_PATH=./cmd/api
BUILD_DIR=./bin
GO_FILES=$(shell find . -name "*.go" -type f -not -path "./vendor/*")

# Default target
.PHONY: all
all: clean build

# Build the application
.PHONY: build
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the application
.PHONY: run
run:
	@echo "Starting $(BINARY_NAME)..."
	@go run $(MAIN_PATH)/main.go

# Run with database seeding
.PHONY: run-seed
run-seed:
	@echo "Starting $(BINARY_NAME) with database seeding..."
	@SEED_DATABASE=true go run $(MAIN_PATH)/main.go

# Run tests
.PHONY: test
test:
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
.PHONY: test-coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage.html
	@go clean

# Format code
.PHONY: fmt
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Lint code
.PHONY: lint
lint:
	@echo "Linting code..."
	@golangci-lint run

# Tidy dependencies
.PHONY: tidy
tidy:
	@echo "Tidying dependencies..."
	@go mod tidy

# Download dependencies
.PHONY: deps
deps:
	@echo "Downloading dependencies..."
	@go mod download

# Generate swagger documentation
.PHONY: swagger
swagger:
	@echo "Generating swagger documentation..."
	@swag init -g $(MAIN_PATH)/main.go -o ./docs

# Database migrations (if you have migrate tool)
.PHONY: migrate-up
migrate-up:
	@echo "Running database migrations..."
	@migrate -path ./migrations -database "$(DB_URL)" up

.PHONY: migrate-down
migrate-down:
	@echo "Rolling back database migrations..."
	@migrate -path ./migrations -database "$(DB_URL)" down

# Development setup
.PHONY: dev-setup
dev-setup: deps tidy
	@echo "Setting up development environment..."
	@go install github.com/swaggo/swag/cmd/swag@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Docker build
.PHONY: docker-build
docker-build:
	@echo "Building Docker image..."
	@docker build -t $(BINARY_NAME) .

# Docker run
.PHONY: docker-run
docker-run:
	@echo "Running Docker container..."
	@docker run -p 8080:8080 $(BINARY_NAME)

# Hot reload for development (requires air)
.PHONY: dev
dev:
	@echo "Starting development server with hot reload..."
	@air

# Security scan
.PHONY: security
security:
	@echo "Running security scan..."
	@gosec ./...

# Docker services management
.PHONY: services-up
services-up:
	@echo "Starting PostgreSQL and Redis services..."
	@docker-compose up -d

.PHONY: services-down
services-down:
	@echo "Stopping services..."
	@docker-compose down

.PHONY: services-logs
services-logs:
	@echo "Showing service logs..."
	@docker-compose logs -f

.PHONY: services-status
services-status:
	@echo "Checking service status..."
	@docker-compose ps

.PHONY: services-restart
services-restart:
	@echo "Restarting services..."
	@docker-compose restart

.PHONY: services-reset
services-reset:
	@echo "Resetting services (removing volumes)..."
	@docker-compose down -v
	@docker-compose up -d

.PHONY: services-tools
services-tools:
	@echo "Starting services with management tools..."
	@docker-compose --profile tools up -d

# Complete development setup
.PHONY: dev-start
dev-start: services-up
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Starting application..."
	@go run $(MAIN_PATH)/main.go

# Observability and Monitoring
.PHONY: monitoring-up
monitoring-up:
	@echo "Starting monitoring infrastructure..."
	@docker-compose -f ../docker-compose.monitoring.yml up -d
	@echo "Monitoring services started:"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3001 (admin/admin123)"
	@echo "  - Jaeger: http://localhost:16686"
	@echo "  - AlertManager: http://localhost:9093"

.PHONY: monitoring-down
monitoring-down:
	@echo "Stopping monitoring infrastructure..."
	@docker-compose -f ../docker-compose.monitoring.yml down

.PHONY: monitoring-logs
monitoring-logs:
	@echo "Showing monitoring logs..."
	@docker-compose -f ../docker-compose.monitoring.yml logs -f

.PHONY: monitoring-restart
monitoring-restart: monitoring-down monitoring-up

# Load Testing
.PHONY: load-test
load-test:
	@echo "Running comprehensive load tests..."
	@./load-testing/run-load-tests.sh all

.PHONY: load-test-baseline
load-test-baseline:
	@echo "Running baseline load test..."
	@./load-testing/run-load-tests.sh baseline

.PHONY: load-test-stress
load-test-stress:
	@echo "Running stress test..."
	@./load-testing/run-load-tests.sh stress

.PHONY: load-test-spike
load-test-spike:
	@echo "Running spike test..."
	@./load-testing/run-load-tests.sh spike

.PHONY: load-test-setup
load-test-setup:
	@echo "Setting up load testing environment..."
	@chmod +x load-testing/run-load-tests.sh
	@echo "Load testing setup complete. Run 'make load-test' to start testing."

# Metrics and Health
.PHONY: metrics
metrics:
	@echo "Fetching application metrics..."
	@curl -s http://localhost:8080/metrics | head -20
	@echo "... (truncated, full metrics available at http://localhost:8080/metrics)"

.PHONY: health
health:
	@echo "Checking application health..."
	@curl -s http://localhost:8080/health | jq '.' || curl -s http://localhost:8080/health

# Cache Operations
.PHONY: cache-stats
cache-stats:
	@echo "Checking cache statistics..."
	@curl -s http://localhost:8080/api/v1/cache/stats | jq '.' || echo "Cache stats endpoint not available"

.PHONY: cache-flush
cache-flush:
	@echo "Flushing cache..."
	@docker exec ldh2_redis redis-cli FLUSHALL
	@echo "Cache flushed successfully"

# Database Operations with Metrics
.PHONY: db-stats
db-stats:
	@echo "Database connection statistics..."
	@docker exec ldh2_postgres psql -U usr -d lewisham_hub -c "SELECT * FROM pg_stat_activity WHERE datname = 'lewisham_hub';" 2>/dev/null || echo "Database not available"

.PHONY: db-size
db-size:
	@echo "Database size information..."
	@docker exec ldh2_postgres psql -U usr -d lewisham_hub -c "SELECT pg_size_pretty(pg_database_size('lewisham_hub')) as database_size;" 2>/dev/null || echo "Database not available"

# Performance Profiling
.PHONY: profile-cpu
profile-cpu:
	@echo "Starting CPU profiling (30 seconds)..."
	@go tool pprof -http=:6061 http://localhost:8080/debug/pprof/profile?seconds=30 &
	@echo "CPU profiler available at http://localhost:6061"

.PHONY: profile-memory
profile-memory:
	@echo "Starting memory profiling..."
	@go tool pprof -http=:6062 http://localhost:8080/debug/pprof/heap &
	@echo "Memory profiler available at http://localhost:6062"

# Full observability setup
.PHONY: observability-setup
observability-setup: monitoring-up load-test-setup
	@echo "Full observability stack setup complete!"
	@echo ""
	@echo "Available endpoints:"
	@echo "  Application:     http://localhost:8080"
	@echo "  Metrics:         http://localhost:8080/metrics"
	@echo "  Health:          http://localhost:8080/health"
	@echo "  Prometheus:      http://localhost:9090"
	@echo "  Grafana:         http://localhost:3001"
	@echo "  Jaeger:          http://localhost:16686"
	@echo "  AlertManager:    http://localhost:9093"
	@echo ""
	@echo "Load testing:"
	@echo "  make load-test           # Run all tests"
	@echo "  make load-test-baseline  # Run baseline test"
	@echo "  make load-test-stress    # Run stress test"

# Enhanced help with new targets
.PHONY: help
help:
	@echo "Available targets:"
	@echo ""
	@echo "Build & Run:"
	@echo "  build           - Build the application"
	@echo "  run             - Run the application"
	@echo "  run-seed        - Run with database seeding"
	@echo "  dev-start       - Start full development environment"
	@echo ""
	@echo "Testing:"
	@echo "  test            - Run tests"
	@echo "  test-coverage   - Run tests with coverage report"
	@echo "  load-test       - Run comprehensive load tests"
	@echo "  load-test-baseline - Run baseline load test"
	@echo "  load-test-stress   - Run stress test"
	@echo "  load-test-spike    - Run spike test"
	@echo ""
	@echo "Code Quality:"
	@echo "  clean           - Clean build artifacts"
	@echo "  fmt             - Format code"
	@echo "  lint            - Lint code"
	@echo "  security        - Run security scan"
	@echo ""
	@echo "Dependencies:"
	@echo "  tidy            - Tidy dependencies"
	@echo "  deps            - Download dependencies"
	@echo "  dev-setup       - Setup development environment"
	@echo ""
	@echo "Documentation:"
	@echo "  swagger         - Generate swagger documentation"
	@echo ""
	@echo "Docker Services:"
	@echo "  services-up     - Start PostgreSQL and Redis"
	@echo "  services-down   - Stop services"
	@echo "  services-logs   - Show service logs"
	@echo "  services-status - Check service status"
	@echo "  services-restart- Restart services"
	@echo "  services-reset  - Reset services (remove data)"
	@echo "  services-tools  - Start with management tools"
	@echo ""
	@echo "Monitoring & Observability:"
	@echo "  monitoring-up   - Start monitoring stack"
	@echo "  monitoring-down - Stop monitoring stack"
	@echo "  monitoring-logs - Show monitoring logs"
	@echo "  observability-setup - Setup complete observability"
	@echo ""
	@echo "Metrics & Health:"
	@echo "  health          - Check application health"
	@echo "  metrics         - Show application metrics"
	@echo "  cache-stats     - Show cache statistics"
	@echo "  cache-flush     - Flush Redis cache"
	@echo "  db-stats        - Show database statistics"
	@echo "  db-size         - Show database size"
	@echo ""
	@echo "Performance:"
	@echo "  profile-cpu     - Start CPU profiling"
	@echo "  profile-memory  - Start memory profiling"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build    - Build Docker image"
	@echo "  docker-run      - Run Docker container"
	@echo ""
	@echo "Development:"
	@echo "  dev             - Start development server with hot reload" 
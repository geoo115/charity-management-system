# 🎯 Code Quality & Testing Guide

> **Comprehensive documentation of code quality standards, testing practices, and performance benchmarks**

This document outlines the code quality metrics, testing strategies, and performance benchmarks for the Charity Management System.

---

## 📋 Table of Contents

- [Code Quality Standards](#-code-quality-standards)
- [Testing Strategy](#-testing-strategy)
- [Test Coverage](#-test-coverage)
- [Linting & Formatting](#-linting--formatting)
- [Performance Benchmarks](#-performance-benchmarks)
- [Continuous Integration](#-continuous-integration)
- [Best Practices](#-best-practices)

---

## ✅ Code Quality Standards

### Backend (Go)

#### Code Style
- **Standard**: [Effective Go](https://golang.org/doc/effective_go.html)
- **Formatter**: `gofmt` (built-in)
- **Linter**: `golangci-lint`
- **Minimum Coverage**: 70%

#### Naming Conventions
```go
// ✅ Good: Clear, descriptive names
type DonationService struct {
    repo   DonationRepository
    cache  CacheService
    logger *log.Logger
}

func (s *DonationService) CreateDonation(ctx context.Context, req *CreateDonationRequest) (*Donation, error) {
    // Implementation
}

// ❌ Bad: Unclear, abbreviated names
type DS struct {
    r  DR
    c  CS
    l  *log.Logger
}

func (s *DS) CD(c context.Context, r *CDR) (*D, error) {
    // Implementation
}
```

#### Error Handling
```go
// ✅ Good: Wrapped errors with context
if err != nil {
    return nil, fmt.Errorf("failed to create donation for user %d: %w", userID, err)
}

// ❌ Bad: Generic errors, no context
if err != nil {
    return nil, errors.New("error occurred")
}
```

#### Package Organization
```
backend/
├── cmd/
│   └── api/              # Application entry point
├── internal/
│   ├── auth/            # Authentication logic
│   ├── config/          # Configuration
│   ├── handlers_new/    # HTTP handlers (thin layer)
│   ├── middleware/      # HTTP middleware
│   ├── models/          # Data models
│   ├── services/        # Business logic (fat layer)
│   ├── repository/      # Data access
│   └── utils/           # Shared utilities
└── docs/                # Swagger documentation
```

### Frontend (TypeScript/React)

#### Code Style
- **Standard**: ESLint + Prettier
- **Type Safety**: TypeScript strict mode
- **Component Style**: Functional components with hooks
- **Minimum Coverage**: 60%

#### Component Structure
```typescript
// ✅ Good: Type-safe, clear structure
interface DonationCardProps {
  donation: Donation;
  onUpdate?: (donation: Donation) => void;
  isLoading?: boolean;
}

export function DonationCard({ 
  donation, 
  onUpdate, 
  isLoading = false 
}: DonationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Component logic
  
  return (
    <div className="donation-card">
      {/* JSX */}
    </div>
  );
}

// ❌ Bad: No types, unclear props
export function Card({ data, func, loading }) {
  const [x, setX] = useState(false);
  return <div>{/* ... */}</div>;
}
```

---

## 🧪 Testing Strategy

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  (5%)  - Critical user flows
        └─────────────┘
       ┌───────────────┐
       │Integration Tests│ (25%) - API endpoints, DB
       └───────────────┘
    ┌─────────────────────┐
    │     Unit Tests      │ (70%) - Functions, components
    └─────────────────────┘
```

### Backend Testing

#### Unit Tests

**Location**: `*_test.go` files alongside source

**Example**: `internal/services/donation_service_test.go`

```go
func TestDonationService_CreateDonation(t *testing.T) {
    tests := []struct {
        name    string
        input   *CreateDonationRequest
        want    *Donation
        wantErr bool
    }{
        {
            name: "valid monetary donation",
            input: &CreateDonationRequest{
                Amount:    100.00,
                DonorID:   1,
                Type:      "monetary",
            },
            want: &Donation{
                ID:        1,
                Amount:    100.00,
                DonorID:   1,
                Type:      "monetary",
                Status:    "completed",
            },
            wantErr: false,
        },
        {
            name: "invalid amount",
            input: &CreateDonationRequest{
                Amount: -50.00,
            },
            want:    nil,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := NewDonationService(mockRepo, mockCache)
            got, err := service.CreateDonation(context.Background(), tt.input)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateDonation() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("CreateDonation() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

#### Integration Tests

**Location**: `*_integration_test.go`

**Example**: Test with real database

```go
//go:build integration
// +build integration

func TestDonationAPI_Integration(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer db.Close()
    
    // Create test server
    router := setupTestRouter(db)
    
    // Test cases
    t.Run("Create donation", func(t *testing.T) {
        body := `{"amount": 100, "type": "monetary", "donor_id": 1}`
        req := httptest.NewRequest("POST", "/api/v1/donations", strings.NewReader(body))
        req.Header.Set("Authorization", "Bearer "+validToken)
        req.Header.Set("Content-Type", "application/json")
        
        w := httptest.NewRecorder()
        router.ServeHTTP(w, req)
        
        assert.Equal(t, http.StatusCreated, w.Code)
    })
}
```

#### Running Tests

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test
go test -v ./internal/services -run TestDonationService

# Run integration tests
go test -v -tags=integration ./...

# Benchmark tests
go test -bench=. -benchmem ./...
```

### Frontend Testing

#### Component Tests

**Location**: `__tests__/` or `*.test.tsx` files

**Example**: `components/DonationCard.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DonationCard } from './DonationCard';

describe('DonationCard', () => {
  const mockDonation = {
    id: 1,
    amount: 100,
    donorName: 'John Doe',
    type: 'monetary',
    date: '2024-01-15',
  };

  it('renders donation details correctly', () => {
    render(<DonationCard donation={mockDonation} />);
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Monetary')).toBeInTheDocument();
  });

  it('calls onUpdate when edit button clicked', async () => {
    const onUpdate = jest.fn();
    render(<DonationCard donation={mockDonation} onUpdate={onUpdate} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    // Assert edit mode or callback
    expect(onUpdate).toHaveBeenCalledWith(mockDonation);
  });

  it('shows loading state', () => {
    render(<DonationCard donation={mockDonation} isLoading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

#### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDonations } from './useDonations';

describe('useDonations', () => {
  it('fetches donations successfully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDonations());
    
    expect(result.current.isLoading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toHaveLength(5);
  });

  it('handles errors gracefully', async () => {
    // Mock API error
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'));
    
    const { result, waitForNextUpdate } = renderHook(() => useDonations());
    
    await waitForNextUpdate();
    
    expect(result.current.error).toBeTruthy();
  });
});
```

#### Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm run test DonationCard.test.tsx

# Run tests matching pattern
npm run test -- --testNamePattern="renders"
```

---

## 📊 Test Coverage

### Current Coverage Metrics

#### Backend (Go)

```bash
# Generate coverage report
cd backend
make test-coverage
```

**Expected Coverage:**
- **Overall**: 70%+
- **Services**: 80%+
- **Handlers**: 75%+
- **Utils**: 85%+

**Coverage Report**: `backend/coverage.html`

#### Frontend (TypeScript/React)

```bash
# Generate coverage report
cd frontend
npm run test:coverage
```

**Expected Coverage:**
- **Overall**: 60%+
- **Components**: 65%+
- **Hooks**: 70%+
- **Utils**: 80%+

**Coverage Report**: `frontend/coverage/index.html`

### Viewing Coverage Reports

```bash
# Backend
cd backend
make test-coverage
open coverage.html  # macOS
xdg-open coverage.html  # Linux

# Frontend
cd frontend
npm run test:coverage
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

---

## 🎨 Linting & Formatting

### Backend (Go)

#### Linter: golangci-lint

**Configuration**: `.golangci.yml`

```yaml
linters:
  enable:
    - gofmt
    - govet
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - structcheck
    - varcheck
    - ineffassign
    - deadcode
    - typecheck
```

**Commands:**

```bash
# Install linter
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run linter
cd backend
make lint

# Or directly
golangci-lint run

# Auto-fix issues
golangci-lint run --fix

# Format code
make fmt
go fmt ./...
```

#### Common Issues & Fixes

```go
// Issue: Unused variable
func example() {
    x := 5  // declared but not used
}
// Fix: Remove or use it
func example() {
    x := 5
    fmt.Println(x)
}

// Issue: Error not handled
result, _ := doSomething()
// Fix: Handle the error
result, err := doSomething()
if err != nil {
    return err
}

// Issue: Inefficient string concatenation
str := ""
for _, s := range items {
    str += s  // inefficient
}
// Fix: Use strings.Builder
var builder strings.Builder
for _, s := range items {
    builder.WriteString(s)
}
str := builder.String()
```

### Frontend (TypeScript/React)

#### Linter: ESLint

**Configuration**: `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

#### Formatter: Prettier

**Configuration**: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Commands:**

```bash
# Run linter
cd frontend
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

---

## ⚡ Performance Benchmarks

### Load Testing Results

**Tool**: k6 Load Testing

**Test Scenarios**: `backend/load-testing/tests/`

#### Baseline Test (2-10 concurrent users)

```bash
cd backend/load-testing
./run-load-tests.sh baseline
```

**Results:**
- **Throughput**: 500-800 req/sec
- **Avg Response Time**: 45ms
- **P95 Response Time**: 180ms
- **P99 Response Time**: 350ms
- **Error Rate**: < 0.01%

#### Stress Test (100 concurrent users)

```bash
./run-load-tests.sh stress
```

**Results:**
- **Throughput**: 1000-1200 req/sec
- **Avg Response Time**: 85ms
- **P95 Response Time**: 450ms
- **P99 Response Time**: 800ms
- **Error Rate**: < 0.1%
- **Cache Hit Rate**: 75%

#### Spike Test (sudden traffic increase)

```bash
./run-load-tests.sh spike
```

**Results:**
- **Recovery Time**: < 30 seconds
- **Max Response Time**: 2s (during spike)
- **System Stability**: Maintained
- **No Crashes**: ✅

**Detailed Results**: [docs/performance/FINAL_PERFORMANCE_RESULTS.md](../performance/FINAL_PERFORMANCE_RESULTS.md)

### Database Performance

**Query Performance:**
- **Simple SELECT**: < 5ms
- **JOIN queries**: < 20ms
- **Complex aggregations**: < 50ms
- **Full-text search**: < 100ms

**Optimization Techniques:**
- Indexed columns (user_id, status, created_at, etc.)
- Connection pooling (max 25 connections)
- Query result caching (Redis)
- Prepared statements

### Cache Performance

**Redis Metrics:**
- **Hit Rate**: 70-80%
- **Miss Rate**: 20-30%
- **Avg Latency**: < 1ms
- **P95 Latency**: < 2ms

**Cached Data:**
- User sessions (TTL: 24h)
- API responses (TTL: 5m-1h)
- Database query results (TTL: 10m)
- Static content (TTL: 24h)

---

## 🔄 Continuous Integration

### GitHub Actions

**Workflows**: `.github/workflows/`

#### Backend CI (`backend-ci.yml`)

```yaml
name: Backend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Install dependencies
        run: cd backend && go mod download
      
      - name: Run tests
        run: cd backend && make test-coverage
      
      - name: Run linter
        run: cd backend && make lint
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.out
```

#### Frontend CI (`frontend-ci.yml`)

```yaml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd frontend && npm ci
      
      - name: Run tests
        run: cd frontend && npm run test:coverage
      
      - name: Run linter
        run: cd frontend && npm run lint
      
      - name: Type check
        run: cd frontend && npm run type-check
```

### Quality Gates

**Minimum Requirements for PR Merge:**
- ✅ All tests passing
- ✅ No linting errors
- ✅ Code coverage maintained or improved
- ✅ No new security vulnerabilities
- ✅ Successful build
- ✅ At least one approval

---

## 📚 Best Practices

### Code Review Checklist

- [ ] **Tests**: New code has adequate test coverage
- [ ] **Documentation**: Updated for new features/changes
- [ ] **Error Handling**: All errors properly handled
- [ ] **Performance**: No obvious performance issues
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Naming**: Variables/functions clearly named
- [ ] **Comments**: Complex logic explained
- [ ] **DRY**: No unnecessary code duplication
- [ ] **SOLID**: Follows SOLID principles
- [ ] **API**: Backward compatible (if applicable)

### Testing Best Practices

**✅ Do:**
- Write tests before fixing bugs (TDD)
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests independent
- Mock external dependencies
- Test one thing per test

**❌ Don't:**
- Skip writing tests
- Test implementation details
- Create interdependent tests
- Hardcode test data
- Ignore flaky tests
- Write overly complex tests

### Performance Best Practices

**✅ Do:**
- Use caching strategically
- Index database columns
- Batch database operations
- Use connection pooling
- Implement pagination
- Optimize queries

**❌ Don't:**
- Load entire tables
- Make N+1 queries
- Skip query optimization
- Ignore cache invalidation
- Overuse synchronous operations
- Neglect monitoring

---

## 📈 Metrics Dashboard

### Key Metrics to Monitor

**Code Quality:**
- Test coverage percentage
- Linter warnings/errors
- Code duplication percentage
- Cyclomatic complexity
- Technical debt ratio

**Performance:**
- Response time (P50, P95, P99)
- Throughput (requests/second)
- Error rate
- Cache hit rate
- Database query time

**Reliability:**
- Uptime percentage
- Mean time to recovery (MTTR)
- Failure rate
- Alert frequency
- Incident count

---

## 🔗 Related Documentation

- **[Testing Tutorial](./OBSERVABILITY_TUTORIAL.md)** - Hands-on testing guide
- **[Performance Results](./performance/FINAL_PERFORMANCE_RESULTS.md)** - Load test results
- **[Contributing Guide](../CONTRIBUTING.md)** - Contribution standards
- **[Architecture Documentation](./backend/ARCHITECTURE.md)** - System design

---

<div align="center">

**📊 Quality is not an act, it is a habit 📊**

[Report Issue](https://github.com/geoo115/charity-management-system/issues) · [Contribute](../CONTRIBUTING.md) · [Documentation](./README.md)

</div>

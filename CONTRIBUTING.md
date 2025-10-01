# Contributing to Lewisham Charity Management System

Thank you for considering contributing to this project! We welcome contributions from everyone, whether you're fixing a bug, implementing a new feature, improving documentation, or suggesting enhancements.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Development Tools](#development-tools)
- [Getting Help](#getting-help)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for everyone. We expect all contributors to:

- Be respectful and considerate of others
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Docker Desktop** or **Docker + Docker Compose**
- **Go 1.21+** (for backend development)
- **Node.js 18+** and **npm/yarn** (for frontend development)
- **Git** (version control)
- **Make** (optional, for convenience commands)
- **PostgreSQL client** (for database work)
- **Redis CLI** (for cache debugging)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/charity-management-system.git
   cd charity-management-system
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/geoo115/charity-management-system.git
   ```

### Setup Development Environment

```bash
# Start infrastructure services
docker-compose up -d postgres redis prometheus grafana jaeger

# Backend setup
cd backend
cp .env.example .env
go mod download
make migrate-up
go run cmd/api/main.go

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Verify Setup

```bash
# Check backend health
curl http://localhost:8080/health

# Check frontend
open http://localhost:3000

# Check Swagger docs
open http://localhost:8080/swagger/index.html
```

---

## 🔄 Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description

# Or for documentation
git checkout -b docs/documentation-update
```

### Branch Naming Conventions

- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Build process or auxiliary tool changes

Examples:
- `feature/donor-dashboard`
- `fix/websocket-connection-leak`
- `docs/api-authentication`
- `refactor/database-queries`

### 2. Make Your Changes

- Write clean, readable code following our standards
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass locally

### 3. Keep Your Branch Updated

Regularly sync with upstream to avoid merge conflicts:

```bash
git fetch upstream
git rebase upstream/main
```

### 4. Test Your Changes

```bash
# Backend tests
cd backend
make test
make lint

# Frontend tests
cd frontend
npm run test
npm run lint

# Integration tests
make test-integration

# Load tests (optional)
cd backend/load-testing
./run-load-tests.sh baseline
```

---

## 📝 Coding Standards

### Go Backend Standards

#### Code Style

Follow the official [Effective Go](https://golang.org/doc/effective_go.html) guidelines and use `gofmt` for formatting.

```bash
# Format code
go fmt ./...

# Run linter
golangci-lint run

# Or use make command
make lint
```

#### Best Practices

```go
// ✅ Good: Descriptive names, clear error handling
func (s *DonationService) CreateDonation(ctx context.Context, req *models.CreateDonationRequest) (*models.Donation, error) {
    if err := s.validator.Validate(req); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    donation, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create donation: %w", err)
    }
    
    return donation, nil
}

// ❌ Bad: Vague names, ignored errors, no context
func (s *DonationService) Create(r *Request) *Donation {
    s.validator.Validate(r)
    d, _ := s.repo.Create(r)
    return d
}
```

#### Error Handling

- Always handle errors explicitly
- Use `fmt.Errorf` with `%w` for error wrapping
- Return errors to the caller
- Log errors at the appropriate level

```go
// ✅ Good
if err != nil {
    return nil, fmt.Errorf("failed to fetch user %d: %w", userID, err)
}

// ❌ Bad
if err != nil {
    log.Println(err)
    return nil, errors.New("error occurred")
}
```

#### Testing

- Write table-driven tests
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

```go
func TestDonationService_CreateDonation(t *testing.T) {
    tests := []struct {
        name    string
        input   *models.CreateDonationRequest
        want    *models.Donation
        wantErr bool
    }{
        {
            name: "valid donation",
            input: &models.CreateDonationRequest{
                Amount: 100,
                DonorID: 1,
            },
            want: &models.Donation{
                ID: 1,
                Amount: 100,
            },
            wantErr: false,
        },
        {
            name: "invalid amount",
            input: &models.CreateDonationRequest{
                Amount: -10,
            },
            want: nil,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

#### Package Organization

```
internal/
├── auth/              # Authentication logic
├── config/            # Configuration management
├── handlers_new/      # HTTP handlers (thin layer)
├── middleware/        # HTTP middleware
├── models/            # Data models and DTOs
├── services/          # Business logic (fat layer)
├── repository/        # Data access layer
└── utils/             # Shared utilities
```

### TypeScript/React Frontend Standards

#### Code Style

Follow the ESLint and Prettier configurations:

```bash
# Format code
npm run format

# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

#### Component Structure

```typescript
// ✅ Good: Type-safe, clear props, proper hooks
import { useState, useEffect } from 'react';

interface DonationCardProps {
  donation: Donation;
  onUpdate?: (donation: Donation) => void;
}

export function DonationCard({ donation, onUpdate }: DonationCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Effect logic
  }, [donation.id]);

  return (
    <div className="rounded-lg border p-4">
      {/* Component JSX */}
    </div>
  );
}

// ❌ Bad: No types, unclear props, bad naming
export function Card({ data, func }) {
  const [x, setX] = useState(false);
  
  return <div>{/* ... */}</div>;
}
```

#### State Management

- Use React hooks for local state
- Use Zustand for global state
- Use React Query for server state

```typescript
// ✅ Good: Proper state management
import { useDonations } from '@/hooks/useDonations';

export function DonationList() {
  const { data, isLoading, error } = useDonations();
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {data.map(donation => (
        <DonationCard key={donation.id} donation={donation} />
      ))}
    </div>
  );
}
```

#### File Naming

- Components: `PascalCase.tsx` (e.g., `DonationCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useDonations.ts`)
- Utils: `kebab-case.ts` (e.g., `format-currency.ts`)
- Types: `PascalCase.ts` (e.g., `Donation.ts`)

---

## 🧪 Testing Requirements

### Backend Testing

#### Unit Tests

- Minimum **70% code coverage** required
- Test all public functions
- Mock external dependencies

```bash
# Run tests
make test

# Run with coverage
make test-coverage

# View coverage report
go tool cover -html=coverage.out
```

#### Integration Tests

```bash
# Run integration tests
make test-integration
```

#### Example Test

```go
func TestCreateDonation(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer db.Close()
    
    service := NewDonationService(db)
    
    // Execute
    donation, err := service.CreateDonation(context.Background(), &CreateDonationRequest{
        Amount: 100,
        DonorID: 1,
    })
    
    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, donation)
    assert.Equal(t, 100.0, donation.Amount)
}
```

### Frontend Testing

```bash
# Run tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

#### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { DonationCard } from './DonationCard';

describe('DonationCard', () => {
  it('renders donation amount', () => {
    const donation = {
      id: 1,
      amount: 100,
      donorName: 'John Doe',
    };

    render(<DonationCard donation={donation} />);
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onUpdate when edited', async () => {
    const onUpdate = jest.fn();
    // Test implementation
  });
});
```

### Load Testing

```bash
# Run baseline load tests
cd backend/load-testing
./run-load-tests.sh baseline

# Run stress tests
./run-load-tests.sh stress
```

---

## 💬 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without functional changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes
- **ci**: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(donations): add recurring donation support"

# Bug fix
git commit -m "fix(auth): resolve JWT expiration issue"

# Documentation
git commit -m "docs(api): update authentication endpoints"

# With body
git commit -m "feat(volunteers): add shift swap functionality

Allows volunteers to request shift swaps with approval workflow.
Includes email notifications and admin oversight.

Closes #123"
```

### Commit Best Practices

- Use imperative mood ("add" not "added")
- Keep subject line under 72 characters
- Capitalize the subject line
- Do not end subject line with a period
- Separate subject from body with a blank line
- Use the body to explain what and why, not how

---

## 🔍 Pull Request Process

### Before Submitting

- [ ] Code follows project coding standards
- [ ] All tests pass locally
- [ ] Code has been linted and formatted
- [ ] New code has tests with adequate coverage
- [ ] Documentation has been updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### Creating a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub from your fork to the main repository

3. **Fill out the PR template** completely:
   - Description of changes
   - Related issues
   - Type of change (feature, fix, etc.)
   - Testing done
   - Screenshots (if UI changes)

### PR Title Format

Follow the same format as commit messages:

```
feat(donations): add recurring donation support
fix(auth): resolve JWT expiration issue
docs(api): update authentication endpoints
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Testing Done
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] Load testing performed (if performance-related)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added in hard-to-understand areas
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added that prove fix/feature works
- [ ] All tests passing locally
```

### Review Process

1. **Automated checks** will run (tests, linting, build)
2. **Code review** by maintainers
3. **Address feedback** by pushing new commits
4. **Approval** from at least one maintainer
5. **Merge** by maintainer

### After Merge

- Delete your feature branch
- Update your local repository:
  ```bash
  git checkout main
  git pull upstream main
  ```

---

## 📂 Project Structure

Understanding the project structure helps you navigate and contribute effectively:

```
charity-management-system/
├── backend/                    # Go backend
│   ├── cmd/api/               # Application entry point
│   ├── internal/              # Private packages
│   │   ├── auth/              # Authentication
│   │   ├── config/            # Configuration
│   │   ├── handlers_new/      # HTTP handlers
│   │   ├── middleware/        # HTTP middleware
│   │   ├── models/            # Data models
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── docs/                  # Swagger docs
│   └── load-testing/          # Performance tests
│
├── frontend/                   # Next.js frontend
│   ├── app/                   # App router pages
│   ├── components/            # React components
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilities
│   └── public/                # Static assets
│
├── docs/                       # Documentation
│   ├── backend/               # Backend docs
│   ├── frontend/              # Frontend docs
│   ├── architecture/          # Architecture diagrams
│   └── workflows/             # User guides
│
└── monitoring/                 # Observability config
    ├── prometheus.yml
    └── grafana/
```

---

## 🛠️ Development Tools

### Backend

```bash
# Hot reload during development
air

# Format code
go fmt ./...

# Run linter
golangci-lint run

# Generate Swagger docs
swag init -g cmd/api/main.go

# Database migrations
make migrate-up
make migrate-down
make migrate-create name=add_new_table

# Build
make build
```

### Frontend

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Build for production
npm run build

# Start production server
npm run start
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild a service
docker-compose up -d --build backend
```

### Database

```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U usr -d lewisham_hub

# Backup database
pg_dump -h localhost -p 5433 -U usr lewisham_hub > backup.sql

# Restore database
psql -h localhost -p 5433 -U usr lewisham_hub < backup.sql

# Connect to Redis
redis-cli -h localhost -p 6380

# View cache keys
redis-cli -h localhost -p 6380 KEYS "*"
```

---

## ❓ Getting Help

### Resources

- **Documentation**: Check the [docs/](./docs) directory
- **API Reference**: http://localhost:8080/swagger/index.html
- **Architecture**: [docs/backend/ARCHITECTURE.md](./docs/backend/ARCHITECTURE.md)
- **Observability**: [docs/OBSERVABILITY_EXPLAINED.md](./docs/OBSERVABILITY_EXPLAINED.md)

### Asking Questions

1. **Search existing issues** before creating a new one
2. **Use GitHub Discussions** for general questions
3. **Create an issue** for bugs or feature requests
4. **Be specific** - include error messages, logs, and steps to reproduce

### Issue Template

When creating an issue:

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g., macOS, Linux, Windows]
- Go version: [e.g., 1.21]
- Node version: [e.g., 18.17]
- Docker version: [e.g., 24.0]

## Additional Context
Any other relevant information
```

---

## 🎯 Good First Issues

Looking for a place to start? Check out issues labeled:
- `good first issue` - Great for newcomers
- `help wanted` - We need community help
- `documentation` - Improve docs
- `bug` - Fix existing issues

---

## 🙏 Thank You

Thank you for contributing to the Lewisham Charity Management System! Your efforts help make this project better for charity organizations and the communities they serve.

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

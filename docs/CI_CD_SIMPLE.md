# CI/CD Configuration

This project uses simplified GitHub Actions workflows for continuous integration.

## Workflows

### Backend CI (`backend-ci.yml`)
- **Triggers**: Push/PR to main/develop with backend changes
- **Steps**:
  - Code formatting check with `gofmt`
  - Go vet for static analysis
  - Build the application
  - Run tests with coverage
  - Upload coverage reports

### Frontend CI (`frontend-ci.yml`)
- **Triggers**: Push/PR to main/develop with frontend changes  
- **Steps**:
  - TypeScript type checking
  - Run tests (if available)
  - Build Next.js application
  - Upload build artifacts

## Dependencies

- **Dependabot**: Automatically updates dependencies weekly
- **Go Version**: 1.25.1 (as specified in go.mod)
- **Node.js Version**: 18.x

## Removed Complexity

To ensure reliability, the following have been removed:
- Docker build/deploy workflows
- Complex security scanning pipelines
- Production deployment automation
- API integration testing with external services

For production deployments, consider manual deployment or dedicated CI/CD tools.
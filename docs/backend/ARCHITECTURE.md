# Backend Architecture Documentation

## Overview

This proof-of-concept backend system is built using Go with the Gin web framework, following clean architecture principles and domain-driven design patterns. The system demonstrates modern backend development practices for charity operations management.

## Project Structure

```
backend/
├── cmd/
│   └── api/                    # Application entry point
│       └── main.go            # Main server file
├── internal/
│   ├── auth/                  # Authentication logic
│   │   ├── constants.go       # Auth constants (JWT expiry, etc.)
│   │   ├── jwt.go            # JWT token handling
│   │   └── refresh_token.go   # Refresh token logic
│   ├── config/               # Configuration management
│   │   └── config.go         # Environment and config loading
│   ├── db/                   # Database layer
│   │   ├── connection.go     # Database connection setup
│   │   ├── migrations.go     # Database migrations
│   │   ├── seed.go          # Database seeding
│   │   └── health.go        # Database health checks
│   ├── handlers_new/         # HTTP handlers (organized by domain)
│   │   ├── admin/           # Admin-specific handlers
│   │   ├── auth/            # Authentication handlers
│   │   ├── donor/           # Donor-specific handlers
│   │   ├── shared/          # Shared utilities and base handlers
│   │   ├── system/          # System-level handlers
│   │   ├── visitor/         # Visitor-specific handlers
│   │   └── volunteer/       # Volunteer-specific handlers
│   ├── middleware/          # HTTP middleware
│   │   ├── auth_middleware.go # Authentication middleware
│   │   ├── cors.go          # CORS middleware
│   │   └── rate_limiter.go  # Rate limiting
│   ├── models/              # Database models
│   ├── routes/              # Route definitions
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   └── websocket/           # WebSocket handling
├── docs/                    # API documentation
├── go.mod                   # Go module definition
├── go.sum                   # Go module checksums
├── Makefile                 # Build and development tasks
└── .gitignore              # Git ignore rules
```

## Architecture Principles

### 1. Clean Architecture
- **Separation of Concerns**: Each layer has a specific responsibility
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Domain-Driven Design**: Code organized around business domains

### 2. Handler Organization
Handlers are organized by user role/domain:
- `admin/`: Administrative functions
- `auth/`: Authentication and authorization
- `donor/`: Donation management
- `visitor/`: Visitor services
- `volunteer/`: Volunteer management
- `system/`: System-level operations

### 3. Shared Components
- `shared/base.go`: Base handler with common functionality
- `shared/errors.go`: Standardized error definitions
- `shared/validation.go`: Input validation utilities

## Configuration Management

The application uses a centralized configuration system:

```go
type Config struct {
    Database     DatabaseConfig
    Redis        RedisConfig
    JWT          JWTConfig
    Server       ServerConfig
    // ... other configs
}
```

Configuration is loaded from environment variables with sensible defaults.

## Error Handling

### Standardized Error Responses
All API responses follow a consistent format:

```go
type StandardResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Error     string      `json:"error,omitempty"`
    Message   string      `json:"message,omitempty"`
    Timestamp time.Time   `json:"timestamp"`
}
```

### Error Categories
- **4xx Client Errors**: Bad requests, unauthorized, forbidden, not found
- **5xx Server Errors**: Internal server errors, database errors
- **Custom Business Errors**: Domain-specific validation errors

## Database Layer

### Connection Management
- Single database connection pool
- Health check endpoints
- Graceful connection handling

### Migrations
- Automated migration system
- Version-controlled schema changes
- Rollback capabilities

### Models
GORM-based models with:
- Proper relationships
- Validation tags
- JSON serialization tags

## Authentication & Authorization

### JWT-Based Authentication
- Access tokens (24 hours for development)
- Refresh tokens (7 days)
- Role-based access control

### Middleware
- Authentication middleware validates JWT tokens
- Role-based middleware for endpoint protection
- Rate limiting for API protection

## API Design

### RESTful Endpoints
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Consistent URL patterns
- Proper status codes

### Pagination
Standardized pagination for list endpoints:
```go
type PaginatedResponse struct {
    Success    bool        `json:"success"`
    Data       interface{} `json:"data"`
    Pagination Pagination  `json:"pagination"`
}
```

## Development Workflow

### Build System
- Makefile with common tasks
- Go modules for dependency management
- Hot reload support for development

### Code Quality
- Go formatting (`go fmt`)
- Linting with `golangci-lint`
- Security scanning with `gosec`

### Testing
- Unit tests for business logic
- Integration tests for handlers
- Coverage reporting

## Deployment

### Docker Support
- Multi-stage Docker builds
- Optimized production images
- Health check endpoints

### Environment Configuration
- Environment-specific configurations
- Secret management
- Feature flags

## Best Practices

### Code Organization
1. **Single Responsibility**: Each handler/service has one responsibility
2. **Interface Segregation**: Small, focused interfaces
3. **Dependency Injection**: Services injected via constructors
4. **Error Handling**: Consistent error handling patterns

### Security
1. **Input Validation**: All inputs validated
2. **SQL Injection Prevention**: Parameterized queries
3. **CORS Configuration**: Proper CORS settings
4. **Rate Limiting**: API rate limiting
5. **JWT Security**: Secure token handling

### Performance
1. **Database Optimization**: Efficient queries and indexes
2. **Caching**: Redis caching for frequently accessed data
3. **Connection Pooling**: Optimized database connections
4. **Pagination**: Large datasets properly paginated

## Monitoring & Logging

### Structured Logging
- Consistent log format
- Log levels (INFO, WARNING, ERROR)
- Request/response logging

### Health Checks
- Database connectivity
- Redis connectivity
- Application health endpoints

## Future Improvements

1. **Observability**: Add metrics and distributed tracing
2. **Testing**: Increase test coverage
3. **Documentation**: API documentation with Swagger
4. **Performance**: Add performance monitoring
5. **Security**: Enhanced security scanning and monitoring 
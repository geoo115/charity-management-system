# Lewisham Charity - API Documentation

## Overview

The Lewisham Charity API provides comprehensive endpoints for managing community donations, volunteer coordination, help requests, visitor services, and feedback management. This RESTful API follows OpenAPI 3.0 specifications and includes real-time WebSocket capabilities.

## 🔗 **Accessing the Documentation**

### Interactive Documentation
- **Swagger UI**: `http://localhost:8080/swagger/index.html`
- **OpenAPI Spec**: `http://localhost:8080/api/swagger.json`

### Base URL
- **Development**: `http://localhost:8080/api/v1`
- **Production**: `https://api.lewisham-hub.org/api/v1`

## 🔐 **Authentication**

The API uses **JWT Bearer Token** authentication for protected endpoints.

### Authentication Header Format
```
Authorization: Bearer <your-jwt-token>
```

### Getting Started
1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **Use Token**: Include in Authorization header for protected endpoints

Security note: Refresh tokens should never be stored in localStorage. For improved security against XSS, use httpOnly, Secure, SameSite cookies for refresh tokens and implement refresh token rotation and server-side invalidation. The server currently supports a JSON refresh flow for compatibility but we recommend switching to cookie-based refresh in production.

## 📊 **API Categories**

### 1. **Authentication & User Management**
- **User Registration**: Create new accounts with role-specific data
- **Login/Logout**: JWT-based authentication with refresh tokens
- **Profile Management**: Update user information and preferences
- **Password Management**: Reset and change passwords

**Key Endpoints:**
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - User logout

### 2. **Help Requests**
- **Request Management**: Create, update, and track help requests
- **Category Support**: Food assistance and general support
- **Priority Levels**: Low, medium, high, urgent
- **Status Tracking**: Pending, in-progress, completed, cancelled

**Key Endpoints:**
- `GET /api/v1/help-requests` - List help requests (paginated)
- `POST /api/v1/help-requests` - Create new help request
- `GET /api/v1/help-requests/{id}` - Get help request details
- `PUT /api/v1/help-requests/{id}` - Update help request

### 3. **Volunteer Management**
- **Application System**: Volunteer applications and approvals
- **Profile Management**: Skills, availability, experience tracking
- **Dashboard**: Volunteer-specific statistics and tasks
- **Training**: Training modules and certification tracking

**Key Endpoints:**
- `GET /api/v1/volunteer/dashboard` - Volunteer dashboard
- `GET /api/v1/volunteer/profile` - Get volunteer profile
- `PUT /api/v1/volunteer/profile` - Update profile
- `GET /api/v1/volunteer/application/status` - Application status

### 4. **Donations**
- **Donation Types**: Monetary, food, clothing, other
- **Donor Management**: Donor profiles and donation history
- **Status Tracking**: Pending, completed, cancelled
- **Impact Reporting**: Donation impact and recognition

**Key Endpoints:**
- `GET /api/v1/donations` - List donations (with filtering)
- `POST /api/v1/donations` - Create new donation
- `GET /api/v1/donor/dashboard` - Donor dashboard
- `GET /api/v1/donor/history` - Donation history

### 5. **Queue Management**
- **Real-time Queues**: Food and general service queues
- **Wait Time Estimation**: Dynamic wait time calculations
- **Call-Next System**: Staff queue management
- **Position Tracking**: Real-time position updates

**Key Endpoints:**
- `GET /api/v1/queue` - Get current queue status
- `POST /api/v1/queue/call-next` - Call next visitor (staff)
- `POST /api/v1/realtime/queue/join` - Join queue
- `GET /api/v1/realtime/queue/{category}` - Queue status by category

### 6. **Notifications**
- **Real-time Notifications**: In-app and push notifications
- **Notification Types**: Info, success, warning, error
- **Priority Levels**: Low, medium, high, urgent
- **Delivery Channels**: In-app, email, SMS, push

**Key Endpoints:**
- `GET /api/v1/notifications` - Get user notifications
- `PUT /api/v1/notifications/{id}/read` - Mark as read
- `PUT /api/v1/notifications/read-all` - Mark all as read
- `GET /api/v1/notifications/preferences` - Notification preferences

### 7. **Document Management**
- **File Upload**: Secure document upload with validation
- **Verification System**: Admin document verification
- **File Types**: PDF, images, text documents
- **Status Tracking**: Pending, verified, rejected

**Key Endpoints:**
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/documents` - List user documents
- `POST /api/v1/documents/verify/{id}` - Verify document (admin)
- `PUT /api/v1/documents/{id}/status` - Update status (admin)

### 8. **Feedback System**
- **Visit Feedback**: Comprehensive visit experience ratings
- **Multi-dimensional Ratings**: Staff, wait time, facility, service speed
- **Comment System**: Positive feedback and improvement suggestions
- **Admin Response**: Staff responses to feedback

**Key Endpoints:**
- `POST /api/v1/feedback/submit` - Submit visit feedback
- `GET /api/v1/admin/feedback/priority` - Priority feedback (admin)
- `POST /api/v1/admin/feedback/bulk-response` - Bulk respond (admin)

### 9. **Admin Dashboard**
- **System Overview**: Comprehensive system statistics
- **User Management**: User account administration
- **Analytics**: Performance metrics and reporting
- **System Health**: Monitoring and maintenance

**Key Endpoints:**
- `GET /api/v1/admin/dashboard` - Admin dashboard
- `GET /api/v1/admin/users` - List all users
- `POST /api/v1/admin/users` - Create user
- `GET /api/v1/admin/analytics` - System analytics

### 10. **WebSocket & Real-time**
- **Live Updates**: Real-time queue, notifications, document status
- **WebSocket Status**: Connection monitoring and health checks
- **Multi-channel Support**: Role-based WebSocket channels
- **Fallback Support**: Polling alternatives for WebSocket failures

**Key Endpoints:**
- `GET /api/v1/ws-status` - WebSocket server status
- `GET /api/v1/ws-heartbeat` - WebSocket health check
- WebSocket connections: `/ws/notifications`, `/ws/queue/updates`, `/ws/documents`

### 11. **System Health**
- **Health Monitoring**: Database, Redis, service health
- **Performance Metrics**: Response times, uptime, resource usage
- **Dependency Checks**: External service connectivity
- **Version Information**: API version and build info

**Key Endpoints:**
- `GET /health` - Comprehensive health check
- `GET /health-check` - Simple health status

## 📋 **Data Models**

### Core Models
- **User**: User accounts with role-based properties
- **HelpRequest**: Community support requests
- **Volunteer**: Volunteer applications and profiles
- **Donation**: Donation records and tracking
- **Document**: File uploads and verification
- **Notification**: Real-time messaging system
- **QueueEntry**: Queue management and position tracking
- **VisitFeedback**: Visitor experience feedback

### Response Formats
- **StandardResponse**: Consistent API response format
- **PaginatedResponse**: Paginated data with metadata
- **Error**: Structured error responses with details

## 🔧 **Features**

### Pagination
All list endpoints support pagination:
```
GET /api/v1/help-requests?page=1&limit=10
```

### Filtering
Many endpoints support filtering:
```
GET /api/v1/donations?type=monetary&status=completed
GET /api/v1/admin/users?role=Volunteer&status=active
```

### Search
Text search available on relevant endpoints:
```
GET /api/v1/admin/users?search=john@example.com
```

### Real-time Updates
WebSocket connections for live updates:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/notifications');
```

## 🚀 **Getting Started**

### 1. **Start the Services**
```bash
# Start PostgreSQL and Redis
docker run -d --name ldh2_postgres -e POSTGRES_USER=usr -e POSTGRES_PASSWORD=test123 -e POSTGRES_DB=lewisham_hub -p 5432:5432 postgres:15-alpine
docker run -d --name ldh2_redis -p 6379:6379 redis:7-alpine

# Start the API server
go run ./cmd/api
```

### 2. **Test Authentication**
```bash
# Register a new user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com","password":"password123","role":"Visitor"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lewisham-hub.org","password":"securePassword123"}'
```

### 3. **Use Protected Endpoints**
```bash
# Get current user (using token from login)
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 **Available Test Accounts**

### Admin Account
- **Email**: `admin@lewisham-hub.org`
- **Password**: `securePassword123`
- **Role**: Admin

### Test Users (Password: `testpass123`)
- **Visitors**: `sarah.johnson@example.com`, `michael.brown@example.com`
- **Volunteers**: `amy.garcia@example.com`, `robert.martinez@example.com`
- **Donors**: `jennifer.anderson@example.com`, `christopher.taylor@example.com`

## 🔒 **Security Features**

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Endpoint access based on user roles
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive request validation
- **CORS Support**: Configurable cross-origin resource sharing
- **Security Headers**: Standard security headers implementation

## 📊 **API Status Codes**

- **200 OK**: Successful GET, PUT requests
- **201 Created**: Successful POST requests
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors

## 🛠️ **Development**

### API Testing
Use the interactive Swagger UI at `http://localhost:8080/swagger/index.html` for:
- **Endpoint Testing**: Try API calls directly from the browser
- **Schema Validation**: Validate request/response formats
- **Authentication Testing**: Test with different user roles
- **Real-time Features**: Monitor WebSocket connections

### Custom Integration
The API is designed for easy integration with:
- **Frontend Applications**: React, Vue, Angular
- **Mobile Applications**: iOS, Android, React Native
- **Third-party Services**: Webhooks, integrations
- **Automation Tools**: Scripts, monitoring systems

## 📞 **Support**

For API support and questions:
- **Documentation**: Always refer to the latest Swagger UI
- **Health Check**: Monitor `/health` endpoint for system status
- **WebSocket Status**: Check `/api/v1/ws-status` for real-time features
- **Error Handling**: All errors include detailed messages and codes

---

**Note**: This API documentation is automatically generated and kept in sync with the actual implementation. Always refer to the live Swagger documentation for the most up-to-date information. 
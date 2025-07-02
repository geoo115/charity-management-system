package docs

import "github.com/swaggo/swag"

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = struct {
	Version     string
	Host        string
	BasePath    string
	Schemes     []string
	Title       string
	Description string
}{
	Version:     "1.0.0",
	Host:        "localhost:8080",
	BasePath:    "/api/v1",
	Schemes:     []string{"http", "https"},
	Title:       "Lewisham Charity API",
	Description: "Comprehensive API for managing community donations, volunteer coordination, help requests, visitor services, and feedback management for the South London community.",
}

// SwaggerSpec contains the complete OpenAPI 3.0 specification
// This comprehensive specification covers all API endpoints in the Lewisham Charity
var SwaggerSpec = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Lewisham Charity API",
    "description": "Comprehensive API for managing community donations, volunteer coordination, help requests, visitor services, and feedback management for the South London community.",
    "version": "1.0.0",
    "contact": {
      "name": "Lewisham Charity Support",
      "email": "support@lewishamCharity.org",
      "url": "https://lewishamCharity.org/contact"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  },
  "servers": [
    {
      "url": "http://localhost:8080/api/v1",
      "description": "Development server"
    },
    {
      "url": "https://staging-api.lewisham-hub.org/api/v1",
      "description": "Staging server"
    },
    {
      "url": "https://api.lewisham-hub.org/api/v1",
      "description": "Production server"
    }
  ],
  "tags": [
    {
      "name": "Authentication",
      "description": "User authentication, registration, and account management"
    },
    {
      "name": "User Management",
      "description": "User profile and account operations"
    },
    {
      "name": "Help Requests",
      "description": "Community support request management"
    },
    {
      "name": "Visitor Services",
      "description": "Visitor check-in, queue management, and services"
    },
    {
      "name": "Volunteer Management",
      "description": "Volunteer applications, shifts, and coordination"
    },
    {
      "name": "Donations",
      "description": "Donation tracking, management, and donor services"
    },
    {
      "name": "Document Management",
      "description": "Document upload, verification, and management"
    },
    {
      "name": "Notifications",
      "description": "Real-time notifications and messaging"
    },
    {
      "name": "Queue Management",
      "description": "Visitor queue, wait times, and call-next system"
    },
    {
      "name": "Feedback",
      "description": "Visitor feedback collection and management"
    },
    {
      "name": "Admin - Dashboard",
      "description": "Administrative dashboard, analytics, and metrics"
    },
    {
      "name": "Admin - User Management",
      "description": "Administrative user account management"
    },
    {
      "name": "Admin - System Management",
      "description": "System configuration, audit logs, and maintenance"
    },
    {
      "name": "WebSocket",
      "description": "Real-time WebSocket connections and status"
    },
    {
      "name": "System Health",
      "description": "Health checks and system monitoring"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your JWT token in the format: Bearer <token>"
      }
    },
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "first_name": {"type": "string", "example": "John"},
          "last_name": {"type": "string", "example": "Doe"},
          "email": {"type": "string", "format": "email", "example": "john.doe@example.com"},
          "role": {"type": "string", "enum": ["Admin", "Volunteer", "Donor", "Visitor"], "example": "Visitor"},
          "status": {"type": "string", "enum": ["active", "inactive", "pending"], "example": "active"},
          "phone": {"type": "string", "example": "+44 20 1234 5678"},
          "address": {"type": "string", "example": "123 Main St, London"},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "LoginRequest": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": {"type": "string", "format": "email", "example": "admin@lewisham-hub.org"},
          "password": {"type": "string", "example": "securePassword123"}
        }
      },
      "LoginResponse": {
        "type": "object",
        "properties": {
          "message": {"type": "string", "example": "Login successful"},
          "token": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
          "refresh_token": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
          "user": {"$ref": "#/components/schemas/User"},
          "success": {"type": "boolean", "example": true}
        }
      },
      "RegisterRequest": {
        "type": "object",
        "required": ["first_name", "last_name", "email", "password", "role"],
        "properties": {
          "first_name": {"type": "string", "example": "John"},
          "last_name": {"type": "string", "example": "Doe"},
          "email": {"type": "string", "format": "email", "example": "john.doe@example.com"},
          "password": {"type": "string", "minLength": 8, "example": "securePassword123"},
          "role": {"type": "string", "enum": ["Admin", "Volunteer", "Donor", "Visitor"], "example": "Visitor"},
          "phone": {"type": "string", "example": "+44 20 1234 5678"},
          "address": {"type": "string", "example": "123 Main St, London"}
        }
      },
      "HelpRequest": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitor_id": {"type": "integer", "example": 5},
          "category": {"type": "string", "enum": ["Food", "General"], "example": "Food"},
          "description": {"type": "string", "example": "Need food assistance for family of 4"},
          "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "example": "medium"},
          "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"], "example": "pending"},
          "assigned_volunteer_id": {"type": "integer", "nullable": true, "example": 10},
          "scheduled_date": {"type": "string", "format": "date", "example": "2024-01-15"},
          "scheduled_time": {"type": "string", "example": "14:30"},
          "notes": {"type": "string", "example": "Dietary restrictions: vegetarian"},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "Volunteer": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "user_id": {"type": "integer", "example": 5},
          "application_status": {"type": "string", "enum": ["pending", "approved", "rejected"], "example": "approved"},
          "skills": {"type": "string", "example": "Food handling, Customer service"},
          "availability": {"type": "string", "example": "Weekends, Tuesday evenings"},
          "experience": {"type": "string", "example": "2 years volunteering at local charity"},
          "references": {"type": "string", "example": "Contact details provided"},
          "training_completed": {"type": "boolean", "example": true},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "Donation": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "donor_id": {"type": "integer", "example": 5},
          "type": {"type": "string", "enum": ["monetary", "food", "clothing", "other"], "example": "monetary"},
          "amount": {"type": "number", "format": "float", "example": 50.00},
          "description": {"type": "string", "example": "Monthly donation"},
          "status": {"type": "string", "enum": ["pending", "completed", "cancelled"], "example": "completed"},
          "contact_email": {"type": "string", "format": "email", "example": "donor@example.com"},
          "contact_phone": {"type": "string", "example": "+44 20 1234 5678"},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "Document": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "user_id": {"type": "integer", "example": 5},
          "filename": {"type": "string", "example": "id_document.pdf"},
          "file_path": {"type": "string", "example": "/uploads/documents/id_document.pdf"},
          "file_type": {"type": "string", "example": "application/pdf"},
          "file_size": {"type": "integer", "example": 1024000},
          "document_type": {"type": "string", "example": "ID Verification"},
          "verification_status": {"type": "string", "enum": ["pending", "verified", "rejected"], "example": "pending"},
          "verified_by": {"type": "integer", "nullable": true, "example": 1},
          "verified_at": {"type": "string", "format": "date-time", "nullable": true},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "Notification": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "user_id": {"type": "integer", "example": 5},
          "title": {"type": "string", "example": "New Help Request"},
          "message": {"type": "string", "example": "You have a new help request assigned"},
          "type": {"type": "string", "enum": ["info", "success", "warning", "error"], "example": "info"},
          "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "example": "medium"},
          "read": {"type": "boolean", "example": false},
          "action_url": {"type": "string", "nullable": true, "example": "/help-requests/123"},
          "created_at": {"type": "string", "format": "date-time"},
          "updated_at": {"type": "string", "format": "date-time"}
        }
      },
      "QueueEntry": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitor_id": {"type": "integer", "example": 5},
          "category": {"type": "string", "enum": ["Food", "General"], "example": "Food"},
          "position": {"type": "integer", "example": 3},
          "estimated_wait": {"type": "string", "example": "15 minutes"},
          "status": {"type": "string", "enum": ["waiting", "called", "served", "no_show"], "example": "waiting"},
          "called_at": {"type": "string", "format": "date-time", "nullable": true},
          "served_at": {"type": "string", "format": "date-time", "nullable": true},
          "created_at": {"type": "string", "format": "date-time"}
        }
      },
      "VisitFeedback": {
        "type": "object",
        "required": ["visitId", "overallRating"],
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitor_id": {"type": "integer", "example": 5},
          "visit_id": {"type": "integer", "example": 10},
          "overall_rating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "staff_helpfulness": {"type": "integer", "minimum": 1, "maximum": 5, "example": 5},
          "wait_time_rating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 3},
          "facility_rating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "service_speed_rating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "food_quality_rating": {"type": "integer", "minimum": 1, "maximum": 5, "nullable": true, "example": 4},
          "service_category": {"type": "string", "example": "Food Support"},
          "positive_comments": {"type": "string", "example": "Very helpful staff, great selection of food"},
          "areas_for_improvement": {"type": "string", "example": "Could improve wait time during peak hours"},
          "suggestions": {"type": "string", "example": "Maybe add more seating in waiting area"},
          "would_recommend": {"type": "boolean", "example": true},
          "felt_welcomed": {"type": "boolean", "example": true},
          "needs_were_met": {"type": "boolean", "example": true},
          "review_status": {"type": "string", "enum": ["pending", "reviewed", "responded", "escalated", "resolved"], "example": "pending"},
          "admin_response": {"type": "string", "nullable": true, "example": "Thank you for your feedback. We're working on reducing wait times."},
          "admin_notes": {"type": "string", "nullable": true},
          "created_at": {"type": "string", "format": "date-time"}
        }
      },
      "WebSocketStatus": {
        "type": "object",
        "properties": {
          "available": {"type": "boolean", "example": true},
          "active_sessions": {"type": "integer", "example": 25},
          "endpoints": {"type": "array", "items": {"type": "string"}, "example": ["/ws/notifications", "/ws/queue/updates"]},
          "server_timestamp": {"type": "string", "format": "date-time"}
        }
      },
      "HealthCheck": {
        "type": "object",
        "properties": {
          "status": {"type": "string", "example": "healthy"},
          "timestamp": {"type": "string", "format": "date-time"},
          "database": {"type": "object", "properties": {"status": {"type": "string", "example": "connected"}, "response_time": {"type": "string", "example": "2ms"}}},
          "redis": {"type": "object", "properties": {"status": {"type": "string", "example": "connected"}, "response_time": {"type": "string", "example": "1ms"}}},
          "version": {"type": "string", "example": "1.0.0"},
          "uptime": {"type": "string", "example": "2h 15m 30s"}
        }
      },
      "StandardResponse": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean", "example": true},
          "data": {"type": "object"},
          "message": {"type": "string", "example": "Operation completed successfully"},
          "timestamp": {"type": "string", "format": "date-time"}
        }
      },
      "PaginatedResponse": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean", "example": true},
          "data": {"type": "array", "items": {"type": "object"}},
          "pagination": {
            "type": "object",
            "properties": {
              "page": {"type": "integer", "example": 1},
              "limit": {"type": "integer", "example": 10},
              "total": {"type": "integer", "example": 100},
              "total_pages": {"type": "integer", "example": 10},
              "has_next": {"type": "boolean", "example": true},
              "has_prev": {"type": "boolean", "example": false}
            }
          },
          "timestamp": {"type": "string", "format": "date-time"}
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean", "example": false},
          "error": {"type": "string", "example": "Validation failed"},
          "message": {"type": "string", "example": "The provided data is invalid"},
          "timestamp": {"type": "string", "format": "date-time"},
          "details": {"type": "object", "nullable": true}
        }
      }
    }
  },
  "paths": {
    "/health": {
      "get": {
        "tags": ["System Health"],
        "summary": "Health check endpoint",
        "description": "Returns the health status of the application and its dependencies",
        "responses": {
          "200": {
            "description": "Health status",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/HealthCheck"}
              }
            }
          }
        }
      }
    },
    "/api/v1/ws-status": {
      "get": {
        "tags": ["WebSocket"],
        "summary": "WebSocket status",
        "description": "Returns information about WebSocket server status and active connections",
        "responses": {
          "200": {
            "description": "WebSocket status information",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/WebSocketStatus"}
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/register": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Register new user",
        "description": "Create a new user account with role-specific data",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {"$ref": "#/components/schemas/RegisterRequest"}
            }
          }
        },
        "responses": {
          "201": {
            "description": "User registered successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {"type": "string", "example": "User registered successfully"},
                    "token": {"type": "string"},
                    "user": {"$ref": "#/components/schemas/User"}
                  }
                }
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "409": {"description": "User already exists", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/auth/login": {
      "post": {
        "tags": ["Authentication"],
        "summary": "User login",
        "description": "Authenticate user and return JWT tokens",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {"$ref": "#/components/schemas/LoginRequest"}
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/LoginResponse"}
              }
            }
          },
          "401": {"description": "Invalid credentials", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "403": {"description": "Account not active", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/auth/me": {
      "get": {
        "tags": ["Authentication"],
        "summary": "Get current user",
        "description": "Get current authenticated user information",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "User information",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/User"}
              }
            }
          },
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/auth/logout": {
      "post": {
        "tags": ["Authentication"],
        "summary": "User logout",
        "description": "Logout user and invalidate tokens",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Logout successful",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/help-requests": {
      "get": {
        "tags": ["Help Requests"],
        "summary": "List help requests",
        "description": "Get paginated list of help requests",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
          {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 10}},
          {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"]}},
          {"name": "category", "in": "query", "schema": {"type": "string", "enum": ["Food", "General"]}}
        ],
        "responses": {
          "200": {
            "description": "List of help requests",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/PaginatedResponse"}
              }
            }
          },
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      },
      "post": {
        "tags": ["Help Requests"],
        "summary": "Create help request",
        "description": "Submit a new help request",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["category", "description"],
                "properties": {
                  "category": {"type": "string", "enum": ["Food", "General"]},
                  "description": {"type": "string"},
                  "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                  "scheduled_date": {"type": "string", "format": "date"},
                  "notes": {"type": "string"}
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Help request created successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/admin/users": {
      "get": {
        "tags": ["Admin - User Management"],
        "summary": "List all users",
        "description": "Get paginated list of all users (admin only)",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
          {"name": "pageSize", "in": "query", "schema": {"type": "integer", "default": 10}},
          {"name": "search", "in": "query", "schema": {"type": "string"}},
          {"name": "role", "in": "query", "schema": {"type": "string", "enum": ["Admin", "Volunteer", "Donor", "Visitor"]}},
          {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["active", "inactive", "pending"]}}
        ],
        "responses": {
          "200": {
            "description": "List of users",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/PaginatedResponse"}
              }
            }
          },
          "403": {"description": "Admin access required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/admin/dashboard": {
      "get": {
        "tags": ["Admin - Dashboard"],
        "summary": "Get admin dashboard data",
        "description": "Get comprehensive dashboard statistics and metrics",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Dashboard data",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "403": {"description": "Admin access required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/volunteer/dashboard": {
      "get": {
        "tags": ["Volunteer Management"],
        "summary": "Get volunteer dashboard",
        "description": "Get volunteer-specific dashboard data and statistics",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Volunteer dashboard data",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "403": {"description": "Volunteer access required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/donations": {
      "get": {
        "tags": ["Donations"],
        "summary": "List donations",
        "description": "Get list of donations with optional filtering",
        "parameters": [
          {"name": "type", "in": "query", "schema": {"type": "string", "enum": ["monetary", "food", "clothing", "other"]}},
          {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["pending", "completed", "cancelled"]}}
        ],
        "responses": {
          "200": {
            "description": "List of donations",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/PaginatedResponse"}
              }
            }
          }
        }
      },
      "post": {
        "tags": ["Donations"],
        "summary": "Create donation",
        "description": "Submit a new donation",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["type", "contact_email"],
                "properties": {
                  "type": {"type": "string", "enum": ["monetary", "food", "clothing", "other"]},
                  "amount": {"type": "number", "format": "float"},
                  "description": {"type": "string"},
                  "contact_email": {"type": "string", "format": "email"},
                  "contact_phone": {"type": "string"}
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Donation created successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/notifications": {
      "get": {
        "tags": ["Notifications"],
        "summary": "Get user notifications",
        "description": "Get paginated list of notifications for the current user",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
          {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 10}}
        ],
        "responses": {
          "200": {
            "description": "List of notifications",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/PaginatedResponse"}
              }
            }
          },
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/queue": {
      "get": {
        "tags": ["Queue Management"],
        "summary": "Get queue status",
        "description": "Get current queue status and waiting times",
        "responses": {
          "200": {
            "description": "Queue status",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          }
        }
      }
    },
    "/api/v1/feedback/submit": {
      "post": {
        "tags": ["Feedback"],
        "summary": "Submit visit feedback",
        "description": "Provide detailed feedback about the visit experience",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["visit_id", "overall_rating"],
                "properties": {
                  "visit_id": {"type": "integer"},
                  "overall_rating": {"type": "integer", "minimum": 1, "maximum": 5},
                  "staff_helpfulness": {"type": "integer", "minimum": 1, "maximum": 5},
                  "positive_comments": {"type": "string"},
                  "areas_for_improvement": {"type": "string"},
                  "would_recommend": {"type": "boolean"}
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Feedback submitted successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    }
  }
}`

// Register the swagger specification
func init() {
	swag.Register(swag.Name, &swag.Spec{
		InfoInstanceName: "swagger",
		SwaggerTemplate:  SwaggerSpec,
		LeftDelim:        "{{",
		RightDelim:       "}}",
	})
}

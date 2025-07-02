package docs

// SwaggerPaths contains all API endpoint definitions
var SwaggerPaths = `
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
    "/api/v1/ws-heartbeat": {
      "get": {
        "tags": ["WebSocket"],
        "summary": "WebSocket heartbeat",
        "description": "Simple endpoint to check if the WebSocket server is accessible",
        "responses": {
          "200": {
            "description": "WebSocket server is online",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {"type": "string", "example": "online"},
                    "timestamp": {"type": "string", "format": "date-time"},
                    "server_info": {"type": "object"}
                  }
                }
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
                    "verificationRequired": {"type": "boolean", "example": true},
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
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Logged out successfully"}
                  }
                }
              }
            }
          },
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
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
    "/api/v1/auth/refresh": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Refresh JWT token",
        "description": "Refresh access token using refresh token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refresh_token"],
                "properties": {
                  "refresh_token": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token refreshed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "access_token": {"type": "string"},
                    "token_type": {"type": "string", "example": "Bearer"},
                    "expires_in": {"type": "integer", "example": 3600}
                  }
                }
              }
            }
          },
          "401": {"description": "Invalid refresh token", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
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
          {"name": "category", "in": "query", "schema": {"type": "string", "enum": ["Food", "General"]}},
          {"name": "priority", "in": "query", "schema": {"type": "string", "enum": ["low", "medium", "high", "urgent"]}}
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
                  "category": {"type": "string", "enum": ["Food", "General"], "example": "Food"},
                  "description": {"type": "string", "example": "Need food assistance for family of 4"},
                  "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "example": "medium"},
                  "scheduled_date": {"type": "string", "format": "date", "example": "2024-01-15"},
                  "scheduled_time": {"type": "string", "example": "14:30"},
                  "notes": {"type": "string", "example": "Dietary restrictions: vegetarian"}
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
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Help request submitted successfully"},
                    "data": {"$ref": "#/components/schemas/HelpRequest"}
                  }
                }
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/help-requests/{id}": {
      "get": {
        "tags": ["Help Requests"],
        "summary": "Get help request details",
        "description": "Get detailed information about a specific help request",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "schema": {"type": "integer"}}
        ],
        "responses": {
          "200": {
            "description": "Help request details",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/HelpRequest"}
              }
            }
          },
          "404": {"description": "Help request not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      },
      "put": {
        "tags": ["Help Requests"],
        "summary": "Update help request",
        "description": "Update an existing help request",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "schema": {"type": "integer"}}
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "description": {"type": "string"},
                  "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                  "status": {"type": "string", "enum": ["pending", "in_progress", "completed", "cancelled"]},
                  "notes": {"type": "string"}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Help request updated successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "404": {"description": "Help request not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      },
      "delete": {
        "tags": ["Help Requests"],
        "summary": "Cancel help request",
        "description": "Cancel an existing help request",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "id", "in": "path", "required": true, "schema": {"type": "integer"}}
        ],
        "responses": {
          "200": {
            "description": "Help request cancelled successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "404": {"description": "Help request not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
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
      },
      "post": {
        "tags": ["Admin - User Management"],
        "summary": "Create new user",
        "description": "Create a new user account (admin only)",
        "security": [{"bearerAuth": []}],
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
            "description": "User created successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "400": {"description": "Invalid request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
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
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "data": {
                      "type": "object",
                      "properties": {
                        "totalUsers": {"type": "integer", "example": 1250},
                        "activeVolunteers": {"type": "integer", "example": 85},
                        "pendingHelpRequests": {"type": "integer", "example": 23},
                        "completedRequestsToday": {"type": "integer", "example": 15},
                        "totalDonations": {"type": "number", "example": 15750.50},
                        "monthlyStats": {"type": "object"},
                        "recentActivity": {"type": "array", "items": {"type": "object"}}
                      }
                    }
                  }
                }
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
    "/api/v1/volunteer/profile": {
      "get": {
        "tags": ["Volunteer Management"],
        "summary": "Get volunteer profile",
        "description": "Get current volunteer's profile information",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Volunteer profile",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Volunteer"}
              }
            }
          },
          "403": {"description": "Volunteer access required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      },
      "put": {
        "tags": ["Volunteer Management"],
        "summary": "Update volunteer profile",
        "description": "Update current volunteer's profile information",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "skills": {"type": "string"},
                  "availability": {"type": "string"},
                  "experience": {"type": "string"}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Profile updated successfully",
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
          {"name": "status", "in": "query", "schema": {"type": "string", "enum": ["pending", "completed", "cancelled"]}},
          {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
          {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 10}}
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
          {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 10}},
          {"name": "unread_only", "in": "query", "schema": {"type": "boolean", "default": false}}
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
    "/api/v1/notifications/{notificationId}/read": {
      "put": {
        "tags": ["Notifications"],
        "summary": "Mark notification as read",
        "description": "Mark a specific notification as read",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {"name": "notificationId", "in": "path", "required": true, "schema": {"type": "integer"}}
        ],
        "responses": {
          "200": {
            "description": "Notification marked as read",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "404": {"description": "Notification not found", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
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
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "data": {
                      "type": "object",
                      "properties": {
                        "food_queue": {"type": "array", "items": {"$ref": "#/components/schemas/QueueEntry"}},
                        "general_queue": {"type": "array", "items": {"$ref": "#/components/schemas/QueueEntry"}},
                        "estimated_wait_times": {
                          "type": "object",
                          "properties": {
                            "food": {"type": "string", "example": "15 minutes"},
                            "general": {"type": "string", "example": "10 minutes"}
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/queue/call-next": {
      "post": {
        "tags": ["Queue Management"],
        "summary": "Call next visitor",
        "description": "Call the next visitor in the specified queue (staff only)",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["category"],
                "properties": {
                  "category": {"type": "string", "enum": ["Food", "General"], "example": "Food"},
                  "staff_id": {"type": "integer", "example": 1}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Next visitor called successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "404": {"description": "No visitors in queue", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "403": {"description": "Staff access required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    },
    "/api/v1/documents": {
      "post": {
        "tags": ["Document Management"],
        "summary": "Upload document",
        "description": "Upload a document for verification",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": ["file", "document_type"],
                "properties": {
                  "file": {"type": "string", "format": "binary"},
                  "document_type": {"type": "string", "example": "ID Verification"},
                  "description": {"type": "string", "example": "Passport copy for identity verification"}
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Document uploaded successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/StandardResponse"}
              }
            }
          },
          "400": {"description": "Invalid file or request data", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
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
                  "needs_were_met": {"type": "boolean", "example": true}
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
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Thank you for your feedback!"},
                    "feedback": {"$ref": "#/components/schemas/VisitFeedback"}
                  }
                }
              }
            }
          },
          "400": {"description": "Invalid request or duplicate feedback", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}},
          "401": {"description": "Authentication required", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}}
        }
      }
    }
  }
`

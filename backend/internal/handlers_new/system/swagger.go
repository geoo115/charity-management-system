package system

import (
	"net/http"

	"github.com/geoo115/LDH/docs"

	"github.com/gin-gonic/gin"
)

// SwaggerSpec contains the OpenAPI 3.0 specification
var SwaggerSpec = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Lewishame Charity API",
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
      "description": "User authentication and account management"
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
      "name": "Visitor Management",
      "description": "Visitor services and check-in processes"
    },
    {
      "name": "Visitor Feedback",
      "description": "Visitor experience feedback system"
    },
    {
      "name": "Admin - Feedback Management",
      "description": "Administrative feedback review and response"
    },
    {
      "name": "Volunteers",
      "description": "Volunteer application and management"
    },
    {
      "name": "Volunteer Shifts",
      "description": "Shift scheduling and assignment"
    },
    {
      "name": "Donations",
      "description": "Donation tracking and management"
    },
    {
      "name": "Queue Management",
      "description": "Visitor queue and wait time management"
    },
    {
      "name": "Admin - Dashboard",
      "description": "Administrative dashboard and metrics"
    },
    {
      "name": "Admin - User Management",
      "description": "User account administration"
    },
    {
      "name": "Document Management",
      "description": "Document upload and verification"
    },
    {
      "name": "Emergency Support",
      "description": "Emergency request handling"
    },
    {
      "name": "Analytics",
      "description": "System analytics and insights"
    },
    {
      "name": "Communications",
      "description": "Messaging and notifications"
    },
    {
      "name": "Tickets",
      "description": "Ticket management and validation"
    },
    {
      "name": "Notifications",
      "description": "Notification preferences and delivery"
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
        "required": ["name", "email", "role"],
        "properties": {
          "id": {"type": "integer", "example": 1},
          "name": {"type": "string", "example": "John Smith"},
          "email": {"type": "string", "format": "email", "example": "john.smith@example.com"},
          "phone": {"type": "string", "example": "+44 20 1234 5678"},
          "address": {"type": "string", "example": "123 High Street, Lewisham"},
          "postcode": {"type": "string", "example": "SE13 6AB"},
          "role": {"type": "string", "enum": ["Admin", "Volunteer", "Donor", "Visitor"], "example": "Visitor"},
          "status": {"type": "string", "enum": ["active", "inactive", "pending", "pending_verification", "verification_rejected"], "example": "active"},
          "emailVerified": {"type": "boolean", "example": true},
          "dateOfBirth": {"type": "string", "format": "date", "example": "1990-05-15"},
          "emergencyContact": {"type": "string", "example": "John Doe - +44 20 9876 5432"},
          "dietaryRequirements": {"type": "string", "example": "Vegetarian, no nuts"},
          "householdSize": {"type": "integer", "example": 3},
          "createdAt": {"type": "string", "format": "date-time"},
          "updatedAt": {"type": "string", "format": "date-time"}
        }
      },
      "HelpRequest": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitorId": {"type": "integer", "example": 5},
          "reference": {"type": "string", "example": "HR-F-2024-001"},
          "visitorName": {"type": "string", "example": "Jane Doe"},
          "email": {"type": "string", "format": "email", "example": "jane.doe@example.com"},
          "phone": {"type": "string", "example": "+44 20 9876 5432"},
          "postcode": {"type": "string", "example": "SE13 7XY"},
          "category": {"type": "string", "enum": ["Food", "General", "Emergency"], "example": "Food"},
          "details": {"type": "string", "example": "Family of 4 needs weekly food support"},
          "visitDay": {"type": "string", "format": "date", "example": "2024-12-20"},
          "timeSlot": {"type": "string", "example": "10:00-11:00"},
          "urgencyLevel": {"type": "string", "enum": ["normal", "urgent", "emergency"], "example": "normal"},
          "householdSize": {"type": "integer", "example": 4},
          "specialRequirements": {"type": "string", "example": "Wheelchair access needed"},
          "dietaryRequirements": {"type": "string", "example": "Gluten-free options preferred"},
          "status": {"type": "string", "enum": ["Pending", "Approved", "TicketIssued", "Fulfilled", "Rejected", "Cancelled"], "example": "Pending"},
          "ticketNumber": {"type": "string", "nullable": true, "example": "LDH12200001"},
          "qrCode": {"type": "string", "nullable": true},
          "createdAt": {"type": "string", "format": "date-time"},
          "updatedAt": {"type": "string", "format": "date-time"}
        }
      },
      "VisitFeedback": {
        "type": "object",
        "required": ["visitId", "overallRating"],
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitorId": {"type": "integer", "example": 5},
          "visitId": {"type": "integer", "example": 10},
          "overallRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "staffHelpfulness": {"type": "integer", "minimum": 1, "maximum": 5, "example": 5},
          "waitTimeRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 3},
          "facilityRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "serviceSpeedRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
          "foodQualityRating": {"type": "integer", "minimum": 1, "maximum": 5, "nullable": true, "example": 4},
          "serviceCategory": {"type": "string", "example": "Food Support"},
          "positiveComments": {"type": "string", "example": "Very helpful staff, great selection of food"},
          "areasForImprovement": {"type": "string", "example": "Could improve wait time during peak hours"},
          "suggestions": {"type": "string", "example": "Maybe add more seating in waiting area"},
          "wouldRecommend": {"type": "boolean", "example": true},
          "feltWelcomed": {"type": "boolean", "example": true},
          "needsWereMet": {"type": "boolean", "example": true},
          "reviewStatus": {"type": "string", "enum": ["pending", "reviewed", "responded", "escalated", "resolved"], "example": "pending"},
          "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"], "example": "medium"},
          "adminResponse": {"type": "string", "nullable": true, "example": "Thank you for your feedback. We're working on reducing wait times."},
          "adminNotes": {"type": "string", "nullable": true},
          "visitDate": {"type": "string", "format": "date-time"},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "Donation": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "userId": {"type": "integer", "nullable": true, "example": 3},
          "name": {"type": "string", "example": "Anonymous Donor"},
          "contactEmail": {"type": "string", "format": "email", "example": "donor@example.com"},
          "contactPhone": {"type": "string", "example": "+44 20 1111 2222"},
          "type": {"type": "string", "enum": ["monetary", "goods"], "example": "monetary"},
          "amount": {"type": "number", "format": "float", "example": 50.00},
          "currency": {"type": "string", "default": "GBP", "example": "GBP"},
          "paymentMethod": {"type": "string", "example": "credit_card"},
          "goods": {"type": "string", "nullable": true, "example": "Canned foods, pasta, rice"},
          "quantity": {"type": "integer", "nullable": true, "example": 20},
          "categories": {"type": "array", "items": {"type": "string"}, "example": ["Non-perishable food", "Hygiene items"]},
          "dropoffScheduled": {"type": "boolean", "example": false},
          "dropoffDate": {"type": "string", "format": "date-time", "nullable": true},
          "status": {"type": "string", "enum": ["pending", "approved", "received", "rejected", "cancelled"], "example": "pending"},
          "receiptSent": {"type": "boolean", "example": false},
          "impactScore": {"type": "integer", "example": 85},
          "anonymous": {"type": "boolean", "example": false},
          "message": {"type": "string", "example": "Happy to help the community"},
          "dropoffPreferred": {"type": "boolean", "example": true},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "VolunteerApplication": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "name": {"type": "string", "example": "Sarah Volunteer"},
          "email": {"type": "string", "format": "email", "example": "sarah.volunteer@example.com"},
          "phone": {"type": "string", "example": "+44 20 3333 4444"},
          "skills": {"type": "array", "items": {"type": "string"}, "example": ["Food handling", "Customer service", "Languages"]},
          "experience": {"type": "string", "example": "2 years volunteering at local food bank"},
          "availability": {"type": "array", "items": {"type": "string"}, "example": ["Monday morning", "Wednesday afternoon", "Saturday"]},
          "status": {"type": "string", "enum": ["pending", "approved", "rejected"], "example": "pending"},
          "motivationStatement": {"type": "string", "example": "I want to help my local community"},
          "references": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "relationship": {"type": "string"},
                "phone": {"type": "string"},
                "email": {"type": "string"}
              }
            }
          },
          "dbsCheckStatus": {"type": "string", "enum": ["not_required", "pending", "approved", "expired"], "example": "pending"},
          "dbsCheckConsent": {"type": "boolean", "example": true},
          "termsAccepted": {"type": "boolean", "example": true},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "Shift": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "date": {"type": "string", "format": "date", "example": "2024-12-20"},
          "startTime": {"type": "string", "format": "time", "example": "09:00"},
          "endTime": {"type": "string", "format": "time", "example": "13:00"},
          "location": {"type": "string", "example": "Main Distribution Center"},
          "role": {"type": "string", "example": "Food Distribution Assistant"},
          "description": {"type": "string", "example": "Assist with food distribution and visitor services"},
          "requirements": {"type": "string", "example": "Food hygiene certificate required"},
          "maxVolunteers": {"type": "integer", "example": 4},
          "assignedVolunteers": {"type": "integer", "example": 2},
          "assignedVolunteerID": {"type": "integer", "nullable": true, "example": 7},
          "status": {"type": "string", "enum": ["open", "full", "cancelled"], "example": "open"},
          "notes": {"type": "string", "example": "Looking forward to helping!"},
          "specialRequirements": {"type": "string", "example": "Require parking space"},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "UrgentNeed": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "name": {"type": "string", "example": "Tinned Vegetables"},
          "category": {"type": "string", "example": "Food - Canned Goods"},
          "urgency": {"type": "string", "enum": ["Low", "Medium", "High", "Critical"], "example": "High"},
          "currentStock": {"type": "integer", "example": 5},
          "targetStock": {"type": "integer", "example": 50},
          "minimumStock": {"type": "integer", "example": 10},
          "description": {"type": "string", "example": "Running low on tinned vegetables - high demand item"},
          "isUrgent": {"type": "boolean", "example": true},
          "estimatedNeedDate": {"type": "string", "format": "date", "example": "2024-12-25"},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "Visit": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitorId": {"type": "integer", "example": 5},
          "ticketId": {"type": "integer", "nullable": true, "example": 10},
          "checkInTime": {"type": "string", "format": "date-time", "example": "2024-12-20T10:30:00Z"},
          "checkOutTime": {"type": "string", "format": "date-time", "nullable": true, "example": "2024-12-20T11:15:00Z"},
          "status": {"type": "string", "enum": ["checked_in", "in_service", "completed", "no_show"], "example": "completed"},
          "serviceType": {"type": "string", "example": "Food Support"},
          "itemsReceived": {"type": "array", "items": {"type": "string"}, "example": ["Fresh vegetables", "Canned goods", "Bread"]},
          "duration": {"type": "integer", "nullable": true, "example": 45, "description": "Duration in minutes"},
          "notes": {"type": "string", "example": "Visitor requested gluten-free options"},
          "staffMember": {"type": "string", "example": "John Staff"},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "Ticket": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "ticketNumber": {"type": "string", "example": "LDH12200001"},
          "visitorId": {"type": "integer", "example": 5},
          "helpRequestId": {"type": "integer", "example": 3},
          "category": {"type": "string", "example": "Food"},
          "visitDate": {"type": "string", "format": "date", "example": "2024-12-20"},
          "timeSlot": {"type": "string", "example": "10:00-11:00"},
          "status": {"type": "string", "enum": ["issued", "used", "expired", "cancelled"], "example": "issued"},
          "qrCode": {"type": "string", "example": "LDH-TICKET:LDH12200001:checkin:2024-12-20"},
          "specialInstructions": {"type": "string", "nullable": true, "example": "Requires wheelchair access"},
          "issuedAt": {"type": "string", "format": "date-time"},
          "usedAt": {"type": "string", "format": "date-time", "nullable": true},
          "expiresAt": {"type": "string", "format": "date-time"}
        }
      },
      "QueueEntry": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitorId": {"type": "integer", "example": 5},
          "visitId": {"type": "integer", "example": 10},
          "ticketNumber": {"type": "string", "example": "LDH12200001"},
          "category": {"type": "string", "example": "Food"},
          "position": {"type": "integer", "example": 3},
          "estimatedWaitTime": {"type": "integer", "example": 15, "description": "Estimated wait time in minutes"},
          "status": {"type": "string", "enum": ["waiting", "called", "served", "no_show"], "example": "waiting"},
          "priority": {"type": "string", "enum": ["normal", "urgent", "emergency"], "example": "normal"},
          "joinedAt": {"type": "string", "format": "date-time"},
          "calledAt": {"type": "string", "format": "date-time", "nullable": true},
          "servedAt": {"type": "string", "format": "date-time", "nullable": true}
        }
      },
      "Document": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "userId": {"type": "integer", "example": 5},
          "type": {"type": "string", "enum": ["photo_id", "proof_address", "proof_income", "medical_certificate"], "example": "photo_id"},
          "filename": {"type": "string", "example": "passport_john_smith.pdf"},
          "originalFilename": {"type": "string", "example": "My Passport.pdf"},
          "filePath": {"type": "string", "example": "/uploads/documents/2024/12/passport_john_smith.pdf"},
          "fileSize": {"type": "integer", "example": 2048576, "description": "File size in bytes"},
          "mimeType": {"type": "string", "example": "application/pdf"},
          "status": {"type": "string", "enum": ["pending", "approved", "rejected"], "example": "pending"},
          "description": {"type": "string", "nullable": true, "example": "UK Passport - expires 2030"},
          "rejectionReason": {"type": "string", "nullable": true},
          "verifiedBy": {"type": "integer", "nullable": true, "example": 1},
          "uploadedAt": {"type": "string", "format": "date-time"},
          "verifiedAt": {"type": "string", "format": "date-time", "nullable": true}
        }
      },
      "AdminMetrics": {
        "type": "object",
        "properties": {
          "donations": {
            "type": "object",
            "properties": {
              "totalToday": {"type": "integer", "example": 12},
              "totalThisWeek": {"type": "integer", "example": 89},
              "totalThisMonth": {"type": "integer", "example": 234},
              "totalAmount": {"type": "number", "example": 15750.50},
              "averageDonation": {"type": "number", "example": 67.31}
            }
          },
          "helpRequests": {
            "type": "object",
            "properties": {
              "pending": {"type": "integer", "example": 15},
              "approved": {"type": "integer", "example": 45},
              "total": {"type": "integer", "example": 78},
              "emergency": {"type": "integer", "example": 3},
              "avgProcessingTime": {"type": "number", "example": 18.5, "description": "Average processing time in hours"}
            }
          },
          "volunteers": {
            "type": "object",
            "properties": {
              "active": {"type": "integer", "example": 25},
              "pending": {"type": "integer", "example": 7},
              "totalHours": {"type": "number", "example": 156.5},
              "shiftCoverage": {"type": "number", "example": 89.2, "description": "Percentage of shifts covered"}
            }
          },
          "visitors": {
            "type": "object",
            "properties": {
              "total": {"type": "integer", "example": 1247},
              "verified": {"type": "integer", "example": 1156},
              "activeThisMonth": {"type": "integer", "example": 456},
              "newRegistrations": {"type": "integer", "example": 23}
            }
          },
          "feedback": {
            "type": "object",
            "properties": {
              "totalFeedback": {"type": "integer", "example": 145},
              "averageRating": {"type": "number", "example": 4.2},
              "responseRate": {"type": "number", "example": 67.3, "description": "Percentage of visitors who provide feedback"},
              "priorityItems": {"type": "integer", "example": 8}
            }
          }
        }
      },
      "FeedbackAnalytics": {
        "type": "object",
        "properties": {
          "overview": {
            "type": "object",
            "properties": {
              "totalFeedback": {"type": "integer", "example": 145},
              "avgOverallRating": {"type": "number", "example": 4.2},
              "avgStaffRating": {"type": "number", "example": 4.6},
              "avgWaitTimeRating": {"type": "number", "example": 3.8},
              "avgFacilityRating": {"type": "number", "example": 4.1},
              "avgServiceSpeedRating": {"type": "number", "example": 4.0}
            }
          },
          "experienceMetrics": {
            "type": "object",
            "properties": {
              "wouldRecommendPercentage": {"type": "number", "example": 89.2},
              "feltWelcomedPercentage": {"type": "number", "example": 94.5},
              "needsMetPercentage": {"type": "number", "example": 87.8}
            }
          },
          "categoryBreakdown": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "properties": {
                "count": {"type": "integer"},
                "averageRating": {"type": "number"}
              }
            }
          },
          "priorityFeedback": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {"type": "integer"},
                "overallRating": {"type": "integer"},
                "reviewStatus": {"type": "string"},
                "createdAt": {"type": "string", "format": "date-time"}
              }
            }
          }
        }
      },
      "Notification": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "userId": {"type": "integer", "example": 5},
          "type": {"type": "string", "enum": ["email", "sms", "in_app", "push"], "example": "email"},
          "title": {"type": "string", "example": "Help Request Approved"},
          "message": {"type": "string", "example": "Your help request has been approved. Ticket number: LDH12200001"},
          "status": {"type": "string", "enum": ["pending", "sent", "delivered", "failed"], "example": "delivered"},
          "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"], "example": "medium"},
          "category": {"type": "string", "example": "help_request"},
          "metadata": {"type": "object", "nullable": true},
          "scheduledFor": {"type": "string", "format": "date-time", "nullable": true},
          "sentAt": {"type": "string", "format": "date-time", "nullable": true},
          "readAt": {"type": "string", "format": "date-time", "nullable": true},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "AuditLog": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "userId": {"type": "integer", "example": 5},
          "action": {"type": "string", "example": "help_request_approved"},
          "resource": {"type": "string", "example": "help_request"},
          "resourceId": {"type": "integer", "example": 123},
          "details": {"type": "object", "nullable": true},
          "ipAddress": {"type": "string", "example": "192.168.1.1"},
          "userAgent": {"type": "string", "example": "Mozilla/5.0..."},
          "timestamp": {"type": "string", "format": "date-time"}
        }
      },
      "EmergencyRequest": {
        "type": "object",
        "properties": {
          "id": {"type": "integer", "example": 1},
          "visitorId": {"type": "integer", "example": 5},
          "category": {"type": "string", "enum": ["Food", "Housing", "Safety", "Medical"], "example": "Food"},
          "urgencyReason": {"type": "string", "example": "No food for next meal"},
          "description": {"type": "string", "example": "Family with young children has no food"},
          "contactPhone": {"type": "string", "example": "+44 20 1234 5678"},
          "status": {"type": "string", "enum": ["submitted", "reviewing", "approved", "in_progress", "resolved"], "example": "submitted"},
          "reviewedBy": {"type": "integer", "nullable": true},
          "reviewNotes": {"type": "string", "nullable": true},
          "resolvedAt": {"type": "string", "format": "date-time", "nullable": true},
          "createdAt": {"type": "string", "format": "date-time"}
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": {"type": "string", "example": "Validation failed"},
          "message": {"type": "string", "example": "The provided data is invalid"},
          "code": {"type": "integer", "example": 400},
          "details": {"type": "object", "nullable": true}
        }
      },
      "SuccessResponse": {
        "type": "object",
        "properties": {
          "success": {"type": "boolean", "example": true},
          "message": {"type": "string", "example": "Operation completed successfully"},
          "data": {"type": "object", "nullable": true}
        }
      }
    }
  },
  "paths": {
    "/auth/register": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Register a new user",
        "description": "Create a new user account with email verification requirement",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "password", "role"],
                "properties": {
                  "name": {"type": "string", "example": "Sarah Visitor"},
                  "email": {"type": "string", "format": "email", "example": "sarah@example.com"},
                  "password": {"type": "string", "minLength": 8, "example": "strongPassword123"},
                  "role": {"type": "string", "enum": ["Admin", "Volunteer", "Donor", "Visitor"], "example": "Visitor"},
                  "phone": {"type": "string", "example": "+44 20 1234 5678"},
                  "address": {"type": "string", "example": "123 High Street, Lewisham"},
                  "postcode": {"type": "string", "example": "SE13 6AB"},
                  "dateOfBirth": {"type": "string", "format": "date", "example": "1990-05-15"},
                  "emergencyContact": {"type": "string", "example": "John Doe - +44 20 9876 5432"},
                  "dietaryRequirements": {"type": "string", "example": "Vegetarian, no nuts"},
                  "householdSize": {"type": "integer", "example": 3}
                }
              }
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
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Registration successful. Please check your email to verify your account."},
                    "userId": {"type": "integer", "example": 123},
                    "verificationRequired": {"type": "boolean", "example": true}
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid input or email already exists",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "tags": ["Authentication"],
        "summary": "User login",
        "description": "Authenticate user and return JWT tokens",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": {"type": "string", "format": "email", "example": "sarah@example.com"},
                  "password": {"type": "string", "example": "strongPassword123"},
                  "rememberMe": {"type": "boolean", "example": false}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Login successful"},
                    "token": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
                    "refreshToken": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
                    "user": {"$ref": "#/components/schemas/User"},
                    "expiresIn": {"type": "integer", "example": 86400}
                  }
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials or account not verified",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "tags": ["Authentication"],
        "summary": "User logout",
        "description": "Invalidate user tokens and logout",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Logout successful",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/SuccessResponse"}
              }
            }
          }
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Refresh access token",
        "description": "Get new access token using refresh token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refreshToken"],
                "properties": {
                  "refreshToken": {"type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
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
                    "token": {"type": "string"},
                    "refreshToken": {"type": "string"},
                    "expiresIn": {"type": "integer"}
                  }
                }
              }
            }
          }
        }
      }
    },
    "/help-requests": {
      "post": {
        "tags": ["Help Requests"],
        "summary": "Create a new help request",
        "description": "Submit a request for support services",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["category", "details", "visitDay", "timeSlot"],
                "properties": {
                  "category": {"type": "string", "enum": ["Food", "General", "Emergency"], "example": "Food"},
                  "details": {"type": "string", "example": "Family of 4 needs weekly food support"},
                  "visitDay": {"type": "string", "format": "date", "example": "2024-12-20"},
                  "timeSlot": {"type": "string", "example": "10:00-11:00"},
                  "urgencyLevel": {"type": "string", "enum": ["normal", "urgent", "emergency"], "example": "normal"},
                  "householdSize": {"type": "integer", "example": 4},
                  "specialRequirements": {"type": "string", "example": "Wheelchair access needed"},
                  "dietaryRequirements": {"type": "string", "example": "Gluten-free options preferred"}
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
                    "helpRequest": {"$ref": "#/components/schemas/HelpRequest"},
                    "reference": {"type": "string", "example": "HR-F-2024-001"},
                    "estimatedProcessingTime": {"type": "string", "example": "24 hours"}
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request or eligibility check failed",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      },
      "get": {
        "tags": ["Help Requests"],
        "summary": "List help requests",
        "description": "Get help requests (admin: all requests, user: own requests)",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {"type": "string", "enum": ["Pending", "Approved", "TicketIssued", "Fulfilled", "Rejected", "Cancelled"]},
            "description": "Filter by status"
          },
          {
            "name": "category",
            "in": "query",
            "schema": {"type": "string", "enum": ["Food", "General", "Emergency"]},
            "description": "Filter by category"
          },
          {
            "name": "page",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "default": 1}
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
          }
        ],
        "responses": {
          "200": {
            "description": "List of help requests",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "helpRequests": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/HelpRequest"}
                    },
                    "pagination": {
                      "type": "object",
                      "properties": {
                        "page": {"type": "integer"},
                        "limit": {"type": "integer"},
                        "total": {"type": "integer"},
                        "totalPages": {"type": "integer"}
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
    "/feedback/submit": {
      "post": {
        "tags": ["Visitor Feedback"],
        "summary": "Submit comprehensive visit feedback",
        "description": "Provide detailed feedback about the visit experience",
        "security": [{"bearerAuth": []}],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["visitId", "overallRating"],
                "properties": {
                  "visitId": {"type": "integer", "example": 10},
                  "overallRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
                  "staffHelpfulness": {"type": "integer", "minimum": 1, "maximum": 5, "example": 5},
                  "waitTimeRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 3},
                  "facilityRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
                  "serviceSpeedRating": {"type": "integer", "minimum": 1, "maximum": 5, "example": 4},
                  "foodQualityRating": {"type": "integer", "minimum": 1, "maximum": 5, "nullable": true, "example": 4},
                  "serviceCategory": {"type": "string", "example": "Food Support"},
                  "positiveComments": {"type": "string", "example": "Very helpful staff, great selection of food"},
                  "areasForImprovement": {"type": "string", "example": "Could improve wait time during peak hours"},
                  "suggestions": {"type": "string", "example": "Maybe add more seating in waiting area"},
                  "wouldRecommend": {"type": "boolean", "example": true},
                  "feltWelcomed": {"type": "boolean", "example": true},
                  "needsWereMet": {"type": "boolean", "example": true}
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
          "400": {
            "description": "Invalid request or duplicate feedback",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      }
    },
    "/feedback/history": {
      "get": {
        "tags": ["Visitor Feedback"],
        "summary": "Get visitor's feedback history",
        "description": "Retrieve all feedback submitted by the authenticated visitor",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "default": 1}
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10}
          }
        ],
        "responses": {
          "200": {
            "description": "Feedback history retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "feedback": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/VisitFeedback"}
                    },
                    "pagination": {
                      "type": "object",
                      "properties": {
                        "page": {"type": "integer"},
                        "limit": {"type": "integer"},
                        "total": {"type": "integer"}
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
    "/admin/feedback": {
      "get": {
        "tags": ["Admin - Feedback Management"],
        "summary": "Get all feedback (Admin only)",
        "description": "Retrieve all visitor feedback with advanced filtering options",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "default": 1}
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
          },
          {
            "name": "status",
            "in": "query",
            "schema": {"type": "string", "enum": ["pending", "reviewed", "responded", "escalated", "resolved"]},
            "description": "Filter by review status"
          },
          {
            "name": "rating",
            "in": "query",
            "schema": {"type": "integer", "minimum": 1, "maximum": 5},
            "description": "Filter by overall rating"
          },
          {
            "name": "category",
            "in": "query",
            "schema": {"type": "string"},
            "description": "Filter by service category"
          },
          {
            "name": "from_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Filter feedback from this date"
          },
          {
            "name": "to_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Filter feedback to this date"
          }
        ],
        "responses": {
          "200": {
            "description": "Feedback list retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "feedback": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/VisitFeedback"}
                    },
                    "pagination": {
                      "type": "object",
                      "properties": {
                        "page": {"type": "integer"},
                        "limit": {"type": "integer"},
                        "total": {"type": "integer"},
                        "totalPages": {"type": "integer"}
                      }
                    },
                    "summary": {
                      "type": "object",
                      "properties": {
                        "averageRating": {"type": "number"},
                        "totalFeedback": {"type": "integer"},
                        "pendingReview": {"type": "integer"}
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
    "/admin/feedback/{feedback_id}/status": {
      "put": {
        "tags": ["Admin - Feedback Management"],
        "summary": "Update feedback review status",
        "description": "Update the review status and provide admin response",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "feedback_id",
            "in": "path",
            "required": true,
            "schema": {"type": "integer"},
            "description": "Feedback ID"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["review_status"],
                "properties": {
                  "review_status": {
                    "type": "string",
                    "enum": ["pending", "reviewed", "responded", "escalated", "resolved"],
                    "example": "responded"
                  },
                  "admin_response": {
                    "type": "string",
                    "example": "Thank you for your feedback. We're working on reducing wait times and have ordered additional seating."
                  },
                  "admin_notes": {
                    "type": "string",
                    "example": "Discussed wait time improvements with operations team. New seating ordered for delivery next week."
                  },
                  "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "example": "medium"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Feedback updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Feedback status updated successfully"},
                    "feedback": {"$ref": "#/components/schemas/VisitFeedback"}
                  }
                }
              }
            }
          },
          "404": {
            "description": "Feedback not found",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      }
    },
    "/admin/feedback/analytics": {
      "get": {
        "tags": ["Admin - Feedback Management"],
        "summary": "Get comprehensive feedback analytics",
        "description": "Retrieve detailed analytics and insights from visitor feedback",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "from_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Analytics from this date (defaults to 30 days ago)"
          },
          {
            "name": "to_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Analytics to this date (defaults to today)"
          },
          {
            "name": "category",
            "in": "query",
            "schema": {"type": "string"},
            "description": "Filter analytics by service category"
          }
        ],
        "responses": {
          "200": {
            "description": "Analytics retrieved successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/FeedbackAnalytics"}
              }
            }
          }
        }
      }
    },
    "/volunteers/apply": {
      "post": {
        "tags": ["Volunteers"],
        "summary": "Submit volunteer application",
        "description": "Apply to become a volunteer with the organization",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "email", "phone", "skills", "availability", "password", "termsAccepted"],
                "properties": {
                  "name": {"type": "string", "example": "Sarah Volunteer"},
                  "email": {"type": "string", "format": "email", "example": "sarah.volunteer@example.com"},
                  "phone": {"type": "string", "example": "+44 20 3333 4444"},
                  "skills": {"type": "array", "items": {"type": "string"}, "example": ["Food handling", "Customer service"]},
                  "experience": {"type": "string", "example": "2 years volunteering at local food bank"},
                  "availability": {"type": "array", "items": {"type": "string"}, "example": ["Monday morning", "Wednesday afternoon"]},
                  "motivationStatement": {"type": "string", "example": "I want to help my local community"},
                  "password": {"type": "string", "minLength": 8, "example": "volunteerPass123"},
                  "termsAccepted": {"type": "boolean", "example": true},
                  "dbsCheckConsent": {"type": "boolean", "example": true},
                  "references": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": {"type": "string"},
                        "relationship": {"type": "string"},
                        "phone": {"type": "string"},
                        "email": {"type": "string"}
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Application submitted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Volunteer application submitted successfully"},
                    "application": {"$ref": "#/components/schemas/VolunteerApplication"},
                    "nextSteps": {"type": "string", "example": "We will review your application and contact you within 5 business days"}
                  }
                }
              }
            }
          }
        }
      }
    },
    "/volunteer/shifts/available": {
      "get": {
        "tags": ["Volunteer Shifts"],
        "summary": "Get available shifts for volunteers",
        "description": "Retrieve shifts available for volunteer signup",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "from_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Get shifts from this date"
          },
          {
            "name": "to_date",
            "in": "query",
            "schema": {"type": "string", "format": "date"},
            "description": "Get shifts to this date"
          },
          {
            "name": "role",
            "in": "query",
            "schema": {"type": "string"},
            "description": "Filter by volunteer role"
          }
        ],
        "responses": {
          "200": {
            "description": "List of available shifts",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "shifts": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Shift"}
                    },
                    "total": {"type": "integer"}
                  }
                }
              }
            }
          }
        }
      }
    },
    "/volunteer/shifts/{id}/signup": {
      "post": {
        "tags": ["Volunteer Shifts"],
        "summary": "Sign up for a shift",
        "description": "Register for an available volunteer shift",
        "security": [{"bearerAuth": []}],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {"type": "integer"},
            "description": "Shift ID"
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "notes": {"type": "string", "example": "Looking forward to helping!"},
                  "specialRequirements": {"type": "string", "example": "Require parking space"}
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successfully signed up for shift",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {"type": "boolean", "example": true},
                    "message": {"type": "string", "example": "Successfully signed up for shift"},
                    "shift": {"$ref": "#/components/schemas/Shift"}
                  }
                }
              }
            }
          },
          "400": {
            "description": "Shift full or conflict with existing assignment",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
              }
            }
          }
        }
      }
    },
    "/admin/dashboard": {
      "get": {
        "tags": ["Admin - Dashboard"],
        "summary": "Get admin dashboard metrics",
        "description": "Retrieve comprehensive dashboard data for administrators",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Dashboard metrics retrieved successfully",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/AdminMetrics"}
              }
            }
          }
        }
      }
    },
    "/queue": {
      "get": {
        "tags": ["Queue Management"],
        "summary": "Get current queue status",
        "description": "Retrieve real-time queue information",
        "security": [{"bearerAuth": []}],
        "responses": {
          "200": {
            "description": "Queue status retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "queue": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/QueueEntry"}
                    },
                    "totalWaiting": {"type": "integer", "example": 12},
                    "averageWaitTime": {"type": "integer", "example": 25},
                    "nextEstimatedCallTime": {"type": "string", "format": "date-time"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`

// ServeSwaggerSpec serves the OpenAPI specification
func ServeSwaggerSpec(c *gin.Context) {
	spec := docs.SwaggerSpec
	c.Header("Content-Type", "application/json")
	c.String(http.StatusOK, spec)
}

// ServeSwaggerUI serves the Swagger UI HTML
func ServeSwaggerUI(c *gin.Context) {
	html := `<!DOCTYPE html>
<html>
<head>
  <title>Lewishame Charity API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        displayRequestDuration: true,
        docExpansion: "none",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`
	c.Header("Content-Type", "text/html")
	c.String(http.StatusOK, html)
}

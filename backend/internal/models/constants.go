package models

// Status constants used across multiple models
const (
	StatusPending      = "pending"
	StatusActive       = "active"
	StatusInactive     = "inactive"
	StatusSuspended    = "suspended"
	StatusApproved     = "approved"
	StatusRejected     = "rejected"
	StatusCompleted    = "completed"
	StatusCancelled    = "cancelled"
	StatusExpired      = "expired"
	StatusProcessing   = "processing"
	StatusFailed       = "failed"
	StatusDeactivated  = "deactivated"
	StatusCheckedIn    = "checked_in"
	StatusTicketIssued = "ticket_issued"
	StatusReceived     = "received"
	StatusProcessed    = "processed"
)

// Priority levels used across models
const (
	PriorityLow      = "low"
	PriorityNormal   = "normal"
	PriorityMedium   = "medium"
	PriorityHigh     = "high"
	PriorityUrgent   = "urgent"
	PriorityCritical = "critical"
)

// User roles - centralized
const (
	RoleAdmin      = "admin"
	RoleStaff      = "staff"
	RoleVolunteer  = "volunteer"
	RoleDonor      = "donor"
	RoleVisitor    = "visitor"
	RoleSuperAdmin = "super_admin"
	RoleUser       = "user"
)

// Legacy role constants for backward compatibility
const (
	RoleAdminLegacy      = "Admin"
	RoleStaffLegacy      = "Staff"
	RoleVolunteerLegacy  = "Volunteer"
	RoleDonorLegacy      = "Donor"
	RoleVisitorLegacy    = "Visitor"
	RoleSuperAdminLegacy = "SuperAdmin"
	RoleUserLegacy       = "User"
)

// Notification types
const (
	NotificationTypeEmail  = "email"
	NotificationTypeSMS    = "sms"
	NotificationTypePush   = "push"
	NotificationTypeInApp  = "in_app"
	NotificationTypeSystem = "system"
)

// Service categories
const (
	CategoryFood      = "food"
	CategoryGeneral   = "general"
	CategoryEmergency = "emergency"
	CategorySupport   = "support"
)

// Legacy category constants for backward compatibility
const (
	CategoryFoodLegacy    = "Food"
	CategoryGeneralLegacy = "General"
)

// Help Request Status constants
const (
	HelpRequestStatusPending      = "pending"
	HelpRequestStatusApproved     = "approved"
	HelpRequestStatusRejected     = "rejected"
	HelpRequestStatusTicketIssued = "ticket_issued"
	HelpRequestStatusCheckedIn    = "checked_in"
	HelpRequestStatusCompleted    = "completed"
	HelpRequestStatusCancelled    = "cancelled"
)

// Volunteer Role Level constants
const (
	VolunteerRoleGeneral     = "general"
	VolunteerRoleSpecialized = "specialized"
	VolunteerRoleLead        = "lead"
)

// Volunteer Status constants
const (
	VolunteerStatusActive    = "active"
	VolunteerStatusInactive  = "inactive"
	VolunteerStatusSuspended = "suspended"
	VolunteerStatusTraining  = "training"
)

// Volunteer Shift Status constants
const (
	VolunteerShiftStatusAssigned   = "assigned"
	VolunteerShiftStatusConfirmed  = "confirmed"
	VolunteerShiftStatusCompleted  = "completed"
	VolunteerShiftStatusCancelled  = "cancelled"
	VolunteerShiftStatusNoShow     = "no_show"
	VolunteerShiftStatusReassigned = "reassigned"
)

// Donation types
const (
	DonationTypeMoney = "money"
	DonationTypeGoods = "goods"
	DonationTypeTime  = "time"
)

// Verification types
const (
	VerificationTypeEmail = "email"
	VerificationTypePhone = "phone"
)

// Verification status constants
const (
	VerificationStatusPending   = "pending"
	VerificationStatusCompleted = "completed"
	VerificationStatusExpired   = "expired"
	VerificationStatusFailed    = "failed"
)

// System configuration keys
const (
	ConfigOperatingHours        = "operating_hours"
	ConfigOperatingDays         = "operating_days"
	ConfigMaxDailyFoodVisits    = "max_daily_food_visits"
	ConfigMaxDailyGeneralVisits = "max_daily_general_visits"
	ConfigFoodVisitInterval     = "food_visit_interval_days"
	ConfigGeneralVisitInterval  = "general_visit_interval_days"
	ConfigAllowedPostcodes      = "allowed_postcodes"
	ConfigQueueOpenTime         = "queue_open_time"
	ConfigTicketValidityHours   = "ticket_validity_hours"
)

// Configuration value types
const (
	ConfigTypeString = "string"
	ConfigTypeInt    = "int"
	ConfigTypeBool   = "bool"
	ConfigTypeJSON   = "json"
	ConfigTypeFloat  = "float"
	ConfigTypeDate   = "date"
	ConfigTypeTime   = "time"
)

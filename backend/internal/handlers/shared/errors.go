package shared

import "errors"

// Common handler errors
var (
	// User-related errors
	ErrUserNotFound  = errors.New("user not found in context")
	ErrInvalidUserID = errors.New("invalid user ID format")
	ErrRoleNotFound  = errors.New("user role not found in context")
	ErrInvalidRole   = errors.New("invalid user role format")

	// Parameter errors
	ErrMissingID    = errors.New("missing ID parameter")
	ErrInvalidID    = errors.New("invalid ID format")
	ErrMissingParam = errors.New("missing required parameter")
	ErrInvalidParam = errors.New("invalid parameter format")

	// Authentication errors
	ErrUnauthorized = errors.New("unauthorized access")
	ErrForbidden    = errors.New("forbidden access")
	ErrInvalidToken = errors.New("invalid authentication token")
	ErrExpiredToken = errors.New("authentication token expired")

	// Validation errors
	ErrValidationFailed = errors.New("validation failed")
	ErrInvalidInput     = errors.New("invalid input data")
	ErrMissingField     = errors.New("missing required field")

	// Database errors
	ErrDatabaseConnection = errors.New("database connection failed")
	ErrRecordNotFound     = errors.New("record not found")
	ErrDuplicateRecord    = errors.New("duplicate record")
	ErrDatabaseQuery      = errors.New("database query failed")

	// Business logic errors
	ErrInsufficientPermissions = errors.New("insufficient permissions")
	ErrOperationNotAllowed     = errors.New("operation not allowed")
	ErrResourceConflict        = errors.New("resource conflict")
	ErrQuotaExceeded           = errors.New("quota exceeded")
)

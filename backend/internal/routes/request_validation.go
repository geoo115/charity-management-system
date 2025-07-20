package routes

import (
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ValidationMiddleware provides comprehensive input validation
type ValidationMiddleware struct {
	validator *validator.Validate
	config    *ValidationConfig
}

// NewValidationMiddleware creates a new validation middleware
func NewValidationMiddleware(config *ValidationConfig) *ValidationMiddleware {
	v := validator.New()

	// Register custom validators
	v.RegisterValidation("phone", validatePhoneNumber)
	v.RegisterValidation("postcode", validatePostcode)
	v.RegisterValidation("safe_string", validateSafeString)
	v.RegisterValidation("no_sql_injection", func(fl validator.FieldLevel) bool {
		return validateNoSQLInjectionField(fl.Field().String())
	})
	v.RegisterValidation("alphanumeric_space", validateAlphanumericSpace)

	return &ValidationMiddleware{
		validator: v,
		config:    config,
	}
}

// ValidateRequest provides comprehensive request validation
func (vm *ValidationMiddleware) ValidateRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip validation for certain routes
		if vm.shouldSkipValidation(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Validate request size
		if err := vm.validateRequestSize(c); err != nil {
			vm.sendValidationError(c, "REQUEST_TOO_LARGE", err.Error(), nil)
			return
		}

		// Validate headers
		if err := vm.validateHeaders(c); err != nil {
			vm.sendValidationError(c, "INVALID_HEADERS", err.Error(), nil)
			return
		}

		// Validate query parameters
		if err := vm.validateQueryParams(c); err != nil {
			vm.sendValidationError(c, "INVALID_QUERY_PARAMS", err.Error(), nil)
			return
		}

		// Validate path parameters
		if err := vm.validatePathParams(c); err != nil {
			vm.sendValidationError(c, "INVALID_PATH_PARAMS", err.Error(), nil)
			return
		}

		c.Next()
	}
}

// ValidateAndBind validates and binds JSON input with comprehensive error reporting
func (vm *ValidationMiddleware) ValidateAndBind(obj interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bind JSON
		if err := c.ShouldBindJSON(obj); err != nil {
			details := map[string]interface{}{
				"error": err.Error(),
				"type":  "json_binding",
			}
			vm.sendValidationError(c, "INVALID_JSON", "Invalid JSON format", details)
			return
		}

		// Sanitize input
		vm.sanitizeStruct(obj)

		// Validate struct
		if err := vm.validator.Struct(obj); err != nil {
			validationErrors := vm.formatValidationErrors(err)
			vm.sendValidationError(c, "VALIDATION_FAILED", "Input validation failed", validationErrors)
			return
		}

		// Store validated object in context
		c.Set("validatedInput", obj)
		c.Next()
	}
}

// ================================================================
// VALIDATION FUNCTIONS
// ================================================================

// validateRequestSize checks if request size is within limits
func (vm *ValidationMiddleware) validateRequestSize(c *gin.Context) error {
	if c.Request.ContentLength > vm.config.MaxRequestSize {
		return fmt.Errorf("request size %d exceeds maximum allowed size %d",
			c.Request.ContentLength, vm.config.MaxRequestSize)
	}
	return nil
}

// validateHeaders validates required headers
func (vm *ValidationMiddleware) validateHeaders(c *gin.Context) error {
	for _, header := range vm.config.RequiredHeaders {
		if c.GetHeader(header) == "" {
			return fmt.Errorf("required header '%s' is missing", header)
		}
	}

	// Validate Content-Type for POST/PUT requests
	if c.Request.Method == "POST" || c.Request.Method == "PUT" {
		contentType := c.GetHeader("Content-Type")
		if contentType != "" && !strings.Contains(contentType, "application/json") {
			return fmt.Errorf("invalid content type: %s", contentType)
		}
	}

	return nil
}

// validateQueryParams validates query parameters for malicious content
func (vm *ValidationMiddleware) validateQueryParams(c *gin.Context) error {
	for key, values := range c.Request.URL.Query() {
		// Validate key
		if err := vm.validateParameterName(key); err != nil {
			return fmt.Errorf("invalid query parameter name '%s': %v", key, err)
		}

		// Validate values
		for _, value := range values {
			if err := vm.validateParameterValue(value); err != nil {
				return fmt.Errorf("invalid query parameter value for '%s': %v", key, err)
			}
		}
	}
	return nil
}

// validatePathParams validates path parameters
func (vm *ValidationMiddleware) validatePathParams(c *gin.Context) error {
	// Get path parameters from gin context
	for _, param := range c.Params {
		if err := vm.validateParameterName(param.Key); err != nil {
			return fmt.Errorf("invalid path parameter name '%s': %v", param.Key, err)
		}

		if err := vm.validateParameterValue(param.Value); err != nil {
			return fmt.Errorf("invalid path parameter value for '%s': %v", param.Key, err)
		}

		// Special validation for ID parameters
		if strings.HasSuffix(param.Key, "id") || param.Key == "id" {
			if err := vm.validateIDParameter(param.Value); err != nil {
				return fmt.Errorf("invalid ID parameter '%s': %v", param.Key, err)
			}
		}
	}
	return nil
}

// validateParameterName validates parameter names for security
func (vm *ValidationMiddleware) validateParameterName(name string) error {
	// Check for SQL injection patterns in parameter names
	sqlPatterns := []string{
		"union", "select", "insert", "delete", "update", "drop", "create",
		"alter", "exec", "execute", "sp_", "xp_",
	}

	lowerName := strings.ToLower(name)
	for _, pattern := range sqlPatterns {
		if strings.Contains(lowerName, pattern) {
			return fmt.Errorf("potentially malicious parameter name")
		}
	}

	// Check for script injection
	if strings.Contains(lowerName, "script") || strings.Contains(lowerName, "javascript") {
		return fmt.Errorf("potentially malicious parameter name")
	}

	return nil
}

// validateParameterValue validates parameter values for security
func (vm *ValidationMiddleware) validateParameterValue(value string) error {
	// Check for SQL injection
	if !validateNoSQLInjectionField(value) {
		return fmt.Errorf("potential SQL injection detected")
	}

	// Check for XSS
	if strings.Contains(value, "<script") || strings.Contains(value, "javascript:") {
		return fmt.Errorf("potential XSS detected")
	}

	// Check for path traversal
	if strings.Contains(value, "../") || strings.Contains(value, "..\\") {
		return fmt.Errorf("potential path traversal detected")
	}

	return nil
}

// validateIDParameter validates ID parameters specifically
func (vm *ValidationMiddleware) validateIDParameter(value string) error {
	// Check if it's a valid positive integer
	id, err := strconv.ParseUint(value, 10, 32)
	if err != nil {
		return fmt.Errorf("ID must be a valid positive integer")
	}

	if id == 0 {
		return fmt.Errorf("ID must be greater than 0")
	}

	return nil
}

// ================================================================
// CUSTOM VALIDATORS
// ================================================================

// validatePhoneNumber validates phone number format
func validatePhoneNumber(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	if phone == "" {
		return true // Allow empty phone numbers
	}

	// Remove spaces and common formatting
	cleaned := strings.ReplaceAll(phone, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")

	// Check if it matches international format
	phoneRegex := regexp.MustCompile(`^[\+]?[1-9][\d]{7,15}$`)
	return phoneRegex.MatchString(cleaned)
}

// validatePostcode validates UK postcode format
func validatePostcode(fl validator.FieldLevel) bool {
	postcode := strings.ToUpper(strings.TrimSpace(fl.Field().String()))
	if postcode == "" {
		return true // Allow empty postcodes
	}

	// UK postcode regex
	postcodeRegex := regexp.MustCompile(`^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$`)
	return postcodeRegex.MatchString(postcode)
}

// validateSafeString validates string for safe content
func validateSafeString(fl validator.FieldLevel) bool {
	value := fl.Field().String()

	// Check for dangerous patterns
	dangerousPatterns := []string{
		"<script", "</script>", "javascript:", "vbscript:", "onload=", "onerror=",
		"onclick=", "onmouseover=", "onfocus=", "onblur=", "onchange=", "onsubmit=",
	}

	lowerValue := strings.ToLower(value)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowerValue, pattern) {
			return false
		}
	}

	return true
}

// validateNoSQLInjection validates against SQL injection
func validateNoSQLInjectionField(value string) bool {
	sqlPatterns := []string{
		"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
		"union", "select", "insert", "delete", "update", "drop",
		"create", "alter", "exec", "execute", "script",
	}

	lowerValue := strings.ToLower(value)
	for _, pattern := range sqlPatterns {
		if strings.Contains(lowerValue, pattern) {
			return false
		}
	}

	return true
}

// validateAlphanumericSpace validates alphanumeric characters with spaces
func validateAlphanumericSpace(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	alphanumericSpaceRegex := regexp.MustCompile(`^[a-zA-Z0-9\s]*$`)
	return alphanumericSpaceRegex.MatchString(value)
}

// ================================================================
// SANITIZATION
// ================================================================

// sanitizeStruct sanitizes all string fields in a struct
func (vm *ValidationMiddleware) sanitizeStruct(obj interface{}) {
	v := reflect.ValueOf(obj)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return
	}

	vm.sanitizeValue(v)
}

// sanitizeValue recursively sanitizes values
func (vm *ValidationMiddleware) sanitizeValue(v reflect.Value) {
	switch v.Kind() {
	case reflect.String:
		if v.CanSet() {
			sanitized := vm.sanitizeString(v.String())
			v.SetString(sanitized)
		}
	case reflect.Struct:
		for i := 0; i < v.NumField(); i++ {
			field := v.Field(i)
			if field.CanInterface() {
				vm.sanitizeValue(field)
			}
		}
	case reflect.Slice, reflect.Array:
		for i := 0; i < v.Len(); i++ {
			vm.sanitizeValue(v.Index(i))
		}
	case reflect.Map:
		for _, key := range v.MapKeys() {
			value := v.MapIndex(key)
			vm.sanitizeValue(value)
		}
	}
}

// sanitizeString sanitizes a string value
func (vm *ValidationMiddleware) sanitizeString(input string) string {
	// Trim whitespace
	sanitized := strings.TrimSpace(input)

	// Remove null bytes
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")

	// Remove control characters except newlines and tabs
	var result strings.Builder
	for _, r := range sanitized {
		if r >= 32 || r == '\n' || r == '\t' || r == '\r' {
			result.WriteRune(r)
		}
	}

	return result.String()
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

// shouldSkipValidation determines if validation should be skipped for a path
func (vm *ValidationMiddleware) shouldSkipValidation(path string) bool {
	skipPaths := []string{
		"/health", "/health-check", "/swagger/", "/api/swagger.json",
	}

	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}

	return false
}

// formatValidationErrors formats validator errors into a readable format
func (vm *ValidationMiddleware) formatValidationErrors(err error) map[string]interface{} {
	errors := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldErr := range validationErrors {
			fieldName := fieldErr.Field()
			errors[fieldName] = map[string]interface{}{
				"tag":     fieldErr.Tag(),
				"value":   fieldErr.Value(),
				"param":   fieldErr.Param(),
				"message": vm.getValidationMessage(fieldErr),
			}
		}
	}

	return errors
}

// getValidationMessage returns a user-friendly validation message
func (vm *ValidationMiddleware) getValidationMessage(fieldErr validator.FieldError) string {
	switch fieldErr.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", fieldErr.Field())
	case "email":
		return "Invalid email format"
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", fieldErr.Field(), fieldErr.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", fieldErr.Field(), fieldErr.Param())
	case "phone":
		return "Invalid phone number format"
	case "postcode":
		return "Invalid postcode format"
	case "safe_string":
		return "Contains potentially unsafe content"
	case "no_sql_injection":
		return "Contains potentially malicious content"
	case "alphanumeric_space":
		return "Must contain only letters, numbers, and spaces"
	default:
		return fmt.Sprintf("Invalid %s", fieldErr.Field())
	}
}

// sendValidationError sends a standardized validation error response
func (vm *ValidationMiddleware) sendValidationError(c *gin.Context, code, message string, details map[string]interface{}) {
	response := gin.H{
		"success": false,
		"error": gin.H{
			"code":    code,
			"message": message,
			"type":    "validation_error",
		},
		"timestamp": time.Now().UTC(),
	}

	if details != nil {
		response["error"].(gin.H)["details"] = details
	}

	c.JSON(http.StatusBadRequest, response)
	c.Abort()
}

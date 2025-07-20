package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// SecurityValidator contains security validation rules
type SecurityValidator struct {
	maxRequestSize  int64
	blockedPatterns []*regexp.Regexp
}

// NewSecurityValidator creates a new security validator
func NewSecurityValidator() *SecurityValidator {
	// Common malicious patterns
	maliciousPatterns := []string{
		`(?i)<script[^>]*>.*?</script>`, // XSS scripts
		`(?i)javascript:`,               // JavaScript URLs
		`(?i)vbscript:`,                 // VBScript URLs
		`(?i)on\w+\s*=`,                 // Event handlers
		`(?i)expression\s*\(`,           // CSS expressions
		`(?i)union\s+select`,            // SQL injection
		`(?i)drop\s+table`,              // SQL injection
		`(?i)delete\s+from`,             // SQL injection
		`(?i)insert\s+into`,             // SQL injection
		`(?i)update\s+\w+\s+set`,        // SQL injection
		`\.\./`,                         // Directory traversal
		`\.\.\\`,                        // Directory traversal (Windows)
		`%2e%2e%2f`,                     // URL encoded directory traversal
		`%252e%252e%252f`,               // Double URL encoded
	}

	var compiledPatterns []*regexp.Regexp
	for _, pattern := range maliciousPatterns {
		if regex, err := regexp.Compile(pattern); err == nil {
			compiledPatterns = append(compiledPatterns, regex)
		}
	}

	return &SecurityValidator{
		maxRequestSize:  10 * 1024 * 1024, // 10MB
		blockedPatterns: compiledPatterns,
	}
}

// ValidateRequest performs comprehensive request validation
func (sv *SecurityValidator) ValidateRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip validation for health checks and system routes
		path := c.Request.URL.Path
		if path == "/health" || path == "/health-check" ||
			strings.HasPrefix(path, "/swagger/") ||
			strings.HasPrefix(path, "/api/swagger.json") {
			c.Next()
			return
		}

		// For protected routes that require authentication, defer strict validation
		// until after authentication to ensure proper 401 responses
		isProtectedRoute := sv.isProtectedRoute(path)

		// 1. Check request size (always check this regardless of route type)
		if c.Request.ContentLength > sv.maxRequestSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Request body too large",
			})
			c.Abort()
			return
		}

		// 2. For protected routes, skip strict header validation to allow auth middleware to run first
		if !isProtectedRoute {
			if err := sv.validateHeaders(c); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Invalid headers: %s", err.Error()),
				})
				c.Abort()
				return
			}
		}

		// 3. Validate request body for malicious content (but be lenient for protected routes)
		if c.Request.Body != nil && c.Request.ContentLength > 0 {
			body, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Failed to read request body",
				})
				c.Abort()
				return
			}

			// Restore the body for the next handler
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

			// For protected routes, only check for the most critical threats
			if isProtectedRoute {
				if err := sv.validateCriticalContent(string(body)); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": fmt.Sprintf("Invalid request content: %s", err.Error()),
					})
					c.Abort()
					return
				}
			} else {
				if err := sv.validateContent(string(body)); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": fmt.Sprintf("Invalid request content: %s", err.Error()),
					})
					c.Abort()
					return
				}
			}
		}

		// 4. Validate query parameters (lenient for protected routes)
		if !isProtectedRoute {
			for key, values := range c.Request.URL.Query() {
				for _, value := range values {
					if err := sv.validateContent(key + "=" + value); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{
							"error": fmt.Sprintf("Invalid query parameter: %s", err.Error()),
						})
						c.Abort()
						return
					}
				}
			}
		}

		c.Next()
	}
}

// isProtectedRoute determines if a route requires authentication and should have relaxed security validation
func (sv *SecurityValidator) isProtectedRoute(path string) bool {
	protectedPrefixes := []string{
		"/api/v1/auth/logout",
		"/api/v1/auth/validate-token",
		"/api/v1/auth/me",
		"/api/v1/user/",
		"/api/v1/visitors/documents/",
		"/api/v1/donor/",
		"/api/v1/volunteer/",
		"/api/v1/staff/",
		"/api/v1/admin/",
		"/auth/me", // legacy route
		"/ws/",     // WebSocket routes
	}

	for _, prefix := range protectedPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}

	return false
}

// validateHeaders checks for malicious content in headers
func (sv *SecurityValidator) validateHeaders(c *gin.Context) error {
	suspiciousHeaders := []string{
		"User-Agent",
		"Referer",
		"X-Forwarded-For",
		"X-Real-IP",
	}

	for _, headerName := range suspiciousHeaders {
		headerValue := c.GetHeader(headerName)
		if headerValue != "" {
			if err := sv.validateContent(headerValue); err != nil {
				// Log the specific header and value that's causing issues
				log.Printf("Security validator blocked header %s with value: %s (error: %s)", headerName, headerValue, err.Error())
				return fmt.Errorf("malicious content in header %s", headerName)
			}
		}
	}

	return nil
}

// validateContent checks content against malicious patterns
func (sv *SecurityValidator) validateContent(content string) error {
	// Check against blocked patterns
	for _, pattern := range sv.blockedPatterns {
		if pattern.MatchString(content) {
			return fmt.Errorf("potentially malicious content detected")
		}
	}

	// Check for excessive special characters (potential obfuscation)
	specialCount := 0
	for _, r := range content {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && !unicode.IsSpace(r) {
			specialCount++
		}
	}

	if len(content) > 0 && float64(specialCount)/float64(len(content)) > 0.5 {
		return fmt.Errorf("excessive special characters detected")
	}

	return nil
}

// validateCriticalContent checks only for the most severe security threats
// Used for protected routes to allow authentication to happen first
func (sv *SecurityValidator) validateCriticalContent(content string) error {
	// Only check for the most critical patterns that could cause immediate damage
	criticalPatterns := []string{
		`(?i)<script[^>]*>.*?</script>`, // XSS scripts
		`(?i)union\s+select`,            // SQL injection
		`(?i)drop\s+table`,              // SQL injection
		`(?i)delete\s+from`,             // SQL injection
	}

	for _, pattern := range criticalPatterns {
		if regex, err := regexp.Compile(pattern); err == nil {
			if regex.MatchString(content) {
				return fmt.Errorf("critical security threat detected")
			}
		}
	}

	return nil
}

// SanitizeInput provides input sanitization
func SanitizeInput() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only process JSON requests
		if c.GetHeader("Content-Type") == "application/json" && c.Request.Body != nil {
			body, err := io.ReadAll(c.Request.Body)
			if err != nil {
				c.Next()
				return
			}

			// Parse JSON
			var data interface{}
			if err := json.Unmarshal(body, &data); err != nil {
				// Not valid JSON, restore original body
				c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
				c.Next()
				return
			}

			// Sanitize the data
			sanitized := sanitizeValue(data)

			// Convert back to JSON
			sanitizedBody, err := json.Marshal(sanitized)
			if err != nil {
				c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
				c.Next()
				return
			}

			// Replace the request body
			c.Request.Body = io.NopCloser(bytes.NewBuffer(sanitizedBody))
			c.Request.ContentLength = int64(len(sanitizedBody))
		}

		c.Next()
	}
}

// sanitizeValue recursively sanitizes values
func sanitizeValue(value interface{}) interface{} {
	switch v := value.(type) {
	case string:
		return sanitizeString(v)
	case map[string]interface{}:
		sanitized := make(map[string]interface{})
		for key, val := range v {
			sanitized[sanitizeString(key)] = sanitizeValue(val)
		}
		return sanitized
	case []interface{}:
		sanitized := make([]interface{}, len(v))
		for i, val := range v {
			sanitized[i] = sanitizeValue(val)
		}
		return sanitized
	default:
		return v
	}
}

// sanitizeString sanitizes a string value
func sanitizeString(s string) string {
	// Remove null bytes
	s = strings.ReplaceAll(s, "\x00", "")

	// Trim whitespace
	s = strings.TrimSpace(s)

	// Normalize line endings
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")

	// Remove control characters except tab and newline
	var result strings.Builder
	for _, r := range s {
		if unicode.IsPrint(r) || r == '\n' || r == '\t' {
			result.WriteRune(r)
		}
	}

	return result.String()
}

// DonationValidationRequest represents donation input validation
type DonationValidationRequest struct {
	Amount   float64 `json:"amount" binding:"required,min=1,max=10000"`
	Type     string  `json:"type" binding:"required,oneof=monetary goods"`
	Category string  `json:"category" binding:"required,max=100"`
	Message  string  `json:"message" binding:"max=500"`
	GiftAid  bool    `json:"giftAid"`
}

// PaymentValidationRequest represents payment input validation
type PaymentValidationRequest struct {
	Amount          int64  `json:"amount" binding:"required,min=100,max=1000000"` // Pence
	Currency        string `json:"currency" binding:"required,len=3"`
	PaymentMethodID string `json:"paymentMethodId" binding:"max=255"`
}

// UserInputValidationRequest represents user input validation
type UserInputValidationRequest struct {
	FirstName string `json:"firstName" binding:"required,min=1,max=50"`
	LastName  string `json:"lastName" binding:"required,min=1,max=50"`
	Email     string `json:"email" binding:"required,email,max=255"`
	Phone     string `json:"phone" binding:"max=20"`
	Address   string `json:"address" binding:"max=255"`
	Postcode  string `json:"postcode" binding:"max=10"`
}

// Rate limiter map for different endpoints
var rateLimiters = map[string]*rate.Limiter{
	"donation": rate.NewLimiter(rate.Every(time.Minute), 10),  // 10 donations per minute
	"payment":  rate.NewLimiter(rate.Every(time.Minute), 5),   // 5 payments per minute
	"auth":     rate.NewLimiter(rate.Every(time.Minute), 20),  // 20 auth requests per minute
	"profile":  rate.NewLimiter(rate.Every(time.Minute), 30),  // 30 profile updates per minute
	"general":  rate.NewLimiter(rate.Every(time.Second), 100), // 100 general requests per second
}

// Input sanitization patterns
var (
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	phoneRegex    = regexp.MustCompile(`^[\+]?[1-9][\d]{0,15}$`)
	postcodeRegex = regexp.MustCompile(`^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$`)
	nameRegex     = regexp.MustCompile(`^[a-zA-Z\s\-'\.]+$`)
	alphaNumRegex = regexp.MustCompile(`^[a-zA-Z0-9\s\-_]+$`)
)

// SecurityValidationMiddleware provides comprehensive input validation and security checks
func SecurityValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check rate limiting based on endpoint
		if !checkRateLimit(c) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		// Validate headers for security
		if !validateSecurityHeaders(c) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid or missing security headers",
			})
			c.Abort()
			return
		}

		// Check for common attack patterns
		if containsSuspiciousPatterns(c) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Request contains suspicious patterns",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// DonationValidationMiddleware validates donation-specific inputs
func DonationValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req DonationValidationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid donation data",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Additional business logic validation
		if !validateDonationAmount(req.Amount) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Donation amount must be between £1 and £10,000",
			})
			c.Abort()
			return
		}

		if !validateDonationCategory(req.Category) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid donation category",
			})
			c.Abort()
			return
		}

		if req.Message != "" && !validateMessage(req.Message) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Message contains invalid characters or exceeds length limit",
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validatedDonation", req)
		c.Next()
	}
}

// PaymentValidationMiddleware validates payment-specific inputs
func PaymentValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req PaymentValidationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid payment data",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate currency
		if !validateCurrency(req.Currency) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Unsupported currency code",
			})
			c.Abort()
			return
		}

		// Validate amount (in pence)
		if req.Amount < 100 || req.Amount > 1000000 { // £1 to £10,000
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Payment amount must be between £1.00 and £10,000.00",
			})
			c.Abort()
			return
		}

		// Validate payment method ID format if provided
		if req.PaymentMethodID != "" && !validatePaymentMethodID(req.PaymentMethodID) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid payment method ID format",
			})
			c.Abort()
			return
		}

		// Store validated data in context
		c.Set("validatedPayment", req)
		c.Next()
	}
}

// UserInputValidationMiddleware validates user profile inputs
func UserInputValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UserInputValidationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid user data",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Validate names
		if !validateName(req.FirstName) || !validateName(req.LastName) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Names can only contain letters, spaces, hyphens, apostrophes, and periods",
			})
			c.Abort()
			return
		}

		// Validate email format
		if !emailRegex.MatchString(req.Email) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid email format",
			})
			c.Abort()
			return
		}

		// Validate phone if provided
		if req.Phone != "" && !validatePhone(req.Phone) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid phone number format",
			})
			c.Abort()
			return
		}

		// Validate postcode if provided
		if req.Postcode != "" && !validatePostcode(req.Postcode) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid UK postcode format",
			})
			c.Abort()
			return
		}

		// Sanitize inputs
		req.FirstName = sanitizeString(req.FirstName)
		req.LastName = sanitizeString(req.LastName)
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		req.Address = sanitizeString(req.Address)
		req.Postcode = strings.ToUpper(strings.TrimSpace(req.Postcode))

		// Store validated and sanitized data in context
		c.Set("validatedUser", req)
		c.Next()
	}
}

// Helper functions for validation

func checkRateLimit(c *gin.Context) bool {
	endpoint := determineEndpointType(c.Request.URL.Path)
	limiter, exists := rateLimiters[endpoint]
	if !exists {
		limiter = rateLimiters["general"]
	}

	return limiter.Allow()
}

func determineEndpointType(path string) string {
	if strings.Contains(path, "/donations") {
		return "donation"
	}
	if strings.Contains(path, "/payments") {
		return "payment"
	}
	if strings.Contains(path, "/auth") {
		return "auth"
	}
	if strings.Contains(path, "/profile") {
		return "profile"
	}
	return "general"
}

func validateSecurityHeaders(c *gin.Context) bool {
	// Check for required headers
	userAgent := c.GetHeader("User-Agent")
	if userAgent == "" || len(userAgent) < 10 {
		return false
	}

	// Check for suspicious user agents
	suspiciousAgents := []string{"curl", "wget", "python", "bot", "crawler", "scanner"}
	lowerUA := strings.ToLower(userAgent)
	for _, agent := range suspiciousAgents {
		if strings.Contains(lowerUA, agent) {
			return false
		}
	}

	return true
}

func containsSuspiciousPatterns(c *gin.Context) bool {
	// Check URL for SQL injection patterns
	url := c.Request.URL.String()
	sqlPatterns := []string{
		"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
		"union", "select", "insert", "update", "delete", "drop",
	}

	lowerURL := strings.ToLower(url)
	for _, pattern := range sqlPatterns {
		if strings.Contains(lowerURL, pattern) {
			return true
		}
	}

	// Check for XSS patterns
	xssPatterns := []string{
		"<script", "</script", "javascript:", "onload=", "onerror=",
		"alert(", "confirm(", "prompt(",
	}

	for _, pattern := range xssPatterns {
		if strings.Contains(lowerURL, pattern) {
			return true
		}
	}

	return false
}

func validateDonationAmount(amount float64) bool {
	return amount >= 1.0 && amount <= 10000.0
}

func validateDonationCategory(category string) bool {
	validCategories := []string{
		"food", "clothing", "shelter", "education", "healthcare",
		"emergency", "community", "environment", "general",
	}

	for _, valid := range validCategories {
		if category == valid {
			return true
		}
	}
	return false
}

func validateMessage(message string) bool {
	// Check length
	if len(message) > 500 {
		return false
	}

	// Check for suspicious patterns
	suspiciousPatterns := []string{
		"<script", "</script", "javascript:", "data:", "vbscript:",
		"onload", "onerror", "onclick", "onmouseover",
	}

	lowerMessage := strings.ToLower(message)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(lowerMessage, pattern) {
			return false
		}
	}

	return true
}

func validateCurrency(currency string) bool {
	validCurrencies := []string{"GBP", "USD", "EUR"}
	for _, valid := range validCurrencies {
		if currency == valid {
			return true
		}
	}
	return false
}

func validatePaymentMethodID(id string) bool {
	// Payment method IDs should be alphanumeric with underscores/hyphens
	return alphaNumRegex.MatchString(id) && len(id) <= 255
}

func validateName(name string) bool {
	return nameRegex.MatchString(name) && len(name) >= 1 && len(name) <= 50
}

func validatePhone(phone string) bool {
	// Remove spaces and common separators
	cleaned := strings.ReplaceAll(phone, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "-", "")
	cleaned = strings.ReplaceAll(cleaned, "(", "")
	cleaned = strings.ReplaceAll(cleaned, ")", "")

	return phoneRegex.MatchString(cleaned)
}

func validatePostcode(postcode string) bool {
	// UK postcode validation
	cleaned := strings.ToUpper(strings.ReplaceAll(postcode, " ", ""))
	return postcodeRegex.MatchString(cleaned)
}

// CSPMiddleware adds Content Security Policy headers
func CSPMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"font-src 'self' https://fonts.gstatic.com; " +
			"img-src 'self' data: https:; " +
			"connect-src 'self' https://api.stripe.com; " +
			"frame-src https://js.stripe.com; " +
			"object-src 'none'; " +
			"base-uri 'self';"

		c.Header("Content-Security-Policy", csp)
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		c.Next()
	}
}

// HTTPSRedirectMiddleware redirects HTTP to HTTPS in production
func HTTPSRedirectMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("X-Forwarded-Proto") == "http" {
			httpsURL := fmt.Sprintf("https://%s%s", c.Request.Host, c.Request.RequestURI)
			c.Redirect(http.StatusMovedPermanently, httpsURL)
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequestSizeMiddleware limits request body size
func RequestSizeMiddleware(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("Request body too large. Maximum size: %d bytes", maxSize),
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// IPWhitelistMiddleware restricts access to specific IP ranges (for admin endpoints)
func IPWhitelistMiddleware(allowedIPs []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		// Allow localhost in development
		if clientIP == "127.0.0.1" || clientIP == "::1" {
			c.Next()
			return
		}

		// Check against whitelist
		for _, allowedIP := range allowedIPs {
			if clientIP == allowedIP {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied from this IP address",
		})
		c.Abort()
	}
}

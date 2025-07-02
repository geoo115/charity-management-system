package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSuite provides a comprehensive testing framework for routes
type TestSuite struct {
	router     *gin.Engine
	recorder   *httptest.ResponseRecorder
	logger     *log.Logger
	authTokens map[string]string // role -> token mapping
}

// NewTestSuite creates a new route testing suite
func NewTestSuite() *TestSuite {
	gin.SetMode(gin.TestMode)

	return &TestSuite{
		router:     gin.New(),
		recorder:   httptest.NewRecorder(),
		logger:     log.New(log.Writer(), "[TEST] ", log.LstdFlags),
		authTokens: make(map[string]string),
	}
}

// SetupRouter configures the router with test-specific settings
func (ts *TestSuite) SetupRouter() {
	// Use minimal middleware for testing
	ts.router.Use(gin.Logger())
	ts.router.Use(gin.Recovery())

	// Setup test routes
	if err := SetupRoutes(ts.router); err != nil {
		ts.logger.Fatalf("Failed to setup routes: %v", err)
	}
}

// ================================================================
// REQUEST BUILDERS
// ================================================================

// RequestBuilder helps build HTTP requests for testing
type RequestBuilder struct {
	method      string
	path        string
	body        interface{}
	headers     map[string]string
	queryParams map[string]string
	authToken   string
	contentType string
}

// NewRequest creates a new request builder
func (ts *TestSuite) NewRequest(method, path string) *RequestBuilder {
	return &RequestBuilder{
		method:      method,
		path:        path,
		headers:     make(map[string]string),
		queryParams: make(map[string]string),
		contentType: "application/json",
	}
}

// WithBody sets the request body
func (rb *RequestBuilder) WithBody(body interface{}) *RequestBuilder {
	rb.body = body
	return rb
}

// WithHeader adds a header to the request
func (rb *RequestBuilder) WithHeader(key, value string) *RequestBuilder {
	rb.headers[key] = value
	return rb
}

// WithAuth sets the authorization token
func (rb *RequestBuilder) WithAuth(token string) *RequestBuilder {
	rb.authToken = token
	return rb
}

// WithAuthRole sets the authorization token for a specific role
func (rb *RequestBuilder) WithAuthRole(ts *TestSuite, role string) *RequestBuilder {
	if token, exists := ts.authTokens[role]; exists {
		rb.authToken = token
	}
	return rb
}

// WithQuery adds query parameters
func (rb *RequestBuilder) WithQuery(key, value string) *RequestBuilder {
	rb.queryParams[key] = value
	return rb
}

// WithContentType sets the content type
func (rb *RequestBuilder) WithContentType(contentType string) *RequestBuilder {
	rb.contentType = contentType
	return rb
}

// Build creates the HTTP request
func (rb *RequestBuilder) Build() (*http.Request, error) {
	var bodyReader io.Reader

	if rb.body != nil {
		switch v := rb.body.(type) {
		case string:
			bodyReader = strings.NewReader(v)
		case []byte:
			bodyReader = bytes.NewReader(v)
		default:
			jsonBody, err := json.Marshal(v)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal body: %v", err)
			}
			bodyReader = bytes.NewReader(jsonBody)
		}
	}

	req, err := http.NewRequest(rb.method, rb.path, bodyReader)
	if err != nil {
		return nil, err
	}

	// Set content type
	if rb.body != nil {
		req.Header.Set("Content-Type", rb.contentType)
	}

	// Set custom headers
	for key, value := range rb.headers {
		req.Header.Set(key, value)
	}

	// Set authorization
	if rb.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+rb.authToken)
	}

	// Set query parameters
	if len(rb.queryParams) > 0 {
		q := req.URL.Query()
		for key, value := range rb.queryParams {
			q.Add(key, value)
		}
		req.URL.RawQuery = q.Encode()
	}

	return req, nil
}

// ================================================================
// RESPONSE ASSERTIONS
// ================================================================

// ResponseAssertion provides fluent API for response assertions
type ResponseAssertion struct {
	t        *testing.T
	response *httptest.ResponseRecorder
	body     map[string]interface{}
}

// NewResponseAssertion creates a new response assertion helper
func (ts *TestSuite) NewResponseAssertion(t *testing.T, response *httptest.ResponseRecorder) *ResponseAssertion {
	ra := &ResponseAssertion{
		t:        t,
		response: response,
	}

	// Parse JSON body if possible
	if response.Body.Len() > 0 {
		var body map[string]interface{}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err == nil {
			ra.body = body
		}
	}

	return ra
}

// HasStatus asserts the response status code
func (ra *ResponseAssertion) HasStatus(expectedStatus int) *ResponseAssertion {
	assert.Equal(ra.t, expectedStatus, ra.response.Code,
		"Expected status %d, got %d. Response: %s",
		expectedStatus, ra.response.Code, ra.response.Body.String())
	return ra
}

// HasHeader asserts a response header exists with expected value
func (ra *ResponseAssertion) HasHeader(key, expectedValue string) *ResponseAssertion {
	actualValue := ra.response.Header().Get(key)
	assert.Equal(ra.t, expectedValue, actualValue,
		"Expected header %s to be %s, got %s", key, expectedValue, actualValue)
	return ra
}

// HasJSONField asserts a JSON field exists with expected value
func (ra *ResponseAssertion) HasJSONField(field string, expectedValue interface{}) *ResponseAssertion {
	require.NotNil(ra.t, ra.body, "Response body is not valid JSON")

	actualValue, exists := ra.body[field]
	require.True(ra.t, exists, "Field %s not found in response", field)
	assert.Equal(ra.t, expectedValue, actualValue,
		"Expected field %s to be %v, got %v", field, expectedValue, actualValue)
	return ra
}

// HasSuccess asserts the response indicates success
func (ra *ResponseAssertion) HasSuccess(expected bool) *ResponseAssertion {
	return ra.HasJSONField("success", expected)
}

// HasError asserts the response contains an error
func (ra *ResponseAssertion) HasError() *ResponseAssertion {
	return ra.HasJSONField("success", false)
}

// HasNoError asserts the response contains no error
func (ra *ResponseAssertion) HasNoError() *ResponseAssertion {
	return ra.HasJSONField("success", true)
}

// ContainsText asserts the response body contains specific text
func (ra *ResponseAssertion) ContainsText(text string) *ResponseAssertion {
	bodyStr := ra.response.Body.String()
	assert.Contains(ra.t, bodyStr, text,
		"Expected response to contain '%s', got: %s", text, bodyStr)
	return ra
}

// HasValidationError asserts the response contains validation errors
func (ra *ResponseAssertion) HasValidationError(field string) *ResponseAssertion {
	ra.HasError()

	if ra.body != nil {
		if errorData, exists := ra.body["error"]; exists {
			if errorMap, ok := errorData.(map[string]interface{}); ok {
				if details, exists := errorMap["details"]; exists {
					if detailsMap, ok := details.(map[string]interface{}); ok {
						_, fieldExists := detailsMap[field]
						assert.True(ra.t, fieldExists,
							"Expected validation error for field '%s'", field)
					}
				}
			}
		}
	}

	return ra
}

// ================================================================
// TEST EXECUTION
// ================================================================

// Execute performs the request and returns the response
func (ts *TestSuite) Execute(rb *RequestBuilder) *httptest.ResponseRecorder {
	req, err := rb.Build()
	if err != nil {
		ts.logger.Fatalf("Failed to build request: %v", err)
	}

	recorder := httptest.NewRecorder()
	ts.router.ServeHTTP(recorder, req)

	return recorder
}

// ExecuteAndAssert performs request and returns assertion helper
func (ts *TestSuite) ExecuteAndAssert(t *testing.T, rb *RequestBuilder) *ResponseAssertion {
	recorder := ts.Execute(rb)
	return ts.NewResponseAssertion(t, recorder)
}

// ================================================================
// MOCK DATA GENERATORS
// ================================================================

// MockDataGenerator provides utilities for generating test data
type MockDataGenerator struct{}

// NewMockDataGenerator creates a new mock data generator
func NewMockDataGenerator() *MockDataGenerator {
	return &MockDataGenerator{}
}

// GenerateUser creates mock user data
func (mdg *MockDataGenerator) GenerateUser(role string) map[string]interface{} {
	return map[string]interface{}{
		"first_name": "Test",
		"last_name":  "User",
		"email":      fmt.Sprintf("test-%s@example.com", strings.ToLower(role)),
		"role":       role,
		"password":   "TestPassword123!",
		"phone":      "+44 20 1234 5678",
		"address":    "123 Test Street",
		"city":       "London",
		"postcode":   "SW1A 1AA",
	}
}

// GenerateDonation creates mock donation data
func (mdg *MockDataGenerator) GenerateDonation() map[string]interface{} {
	return map[string]interface{}{
		"type":        "monetary",
		"amount":      100.50,
		"currency":    "GBP",
		"description": "Test donation",
		"anonymous":   false,
	}
}

// GenerateHelpRequest creates mock help request data
func (mdg *MockDataGenerator) GenerateHelpRequest() map[string]interface{} {
	return map[string]interface{}{
		"type":                 "food_assistance",
		"description":          "Need help with groceries",
		"urgency":              "medium",
		"household_size":       3,
		"dietary_requirements": "vegetarian",
		"contact_method":       "phone",
	}
}

// GenerateVolunteerApplication creates mock volunteer application data
func (mdg *MockDataGenerator) GenerateVolunteerApplication() map[string]interface{} {
	return map[string]interface{}{
		"motivation":           "Want to help the community",
		"experience":           "Previous volunteer work at local charity",
		"availability":         "weekends",
		"preferred_activities": []string{"food_distribution", "admin_support"},
		"references":           "John Smith, 020 1234 5678",
	}
}

// ================================================================
// AUTHENTICATION HELPERS
// ================================================================

// SetupTestAuth configures authentication tokens for testing
func (ts *TestSuite) SetupTestAuth() {
	// In a real implementation, you would:
	// 1. Create test users in the database
	// 2. Generate valid JWT tokens for each role
	// 3. Store them in ts.authTokens

	ts.authTokens["Admin"] = "test-admin-token"
	ts.authTokens["Volunteer"] = "test-volunteer-token"
	ts.authTokens["Donor"] = "test-donor-token"
	ts.authTokens["Visitor"] = "test-visitor-token"
}

// GetAuthToken returns the auth token for a role
func (ts *TestSuite) GetAuthToken(role string) string {
	return ts.authTokens[role]
}

// ================================================================
// PERFORMANCE TESTING
// ================================================================

// PerformanceTest runs performance tests on routes
func (ts *TestSuite) PerformanceTest(t *testing.T, rb *RequestBuilder, concurrent int, duration time.Duration) {
	results := make(chan time.Duration, concurrent*100)
	done := make(chan bool)

	// Start workers
	for i := 0; i < concurrent; i++ {
		go func() {
			start := time.Now()
			for time.Since(start) < duration {
				requestStart := time.Now()
				ts.Execute(rb)
				results <- time.Since(requestStart)
			}
			done <- true
		}()
	}

	// Collect results
	var durations []time.Duration
	var completed int

	timeout := time.After(duration + 10*time.Second)

	for completed < concurrent {
		select {
		case duration := <-results:
			durations = append(durations, duration)
		case <-done:
			completed++
		case <-timeout:
			t.Fatalf("Performance test timed out")
		}
	}

	// Calculate statistics
	if len(durations) > 0 {
		var total time.Duration
		min := durations[0]
		max := durations[0]

		for _, d := range durations {
			total += d
			if d < min {
				min = d
			}
			if d > max {
				max = d
			}
		}

		avg := total / time.Duration(len(durations))

		t.Logf("Performance Test Results:")
		t.Logf("  Requests: %d", len(durations))
		t.Logf("  Average: %v", avg)
		t.Logf("  Min: %v", min)
		t.Logf("  Max: %v", max)
		t.Logf("  RPS: %.2f", float64(len(durations))/duration.Seconds())

		// Assert performance requirements
		assert.True(t, avg < 100*time.Millisecond,
			"Average response time %v exceeds 100ms threshold", avg)
	}
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

// CleanupTest performs test cleanup
func (ts *TestSuite) CleanupTest() {
	// Clear auth tokens
	ts.authTokens = make(map[string]string)

	// Reset recorder
	ts.recorder = httptest.NewRecorder()
}

// LogResponse logs the response for debugging
func (ts *TestSuite) LogResponse(response *httptest.ResponseRecorder) {
	ts.logger.Printf("Response Status: %d", response.Code)
	ts.logger.Printf("Response Headers: %v", response.Header())
	ts.logger.Printf("Response Body: %s", response.Body.String())
}

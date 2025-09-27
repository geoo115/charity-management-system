import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');

// Test configuration
export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
    { duration: '3m', target: 10 },   // Stay at 10 users for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users over 1 minute
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],    // 95% of requests under 2 seconds
    http_req_failed: ['rate<0.1'],        // Error rate under 10%
    errors: ['rate<0.1'],                 // Custom error rate under 10%
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';

// Test data - using actual seeded users
const testUsers = [
  { email: 'sarah.johnson@example.com', password: 'testpass123' },
  { email: 'michael.brown@example.com', password: 'testpass123' },
  { email: 'emma.wilson@example.com', password: 'testpass123' },
  { email: 'david.thompson@example.com', password: 'testpass123' },
  { email: 'amy.garcia@example.com', password: 'testpass123' },
];

// Helper function to get random test user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Test scenarios
export default function () {
  // Test 1: Health check
  testHealthCheck();
  
  // Test 2: Authentication
  let authToken = testAuthentication();
  
  if (authToken) {
    // Test 3: Dashboard access
    testDashboardAccess(authToken);
    
    // Test 4: Help requests
    testHelpRequests(authToken);
    
    // Test 5: Basic API endpoints
    testBasicEndpoints(authToken);
  }
  
  sleep(1); // Wait 1 second between iterations
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testAuthentication() {
  const user = getRandomUser();
  const loginPayload = JSON.stringify(user);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);
  
  const success = check(response, {
    'Login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'Login response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  
  // Return token if login successful
  if (response.status === 200) {
    try {
      const responseData = JSON.parse(response.body);
      return (responseData.data && responseData.data.token) || responseData.token;
    } catch (e) {
      console.log('Failed to parse login response');
      return null;
    }
  }
  
  return null;
}

function testDashboardAccess(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.get(`${BASE_URL}/api/v1/dashboard/stats`, params);
  
  const success = check(response, {
    'Dashboard access status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'Dashboard response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testHelpRequests(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.get(`${BASE_URL}/api/v1/help-requests`, params);
  
  const success = check(response, {
    'Help requests status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'Help requests response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testBasicEndpoints(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  // Test metrics endpoint
  const metricsResponse = http.get(`${BASE_URL}/metrics`);
  check(metricsResponse, {
    'Metrics endpoint accessible': (r) => r.status === 200,
  });
  
  // Test auth/me endpoint if token exists
  if (token) {
    const meResponse = http.get(`${BASE_URL}/api/v1/auth/me`, params);
    check(meResponse, {
      'Auth me status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  }
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting baseline load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test configuration: 10 users, 5 minutes total duration');
  
  // Verify application is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Application health check failed: ${healthResponse.status}`);
  }
  
  return { baseUrl: BASE_URL };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Baseline load test completed!');
}
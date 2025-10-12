import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let loginResponseTime = new Trend('login_response_time');
export let apiResponseTime = new Trend('api_response_time');

// Test configuration - REALISTIC user behavior
export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 500 },   // Ramp up to 500 users over next 5 minutes
    { duration: '10m', target: 500 },  // Stay at 500 users for 10 minutes
    { duration: '3m', target: 0 },     // Ramp down to 0 users over 3 minutes
  ],
  thresholds: {
    'http_req_duration{type:api}': ['p(95)<500', 'p(99)<1000'],  // API requests: 95% under 500ms, 99% under 1s
    'http_req_duration{type:login}': ['p(95)<2000'],             // Login: 95% under 2s (bcrypt is slow)
    http_req_failed: ['rate<0.01'],                               // Less than 1% network failures
    errors: ['rate<0.05'],                                        // Less than 5% application errors
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

// Shared state for each VU (Virtual User) - simulates session management
let userToken = null;
let tokenExpiryTime = 0;
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 3;

// Test scenarios - REALISTIC: Users login once, then use the system
export default function () {
  const now = Date.now();
  
  // Check if we need to login (no token, expired, or failed auth)
  if (!userToken || now > tokenExpiryTime) {
    if (loginAttempts < MAX_LOGIN_ATTEMPTS) {
      userToken = testAuthentication();
      if (userToken) {
        // Token valid for 15 minutes (simulate session)
        tokenExpiryTime = now + (15 * 60 * 1000);
        loginAttempts = 0; // Reset on successful login
      } else {
        loginAttempts++;
        sleep(2); // Back off on failed login
        return; // Skip this iteration if login failed
      }
    } else {
      // Max login attempts reached, skip this iteration
      sleep(5);
      return;
    }
  }
  
  // Simulate realistic user behavior: browse different endpoints
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% of time: Check dashboard
    testDashboardAccess(userToken);
  } else if (scenario < 0.7) {
    // 30% of time: View help requests
    testHelpRequests(userToken);
  } else if (scenario < 0.85) {
    // 15% of time: Check profile
    testProfile(userToken);
  } else {
    // 15% of time: Check multiple endpoints (power user)
    testDashboardAccess(userToken);
    sleep(0.5);
    testHelpRequests(userToken);
  }
  
  // Realistic think time: 1-4 seconds between actions
  sleep(Math.random() * 3 + 1);
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`, { tags: { type: 'health' } });
  
  const success = check(response, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 200ms': (r) => r.timings.duration < 200,
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
    tags: { type: 'login' },
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);
  
  const success = check(response, {
    'Login status is 200': (r) => r.status === 200,
    'Login response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  loginResponseTime.add(response.timings.duration);
  responseTime.add(response.timings.duration);
  
  // Return token if login successful
  if (response.status === 200) {
    try {
      const responseData = JSON.parse(response.body);
      return (responseData.data && responseData.data.token) || responseData.token;
    } catch (e) {
      console.error('Failed to parse login response');
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
    tags: { type: 'api' },
  };
  
  const response = http.get(`${BASE_URL}/api/v1/dashboard/stats`, params);
  
  const success = check(response, {
    'Dashboard status is 200': (r) => r.status === 200,
    'Dashboard response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
  responseTime.add(response.timings.duration);
  
  // Handle token expiry
  if (response.status === 401) {
    userToken = null; // Force re-login on next iteration
  }
}

function testHelpRequests(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: 'api' },
  };
  
  const response = http.get(`${BASE_URL}/api/v1/help-requests`, params);
  
  const success = check(response, {
    'Help requests status is 200': (r) => r.status === 200,
    'Help requests response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
  responseTime.add(response.timings.duration);
  
  // Handle token expiry
  if (response.status === 401) {
    userToken = null; // Force re-login on next iteration
  }
}

function testProfile(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: 'api' },
  };
  
  const response = http.get(`${BASE_URL}/api/v1/auth/me`, params);
  
  const success = check(response, {
    'Profile status is 200': (r) => r.status === 200,
    'Profile response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  apiResponseTime.add(response.timings.duration);
  responseTime.add(response.timings.duration);
  
  // Handle token expiry
  if (response.status === 401) {
    userToken = null; // Force re-login on next iteration
  }
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting REALISTIC load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test simulates actual user behavior:');
  console.log('  - Users login once per session (15min)');
  console.log('  - Realistic think time between actions (1-4s)');
  console.log('  - Mixed endpoint usage (40% dashboard, 30% help requests, 15% profile, 15% multiple)');
  console.log('  - Gradual ramp: 100 users @ 2min, 500 users @ 7min, sustain 10min');
  
  // Verify application is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Application health check failed: ${healthResponse.status}`);
  }
  
  console.log('✓ Application health check passed');
  
  return { baseUrl: BASE_URL };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Realistic load test completed!');
  console.log('Analysis should show:');
  console.log('  - Significantly fewer login attempts (one per VU session)');
  console.log('  - More accurate API endpoint performance metrics');
  console.log('  - Better representation of real user experience');
}
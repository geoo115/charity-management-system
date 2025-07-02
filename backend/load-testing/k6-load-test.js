import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const authFailureRate = new Rate('auth_failure_rate');
const apiResponseTime = new Trend('api_response_time');
const websocketConnections = new Gauge('websocket_connections');
const businessOperations = new Counter('business_operations');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },   // Ramp up to 10 users
        { duration: '5m', target: 10 },   // Stay at 10 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
      gracefulRampDown: '1m',
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startTime: '10m',
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Spike to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '3m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '2m',
    },
    
    // WebSocket connections test
    websocket_test: {
      executor: 'constant-vus',
      vus: 20,
      duration: '15m',
      startTime: '5m',
      exec: 'websocketTest',
    },
    
    // Database intensive operations
    database_test: {
      executor: 'ramping-rate',
      startTime: '2m',
      stages: [
        { duration: '3m', target: 50 },   // 50 RPS
        { duration: '5m', target: 100 },  // 100 RPS
        { duration: '3m', target: 50 },   // Back to 50 RPS
      ],
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'databaseIntensiveTest',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    auth_failure_rate: ['rate<0.05'],  // Auth failures under 5%
    websocket_connections: ['value>15'], // At least 15 WS connections
    business_operations: ['count>1000'], // At least 1000 business ops
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data
const TEST_USERS = {
  admin: { email: 'admin@lewisham-hub.org', password: 'admin123', role: 'admin' },
  volunteer: { email: 'volunteer@test.com', password: 'volunteer123', role: 'volunteer' },
  visitor: { email: 'visitor@test.com', password: 'visitor123', role: 'visitor' },
  donor: { email: 'donor@test.com', password: 'donor123', role: 'donor' },
};

// Helper functions
function authenticateUser(userType) {
  const user = TEST_USERS[userType];
  const loginResponse = http.post(`${API_BASE}/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const authSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'auth token received': (r) => r.json('data.access_token') !== '',
  });
  
  authFailureRate.add(!authSuccess);
  
  if (authSuccess) {
    return loginResponse.json('data.access_token');
  }
  return null;
}

function makeAuthenticatedRequest(method, endpoint, token, payload = null) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  let response;
  const startTime = Date.now();
  
  switch (method.toLowerCase()) {
    case 'get':
      response = http.get(`${API_BASE}${endpoint}`, { headers });
      break;
    case 'post':
      response = http.post(`${API_BASE}${endpoint}`, payload ? JSON.stringify(payload) : null, { headers });
      break;
    case 'put':
      response = http.put(`${API_BASE}${endpoint}`, payload ? JSON.stringify(payload) : null, { headers });
      break;
    case 'delete':
      response = http.del(`${API_BASE}${endpoint}`, null, { headers });
      break;
  }
  
  const responseTime = Date.now() - startTime;
  apiResponseTime.add(responseTime);
  
  return response;
}

// Main test function
export default function() {
  group('User Authentication Flow', () => {
    const userTypes = Object.keys(TEST_USERS);
    const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
    const token = authenticateUser(userType);
    
    if (!token) return;
    
    // Profile operations
    group('Profile Management', () => {
      const profileResponse = makeAuthenticatedRequest('GET', '/auth/me', token);
      check(profileResponse, {
        'profile fetch successful': (r) => r.status === 200,
        'profile has user data': (r) => r.json('data.id') !== null,
      });
      
      businessOperations.add(1);
    });
    
    // Role-specific operations
    switch (userType) {
      case 'admin':
        adminOperations(token);
        break;
      case 'volunteer':
        volunteerOperations(token);
        break;
      case 'visitor':
        visitorOperations(token);
        break;
      case 'donor':
        donorOperations(token);
        break;
    }
    
    sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
  });
}

function adminOperations(token) {
  group('Admin Operations', () => {
    // Dashboard analytics
    const dashboardResponse = makeAuthenticatedRequest('GET', '/admin/dashboard', token);
    check(dashboardResponse, {
      'admin dashboard accessible': (r) => r.status === 200,
    });
    
    // User management
    const usersResponse = makeAuthenticatedRequest('GET', '/admin/users?page=1&limit=10', token);
    check(usersResponse, {
      'users list accessible': (r) => r.status === 200,
      'users list has pagination': (r) => r.json('pagination') !== null,
    });
    
    // Help requests management
    const helpRequestsResponse = makeAuthenticatedRequest('GET', '/admin/help-requests?status=pending', token);
    check(helpRequestsResponse, {
      'help requests accessible': (r) => r.status === 200,
    });
    
    businessOperations.add(3);
  });
}

function volunteerOperations(token) {
  group('Volunteer Operations', () => {
    // Volunteer dashboard
    const dashboardResponse = makeAuthenticatedRequest('GET', '/volunteer/dashboard', token);
    check(dashboardResponse, {
      'volunteer dashboard accessible': (r) => r.status === 200,
    });
    
    // Profile management
    const profileResponse = makeAuthenticatedRequest('GET', '/volunteer/profile', token);
    check(profileResponse, {
      'volunteer profile accessible': (r) => r.status === 200,
    });
    
    // Shifts management
    const shiftsResponse = makeAuthenticatedRequest('GET', '/volunteer/shifts/available', token);
    check(shiftsResponse, {
      'available shifts accessible': (r) => r.status === 200,
    });
    
    businessOperations.add(3);
  });
}

function visitorOperations(token) {
  group('Visitor Operations', () => {
    // Create help request
    const helpRequestPayload = {
      category: Math.random() > 0.5 ? 'food' : 'general',
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      description: 'Load testing help request',
      contact_method: 'email',
    };
    
    const createResponse = makeAuthenticatedRequest('POST', '/help-requests', token, helpRequestPayload);
    check(createResponse, {
      'help request created': (r) => r.status === 201,
      'help request has ID': (r) => r.json('data.id') !== null,
    });
    
    // Queue status
    const queueResponse = makeAuthenticatedRequest('GET', '/queue', token);
    check(queueResponse, {
      'queue status accessible': (r) => r.status === 200,
    });
    
    // Document upload simulation
    const documentsResponse = makeAuthenticatedRequest('GET', '/documents', token);
    check(documentsResponse, {
      'documents list accessible': (r) => r.status === 200,
    });
    
    businessOperations.add(3);
  });
}

function donorOperations(token) {
  group('Donor Operations', () => {
    // Donor dashboard
    const dashboardResponse = makeAuthenticatedRequest('GET', '/donor/dashboard', token);
    check(dashboardResponse, {
      'donor dashboard accessible': (r) => r.status === 200,
    });
    
    // Donation history
    const historyResponse = makeAuthenticatedRequest('GET', '/donor/history', token);
    check(historyResponse, {
      'donation history accessible': (r) => r.status === 200,
    });
    
    // Create donation
    const donationPayload = {
      type: ['monetary', 'goods', 'time'][Math.floor(Math.random() * 3)],
      amount: Math.floor(Math.random() * 1000) + 10,
      description: 'Load testing donation',
    };
    
    const donationResponse = makeAuthenticatedRequest('POST', '/donations', token, donationPayload);
    check(donationResponse, {
      'donation created': (r) => r.status === 201,
    });
    
    businessOperations.add(3);
  });
}

// WebSocket test function
export function websocketTest() {
  const token = authenticateUser('volunteer');
  if (!token) return;
  
  const wsUrl = `ws://localhost:8080/ws/notifications?token=${token}`;
  
  const res = ws.connect(wsUrl, {}, function (socket) {
    websocketConnections.add(1);
    
    socket.on('open', () => {
      console.log('WebSocket connected');
      
      // Subscribe to notifications
      socket.send(JSON.stringify({
        type: 'subscribe',
        categories: ['queue_updates', 'help_requests', 'system_notifications']
      }));
    });
    
    socket.on('message', (data) => {
      check(data, {
        'websocket message received': (d) => d.length > 0,
      });
    });
    
    socket.on('close', () => {
      websocketConnections.add(-1);
      console.log('WebSocket disconnected');
    });
    
    sleep(30); // Keep connection open for 30 seconds
  });
  
  check(res, {
    'websocket connection established': (r) => r && r.status === 101,
  });
}

// Database intensive test function
export function databaseIntensiveTest() {
  const token = authenticateUser('admin');
  if (!token) return;
  
  group('Database Intensive Operations', () => {
    // Multiple rapid requests to stress database
    const endpoints = [
      '/admin/analytics?range=7d',
      '/admin/users?page=1&limit=50',
      '/admin/help-requests?status=all&page=1&limit=50',
      '/admin/donations?page=1&limit=50',
      '/admin/volunteers?status=active&page=1&limit=50',
    ];
    
    endpoints.forEach(endpoint => {
      const response = makeAuthenticatedRequest('GET', endpoint, token);
      check(response, {
        [`${endpoint} responds correctly`]: (r) => r.status === 200,
      });
    });
    
    businessOperations.add(endpoints.length);
  });
  
  sleep(0.1); // Minimal sleep for high RPS
}

// Health check function
export function healthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health endpoint accessible': (r) => r.status === 200,
    'database healthy': (r) => r.json('database.status') === 'healthy',
    'redis healthy': (r) => r.json('redis.status') === 'healthy',
  });
}

// Setup function
export function setup() {
  console.log('Starting load test setup...');
  
  // Verify API is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error('API health check failed - is the server running?');
  }
  
  console.log('API health check passed');
  return { baseUrl: BASE_URL };
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Base URL: ${data.baseUrl}`);
} 
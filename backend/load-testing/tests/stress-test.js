import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');

// Stress test configuration - gradually increase load to find breaking point
export let options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '3m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 150 },   // Ramp up to 150 users
    { duration: '3m', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],     // Allow higher latency under stress
    http_req_failed: ['rate<0.3'],         // Allow 30% error rate during stress
    errors: ['rate<0.3'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';

const testUsers = [
  { email: 'stress1@example.com', password: 'password123' },
  { email: 'stress2@example.com', password: 'password123' },
  { email: 'stress3@example.com', password: 'password123' },
  { email: 'stress4@example.com', password: 'password123' },
  { email: 'stress5@example.com', password: 'password123' },
];

function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

export default function () {
  // Mix of operations to stress different parts of the system
  const operations = [
    () => testHealthCheck(),
    () => testAuthentication(),
    () => testMultipleEndpoints(),
    () => testConcurrentRequests(),
  ];
  
  // Randomly select operation to create varied load
  const operation = operations[Math.floor(Math.random() * operations.length)];
  operation();
  
  // Shorter sleep time to increase request rate
  sleep(0.5);
}

function testHealthCheck() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'Health check successful': (r) => r.status === 200,
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
    'Auth request completed': (r) => r.status > 0, // Any response is better than timeout
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testMultipleEndpoints() {
  // Rapid-fire multiple endpoint requests to stress the system
  const endpoints = [
    '/health',
    '/metrics',
    '/api/v1/auth/me',
    '/api/v1/help-requests',
    '/api/v1/donations',
  ];
  
  endpoints.forEach(endpoint => {
    const response = http.get(`${BASE_URL}${endpoint}`);
    
    const success = check(response, {
      [`${endpoint} responded`]: (r) => r.status > 0,
    });
    
    errorRate.add(!success);
    responseTime.add(response.timings.duration);
  });
}

function testConcurrentRequests() {
  // Simulate concurrent requests from same user
  const requests = [
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/metrics`],
    ['GET', `${BASE_URL}/health`],
  ];
  
  const responses = http.batch(requests);
  
  responses.forEach((response, index) => {
    const success = check(response, {
      [`Batch request ${index} completed`]: (r) => r.status > 0,
    });
    
    errorRate.add(!success);
    responseTime.add(response.timings.duration);
  });
}

export function setup() {
  console.log('Starting stress test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test configuration: Gradually increasing load from 50 to 200 users');
  console.log('Objective: Find system breaking point and performance degradation');
  
  // Verify application is accessible
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.log(`Warning: Application health check returned ${healthResponse.status}`);
    console.log('Proceeding with stress test to measure failure behavior...');
  }
  
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log('Stress test completed!');
  console.log('Review results to identify:');
  console.log('- Maximum sustainable concurrent users');
  console.log('- Performance degradation points');
  console.log('- Error rate patterns');
  console.log('- System recovery behavior');
}
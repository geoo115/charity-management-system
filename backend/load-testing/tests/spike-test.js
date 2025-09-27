import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');

// Spike test configuration - sudden traffic surge simulation
export let options = {
  stages: [
    { duration: '2m', target: 20 },    // Normal load
    { duration: '30s', target: 200 },  // Sudden spike!
    { duration: '2m', target: 200 },   // Maintain spike
    { duration: '30s', target: 20 },   // Back to normal
    { duration: '2m', target: 20 },    // Recovery period
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],    // Very lenient during spike
    http_req_failed: ['rate<0.5'],         // Allow 50% error rate during spike
    errors: ['rate<0.5'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';

// Simulate different types of users during spike (viral content, news coverage, etc.)
const spikeUsers = [
  { email: 'spike1@example.com', password: 'password123' },
  { email: 'spike2@example.com', password: 'password123' },
  { email: 'spike3@example.com', password: 'password123' },
  { email: 'newuser1@example.com', password: 'password123' },
  { email: 'newuser2@example.com', password: 'password123' },
  { email: 'newuser3@example.com', password: 'password123' },
];

function getRandomUser() {
  return spikeUsers[Math.floor(Math.random() * spikeUsers.length)];
}

export default function () {
  // During spike, simulate typical user behavior when site goes viral
  const scenarios = [
    () => browseAsVisitor(),
    () => attemptRegistration(),
    () => checkServiceStatus(),
    () => rapidPageRefresh(),
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  // Variable sleep to simulate real user behavior
  sleep(Math.random() * 2);
}

function browseAsVisitor() {
  // Typical visitor behavior during viral traffic
  const response1 = http.get(`${BASE_URL}/health`);
  
  check(response1, {
    'Site accessible': (r) => r.status > 0,
  });
  
  errorRate.add(response1.status === 0 || response1.status >= 500);
  responseTime.add(response1.timings.duration);
  
  // Try to access main API endpoints
  const response2 = http.get(`${BASE_URL}/api/v1/help-requests`);
  
  check(response2, {
    'Help requests accessible': (r) => r.status > 0,
  });
  
  errorRate.add(response2.status === 0 || response2.status >= 500);
  responseTime.add(response2.timings.duration);
}

function attemptRegistration() {
  // New users trying to register during spike
  const user = getRandomUser();
  const registerPayload = JSON.stringify({
    email: user.email,
    password: user.password,
    first_name: 'Test',
    last_name: 'User',
    role: 'visitor'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, params);
  
  const success = check(response, {
    'Registration attempt processed': (r) => r.status > 0,
  });
  
  errorRate.add(!success || response.status >= 500);
  responseTime.add(response.timings.duration);
}

function checkServiceStatus() {
  // Users checking if service is working
  const response = http.get(`${BASE_URL}/metrics`);
  
  const success = check(response, {
    'Metrics accessible': (r) => r.status > 0,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function rapidPageRefresh() {
  // Users rapidly refreshing pages when site is slow
  for (let i = 0; i < 3; i++) {
    const response = http.get(`${BASE_URL}/health`);
    
    check(response, {
      [`Refresh ${i + 1} completed`]: (r) => r.status > 0,
    });
    
    errorRate.add(response.status === 0 || response.status >= 500);
    responseTime.add(response.timings.duration);
    
    sleep(0.2); // Quick refresh attempts
  }
}

export function setup() {
  console.log('Starting spike load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('Test configuration: Sudden spike from 20 to 200 users in 30 seconds');
  console.log('Simulates: Viral social media, news coverage, emergency situations');
  
  // Check initial state
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.log(`Warning: Application health check returned ${healthResponse.status}`);
  }
  
  return { baseUrl: BASE_URL, initialStatus: healthResponse.status };
}

export function teardown(data) {
  console.log('Spike test completed!');
  console.log('Review results for:');
  console.log('- Response to sudden traffic surge');
  console.log('- Error rate during spike period');
  console.log('- Recovery time after spike');
  console.log('- System stability during high load');
  
  // Check final state
  const finalHealthResponse = http.get(`${BASE_URL}/health`);
  console.log(`Initial status: ${data.initialStatus}, Final status: ${finalHealthResponse.status}`);
  
  if (finalHealthResponse.status === data.initialStatus) {
    console.log('✓ System recovered to initial state');
  } else {
    console.log('⚠ System state changed after spike test');
  }
}
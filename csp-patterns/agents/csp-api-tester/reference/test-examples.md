# API Tester — Test Suite Examples

## Comprehensive API Test Suite (Playwright)

```javascript
import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';

describe('User API Comprehensive Testing', () => {
  let authToken;
  let baseURL = process.env.API_BASE_URL;

  beforeAll(async () => {
    const response = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: process.env.TEST_USER_PASSWORD
      })
    });
    const data = await response.json();
    authToken = data.token;
  });

  describe('Functional Testing', () => {
    test('should create user with valid data', async () => {
      const response = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: 'Test User', email: 'new@example.com', role: 'user' })
      });
      expect(response.status).toBe(201);
      const user = await response.json();
      expect(user.email).toBe('new@example.com');
      expect(user.password).toBeUndefined(); // Password should not be returned
    });

    test('should handle invalid input gracefully', async () => {
      const response = await fetch(`${baseURL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: '', email: 'invalid-email', role: 'invalid_role' })
      });
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.errors).toBeDefined();
    });
  });

  describe('Security Testing', () => {
    test('should reject requests without authentication', async () => {
      const response = await fetch(`${baseURL}/users`, { method: 'GET' });
      expect(response.status).toBe(401);
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const response = await fetch(`${baseURL}/users?search=${sqlInjection}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(response.status).not.toBe(500);
    });

    test('should enforce rate limiting', async () => {
      const requests = Array(100).fill(null).map(() =>
        fetch(`${baseURL}/users`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      );
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    test('should respond within performance SLA', async () => {
      const startTime = performance.now();
      const response = await fetch(`${baseURL}/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const responseTime = performance.now() - startTime;
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(200); // Under 200ms SLA
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        fetch(`${baseURL}/users`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      );
      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const avgResponseTime = (performance.now() - startTime) / concurrentRequests;
      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(avgResponseTime).toBeLessThan(500);
    });
  });
});
```

## OWASP API Security Top 10 Checklist

1. **BOLA (Broken Object Level Authorization)**: Test accessing resources you don't own
2. **BFLA (Broken Function Level Authorization)**: Test accessing admin endpoints as regular user
3. **Excessive Data Exposure**: Verify API doesn't return more data than needed
4. **Lack of Resources & Rate Limiting**: Test rate limiting enforcement
5. **Broken Authentication**: Test token manipulation, expired tokens, algorithm confusion
6. **Mass Assignment**: Test if API accepts fields you shouldn't be able to modify
7. **Security Misconfiguration**: Check for verbose errors, debug endpoints, default credentials
8. **Injection**: SQL, NoSQL, command injection in all input fields
9. **Improper Assets Management**: Test undocumented/deprecated endpoints
10. **Insufficient Logging & Monitoring**: Verify security events are logged

## Contract Testing (Consumer-Driven)

```javascript
// Define consumer expectations
const consumerContract = {
  endpoint: 'GET /users/{id}',
  request: { headers: { 'Authorization': 'Bearer {token}' } },
  response: {
    status: 200,
    body: {
      id: 'string',
      name: 'string',
      email: 'string',
      // Consumer only cares about these fields
    }
  }
};

// Provider validates it meets expectations
test('provider meets consumer contract', async () => {
  const response = await fetch(`${baseURL}/users/123`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  expect(response.status).toBe(200);
  const user = await response.json();
  expect(user).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    email: expect.any(String),
  });
});
```

## Load Testing with k6

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests < 200ms
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function () {
  const res = http.get(`${__ENV.API_BASE_URL}/users`, {
    headers: { 'Authorization': `Bearer ${__ENV.AUTH_TOKEN}` }
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

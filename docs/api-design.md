# API Design

REST API architecture and design principles for the Notification Service.

> **Note:** This is a backend-to-backend (B2B) internal API. It is designed to be called by other backend services within your infrastructure, NOT by end-user clients (browsers, mobile apps).

## Design Principles

### RESTful Design

The API follows REST principles:
- Resources identified by URIs
- Standard HTTP methods (GET, POST)
- Stateless requests
- JSON request/response format
- Standard HTTP status codes

### Idempotency

POST endpoints return notification ID, allowing clients to check status and avoid duplicate sends.

### Error Handling

Consistent error response format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "email",
        "message": "\"email\" must be a valid email"
      }
    ]
  }
}
```

## API Structure

```
/api
├── /health                                     GET
├── /ready                                      GET
└── /notifications
    ├── /send-verification                      POST
    ├── /send                                   POST
    ├── /:id                                    GET
    └── /user/:userId
        └── /stats                              GET
```

## Endpoints

### Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Basic liveness check

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-02-06T10:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Service is alive

---

### Readiness Check

**Endpoint:** `GET /api/ready`

**Purpose:** Readiness check with dependency status

**Response:**
```json
{
  "status": "READY",
  "checks": {
    "rabbitmq": true,
    "database": true
  }
}
```

**Status Codes:**
- `200 OK` - Service is ready
- `503 Service Unavailable` - Dependencies not available

---

### Send Verification Email

**Endpoint:** `POST /api/notifications/send-verification`

**Purpose:** Send verification email with custom template

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "verificationLink": "https://yourapp.com/verify?token=abc123",
  "subject": "Verify your email address",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "callbackUrl": "https://yourapp.com/api/webhooks/email-sent"
}
```

**Required Fields:**
- `email` - Valid email address
- `username` - User's display name
- `verificationLink` - HTTPS URL for verification

**Optional Fields:**
- `subject` - Custom subject line (default: "Verify your email")
- `userId` - User ID for tracking
- `callbackUrl` - HTTP(S) URL to receive delivery status

**Response:**
```json
{
  "success": true,
  "message": "Verification email queued for delivery",
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "statusUrl": "/api/notifications/123e4567-e89b-12d3-a456-426614174000"
}
```

**Status Codes:**
- `200 OK` - Email queued successfully
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid API key (if authentication enabled)
- `429 Too Many Requests` - Rate limit exceeded (if rate limiting enabled)
- `503 Service Unavailable` - Queue unavailable

---

### Send Custom Notification

**Endpoint:** `POST /api/notifications/send`

**Purpose:** Send custom notification with plain text or HTML

**Request Body:**
```json
{
  "email": "user@example.com",
  "subject": "Order Confirmation",
  "message": "Your order #12345 has been confirmed!",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "callbackUrl": "https://yourapp.com/api/webhooks/email-sent"
}
```

**Required Fields:**
- `email` - Valid email address
- `subject` - Email subject
- `message` - Email body (plain text or HTML)

**Optional Fields:**
- `userId` - User ID for tracking
- `callbackUrl` - HTTP(S) URL to receive delivery status

**Response:**
```json
{
  "success": true,
  "message": "Notification queued for delivery",
  "notificationId": "456e7890-e12b-34c5-d678-901234567890",
  "statusUrl": "/api/notifications/456e7890-e12b-34c5-d678-901234567890"
}
```

**Status Codes:**
- `200 OK` - Notification queued successfully
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid API key
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - Queue unavailable

---

### Get Notification Status

**Endpoint:** `GET /api/notifications/:id`

**Purpose:** Check notification delivery status

**Path Parameters:**
- `id` - Notification UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "456e7890-e12b-34c5-d678-901234567890",
    "type": "email",
    "channel": "user@example.com",
    "subject": "Verify your email address",
    "status": "sent",
    "errorMessage": null,
    "retryCount": 0,
    "createdAt": "2026-02-06T10:00:00.000Z",
    "updatedAt": "2026-02-06T10:00:05.000Z",
    "sentAt": "2026-02-06T10:00:05.000Z"
  }
}
```

**Status Values:**
- `queued` - Waiting in queue
- `sending` - Currently being processed
- `sent` - Successfully delivered
- `failed` - Delivery failed (see errorMessage)
- `retrying` - Temporary failure, will retry

**Status Codes:**
- `200 OK` - Notification found
- `404 Not Found` - Notification ID does not exist

---

### Get User Statistics

**Endpoint:** `GET /api/notifications/user/:userId/stats`

**Purpose:** Get notification statistics for a user

**Path Parameters:**
- `userId` - User UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "sent": 145,
    "failed": 3,
    "pending": 2
  }
}
```

**Status Codes:**
- `200 OK` - Statistics retrieved
- `400 Bad Request` - Invalid userId format

---

## Request Validation

### Validation Rules

Implemented using Joi schemas:

```typescript
// Email validation
const email = Joi.string().email().required();

// UUID validation
const uuid = Joi.string().uuid();

// URL validation
const url = Joi.string().uri({ scheme: ['http', 'https'] });

// Verification email schema
const sendVerification = Joi.object({
  email: email,
  username: Joi.string().required().min(1).max(255),
  verificationLink: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  userId: uuid.optional(),
  subject: Joi.string().max(500).optional(),
  callbackUrl: url.allow(null, '').optional()
});
```

### Validation Errors

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "email",
        "message": "\"email\" must be a valid email"
      },
      {
        "field": "verificationLink",
        "message": "\"verificationLink\" must be a valid uri with a scheme matching the http|https pattern"
      }
    ]
  }
}
```

## Authentication

### API Key Authentication (Optional)

When `API_KEY` environment variable is set, all endpoints require authentication via `X-API-Key` header.

**Recommendation:** For production B2B deployments, enable API key authentication to track and limit requests per calling service.

**Header:**
```
X-API-Key: your-secret-api-key-here
```

**Example:**
```bash
# Called from another backend service
curl -X POST http://notification-api.internal:3001/api/notifications/send \
  -H "X-API-Key: auth-service-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","subject":"Test","message":"Hello"}'
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

## Rate Limiting

### Configuration

When `RATE_LIMIT_ENABLED=true` and Redis is configured:

```env
RATE_LIMIT_ENABLED=true
REDIS_URL=redis://redis:6379
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
RATE_LIMIT_BLOCK_DURATION=300
```

**Effect:** 100 requests per 60 seconds per API key (for B2B services, rate limiting by API key is more appropriate than by IP address, since multiple services may share the same IP)

### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Too many requests, please try again later",
    "retryAfter": 300
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707217500
Retry-After: 300
```

## Error Handling

### Error Response Format

All errors follow consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
    [key: string]: any;
  };
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request payload |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded |
| `CONFLICT` | 409 | Resource conflict |
| `SERVICE_UNAVAILABLE` | 503 | Service or dependency unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Custom Error Classes

```typescript
class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: any[];
  
  constructor(message: string, details: any[]) {
    super(message);
    this.details = details;
  }
}

class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`);
  }
}
```

## Response Caching

### Cache Headers

Status check responses include cache headers:

```http
Cache-Control: no-cache, no-store, must-revalidate
```

Rationale: Notification status changes frequently, caching would show stale data.

## CORS

CORS is **not needed** for this service since it's a backend-to-backend API. All requests come from other backend services, not from browsers.

If you need to expose this service to browser clients (not recommended), you would need to add CORS middleware. However, the recommended pattern is to have your user-facing backend call this service internally.

## Webhooks / Callbacks

### Callback URL

When `callbackUrl` is provided in request, the service will POST delivery status to that URL.

**Request to Callback URL:**
```http
POST https://yourapp.com/api/webhooks/email-sent
Content-Type: application/json

{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "sent",
  "timestamp": "2026-02-06T10:00:05.000Z",
  "userId": "456e7890-e12b-34c5-d678-901234567890"
}
```

**Callback on Failure:**
```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "failed",
  "errorMessage": "SMTP connection timeout",
  "timestamp": "2026-02-06T10:00:30.000Z",
  "userId": "456e7890-e12b-34c5-d678-901234567890"
}
```

## Versioning

Currently, the API is unversioned. When breaking changes are introduced, versioning will be added:

**Option 1: URL Path**
```
/api/v1/notifications/send
/api/v2/notifications/send
```

**Option 2: Header**
```
Accept: application/vnd.notification-service.v2+json
```

## Future Endpoints

Planned for future releases:

- `GET /api/notifications` - List notifications with pagination
- `DELETE /api/notifications/:id` - Cancel pending notification
- `GET /api/notifications/user/:userId` - Get user notification history
- `POST /api/notifications/batch` - Send multiple notifications
- `GET /api/queue/stats` - Queue depth and metrics

## Next Steps

- [API Examples](api-examples.md) - Integration examples (Node.js, Python, cURL)
- [System Architecture](overview.md) - High-level system design
- [Deployment](deployment.md) - Production deployment
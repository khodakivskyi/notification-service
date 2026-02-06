# API Examples

Integration examples for backend services calling the Notification Service API.

> **Note:** This is a backend-to-backend (B2B) API. All examples show how your backend services can integrate with the Notification Service.

## Authentication (Optional)

If `API_KEY` environment variable is configured, requests require an API key in the `X-API-Key` header:

```bash
curl -X POST http://notification-service:3001/api/notifications/send \
  -H "X-API-Key: your-service-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","subject":"Test","message":"Hello"}'
```

If API key authentication is not enabled, you can omit the `X-API-Key` header:

```bash
curl -X POST http://notification-service:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","subject":"Test","message":"Hello"}'
```

> **Recommendation:** For production B2B deployments, it's recommended to enable API key authentication to track and limit requests per calling service.

---

## Send Verification Email

Used by authentication/registration services to send email verification links.

### Request

```bash
curl -X POST http://notification-service:3001/api/notifications/send-verification \
  -H "X-API-Key: auth-service-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "john_doe",
    "verificationLink": "https://yourapp.com/verify?token=abc123def456",
    "subject": "Please verify your email",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "callbackUrl": "https://auth-service.internal/webhooks/email-status"
  }'
```

### Response (Success)

```json
{
  "success": true,
  "message": "Verification email queued for delivery",
  "notificationId": "789e0123-e45b-67c8-d901-234567890abc",
  "statusUrl": "/api/notifications/789e0123-e45b-67c8-d901-234567890abc"
}
```

### Node.js Example

```typescript
// auth-service/src/services/emailService.ts
import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3001';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY;

interface SendVerificationParams {
  email: string;
  username: string;
  verificationToken: string;
  userId: string;
}

export async function sendVerificationEmail(params: SendVerificationParams): Promise<string> {
  const response = await axios.post(
    `${NOTIFICATION_SERVICE_URL}/api/notifications/send-verification`,
    {
      email: params.email,
      username: params.username,
      verificationLink: `https://yourapp.com/verify?token=${params.verificationToken}`,
      userId: params.userId,
      callbackUrl: `${process.env.AUTH_SERVICE_URL}/webhooks/email-status`
    },
    {
      headers: {
        'X-API-Key': NOTIFICATION_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.notificationId;
}
```

---

## Send Custom Notification

Used by any backend service to send custom email notifications.

### Request

```bash
curl -X POST http://notification-service:3001/api/notifications/send \
  -H "X-API-Key: order-service-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "subject": "Order Confirmation #12345",
    "message": "<h1>Thank you for your order!</h1><p>Your order #12345 has been confirmed.</p>",
    "userId": "456e7890-e12b-34c5-d678-901234567890",
    "callbackUrl": "https://order-service.internal/webhooks/email-status"
  }'
```

### Response (Success)

```json
{
  "success": true,
  "message": "Notification queued for delivery",
  "notificationId": "abc12345-e67f-89g0-h123-456789ijklmn",
  "statusUrl": "/api/notifications/abc12345-e67f-89g0-h123-456789ijklmn"
}
```

### Python Example

```python
# order_service/notifications.py
import os
import requests

NOTIFICATION_SERVICE_URL = os.getenv('NOTIFICATION_SERVICE_URL', 'http://notification-service:3001')
NOTIFICATION_API_KEY = os.getenv('NOTIFICATION_API_KEY')

def send_order_confirmation(email: str, order_id: str, user_id: str) -> str:
    """Send order confirmation email via Notification Service."""
    
    response = requests.post(
        f"{NOTIFICATION_SERVICE_URL}/api/notifications/send",
        json={
            "email": email,
            "subject": f"Order Confirmation #{order_id}",
            "message": f"""
                <h1>Thank you for your order!</h1>
                <p>Your order <strong>#{order_id}</strong> has been confirmed.</p>
                <p>We'll notify you when it ships.</p>
            """,
            "userId": user_id
        },
        headers={
            "X-API-Key": NOTIFICATION_API_KEY,
            "Content-Type": "application/json"
        },
        timeout=10
    )
    
    response.raise_for_status()
    return response.json()["notificationId"]
```

---

## Check Notification Status

Poll the status of a sent notification.

### Request

```bash
curl -X GET http://notification-service:3001/api/notifications/789e0123-e45b-67c8-d901-234567890abc \
  -H "X-API-Key: auth-service-api-key"
```

### Response (Success - Sent)

```json
{
  "success": true,
  "data": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "type": "email",
    "channel": "newuser@example.com",
    "subject": "Please verify your email",
    "status": "sent",
    "errorMessage": null,
    "retryCount": 0,
    "createdAt": "2026-02-06T10:00:00.000Z",
    "updatedAt": "2026-02-06T10:00:05.000Z",
    "sentAt": "2026-02-06T10:00:05.000Z"
  }
}
```

### Response (Failed)

```json
{
  "success": true,
  "data": {
    "id": "789e0123-e45b-67c8-d901-234567890abc",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "type": "email",
    "channel": "invalid-email",
    "subject": "Please verify your email",
    "status": "failed",
    "errorMessage": "SMTP error: Invalid recipient address",
    "retryCount": 3,
    "createdAt": "2026-02-06T10:00:00.000Z",
    "updatedAt": "2026-02-06T10:05:00.000Z",
    "sentAt": null
  }
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `queued` | Waiting in queue to be processed |
| `sending` | Currently being sent |
| `sent` | Successfully delivered to SMTP server |
| `failed` | Delivery failed after all retries |
| `retrying` | Temporary failure, will retry |

---

## Get User Statistics

Get notification statistics for a specific user.

### Request

```bash
curl -X GET http://notification-service:3001/api/notifications/user/123e4567-e89b-12d3-a456-426614174000/stats \
  -H "X-API-Key: admin-service-api-key"
```

### Response

```json
{
  "success": true,
  "data": {
    "total": 25,
    "sent": 23,
    "failed": 1,
    "pending": 1
  }
}
```

---

## Webhook Callbacks

When you provide a `callbackUrl`, the Notification Service will POST the delivery status to that URL.

### Callback Request (Success)

```http
POST https://your-service.internal/webhooks/email-status
Content-Type: application/json

{
  "notificationId": "789e0123-e45b-67c8-d901-234567890abc",
  "status": "sent",
  "timestamp": "2026-02-06T10:00:05.000Z",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Callback Request (Failure)

```http
POST https://your-service.internal/webhooks/email-status
Content-Type: application/json

{
  "notificationId": "789e0123-e45b-67c8-d901-234567890abc",
  "status": "failed",
  "errorMessage": "SMTP error: Connection timeout",
  "timestamp": "2026-02-06T10:05:00.000Z",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Webhook Handler Example (Express.js)

```typescript
// your-service/src/routes/webhooks.ts
import express from 'express';

const router = express.Router();

router.post('/email-status', async (req, res) => {
  const { notificationId, status, errorMessage, userId } = req.body;

  console.log(`Email ${notificationId} for user ${userId}: ${status}`);

  if (status === 'sent') {
    // Update user record, mark email as verified, etc.
    await userService.markEmailSent(userId, notificationId);
  } else if (status === 'failed') {
    // Handle failure - maybe notify admin or retry with different email
    console.error(`Email failed: ${errorMessage}`);
    await alertService.notifyEmailFailure(userId, errorMessage);
  }

  res.status(200).json({ received: true });
});

export default router;
```

---

## Health Check

Check if the Notification Service is healthy.

### Liveness Check

```bash
curl http://notification-service:3001/api/health
```

```json
{
  "status": "OK",
  "timestamp": "2026-02-06T10:00:00.000Z"
}
```

### Readiness Check

```bash
curl http://notification-service:3001/api/ready
```

```json
{
  "status": "READY",
  "checks": {
    "rabbitmq": true,
    "database": true
  }
}
```

---

## Error Handling

### Validation Error (400)

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

### Authentication Error (401)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found: invalid-uuid"
  }
}
```

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Too many requests, please try again later",
    "retryAfter": 60
  }
}
```

### Service Unavailable (503)

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Message queue is unavailable"
  }
}
```

---

## Best Practices

### 1. Use Callbacks Instead of Polling

Instead of polling for status, provide a `callbackUrl` to receive notifications:

```typescript
// Good - use callbacks
await sendEmail({
  email: 'user@example.com',
  subject: 'Hello',
  message: 'World',
  callbackUrl: 'https://your-service/webhooks/email-status'
});

// Avoid - polling
const notificationId = await sendEmail({ ... });
while (true) {
  const status = await checkStatus(notificationId);
  if (status === 'sent' || status === 'failed') break;
  await sleep(1000);
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  await sendVerificationEmail(user);
} catch (error) {
  if (error.response?.status === 503) {
    // Queue is down - retry later or use fallback
    await queueForLaterRetry(user);
  } else if (error.response?.status === 429) {
    // Rate limited - back off
    const retryAfter = error.response.data.error.retryAfter;
    await sleep(retryAfter * 1000);
    await sendVerificationEmail(user);
  } else {
    throw error;
  }
}
```

### 3. Set Reasonable Timeouts

```typescript
const response = await axios.post(url, data, {
  timeout: 10000, // 10 seconds
  headers: { 'X-API-Key': apiKey }
});
```

### 4. Use Circuit Breaker Pattern

For production, implement a circuit breaker to handle service failures:

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(sendEmail, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => {
  // Queue email for later or use backup service
});
```

---

## Next Steps

- [API Design](api-design.md) - API structure and authentication
- [System Architecture](overview.md) - How the service works
- [Deployment](deployment.md) - Deploy in your infrastructure

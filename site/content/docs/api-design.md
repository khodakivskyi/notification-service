# API Design

REST API design for Notification Service v2.

> **Note:** Internal backend-to-backend API only.

## Base Paths

- `/api/health`
- `/api/ready`
- `/api/notifications/*`

## Endpoints

### `POST /api/notifications/send`
Queue a notification for async delivery.

**Request body:**

```json
{
  "email": "user@example.com",
  "subject": "Order Confirmation",
  "htmlContent": "<h1>Thanks!</h1><p>Your order is confirmed.</p>",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "callbackUrl": "https://your-service.internal/webhooks/email-status"
}
```

**Required fields:**
- `email`
- `subject`
- `htmlContent`

**Response:** `202 Accepted`

```json
{
  "success": true,
  "message": "Notification queued for delivery",
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "statusUrl": "/api/notifications/123e4567-e89b-12d3-a456-426614174000"
}
```

---

### `GET /api/notifications/:id`
Get notification details and current status.

### `GET /api/notifications/user/:userId/stats`
Get aggregated notification stats for a user.

### `GET /api/notifications/queue/stats`
Get queue metrics from RabbitMQ integration.

### `GET /api/health`
Liveness check.

### `GET /api/ready`
Readiness check with DB/RabbitMQ status.

---

## Authentication (optional)

If `API_KEY` is set, include header:

```http
X-API-Key: your-secret-api-key
```

---

## Validation Rules

`POST /api/notifications/send` schema:

- `email`: valid email, required
- `subject`: string, required, max 255
- `htmlContent`: string, required
- `userId`: optional
- `callbackUrl`: optional URI

---

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload"
  }
}
```

Common codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `NOT_FOUND` (404)
- `RATE_LIMIT_ERROR` (429)
- `SERVICE_UNAVAILABLE` (503)
- `INTERNAL_ERROR` (500)

---

## Next Steps

- [API Examples](api-examples.md)
- [System Architecture](overview.md)
- [Deployment](deployment.md)

# API Examples

Practical backend integration examples for Notification Service v2.

> **Note:** The main delivery endpoint in v2 is `POST /api/notifications/send`.

## Send Notification

```bash
curl -X POST http://notification-service:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-service-api-key" \
  -d '{
    "email": "customer@example.com",
    "subject": "Order #12345",
    "htmlContent": "<h1>Order confirmed</h1><p>Thank you!</p>",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "callbackUrl": "https://order-service.internal/webhooks/email-status"
  }'
```

### Success response

```json
{
  "success": true,
  "message": "Notification queued for delivery",
  "notificationId": "abc12345-e67f-89g0-h123-456789ijklmn",
  "statusUrl": "/api/notifications/abc12345-e67f-89g0-h123-456789ijklmn"
}
```

---

## Node.js Example

```typescript
import axios from 'axios';

const baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3001';
const apiKey = process.env.NOTIFICATION_API_KEY;

export async function sendOrderEmail(email: string, orderId: string, userId: string) {
  const response = await axios.post(
    `${baseUrl}/api/notifications/send`,
    {
      email,
      subject: `Order Confirmation #${orderId}`,
      htmlContent: `<h1>Order #${orderId}</h1><p>Thank you for your purchase.</p>`,
      userId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      timeout: 10000,
    },
  );

  return response.data.notificationId;
}
```

---

## Python Example

```python
import os
import requests

base_url = os.getenv('NOTIFICATION_SERVICE_URL', 'http://notification-service:3001')
api_key = os.getenv('NOTIFICATION_API_KEY')


def send_email(email: str, order_id: str, user_id: str) -> str:
    response = requests.post(
        f"{base_url}/api/notifications/send",
        json={
            "email": email,
            "subject": f"Order Confirmation #{order_id}",
            "htmlContent": f"<h1>Order #{order_id}</h1><p>Thank you!</p>",
            "userId": user_id,
        },
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["notificationId"]
```

---

## Check Notification Status

```bash
curl -X GET http://notification-service:3001/api/notifications/{notificationId} \
  -H "X-API-Key: your-service-api-key"
```

---

## Queue and Health Endpoints

```bash
curl http://notification-service:3001/api/notifications/queue/stats
curl http://notification-service:3001/api/health
curl http://notification-service:3001/api/ready
```

---

## Callback Payload Example

```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "sent",
  "timestamp": "2026-05-09T18:00:00.000Z",
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## Next Steps

- [API Design](api-design.md)
- [System Architecture](overview.md)
- [Deployment](deployment.md)

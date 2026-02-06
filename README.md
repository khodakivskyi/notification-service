# Notification Service

> Internal backend-to-backend (B2B) microservice for sending email notifications with queue-based processing and automatic retries.

**This service is designed to be called by other backend services** (e.g., auth service, order service) to send emails to end users. It should be deployed within your private network and NOT exposed to the public internet.

[![Release](https://img.shields.io/github/v/release/khodakivskyi/notification-service)](https://github.com/khodakivskyi/notification-service/releases)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue)](https://ghcr.io/khodakivskyi/notification-service)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Quick Start

```bash
# Clone and start
git clone https://github.com/khodakivskyi/notification-service.git
cd notification-service
docker-compose up -d

# Send your first notification
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","subject":"Hello!","message":"It works!"}'
```

**[→ Full Documentation](docs/index.md)**

---

## Features

- **B2B Microservice** – Designed for internal backend-to-backend communication
- **Email Notifications** – Verification emails, custom notifications, templated messages
- **Queue Processing** – RabbitMQ-based async job processing with guaranteed delivery
- **Automatic Retries** – Exponential backoff with Dead Letter Queue (DLQ)
- **Webhook Callbacks** – Receive delivery status via HTTP callbacks
- **Notification Tracking** – PostgreSQL database for delivery status and history
- **Health Checks** – Built-in health and readiness endpoints
- **Docker Ready** – Multi-platform images (amd64, arm64)
- **Rate Limiting** – Optional Redis-based rate limiting per API key
- **Production Ready** – Structured logging, error handling, graceful shutdown
- **Easy Integration** – RESTful API, Docker Compose, examples for Node.js, Python, cURL

---

## Architecture

```
┌─────────────────────┐
│  Your Backend       │
│  (Auth, Orders...)  │
└──────┬──────────────┘
       │ HTTP POST (internal network)
       ↓
┌─────────────────────┐
│ Notification Service│
│    (Express API)    │
└──────┬──────────────┘
       │ Queue Job
       ↓
┌─────────────────────┐
│     RabbitMQ        │
│  (Message Broker)   │
└──────┬──────────────┘
       │ Consume
       ↓
┌─────────────────────┐
│      Workers        │
│  (Email Sender)     │
└──────┬──────────────┘
       │
       ├─→ PostgreSQL (Status tracking)
       └─→ SMTP Server (Send email to end user)
```

**[→ Detailed Architecture Documentation](docs/overview.md)**

---

## Installation

### Docker (Recommended)

```bash
docker pull ghcr.io/khodakivskyi/notification-service:latest
```

### Docker Compose

```bash
docker-compose up -d
```

### From Source

```bash
npm install
npm run build
npm start
```

**[→ Development Setup Guide](docs/setup.md)**

---

## Documentation

### Architecture
- [System Overview](docs/overview.md) – High-level design and B2B integration
- [Database Schema](docs/database.md) – PostgreSQL tables
- [Message Queue](docs/message-queue.md) – RabbitMQ integration
- [API Design](docs/api-design.md) – REST API structure
- [API Examples](docs/api-examples.md) – Integration examples (Node.js, Python, cURL)

### Development
- [Development Setup](docs/setup.md) – Local environment
- [Project Structure](docs/structure.md) – Codebase organization
- [Coding Standards](docs/standards.md) – Style guide

### Operations
- [Deployment](docs/deployment.md) – Production deployment (internal network)

---

## API Usage

API endpoints for your backend services to call:

### Send Verification Email

```bash
curl -X POST http://notification-service:3001/api/notifications/send-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "verificationLink": "https://yourapp.com/verify?token=abc123",
    "callbackUrl": "http://your-service:3000/webhooks/email-status"
  }'
```

### Send Custom Notification

```bash
curl -X POST http://notification-service:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Order Confirmed",
    "message": "Your order #12345 has been confirmed!"
  }'
```

### Check Notification Status

```bash
curl http://notification-service:3001/api/notifications/{notificationId}
```

**[→ Full API Documentation](docs/api-design.md)**

---

## Integration Examples

Call this service from your backend services (auth, orders, etc.):

### Node.js / Express

```javascript
// auth-service/src/notifications.js
const axios = require('axios');

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3001';

async function sendVerificationEmail(user, token) {
  const response = await axios.post(
    `${NOTIFICATION_URL}/api/notifications/send-verification`,
    {
      email: user.email,
      username: user.username,
      verificationLink: `https://yourapp.com/verify/${token}`,
      userId: user.id,
      callbackUrl: 'http://auth-service:3000/webhooks/email-status'
    }
  );
  return response.data.notificationId;
}
```

### Python / FastAPI

```python
# order_service/notifications.py
import httpx
import os

NOTIFICATION_URL = os.getenv('NOTIFICATION_SERVICE_URL', 'http://notification-service:3001')

async def send_order_confirmation(email: str, order_id: str, user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f'{NOTIFICATION_URL}/api/notifications/send',
            json={
                'email': email,
                'subject': f'Order Confirmation #{order_id}',
                'message': f'Your order #{order_id} has been confirmed!',
                'userId': user_id
            }
        )
        response.raise_for_status()
        return response.json()['notificationId']
```

**[→ More Examples](docs/api-examples.md)**

---

## Configuration

### Required Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/notifications
RABBITMQ_URL=amqp://user:pass@localhost:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Optional Features

```env
# API Key Authentication
API_KEY=your-secret-key-here

# Rate Limiting (requires Redis)
RATE_LIMIT_ENABLED=true
REDIS_URL=redis://localhost:6379
```

**[→ Development Setup](docs/setup.md)**

---

## Development

### Setup

```bash
# Install dependencies
npm install

# Setup git hooks
npm run init-hooks

# Start dependencies
docker-compose up -d db rabbitmq

# Start development server
npm run dev

# Start workers (separate terminal)
npm run dev:workers
```

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run lint          # Lint code
npm run format        # Format code
```

**[→ Development Guide](docs/setup.md)**

---

## Deployment

> **Important:** Deploy within your private network (VPC, Kubernetes cluster). Do NOT expose to public internet.

### Docker Compose (Internal Network)

```yaml
version: '3.8'

networks:
  internal:
    driver: bridge

services:
  notification-service:
    image: ghcr.io/khodakivskyi/notification-service:latest
    networks:
      - internal
    # No public ports - only internal network access
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    restart: unless-stopped

  workers:
    image: ghcr.io/khodakivskyi/notification-service:latest
    command: ["node", "dist/workers.js"]
    networks:
      - internal
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    restart: unless-stopped
    deploy:
      replicas: 3
```

Other services on the same network can access via: `http://notification-service:3001`

**[→ Production Deployment Guide](docs/deployment.md)**

---

## Health Monitoring

```bash
# Basic health check
curl http://localhost:3001/api/health

# Readiness check (includes dependencies)
curl http://localhost:3001/api/ready
```

**[→ API Examples](docs/api-examples.md)**

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` – New feature
- `fix:` – Bug fix
- `docs:` – Documentation changes
- `refactor:` – Code refactoring
- `test:` – Tests
- `chore:` – Maintenance

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## Support

- [Documentation](docs/)
- [Issue Tracker](https://github.com/khodakivskyi/notification-service/issues)
- [Discussions](https://github.com/khodakivskyi/notification-service/discussions)
- [Releases](https://github.com/khodakivskyi/notification-service/releases)

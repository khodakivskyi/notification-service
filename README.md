# Notification Service

> Internal backend-to-backend (B2B) microservice for sending email notifications with queue-based processing and automatic retries.

**This service is designed to be called by other backend services** (e.g., auth service, order service) and should be deployed in a private network.

[![Release](https://img.shields.io/github/v/release/khodakivskyi/notification-service)](https://github.com/khodakivskyi/notification-service/releases)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue)](https://ghcr.io/khodakivskyi/notification-service)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Quick Start

### Option 1: CLI npm tool (v2)

```bash
npx notification-service init
```

The interactive wizard can:
- Generate `.env`
- Generate or merge `docker-compose.yml`
- Start Docker dependencies
- Test PostgreSQL/RabbitMQ/SMTP configuration

### Option 2: Docker Compose

```bash
git clone https://github.com/khodakivskyi/notification-service.git
cd notification-service
docker-compose up -d
```

### Send a notification

```bash
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Hello",
    "htmlContent": "<h1>It works!</h1>"
  }'
```

**[→ Full Documentation](docs/index.md)**

---

## What’s New in v2.0.0

- **CLI npm tool** for first-time setup: `npx notification-service init`
- **Single send endpoint** (`POST /api/notifications/send`) with `htmlContent`
- **Automatic database migrations** on service startup
- **TypeScript migrations** for `node-pg-migrate`
- **ESM-based codebase** and improved internal architecture (DI, interfaces, channels)

---

## Features

- **B2B microservice** for internal service-to-service usage
- **Async queue processing** with RabbitMQ
- **Automatic retries + DLQ** for failed delivery attempts
- **Delivery tracking** in PostgreSQL
- **Webhook callbacks** for delivery status updates
- **Health/readiness endpoints**
- **Optional API key auth and Redis-based rate limiting**
- **Docker-ready deployment**

---

## Core API Endpoints

- `POST /api/notifications/send` – queue notification for delivery
- `GET /api/notifications/:id` – fetch notification status
- `GET /api/notifications/user/:userId/stats` – user notification stats
- `GET /api/notifications/queue/stats` – queue stats
- `GET /api/health` – liveness check
- `GET /api/ready` – dependency readiness check

---

## Documentation

- [Documentation Home](docs/index.md)
- [Development Setup](docs/setup.md)
- [API Design](docs/api-design.md)
- [API Examples](docs/api-examples.md)
- [Deployment](docs/deployment.md)

---

## Development

```bash
npm install
npm run build
npm run dev
npm run dev:workers
```

### CLI package (local development)

```bash
cd cli
npm install
npm run build
npm test
```

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

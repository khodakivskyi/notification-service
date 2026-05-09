# Development Setup

Guide for setting up Notification Service v2 locally.

> **About this service:** Backend-to-backend (B2B) microservice for notification delivery. Keep it on private/internal network.

## Prerequisites

- Node.js 24+
- npm 10+
- Docker + Docker Compose
- Git

---

## Option A: CLI npm tool (recommended)

```bash
npx notification-service init
```

The setup wizard asks for your environment and can:
- generate `.env`
- generate/merge `docker-compose.yml`
- start Docker dependencies
- test PostgreSQL, RabbitMQ, and SMTP setup

### Dry run

```bash
npx notification-service init --dry-run
```

---

## Option B: Manual setup

### 1. Clone and install

```bash
git clone https://github.com/khodakivskyi/notification-service.git
cd notification-service
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set required values in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notifications
RABBITMQ_URL=amqp://guest:guest@localhost:5672
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-user@example.com
SMTP_PASS=your-password
```

### 3. Start dependencies

```bash
docker-compose up -d db rabbitmq
```

### 4. Start service and workers

```bash
npm run dev
npm run dev:workers
```

> Database migrations run automatically on startup in v2.

---

## Useful Commands

```bash
npm run build
npm run lint
npm test
npm run dev
npm run dev:workers
```

CLI package:

```bash
cd cli
npm install
npm run lint
npm run build
npm test
```

---

## Common Issues

### Docker is not running

Start Docker Desktop/daemon and retry setup.

### Dependency connection failures

Verify URLs and credentials in `.env`, then re-run:

```bash
npx notification-service init --dry-run
```

---

## Next Steps

- [API Design](api-design.md)
- [API Examples](api-examples.md)
- [Deployment](deployment.md)

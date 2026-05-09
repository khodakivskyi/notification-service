# Notification Service Documentation

Welcome to the technical documentation for Notification Service v2.

> **Note:** This is an internal backend-to-backend (B2B) microservice. It is not intended for direct end-user access.

## Start Here

1. [Development Setup](setup.md)
2. [API Design](api-design.md)
3. [API Examples](api-examples.md)

---

## What’s New in v2.0.0

- Interactive **CLI npm tool** for setup: `npx notification-service init`
- Unified send API: `POST /api/notifications/send` with `htmlContent`
- Automatic database migrations on startup
- TypeScript migrations and ESM-based architecture improvements

---

## Documentation Sections

### Core
- [System Architecture](overview.md)
- [API Design](api-design.md)
- [API Examples](api-examples.md)

### Development
- [Development Setup](setup.md)
- [Project Structure](structure.md)
- [Coding Standards](standards.md)

### Operations
- [Database Schema](database.md)
- [Message Queue](message-queue.md)
- [Deployment](deployment.md)

---

## Quick Links

- [GitHub Repository](https://github.com/khodakivskyi/notification-service)
- [Latest Release](https://github.com/khodakivskyi/notification-service/releases/latest)
- [Docker Images](https://ghcr.io/khodakivskyi/notification-service)

---

## Need Help?

- Check [Development Setup](setup.md#common-issues)
- Search [issues](https://github.com/khodakivskyi/notification-service/issues)
- Open a [new issue](https://github.com/khodakivskyi/notification-service/issues/new)

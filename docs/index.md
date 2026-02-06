# Notification Service Documentation

Welcome to the complete technical documentation for the Notification Service.

> **Note:** This is a backend-to-backend (B2B) internal microservice for sending email notifications. It is NOT designed for direct end-user access. Other backend services call this API to send emails.

## Documentation Sections

### Architecture
- [System Architecture](overview.md) – High-level system design and B2B integration patterns
- [Database Schema](database.md) – PostgreSQL tables and relationships
- [Message Queue](message-queue.md) – RabbitMQ integration
- [API Design](api-design.md) – REST API structure
- [API Examples](api-examples.md) – Integration examples for backend services

### Development
- [Development Setup](setup.md) – Local development environment
- [Project Structure](structure.md) – Codebase organization
- [Coding Standards](standards.md) – Style guide and best practices

### Operations
- [Deployment](deployment.md) – Production deployment strategies (internal network)

## Quick Links

- [GitHub Repository](https://github.com/khodakivskyi/notification-service)
- [Issue Tracker](https://github.com/khodakivskyi/notification-service/issues)
- [Latest Release](https://github.com/khodakivskyi/notification-service/releases/latest)
- [Docker Images](https://ghcr.io/khodakivskyi/notification-service)

## Popular Topics

### For Backend Developers (Integration)
1. [API Examples](api-examples.md) – Integration examples (Node.js, Python, cURL)
2. [API Design](api-design.md) – REST API endpoints and authentication
3. [System Architecture](overview.md) – Understand how to integrate with this service

### For Service Developers
1. [Development Setup](setup.md) – Configure local environment
2. [Project Structure](structure.md) – Understand the codebase
3. [Coding Standards](standards.md) – Style guide and best practices

### For DevOps
1. [Deployment Guide](deployment.md) – Deploy to internal network
2. [Database Schema](database.md) – Database setup and migrations
3. [Message Queue](message-queue.md) – RabbitMQ configuration

## About This Documentation

This documentation covers version 1.x of the Notification Service. For older versions, see the [release archive](https://github.com/khodakivskyi/notification-service/releases).

### Documentation Structure

```
docs/
├── index.md           # This file - documentation home
├── overview.md        # System architecture
├── database.md        # Database schema
├── message-queue.md   # RabbitMQ configuration
├── api-design.md      # REST API structure
├── api-examples.md    # Integration examples
├── setup.md           # Development setup
├── structure.md       # Project structure
├── standards.md       # Coding standards
└── deployment.md      # Production deployment
```

## Contributing to Documentation

Found an error or want to improve the documentation?

1. Fork the [repository](https://github.com/khodakivskyi/notification-service)
2. Edit the relevant `.md` file in `docs/`
3. Submit a Pull Request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Documentation Conventions

- Code blocks include language identifiers for syntax highlighting
- All examples use realistic but safe placeholder data
- Commands are tested on Ubuntu 22.04 LTS
- Docker examples use Docker 24.0+ and Docker Compose 2.0+

## Need Help?

- Check common issues in [Development Setup](setup.md#common-issues)
- Search [existing issues](https://github.com/khodakivskyi/notification-service/issues)
- Ask in [Discussions](https://github.com/khodakivskyi/notification-service/discussions)
- Open a [new issue](https://github.com/khodakivskyi/notification-service/issues/new)
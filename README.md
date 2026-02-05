# Notification Service

> Self-hosted, production-ready notification microservice with email support and queue-based processing

[![Release](https://img.shields.io/github/v/release/khodakivskyi/notification-service)](https://github.com/khodakivskyi/notification-service/releases)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue)](https://ghcr.io/khodakivskyi/notification-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

- 📨 **Email Notifications** - Send verification emails, custom notifications, and more
- 🔄 **Queue Processing** - RabbitMQ-based asynchronous job processing
- ⚡ **Automatic Retries** - Exponential backoff with Dead Letter Queue (DLQ)
- 📊 **Notification Tracking** - PostgreSQL database for delivery status and history
- 🏥 **Health Checks** - Built-in health and readiness endpoints
- 🐳 **Docker Ready** - Multi-platform images (amd64, arm64)
- 🔒 **Rate Limiting** - Optional Redis-based rate limiting
- 📈 **Production Ready** - Structured logging, error handling, graceful shutdown

# System Architecture

High-level overview of the Notification Service architecture.

## Service Overview

**This is an internal backend-to-backend (B2B) microservice.** It is NOT designed for direct end-user access. Other backend services in your infrastructure call this service to send email notifications to users.

**Typical Use Cases:**
- User registration service calls this API to send verification emails
- E-commerce backend calls this API to send order confirmations
- Authentication service calls this API to send password reset emails

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Internal Backend Services                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Auth Service│  │Order Service│  │ User Service│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼─────────────────┼─────────────────┼────────────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
               HTTP POST (Internal REST API)
                            │
          ┌─────────────────▼─────────────────┐
          │   Internal Load Balancer / K8s    │
          └─────────────────┬─────────────────┘
                            │
          ┌─────────────────▼─────────────────┐
          │     Notification Service (API)    │
          │                                    │
          │  ┌──────────────────────────────┐ │
          │  │  Express.js REST API         │ │
          │  │  - Request validation (Joi)  │ │
          │  │  - Authentication            │ │
          │  │  - Rate limiting (optional)  │ │
          │  │  - Error handling            │ │
          │  └──────────────┬───────────────┘ │
          └─────────────────┼─────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                    │
          ▼                                    ▼
┌─────────────────┐              ┌─────────────────────┐
│   PostgreSQL    │              │      RabbitMQ       │
│                 │              │                     │
│  - Notifications│◄─────────────┤  - Email Queue      │
│  - Statuses     │   Store      │  - Retry Queue      │
│  - Audit logs   │   Status     │  - Dead Letter Queue│
└─────────────────┘              └──────────┬──────────┘
                                            │
                                            │ Consume
                                            │
                          ┌─────────────────▼──────────────┐
                          │      Worker Processes          │
                          │                                │
                          │  ┌──────────────────────────┐  │
                          │  │  Email Worker (Node.js)  │  │
                          │  │  - Consumes queue jobs   │  │
                          │  │  - Renders templates     │  │
                          │  │  - Sends emails via SMTP │  │
                          │  │  - Updates status in DB  │  │
                          │  │  - Handles retries       │  │
                          │  └──────────┬───────────────┘  │
                          └─────────────┼───────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────┐
                          │    SMTP Server       │
                          │  (Gmail, SendGrid,   │
                          │   Custom SMTP)       │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   End User Inbox     │
                          └──────────────────────┘
```

## Components

### 1. API Service

**Technology:** Node.js, Express.js, TypeScript

**Responsibilities:**
- Accept HTTP requests from other backend services
- Validate request payload using Joi schemas
- Authenticate requests via API key (optional, recommended for B2B)
- Apply rate limiting per API key (optional, Redis-based)
- Store notification records in database
- Publish jobs to RabbitMQ queue
- Return notification ID to calling service
- Provide status check endpoints
- Health and readiness checks

**Endpoints:**
- `POST /api/notifications/send-verification` - Send verification email
- `POST /api/notifications/send` - Send custom notification
- `GET /api/notifications/:id` - Get notification status
- `GET /api/notifications/user/:userId/stats` - Get user statistics
- `GET /api/health` - Basic health check
- `GET /api/ready` - Readiness check with dependency status

### 2. Worker Processes

**Technology:** Node.js, TypeScript

**Responsibilities:**
- Consume jobs from RabbitMQ queue
- Atomically claim notifications (prevent duplicate processing)
- Render email templates using Handlebars
- Send emails via SMTP using Nodemailer
- Update notification status in database
- Handle failures with exponential backoff retries
- Route failed messages to Dead Letter Queue
- Execute optional HTTP callbacks on completion

**Scaling:**
- Multiple worker instances can run in parallel
- Each worker processes one job at a time
- RabbitMQ ensures fair distribution of jobs
- Recommended: 2-5 workers per CPU core

### 3. Message Queue (RabbitMQ)

**Queues:**
- **Email Queue** - Primary queue for notification jobs
- **Retry Queue** - Temporary queue for delayed retries
- **Dead Letter Queue (DLQ)** - Failed messages after max retries

**Configuration:**
- Durable queues (survive broker restart)
- Persistent messages (survive broker restart)
- Message TTL (time-to-live)
- Max queue length
- Dead letter exchange for failed messages

### 4. Database (PostgreSQL)

**Tables:**
- **notifications** - Notification records and status
- **notification_statuses** - Status enum (queued, sending, sent, failed, retrying)

**Indexes:**
- `userId` - Fast lookup by user
- `statusId` - Filter by status
- `createdAt` - Sort by creation time
- Composite index on `(userId, createdAt DESC)`

### 5. SMTP Integration

**Supported Providers:**
- Gmail (with App Password)
- SendGrid
- Amazon SES
- Custom SMTP servers

**Configuration:**
- TLS encryption
- Authentication
- Connection pooling
- Timeout handling

### 6. Optional: Rate Limiter (Redis)

**When Enabled:**
- Limits requests per IP address
- Sliding window algorithm
- Configurable limits and duration
- Returns 429 Too Many Requests when exceeded

## Data Flow

### Sending a Notification

```
1. Client → API: POST /api/notifications/send
2. API → Validation: Check request payload
3. API → Authentication: Verify API key (if enabled)
4. API → Rate Limiter: Check rate limits (if enabled)
5. API → Database: INSERT notification record (status: queued)
6. API → RabbitMQ: Publish job to email queue
7. API → Client: Return notification ID
8. Worker → RabbitMQ: Consume job from queue
9. Worker → Database: UPDATE status to 'sending' (atomic claim)
10. Worker → Template Engine: Render email HTML
11. Worker → SMTP: Send email
12. Worker → Database: UPDATE status to 'sent'
13. Worker → RabbitMQ: ACK message (remove from queue)
14. Worker → HTTP Callback: POST to callback URL (if provided)
```

### Retry Flow (on Failure)

```
1. Worker → SMTP: Send email (fails)
2. Worker → Database: UPDATE status to 'retrying'
3. Worker → RabbitMQ: NACK message (reject)
4. RabbitMQ → Retry Queue: Route to retry queue with delay
5. (Wait for retry delay - exponential backoff)
6. RabbitMQ → Email Queue: Re-queue message
7. Worker → Email Queue: Consume again (repeat from step 8)
```

### Dead Letter Queue (Max Retries Exceeded)

```
1. Worker attempts: 1, 2, 3 (all fail)
2. Worker → Database: UPDATE status to 'failed'
3. Worker → RabbitMQ: NACK message with reject
4. RabbitMQ → DLX: Route to Dead Letter Exchange
5. DLX → DLQ: Store in Dead Letter Queue
6. (Manual intervention required)
```

## Scalability

### Horizontal Scaling

**API Service:**
- Stateless design
- Can run multiple instances behind load balancer
- Session data not stored in memory
- Shared database and queue

**Worker Processes:**
- Fully independent
- No shared state
- Can scale to hundreds of instances
- Limited only by queue throughput

**Database:**
- Connection pooling (default: 10 connections per instance)
- Read replicas for status checks (optional)
- Partitioning by date for large datasets (optional)

**RabbitMQ:**
- Clustering for high availability
- Mirrored queues
- Federation for geo-distribution

### Vertical Scaling

**API Service:**
- CPU-bound during request validation
- Memory: ~50-100 MB per instance
- Recommended: 2+ CPU cores, 512 MB RAM

**Worker Processes:**
- I/O-bound during SMTP communication
- Memory: ~100-200 MB per instance
- Recommended: 1+ CPU core, 256 MB RAM per worker

## High Availability

### Service Redundancy

```yaml
# Example: 3 API instances, 6 workers
services:
  api:
    deploy:
      replicas: 3
  workers:
    deploy:
      replicas: 6
```

### Database

- Primary-replica setup
- Automated failover with Patroni or similar
- Regular backups (hourly incremental, daily full)

### Message Queue

- RabbitMQ cluster with 3+ nodes
- Mirrored queues across nodes
- Durable queues and persistent messages

### Monitoring

- Health checks every 30 seconds
- Restart unhealthy containers automatically
- Alert on queue depth > threshold
- Alert on high error rate

## Security

### Network Security

- Service accessible only within internal network (VPC, Kubernetes cluster)
- TLS/SSL for service-to-service communication (mTLS recommended)
- No public internet exposure
- No direct external access to database or queue

### Authentication

- Optional API key authentication (enabled when `API_KEY` env var is set)
- Recommended: each calling service should have its own API key
- API keys stored as environment variables or secrets manager
- Header-based: `X-API-Key: your-key`

### Data Protection

- Passwords and secrets in environment variables
- Database credentials not in code
- SMTP passwords not logged
- Email content not logged (PII protection)

### Rate Limiting

- Protect against misconfigured clients or abuse
- Per-API-key limits (not per-IP, since all traffic comes from internal services)
- Configurable thresholds per calling service

## Monitoring and Observability

### Logging

- Structured JSON logs
- Log levels: error, warn, info, debug
- Separate files: `error.log`, `combined.log`
- Correlation IDs for request tracing

### Metrics

- Queue depth (RabbitMQ management API)
- Processing rate (messages/second)
- Error rate (failed/total)
- Latency (time from queue to sent)

### Health Checks

- `/api/health` - Basic liveness
- `/api/ready` - Readiness with dependency checks
- Docker HEALTHCHECK directive

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 24+ |
| Language | TypeScript | 5+ |
| Web Framework | Express.js | 4+ |
| Database | PostgreSQL | 15+ |
| Message Queue | RabbitMQ | 3.12+ |
| Email | Nodemailer | 6+ |
| Template Engine | Handlebars | 4+ |
| Validation | Joi | 17+ |
| Logging | Winston | 3+ |
| Rate Limiting | rate-limiter-flexible | 5+ |
| Cache (optional) | Redis | 7+ |

## Design Decisions

### Why RabbitMQ?

- Reliable message delivery with acknowledgments
- Dead Letter Queue support out of the box
- Mature, battle-tested
- Easy to operate and monitor
- Better for task queue pattern than Redis

### Why PostgreSQL?

- ACID compliance for notification records
- Rich query capabilities for statistics
- JSONB support for flexible metadata
- Excellent performance for read/write workloads
- Built-in full-text search (future feature)

### Why Separate Workers?

- Isolate long-running SMTP operations from API
- Scale independently based on workload
- API remains responsive during email sending
- Workers can retry without blocking API
- Easier to debug and monitor

### Why TypeScript?

- Type safety reduces runtime errors
- Better IDE support and autocomplete
- Self-documenting code
- Easier refactoring
- Compile-time error detection

## Next Steps

- [Database Schema](database.md) - Detailed table structures
- [Message Queue](message-queue.md) - RabbitMQ configuration
- [API Design](api-design.md) - REST API architecture
- [Deployment](deployment.md) - Production deployment (internal network)
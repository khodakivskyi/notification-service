# Project Structure

Complete overview of the codebase organization.

## Directory Structure

```
notification-service/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # CI pipeline
│       └── release.yml                 # Release and Docker publish
├── .githooks/
│   ├── commit-msg                      # Commit message validation
│   └── pre-commit                      # Pre-commit checks
├── docs/                               # Documentation
│   ├── index.md                        # Documentation home
│   ├── overview.md                     # System architecture
│   ├── database.md                     # Database schema
│   ├── message-queue.md                # RabbitMQ configuration
│   ├── api-design.md                   # REST API structure
│   ├── api-examples.md                 # Integration examples
│   ├── setup.md                        # Development setup
│   ├── structure.md                    # Project structure (this file)
│   ├── standards.md                    # Coding standards
│   └── deployment.md                   # Production deployment
├── migrations/                         # Database migrations
│   ├── 01_create_notifications_table.sql
│   └── 02_create_notification_statuses_table.sql
├── src/                                # Source code
│   ├── __tests__/                      # Unit tests
│   │   ├── health.test.ts
│   │   ├── notifications.test.ts
│   │   └── exceptions.test.ts
│   ├── config/                         # Configuration
│   │   ├── database.ts                 # PostgreSQL connection
│   │   ├── env.ts                      # Environment validation
│   │   ├── logger.ts                   # Winston logger
│   │   └── rabbitmq.ts                 # RabbitMQ connection
│   ├── constants/                      # Constants
│   │   ├── index.ts
│   │   ├── notificationStatuses.ts     # Status enum
│   │   └── system.ts
│   ├── exceptions/                     # Custom error classes
│   │   ├── index.ts
│   │   ├── BaseError.ts
│   │   ├── ValidationError.ts
│   │   ├── NotFoundError.ts
│   │   └── ...
│   ├── helpers/                        # Utility functions
│   │   ├── index.ts
│   │   ├── httpClient.ts               # HTTP client for callbacks
│   │   └── validation.ts               # Validation helpers
│   ├── middleware/                     # Express middleware
│   │   ├── auth.ts                     # API key authentication
│   │   ├── errorHandler.ts             # Global error handler
│   │   ├── rateLimitHandler.ts         # Rate limiting
│   │   └── validation.ts               # Request validation
│   ├── queues/                         # RabbitMQ queues
│   │   ├── emailQueue.ts               # Email queue manager
│   │   └── emailWorker.ts              # Email worker
│   ├── repositories/                   # Database access layer
│   │   └── notificationRepository.ts   # Notification CRUD
│   ├── routes/                         # API routes
│   │   ├── health.ts                   # Health endpoints
│   │   └── notifications.ts            # Notification endpoints
│   ├── schemas/                        # Validation schemas
│   │   └── notificationSchemas.ts      # Joi schemas
│   ├── services/                       # Business logic
│   │   └── email/
│   │       ├── emailService.ts         # Email sending logic
│   │       └── templates/              # Email templates
│   │           └── verification.hbs    # Handlebars template
│   ├── types/                          # TypeScript types
│   │   └── notification.ts             # Notification interfaces
│   ├── app.ts                          # Express app setup
│   ├── index.ts                        # API server entry point
│   └── workers.ts                      # Workers entry point
├── .dockerignore
├── .env.example                        # Example environment file
├── .eslintrc.cjs                       # ESLint configuration
├── .gitignore
├── .prettierignore
├── .prettierrc                         # Prettier configuration
├── .releaserc.json                     # Semantic release config
├── commitlint.config.mjs               # Commitlint config
├── docker-compose.yml                  # Development stack
├── docker-compose.rate-limit.yml       # With rate limiting
├── Dockerfile                          # Multi-stage build
├── package.json                        # Dependencies and scripts
├── package-lock.json
├── README.md                           # Project overview
├── test.http                           # HTTP requests for testing
├── tsconfig.json                       # TypeScript configuration
└── vitest.config.mjs                   # Vitest test configuration
```

## Source Code Organization

### Entry Points

#### `src/index.ts`

API server entry point.

**Responsibilities:**
- Initialize database connection
- Initialize RabbitMQ connection
- Initialize email queue
- Start Express server
- Handle graceful shutdown

**Code Flow:**
```typescript
startServer()
  ├─ db.connect()
  ├─ rabbitMQ.connect()
  ├─ emailQueue.init()
  └─ app.listen(PORT)
```

#### `src/workers.ts`

Worker processes entry point.

**Responsibilities:**
- Initialize database connection
- Initialize RabbitMQ connection
- Initialize email queue
- Start email worker
- Handle graceful shutdown

**Code Flow:**
```typescript
startWorkers()
  ├─ rabbitMQ.connect()
  ├─ emailQueue.init()
  └─ emailWorker.start()
```

#### `src/app.ts`

Express application setup.

**Responsibilities:**
- Configure Express middleware
- Mount routes
- Setup error handling

**Middleware Stack:**
```typescript
app.use(express.json())
app.use(authenticate)           // Optional
app.use(rateLimitHandler)       // Optional
app.use('/api', healthRoutes)
app.use('/api/notifications', notificationRoutes)
app.use(errorHandler)
```

### Configuration Layer

#### `src/config/env.ts`

Environment variable validation and parsing.

**Exports:**
```typescript
export default {
  env: string,
  apiKey: string,
  server: { port: number },
  database: { url: string },
  smtp: { host, port, user, pass },
  rabbitmq: { url, queues, exchanges },
  logger: { level: string },
  rateLimiting: { enabled, redisUrl, points, duration }
}
```

**Validation:**
- Uses Joi schema
- Exits process on invalid config
- Required fields enforced

#### `src/config/database.ts`

PostgreSQL connection pool.

**Exports:**
```typescript
class Database {
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>
  checkConnection(): Promise<boolean>
  close(): Promise<void>
}

export default new Database();
```

#### `src/config/rabbitmq.ts`

RabbitMQ connection manager.

**Exports:**
```typescript
class RabbitMQConnection {
  connect(): Promise<void>
  getPublishChannel(): Promise<ConfirmChannel>
  getConsumeChannel(): Promise<Channel>
  checkConnection(): Promise<boolean>
  close(): Promise<void>
}

export default new RabbitMQConnection();
```

#### `src/config/logger.ts`

Winston logger configuration.

**Transports:**
- Console (colorized, formatted)
- File: `logs/error.log` (errors only)
- File: `logs/combined.log` (all levels)

**Exports:**
```typescript
export default logger;

// Usage
logger.info('Server started', { port: 3001 });
logger.error('Database error', { error: err.message });
```

### Routes Layer

#### `src/routes/health.ts`

Health check endpoints.

**Endpoints:**
- `GET /health` - Basic liveness
- `GET /ready` - Readiness with dependency checks

#### `src/routes/notifications.ts`

Notification endpoints.

**Endpoints:**
- `POST /send-verification` - Send verification email
- `POST /send` - Send custom notification
- `GET /:id` - Get notification status
- `GET /user/:userId/stats` - Get user statistics

**Structure:**
```typescript
router.post('/send-verification',
  validate(schemas.sendVerification),
  async (req, res, next) => {
    // Handle request
  }
);
```

### Services Layer

#### `src/services/email/emailService.ts`

Email sending business logic.

**Functions:**
```typescript
sendVerificationEmail(data: VerificationData): Promise<void>
sendNotificationEmail(data: NotificationData): Promise<void>
renderTemplate(templateName: string, data: any): Promise<string>
```

**Dependencies:**
- Nodemailer for SMTP
- Handlebars for templates
- Configuration from env

#### `src/services/email/templates/`

Handlebars email templates.

**Files:**
- `verification.hbs` - Email verification template

**Template Data:**
```handlebars
<h1>Hello {{username}}</h1>
<p>Please verify your email:</p>
<a href="{{verificationLink}}">Verify Email</a>
```

### Repositories Layer

#### `src/repositories/notificationRepository.ts`

Database access for notifications.

**Methods:**
```typescript
create(data: CreateNotificationInput): Promise<Notification>
getById(id: string): Promise<Notification | null>
getByUserId(userId: string, limit, offset): Promise<Notification[]>
updateStatus(id: string, statusId: number, errorMessage?): Promise<void>
getStatsByUserId(userId: string): Promise<NotificationStats[]>
```

**Pattern:** Repository pattern - abstracts database access

### Queues Layer

#### `src/queues/emailQueue.ts`

Email queue manager.

**Methods:**
```typescript
init(): Promise<void>
addVerificationEmail(data: EmailJobData): Promise<boolean>
addNotificationEmail(data: EmailJobData): Promise<boolean>
getStats(): Promise<QueueStats>
```

**Responsibilities:**
- Initialize queues (email, retry, DLQ)
- Publish jobs to queue
- Return queue statistics

#### `src/queues/emailWorker.ts`

Email worker consumer.

**Methods:**
```typescript
start(): Promise<void>
stop(): Promise<void>
processMessage(msg: ConsumeMessage): Promise<void>
```

**Responsibilities:**
- Consume jobs from queue
- Process email sending
- Handle retries
- Update database status

### Middleware Layer

#### `src/middleware/auth.ts`

API key authentication.

**Function:**
```typescript
authenticate(req: Request, res: Response, next: NextFunction)
```

**Logic:**
- Check `X-API-Key` header
- Compare with `API_KEY` env variable
- Return 401 if invalid

#### `src/middleware/errorHandler.ts`

Global error handler.

**Function:**
```typescript
errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
)
```

**Logic:**
- Catch all unhandled errors
- Format error response
- Log error details
- Return appropriate HTTP status

#### `src/middleware/rateLimitHandler.ts`

Rate limiting middleware.

**Function:**
```typescript
rateLimitHandler(req: Request, res: Response, next: NextFunction)
```

**Logic:**
- Check request count in Redis
- Increment counter
- Block if limit exceeded
- Return 429 with Retry-After header

#### `src/middleware/validation.ts`

Request validation middleware factory.

**Function:**
```typescript
validate(schema: Joi.Schema) => (req, res, next) => { ... }
```

**Usage:**
```typescript
router.post('/send',
  validate(schemas.sendNotification),
  handler
);
```

### Schemas Layer

#### `src/schemas/notificationSchemas.ts`

Joi validation schemas.

**Exports:**
```typescript
export const sendVerification: Joi.Schema
export const sendNotification: Joi.Schema
export const uuidParam: Joi.Schema
export const userIdParam: Joi.Schema
```

**Example:**
```typescript
export const sendVerification = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().required().min(1).max(255),
  verificationLink: Joi.string().uri().required(),
  userId: Joi.string().uuid().optional(),
  subject: Joi.string().max(500).optional(),
  callbackUrl: Joi.string().uri().allow(null, '').optional()
});
```

### Exceptions Layer

#### `src/exceptions/`

Custom error classes.

**Classes:**
- `BaseError` - Base class for all errors
- `ValidationError` - 400 validation errors
- `NotFoundError` - 404 resource not found
- `UnauthorizedError` - 401 authentication failed
- `ForbiddenError` - 403 insufficient permissions
- `ConflictError` - 409 resource conflict
- `RateLimitError` - 429 rate limit exceeded
- `ServiceUnavailableError` - 503 service unavailable

**Structure:**
```typescript
export class ValidationError extends BaseError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: any[];
  
  constructor(message: string, details: any[]) {
    super(message);
    this.details = details;
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}
```

### Helpers Layer

#### `src/helpers/httpClient.ts`

HTTP client for webhook callbacks.

**Function:**
```typescript
async post(url: string, data: any): Promise<void>
```

**Usage:**
```typescript
await httpClient.post(callbackUrl, {
  notificationId: id,
  status: 'sent',
  timestamp: new Date().toISOString()
});
```

#### `src/helpers/validation.ts`

Validation utility functions.

**Functions:**
```typescript
isValidEmail(email: string): boolean
isValidUUID(uuid: string): boolean
isValidUrl(url: string): boolean
```

### Types Layer

#### `src/types/notification.ts`

TypeScript type definitions.

**Interfaces:**
```typescript
interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: string;
  subject: string;
  content: string;
  statusId: number;
  errorMessage: string | null;
  retryCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
}

interface CreateNotificationInput {
  userId: string;
  type: string;
  channel: string;
  subject: string;
  content: string;
  metadata?: Record<string, any>;
}

interface NotificationStats {
  type: string;
  status: string;
  count: number;
}
```

### Constants Layer

#### `src/constants/notificationStatuses.ts`

Status constants.

**Exports:**
```typescript
export const NOTIFICATION_STATUSES = {
  QUEUED: 1,
  SENDING: 2,
  SENT: 3,
  FAILED: 4,
  RETRYING: 5
} as const;
```

**Usage:**
```typescript
await updateStatus(id, NOTIFICATION_STATUSES.SENT);
```

#### `src/constants/system.ts`

System constants.

**Exports:**
```typescript
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [10000, 30000, 60000];
```

### Tests Layer

#### `src/__tests__/`

Unit and integration tests.

**Files:**
- `health.test.ts` - Health endpoint tests
- `notifications.test.ts` - Notification endpoint tests
- `exceptions.test.ts` - Custom error class tests
- `emailService.test.ts` - Email service tests

**Structure:**
```typescript
describe('Health Routes', () => {
  it('GET /api/health returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});
```

## Design Patterns

### Repository Pattern

Abstracts database access.

**Example:**
```typescript
// Repository
class NotificationRepository {
  async create(data): Promise<Notification> {
    const result = await db.query('INSERT INTO...');
    return result.rows[0];
  }
}

// Usage in route
const notification = await notificationRepository.create(data);
```

### Singleton Pattern

Single instance of shared resources.

**Example:**
```typescript
// config/database.ts
class Database {
  private static instance: Database;
  
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
}

export default Database.getInstance();
```

### Factory Pattern

Middleware creation.

**Example:**
```typescript
// middleware/validation.ts
function validate(schema: Joi.Schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request', error.details);
    }
    next();
  };
}
```

### Dependency Injection

Pass dependencies to constructors.

**Example:**
```typescript
class EmailWorker {
  constructor(
    private queue: EmailQueue,
    private emailService: EmailService,
    private repository: NotificationRepository
  ) {}
}
```

## Module Dependencies

```
app.ts
  ├─ routes/health.ts
  ├─ routes/notifications.ts
  │   ├─ middleware/validation.ts
  │   │   └─ schemas/notificationSchemas.ts
  │   ├─ repositories/notificationRepository.ts
  │   │   └─ config/database.ts
  │   └─ queues/emailQueue.ts
  │       └─ config/rabbitmq.ts
  ├─ middleware/auth.ts
  ├─ middleware/rateLimitHandler.ts
  │   └─ config/env.ts
  └─ middleware/errorHandler.ts
      └─ config/logger.ts

workers.ts
  ├─ queues/emailWorker.ts
  │   ├─ services/email/emailService.ts
  │   ├─ repositories/notificationRepository.ts
  │   └─ config/rabbitmq.ts
  └─ config/database.ts
```

## Naming Conventions

### Files and Directories

- **camelCase** for files: `notificationRepository.ts`
- **camelCase** for directories: `services/email/`
- **kebab-case** for config files: `.eslintrc.cjs`

### Classes

- **PascalCase**: `EmailService`, `NotificationRepository`
- Suffix with type: `ValidationError`, `EmailWorker`

### Functions and Variables

- **camelCase**: `sendEmail()`, `notificationId`
- Descriptive names: `getNotificationById()` not `get()`

### Constants

- **UPPER_SNAKE_CASE**: `NOTIFICATION_STATUSES`, `MAX_RETRIES`

### Interfaces and Types

- **PascalCase**: `Notification`, `EmailJobData`
- No `I` prefix: `Notification` not `INotification`

## Import Order

```typescript
// 1. External dependencies
import express from 'express';
import { Pool } from 'pg';

// 2. Internal modules (absolute imports)
import config from '@/config/env';
import logger from '@/config/logger';

// 3. Internal modules (relative imports)
import { validate } from '../middleware/validation';
import notificationRepository from '../repositories/notificationRepository';

// 4. Types
import type { Notification } from '../types/notification';
```

## Next Steps

- [Coding Standards](standards.md) - Style guide and best practices
- [API Design](api-design.md) - REST API structure
- [Deployment](deployment.md) - Production deployment
# Coding Standards

Style guide and best practices for the Notification Service codebase.

## TypeScript Guidelines

### Type Safety

Always use explicit types, avoid `any`.

**Bad:**
```typescript
function processData(data: any): any {
  return data.value;
}
```

**Good:**
```typescript
interface InputData {
  value: string;
}

function processData(data: InputData): string {
  return data.value;
}
```

### Type Assertions

Use type assertions sparingly, prefer type guards.

**Bad:**
```typescript
const value = data as string;
```

**Good:**
```typescript
if (typeof data === 'string') {
  const value = data;
}
```

### Null Safety

Use optional chaining and nullish coalescing.

**Bad:**
```typescript
const email = user && user.email ? user.email : 'default@example.com';
```

**Good:**
```typescript
const email = user?.email ?? 'default@example.com';
```

### Enums vs Constants

Use `const` objects over enums for better tree-shaking.

**Bad:**
```typescript
enum Status {
  Queued = 1,
  Sent = 2
}
```

**Good:**
```typescript
export const NOTIFICATION_STATUSES = {
  QUEUED: 1,
  SENT: 2
} as const;
```

## Code Organization

### File Structure

Each file should have a single responsibility.

**Typical file structure:**
```typescript
// 1. Imports
import express from 'express';
import logger from '../config/logger';

// 2. Types/Interfaces
interface NotificationData {
  email: string;
  subject: string;
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Functions/Classes
class NotificationService {
  async send(data: NotificationData): Promise<void> {
    // Implementation
  }
}

// 5. Exports
export default new NotificationService();
```

### Function Size

Keep functions small and focused (max 50 lines).

**Bad:**
```typescript
async function processNotification(data) {
  // 100+ lines of code
  // Multiple responsibilities
  // Hard to test
}
```

**Good:**
```typescript
async function processNotification(data: NotificationData): Promise<void> {
  await validateData(data);
  const notification = await createNotification(data);
  await queueForDelivery(notification);
}

async function validateData(data: NotificationData): Promise<void> {
  // Validation logic
}

async function createNotification(data: NotificationData): Promise<Notification> {
  // Creation logic
}

async function queueForDelivery(notification: Notification): Promise<void> {
  // Queue logic
}
```

### Class Design

Prefer composition over inheritance.

**Bad:**
```typescript
class EmailNotification extends Notification {
  // Deep inheritance hierarchy
}
```

**Good:**
```typescript
class EmailNotification {
  constructor(
    private emailService: EmailService,
    private repository: NotificationRepository
  ) {}
}
```

## Error Handling

### Custom Errors

Use custom error classes for different error types.

```typescript
class ValidationError extends Error {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details: any[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
throw new ValidationError('Invalid email', [
  { field: 'email', message: 'Invalid format' }
]);
```

### Error Propagation

Let errors bubble up to the error handler middleware.

**Bad:**
```typescript
async function sendEmail(data: EmailData) {
  try {
    await smtp.send(data);
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Failed to send' };
  }
}
```

**Good:**
```typescript
async function sendEmail(data: EmailData): Promise<void> {
  try {
    await smtp.send(data);
  } catch (error) {
    logger.error('SMTP error', { error: error.message, data });
    throw new ServiceUnavailableError('SMTP server unavailable');
  }
}
```

### Try-Catch Placement

Use try-catch at boundaries (routes, workers).

```typescript
// Route handler
router.post('/send', async (req, res, next) => {
  try {
    const result = await notificationService.send(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

## Async/Await

### Always Use Async/Await

Prefer async/await over raw promises.

**Bad:**
```typescript
function getNotification(id: string) {
  return db.query('SELECT * FROM notifications WHERE id = $1', [id])
    .then(result => result.rows[0])
    .catch(error => {
      logger.error('Query failed', { error });
      throw error;
    });
}
```

**Good:**
```typescript
async function getNotification(id: string): Promise<Notification> {
  try {
    const result = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    logger.error('Query failed', { error: error.message, id });
    throw error;
  }
}
```

### Parallel Operations

Use `Promise.all()` for independent operations.

**Bad (Sequential):**
```typescript
const user = await getUser(userId);
const stats = await getStats(userId);
const notifications = await getNotifications(userId);
```

**Good (Parallel):**
```typescript
const [user, stats, notifications] = await Promise.all([
  getUser(userId),
  getStats(userId),
  getNotifications(userId)
]);
```

## Logging

### Structured Logging

Always use structured logs with context.

**Bad:**
```typescript
console.log('Email sent to user@example.com');
```

**Good:**
```typescript
logger.info('Email sent', {
  notificationId: notification.id,
  email: notification.channel,
  userId: notification.userId,
  duration: Date.now() - startTime
});
```

### Log Levels

Use appropriate log levels.

```typescript
logger.error('Database connection failed', { error: err.message });  // Errors
logger.warn('Queue depth high', { depth: 50000 });                   // Warnings
logger.info('Server started', { port: 3001 });                       // Info
logger.debug('Request received', { method: 'POST', path: '/send' }); // Debug
```

### Sensitive Data

Never log sensitive data.

**Bad:**
```typescript
logger.info('User authenticated', {
  email: user.email,
  password: user.password  // Never log passwords!
});
```

**Good:**
```typescript
logger.info('User authenticated', {
  userId: user.id,
  email: user.email
});
```

## Database Queries

### Parameterized Queries

Always use parameterized queries (prevent SQL injection).

**Bad:**
```typescript
const query = `SELECT * FROM notifications WHERE id = '${id}'`;
const result = await db.query(query);
```

**Good:**
```typescript
const query = 'SELECT * FROM notifications WHERE id = $1';
const result = await db.query(query, [id]);
```

### Transaction Management

Use transactions for multi-step operations.

```typescript
async function transferNotifications(fromUser: string, toUser: string): Promise<void> {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    await client.query('UPDATE notifications SET "userId" = $1 WHERE "userId" = $2', [toUser, fromUser]);
    await client.query('INSERT INTO audit_log (action, userId) VALUES ($1, $2)', ['transfer', fromUser]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Query Optimization

Use indexes and limit result sets.

```typescript
// Add LIMIT for large datasets
async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const result = await db.query(
    'SELECT * FROM notifications WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}
```

## Testing

### Test Structure

Follow Arrange-Act-Assert pattern.

```typescript
describe('NotificationRepository', () => {
  describe('create', () => {
    it('should create notification with valid data', async () => {
      // Arrange
      const data = {
        userId: '123',
        type: 'email',
        channel: 'user@example.com',
        subject: 'Test',
        content: 'Hello'
      };
      
      // Act
      const notification = await repository.create(data);
      
      // Assert
      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(data.userId);
      expect(notification.statusId).toBe(NOTIFICATION_STATUSES.QUEUED);
    });
  });
});
```

### Test Naming

Use descriptive test names.

**Bad:**
```typescript
it('works', () => { ... });
```

**Good:**
```typescript
it('should return 404 when notification not found', () => { ... });
```

### Mocking

Mock external dependencies.

```typescript
import { vi } from 'vitest';

describe('EmailWorker', () => {
  it('should send email via SMTP', async () => {
    // Mock SMTP service
    const mockSend = vi.fn().mockResolvedValue(undefined);
    const emailService = { send: mockSend };
    
    const worker = new EmailWorker(emailService);
    await worker.processMessage(mockMessage);
    
    expect(mockSend).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Test',
      html: expect.any(String)
    });
  });
});
```

## Comments

### When to Comment

Comment "why", not "what".

**Bad:**
```typescript
// Increment retry count
retryCount++;
```

**Good:**
```typescript
// Retry count is used to determine exponential backoff delay
retryCount++;
const delay = calculateBackoff(retryCount);
```

### JSDoc

Use JSDoc for public APIs.

```typescript
/**
 * Sends verification email to user
 * @param data - Verification email data
 * @param data.email - Recipient email address
 * @param data.username - User's display name
 * @param data.verificationLink - HTTPS URL for verification
 * @returns Promise resolving to notification ID
 * @throws {ValidationError} If email is invalid
 * @throws {ServiceUnavailableError} If queue is unavailable
 */
async function sendVerificationEmail(data: VerificationEmailData): Promise<string> {
  // Implementation
}
```

### TODO Comments

Use TODO for future improvements.

```typescript
// TODO: Add support for HTML templates
// TODO: Implement exponential backoff with jitter
// TODO: Add circuit breaker for SMTP failures
```

## Performance

### Avoid N+1 Queries

Batch database operations.

**Bad:**
```typescript
for (const notification of notifications) {
  await updateStatus(notification.id, 'sent');
}
```

**Good:**
```typescript
const ids = notifications.map(n => n.id);
await db.query(
  'UPDATE notifications SET "statusId" = $1 WHERE id = ANY($2)',
  [NOTIFICATION_STATUSES.SENT, ids]
);
```

### Connection Pooling

Reuse database connections.

```typescript
// Use pool, not individual connections
const result = await pool.query('SELECT * FROM notifications');

// Not:
const client = await pool.connect();
const result = await client.query('SELECT * FROM notifications');
client.release();
```

### Caching

Cache expensive operations.

```typescript
class NotificationRepository {
  private statusCache = new Map<number, string>();
  
  async getStatusName(statusId: number): Promise<string> {
    if (this.statusCache.has(statusId)) {
      return this.statusCache.get(statusId)!;
    }
    
    const result = await db.query('SELECT name FROM notification_statuses WHERE id = $1', [statusId]);
    const name = result.rows[0].name;
    this.statusCache.set(statusId, name);
    return name;
  }
}
```

## Security

### Input Validation

Validate all user input.

```typescript
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  subject: Joi.string().max(500).required(),
  message: Joi.string().required()
});

const { error, value } = schema.validate(req.body);
if (error) {
  throw new ValidationError('Invalid input', error.details);
}
```

### SQL Injection Prevention

Always use parameterized queries.

```typescript
// Safe
await db.query('SELECT * FROM notifications WHERE id = $1', [id]);

// NEVER DO THIS:
await db.query(`SELECT * FROM notifications WHERE id = '${id}'`);
```

### Secrets Management

Never hardcode secrets.

**Bad:**
```typescript
const apiKey = 'sk_live_1234567890abcdef';
```

**Good:**
```typescript
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable is required');
}
```

## Code Review Checklist

### Before Submitting PR

- [ ] All tests pass
- [ ] Code is formatted (run `npm run format`)
- [ ] No linter errors (run `npm run lint`)
- [ ] Added tests for new functionality
- [ ] Updated documentation if needed
- [ ] No sensitive data in code or logs
- [ ] Commit messages follow Conventional Commits
- [ ] No TODOs without tracking issue

### During Review

- [ ] Code follows style guide
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] No performance issues
- [ ] Security best practices followed
- [ ] Tests are meaningful

## Git Workflow

### Branch Naming

```
feat/add-sms-support
fix/email-template-rendering
docs/update-api-examples
refactor/queue-management
test/add-integration-tests
chore/update-dependencies
```

### Commit Messages

Follow Conventional Commits:

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc)
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance

**Example:**
```
feat: add SMS notification support

- Add SMS service with Twilio integration
- Add SMS queue and worker
- Add SMS templates
- Update API to accept phone numbers

Closes #42
```

### Pull Requests

**Title:** Same as commit message (if single commit)

**Description:**
```markdown
## Summary
Brief description of changes

## Changes
- Added feature X
- Fixed bug Y
- Updated documentation Z

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Next Steps

- [Project Structure](structure.md) - Codebase organization
- [API Design](api-design.md) - REST API structure
- [Deployment Guide](deployment.md) - Production deployment
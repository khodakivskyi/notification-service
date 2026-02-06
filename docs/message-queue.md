# Message Queue Architecture

RabbitMQ configuration and queue management for the Notification Service.

## Overview

The Notification Service uses RabbitMQ as a message broker to decouple API requests from email sending operations. This ensures reliability, scalability, and fault tolerance.

## Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      RabbitMQ Broker                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Email Queue (Primary)                  │    │
│  │  - Name: email-queue                               │    │
│  │  - Durable: true                                   │    │
│  │  - Max length: 100,000                             │    │
│  ���  - DLX: email-dlx                                  │    │
│  └──────────────┬─────────────────────────────────────┘    │
│                 │                                            │
│                 │ On reject/NACK                            │
│                 │                                            │
│  ┌──────────────▼─────────────────────────────────────┐    │
│  │           Retry Queue (Delayed)                     │    │
│  │  - Name: email-retry-queue                         │    │
│  │  - Durable: true                                   │    │
│  │  - TTL: varies (exponential backoff)               │    │
│  │  - Routes back to: email-queue                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Dead Letter Exchange (DLX)                    │   │
│  │  - Name: email-dlx                                  │   │
│  │  - Type: direct                                     │   │
│  │  - Durable: true                                    │   ���
│  └──────────────┬──────────────────────────────────────┘   │
│                 │                                            │
│                 │ Routes to                                 │
│                 │                                            │
│  ┌──────────────▼──────────────────────────────────────┐   │
│  │          Dead Letter Queue (DLQ)                     │   │
│  │  - Name: email-dlq                                  │   │
│  │  - Durable: true                                    │   │
│  │  - Manual intervention required                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Queue Configuration

### Email Queue (Primary)

Primary queue for all notification jobs.

**Properties:**
```javascript
{
  name: 'email-queue',
  durable: true,
  arguments: {
    'x-max-length': 100000,
    'x-dead-letter-exchange': 'email-dlx',
    'x-dead-letter-routing-key': 'email-dlq'
  }
}
```

**Characteristics:**
- Durable: Survives broker restart
- Max length: 100,000 messages (prevents memory overflow)
- Dead letter exchange: Routes failed messages to DLX
- Fair dispatch: Workers receive messages round-robin
- Prefetch count: 1 (workers process one message at a time)

### Retry Queue

Temporary queue for delayed retries with exponential backoff.

**Properties:**
```javascript
{
  name: 'email-retry-queue',
  durable: true,
  arguments: {
    'x-dead-letter-exchange': '',
    'x-dead-letter-routing-key': 'email-queue'
  }
}
```

**Retry Logic:**
- Message expires after TTL
- Routes back to primary queue
- TTL increases exponentially: 10s, 30s, 60s, 120s, 300s

**Example TTL Calculation:**
```javascript
const delays = [10000, 30000, 60000, 120000, 300000]; // milliseconds
const ttl = delays[Math.min(retryCount, delays.length - 1)];
```

### Dead Letter Exchange (DLX)

Exchange that receives messages that failed all retry attempts.

**Properties:**
```javascript
{
  name: 'email-dlx',
  type: 'direct',
  durable: true
}
```

**Routing:**
- Binds to Dead Letter Queue
- Routing key: `email-dlq`

### Dead Letter Queue (DLQ)

Final destination for messages that cannot be processed.

**Properties:**
```javascript
{
  name: 'email-dlq',
  durable: true
}
```

**Handling:**
- Manual inspection required
- Common issues: Invalid email, SMTP errors, template errors
- Can republish to main queue after fixing issues

## Message Format

### Job Structure

```typescript
interface EmailJob {
  type: 'verification' | 'notification';
  data: EmailJobData;
  timestamp: number;
  retries: number;
}

interface EmailJobData {
  // Common fields
  notificationId: string;
  callbackUrl?: string | null;
  userId?: string | null;
  
  // For verification emails
  email?: string;
  username?: string;
  verificationLink?: string;
  subject?: string;
  
  // For custom notifications
  to?: string;
  message?: string;
}
```

### Example: Verification Email

```json
{
  "type": "verification",
  "data": {
    "notificationId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "john_doe",
    "verificationLink": "https://app.com/verify?token=abc123",
    "subject": "Verify your email address",
    "userId": "456e7890-e12b-34c5-d678-901234567890",
    "callbackUrl": "https://app.com/api/webhooks/email-sent"
  },
  "timestamp": 1707217200000,
  "retries": 0
}
```

### Example: Custom Notification

```json
{
  "type": "notification",
  "data": {
    "notificationId": "789e0123-e45b-67c8-d901-234567890abc",
    "to": "user@example.com",
    "subject": "Order Confirmation",
    "message": "Your order #12345 has been confirmed!",
    "userId": "456e7890-e12b-34c5-d678-901234567890",
    "callbackUrl": null
  },
  "timestamp": 1707217200000,
  "retries": 0
}
```

## Message Flow

### Normal Flow (Success)

```
1. API publishes message to email-queue
   └─ Message properties: persistent, content-type: application/json

2. Worker consumes message from email-queue
   └─ Prefetch: 1 (one message at a time)

3. Worker processes message
   ├─ Update DB: status = 'sending'
   ├─ Render email template
   ├─ Send via SMTP
   └─ Update DB: status = 'sent'

4. Worker ACKs message
   └─ Message removed from queue
```

### Retry Flow (Temporary Failure)

```
1. API publishes message to email-queue

2. Worker consumes message

3. Worker processes message (fails - e.g., SMTP timeout)
   └─ Update DB: status = 'retrying'

4. Worker NACKs message with requeue=false
   └─ Message sent to retry queue via DLX

5. Message expires in retry queue after TTL
   └─ Routes back to email-queue

6. Worker consumes message again (retry count incremented)

7. Worker processes message (success)
   └─ Update DB: status = 'sent'

8. Worker ACKs message
   └─ Message removed from queue
```

### Dead Letter Flow (Max Retries Exceeded)

```
1. Worker attempts: retry 1, 2, 3 (all fail)

2. Worker processes message (fails - retry count = 3)
   └─ Update DB: status = 'failed', errorMessage = '...'

3. Worker NACKs message with requeue=false
   └─ Message sent to DLX

4. DLX routes message to DLQ
   └─ Message stored in email-dlq

5. Manual intervention required
   ├─ Inspect message in RabbitMQ management UI
   ├─ Fix underlying issue (e.g., invalid email)
   └─ Optionally republish to email-queue
```

## Connection Management

### Publish Channel

Dedicated channel for publishing messages from API service.

```typescript
class RabbitMQConnection {
  private publishChannel: ConfirmChannel;
  
  async getPublishChannel(): Promise<ConfirmChannel> {
    if (!this.publishChannel) {
      this.publishChannel = await this.connection.createConfirmChannel();
    }
    return this.publishChannel;
  }
  
  async publish(queue: string, message: Buffer): Promise<void> {
    const channel = await this.getPublishChannel();
    channel.sendToQueue(queue, message, { persistent: true });
    await channel.waitForConfirms(); // Wait for broker confirmation
  }
}
```

### Consume Channel

Dedicated channel for consuming messages in workers.

```typescript
class EmailWorker {
  private consumeChannel: Channel;
  
  async start(): Promise<void> {
    this.consumeChannel = await rabbitMQ.getConsumeChannel();
    
    // Prefetch: process one message at a time
    this.consumeChannel.prefetch(1);
    
    // Start consuming
    this.consumeChannel.consume('email-queue', async (msg) => {
      if (!msg) return;
      
      try {
        await this.processMessage(msg);
        this.consumeChannel.ack(msg); // Success
      } catch (error) {
        this.consumeChannel.nack(msg, false, false); // Fail, send to retry
      }
    });
  }
}
```

### Connection Recovery

```typescript
connection.on('error', (err) => {
  logger.error('RabbitMQ connection error', { error: err.message });
});

connection.on('close', () => {
  logger.warn('RabbitMQ connection closed, reconnecting...');
  setTimeout(() => this.connect(), 5000);
});
```

## Configuration

### Environment Variables

```env
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
EMAIL_QUEUE_NAME=email-queue
EMAIL_RETRY_QUEUE_NAME=email-retry-queue
EMAIL_DLQ_NAME=email-dlq
RABBITMQ_DLX_EXCHANGE=email-dlx
```

### Queue Settings

```typescript
export default {
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchanges: {
      dlx: process.env.RABBITMQ_DLX_EXCHANGE || 'email-dlx'
    },
    queues: {
      email: process.env.EMAIL_QUEUE_NAME || 'email-queue',
      emailRetry: process.env.EMAIL_RETRY_QUEUE_NAME || 'email-retry-queue',
      emailDlq: process.env.EMAIL_DLQ_NAME || 'email-dlq'
    },
    routingKeys: {
      emailDlq: 'email-dlq'
    },
    settings: {
      maxLength: 100000,
      prefetch: 1
    }
  }
};
```

## Monitoring

### RabbitMQ Management UI

Access at `http://localhost:15672` (default credentials: guest/guest)

**Key Metrics:**
- Queue depth (messages ready)
- Consumer count (active workers)
- Message rates (publish/deliver/ack)
- Unacked messages (in-flight)

### Queue Depth Monitoring

```bash
# Check queue depth
curl -u guest:guest http://localhost:15672/api/queues/%2F/email-queue

# Alert if queue depth > 10,000
```

### Dead Letter Queue Inspection

```bash
# Get messages in DLQ
curl -u guest:guest http://localhost:15672/api/queues/%2F/email-dlq/get \
  -X POST \
  -d '{"count":10,"ackmode":"ack_requeue_false","encoding":"auto"}'
```

## Retry Strategy

### Exponential Backoff

```typescript
const RETRY_DELAYS = [
  10000,   // 10 seconds
  30000,   // 30 seconds
  60000,   // 1 minute
  120000,  // 2 minutes
  300000   // 5 minutes
];

const MAX_RETRIES = RETRY_DELAYS.length;

function getRetryDelay(retryCount: number): number {
  return RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
}
```

### Retry Logic

```typescript
async function processMessage(msg: ConsumeMessage): Promise<void> {
  const job: EmailJob = JSON.parse(msg.content.toString());
  
  try {
    await sendEmail(job.data);
    // Success - ACK message
  } catch (error) {
    job.retries++;
    
    if (job.retries >= MAX_RETRIES) {
      // Max retries exceeded - mark as failed, send to DLQ
      await updateStatus(job.data.notificationId, 'failed', error.message);
      this.channel.nack(msg, false, false);
    } else {
      // Retry - send to retry queue with TTL
      await updateStatus(job.data.notificationId, 'retrying');
      const delay = getRetryDelay(job.retries);
      await this.publishToRetryQueue(job, delay);
      this.channel.ack(msg); // ACK original message
    }
  }
}
```

## Best Practices

### Publishing

- Always use persistent messages (`persistent: true`)
- Use confirm channel and wait for confirmations
- Set content-type header (`application/json`)
- Include timestamp in message payload
- Keep messages small (< 1 MB)

### Consuming

- Set prefetch to 1 for fair distribution
- Always ACK or NACK messages
- Use separate channels for publishing and consuming
- Implement idempotency (check if notification already processed)
- Handle consumer cancellation gracefully

### Error Handling

- Log all errors with context (notification ID, retry count)
- Distinguish between retryable and non-retryable errors
- Update database status before NACK
- Monitor DLQ regularly
- Set up alerts for high DLQ depth

### Performance

- Use connection pooling for high-throughput
- Monitor queue depth and scale workers accordingly
- Use lazy queues for large message backlogs
- Enable publisher confirms for reliability
- Set message TTL to prevent infinite retention

## Troubleshooting

### Queue Depth Growing

**Symptom:** Messages accumulating in queue

**Possible Causes:**
- Workers stopped or crashed
- SMTP server slow or unresponsive
- Workers processing slower than publishing rate

**Solutions:**
- Scale up workers: `docker-compose up --scale workers=5`
- Check worker logs for errors
- Verify SMTP connectivity
- Increase worker resources (CPU, memory)

### Messages in DLQ

**Symptom:** High count in email-dlq

**Possible Causes:**
- Invalid email addresses
- SMTP authentication failures
- Template rendering errors
- Network issues

**Solutions:**
- Inspect messages in RabbitMQ UI
- Check worker error logs
- Fix root cause (update template, verify SMTP credentials)
- Republish messages to email-queue after fixing

### Connection Errors

**Symptom:** Workers unable to connect to RabbitMQ

**Solutions:**
- Verify RabbitMQ is running: `docker ps | grep rabbitmq`
- Check connection URL: `echo $RABBITMQ_URL`
- Test connectivity: `telnet rabbitmq 5672`
- Check firewall rules
- Review RabbitMQ logs: `docker logs rabbitmq`

## Next Steps

- [API Design](api-design.md) - REST API architecture
- [Deployment](deployment.md) - Production deployment
- [Database Schema](database.md) - PostgreSQL tables
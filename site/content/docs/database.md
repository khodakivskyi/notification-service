# Database Schema

Complete PostgreSQL database schema documentation.

## Overview

The Notification Service uses PostgreSQL 15+ as its primary data store for notification records, status tracking, and audit logs.

## Database Diagram

```
┌─────────────────────────────────┐
│     notification_statuses       │
├─────────────────────────────────┤
│ id (PK)          SERIAL          │
│ name             VARCHAR(50)     │
└───────────┬─────────────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────────────┐
│        notifications            │
├─────────────────────────────────┤
│ id (PK)          UUID            │
│ userId           UUID            │
│ type             VARCHAR(50)     │
│ channel          VARCHAR(255)    │
│ subject          VARCHAR(500)    │
│ content          TEXT            │
│ statusId (FK)    INTEGER         │
│ errorMessage     TEXT            │
│ retryCount       INTEGER         │
│ metadata         JSONB           │
│ createdAt        TIMESTAMPTZ     │
│ updatedAt        TIMESTAMPTZ     │
│ sentAt           TIMESTAMPTZ     │
└─────────────────────────────────┘
```

## Tables

### notification_statuses

Enumeration table for notification status values.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | SERIAL | PRIMARY KEY | Numeric status ID |
| `name` | VARCHAR(50) | NOT NULL UNIQUE | Status name |

**Data:**

| id | name |
|----|------|
| 1 | queued |
| 2 | sending |
| 3 | sent |
| 4 | failed |
| 5 | retrying |

**Status Lifecycle:**

```
queued → sending → sent
  │         │
  │         └──► retrying → sending → sent
  │                  │
  └──────────────────┴──► failed
```

**SQL:**

```sql
CREATE TABLE IF NOT EXISTS notification_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO notification_statuses (name) VALUES
    ('queued'),
    ('sending'),
    ('sent'),
    ('failed'),
    ('retrying')
ON CONFLICT (name) DO NOTHING;
```

---

### notifications

Primary table for notification records.

**Columns:**

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | Notification ID |
| `userId` | UUID | NOT NULL | - | User who receives notification |
| `type` | VARCHAR(50) | NOT NULL | - | Notification type (email, sms, push) |
| `channel` | VARCHAR(255) | NOT NULL | - | Delivery channel (email address, phone, etc) |
| `subject` | VARCHAR(500) | NOT NULL | - | Notification subject/title |
| `content` | TEXT | NULL | - | Notification body/content |
| `statusId` | INTEGER | NOT NULL, FK | `1` | Current status (FK to notification_statuses) |
| `errorMessage` | TEXT | NULL | - | Error message if failed |
| `retryCount` | INTEGER | NOT NULL | `0` | Number of retry attempts |
| `metadata` | JSONB | NULL | - | Additional flexible data |
| `createdAt` | TIMESTAMPTZ | NOT NULL | `NOW()` | Timestamp when created |
| `updatedAt` | TIMESTAMPTZ | NOT NULL | `NOW()` | Timestamp when last updated |
| `sentAt` | TIMESTAMPTZ | NULL | - | Timestamp when successfully sent |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| `idx_notifications_user_id` | `userId` | B-tree | Fast user lookups |
| `idx_notifications_status_id` | `statusId` | B-tree | Filter by status |
| `idx_notifications_created_at` | `createdAt` | B-tree | Sort by time |
| `idx_notifications_type` | `type` | B-tree | Filter by type |
| `idx_notifications_user_created` | `(userId, createdAt DESC)` | B-tree | User timeline queries |

**Foreign Keys:**

- `statusId` → `notification_statuses(id)`

**Triggers:**

1. **update_updated_at** - Automatically updates `updatedAt` on row modification
2. **update_sent_at** - Automatically sets `sentAt` when status changes to 'sent' (id=3)

**SQL:**

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    channel VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT,
    "statusId" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "retryCount" INTEGER DEFAULT 0,
    metadata JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "sentAt" TIMESTAMPTZ,
    
    CONSTRAINT fk_notifications_status
        FOREIGN KEY ("statusId")
        REFERENCES notification_statuses(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON notifications("userId");
    
CREATE INDEX IF NOT EXISTS idx_notifications_status_id 
    ON notifications("statusId");
    
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications("createdAt");
    
CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON notifications("type");
    
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON notifications("userId", "createdAt" DESC);

-- Trigger: Auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-set sentAt when status becomes 'sent'
CREATE OR REPLACE FUNCTION update_sent_at_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."statusId" = 3 AND (OLD."statusId" IS NULL OR OLD."statusId" != 3) THEN
        NEW."sentAt" = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_notifications_sent_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    WHEN (NEW."statusId" = 3 AND (OLD."statusId" IS NULL OR OLD."statusId" != 3))
    EXECUTE FUNCTION update_sent_at_on_status_change();
```

## Common Queries

### Insert Notification

```sql
INSERT INTO notifications (
    "userId",
    "type",
    channel,
    subject,
    content,
    metadata
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',
    'email',
    'user@example.com',
    'Verify your email',
    'Click the link to verify...',
    '{"verificationLink": "https://example.com/verify?token=abc"}'::jsonb
) RETURNING *;
```

### Get Notification by ID

```sql
SELECT 
    n.*,
    ns.name AS status
FROM notifications n
LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
WHERE n.id = '123e4567-e89b-12d3-a456-426614174000';
```

### Update Status (Atomic Claim for Processing)

```sql
-- Only update if currently in 'queued' or 'retrying' status
UPDATE notifications
SET "statusId" = 2  -- sending
WHERE id = '123e4567-e89b-12d3-a456-426614174000'
  AND "statusId" IN (1, 5)  -- queued or retrying
RETURNING id;

-- Returns row if claimed, empty if already claimed by another worker
```

### Get User Notifications

```sql
SELECT *
FROM notifications
WHERE "userId" = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY "createdAt" DESC
LIMIT 50 OFFSET 0;
```

### Get User Statistics

```sql
SELECT 
    n."type",
    ns.name AS status,
    COUNT(*)::INT AS count
FROM notifications n
LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
WHERE n."userId" = '123e4567-e89b-12d3-a456-426614174000'
GROUP BY n."type", ns.name;
```

## Metadata Field

The `metadata` JSONB column stores flexible data that varies by notification type.

**Example: Verification Email**

```json
{
  "verificationLink": "https://app.com/verify?token=abc123",
  "username": "john_doe",
  "expiresAt": "2026-02-07T10:00:00Z"
}
```

**Example: Order Confirmation**

```json
{
  "orderId": "ORD-123456",
  "orderTotal": 99.99,
  "currency": "USD",
  "items": [
    {"name": "Product A", "quantity": 2},
    {"name": "Product B", "quantity": 1}
  ]
}
```

**Querying JSONB:**

```sql
-- Find notifications with specific metadata key
SELECT * FROM notifications
WHERE metadata ? 'orderId';

-- Find by metadata value
SELECT * FROM notifications
WHERE metadata->>'orderId' = 'ORD-123456';

-- Index for JSONB queries (optional)
CREATE INDEX idx_notifications_metadata_gin 
    ON notifications USING GIN (metadata);
```

## Performance Considerations

### Connection Pooling

Default pool size: 10 connections

```javascript
// config/database.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

### Query Optimization

- Use prepared statements for repeated queries
- Indexes on all frequently filtered columns
- Composite index for common multi-column queries
- EXPLAIN ANALYZE for slow queries

### Partitioning (Future)

For high-volume deployments (>10M notifications):

```sql
-- Partition by month
CREATE TABLE notifications_2026_02 PARTITION OF notifications
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Archival Strategy

Move old notifications to archive table:

```sql
-- Archive notifications older than 90 days
INSERT INTO notifications_archive
SELECT * FROM notifications
WHERE "createdAt" < NOW() - INTERVAL '90 days';

DELETE FROM notifications
WHERE "createdAt" < NOW() - INTERVAL '90 days';
```

## Migrations

### Migration Files

Migrations are SQL files in `migrations/` directory:

```
migrations/
├── 01_create_notifications_table.sql
└── 02_create_notification_statuses_table.sql
```

### Running Migrations

```bash
# Using psql
psql $DATABASE_URL -f migrations/01_create_notifications_table.sql
psql $DATABASE_URL -f migrations/02_create_notification_statuses_table.sql

# Or via docker-compose (automatic on startup)
docker-compose up -d db
```

### Migration Best Practices

- Migrations are idempotent (use `IF NOT EXISTS`)
- Each migration in separate file
- Numbered sequentially
- Never modify existing migrations
- Test migrations on copy of production data

## Backup and Recovery

### Backup

```bash
# Full database dump
pg_dump $DATABASE_URL > backup.sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema.sql

# Data only
pg_dump --data-only $DATABASE_URL > data.sql

# Specific table
pg_dump -t notifications $DATABASE_URL > notifications.sql
```

### Restore

```bash
# Full restore
psql $DATABASE_URL < backup.sql

# Specific table
psql $DATABASE_URL < notifications.sql
```

### Automated Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d)
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete
```

## Next Steps

- [Message Queue](message-queue.md) - RabbitMQ configuration
- [API Design](api-design.md) - REST API structure
- [Deployment](deployment.md) - Production deployment
# Deployment Guide

Production deployment strategies and best practices.

> **Note:** This is an internal backend-to-backend (B2B) microservice. It should be deployed within your private network (VPC, Kubernetes cluster) and NOT exposed to the public internet. Other backend services call this API to send email notifications.

## Deployment Options

### 1. Docker Compose (Simple)

Best for small deployments, single-server setups.

**Production docker-compose.yml:**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: notifications
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  notification-service:
    image: ghcr.io/khodakivskyi/notification-service:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      LOG_LEVEL: warn
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/notifications
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      API_KEY: ${API_KEY}
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  workers:
    image: ghcr.io/khodakivskyi/notification-service:latest
    restart: unless-stopped
    command: ["node", "dist/workers.js"]
    environment:
      NODE_ENV: production
      LOG_LEVEL: warn
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/notifications
      RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq:5672
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 3

volumes:
  postgres_data:
  rabbitmq_data:
```

**Production .env:**

```env
# Database
DB_USER=notif_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# RabbitMQ
RABBITMQ_USER=notif_user
RABBITMQ_PASSWORD=STRONG_PASSWORD_HERE

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxx

# API Security
API_KEY=your-32-character-minimum-api-key-here
```

**Deploy:**

```bash
# Pull latest image
docker-compose pull

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f notification-service
```

---

### 2. Kubernetes (Scalable)

Best for large deployments, high availability.

**namespace.yaml:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: notification-service
```

**configmap.yaml:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-config
  namespace: notification-service
data:
  NODE_ENV: production
  PORT: "3001"
  LOG_LEVEL: warn
  EMAIL_QUEUE_NAME: email-queue
  EMAIL_RETRY_QUEUE_NAME: email-retry-queue
  EMAIL_DLQ_NAME: email-dlq
```

**secret.yaml:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: notification-secrets
  namespace: notification-service
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:password@postgres:5432/notifications
  RABBITMQ_URL: amqp://user:password@rabbitmq:5672
  SMTP_HOST: smtp.sendgrid.net
  SMTP_PORT: "587"
  SMTP_USER: apikey
  SMTP_PASS: SG.xxxxxxxxxxxxxx
  API_KEY: your-api-key-here
```

**deployment-api.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-api
  namespace: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-api
  template:
    metadata:
      labels:
        app: notification-api
    spec:
      containers:
      - name: api
        image: ghcr.io/khodakivskyi/notification-service:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: notification-config
        - secretRef:
            name: notification-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
```

**deployment-workers.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-workers
  namespace: notification-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: notification-workers
  template:
    metadata:
      labels:
        app: notification-workers
    spec:
      containers:
      - name: worker
        image: ghcr.io/khodakivskyi/notification-service:latest
        command: ["node", "dist/workers.js"]
        envFrom:
        - configMapRef:
            name: notification-config
        - secretRef:
            name: notification-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: notification-api
  namespace: notification-service
spec:
  selector:
    app: notification-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
```

**Network Policy (Restrict Access):**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: notification-api-policy
  namespace: notification-service
spec:
  podSelector:
    matchLabels:
      app: notification-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Only allow traffic from specific namespaces (your other backend services)
    - namespaceSelector:
        matchLabels:
          allowed-to-notification-service: "true"
    ports:
    - protocol: TCP
      port: 3001
```

> **Note:** No Ingress resource is needed since this is an internal service. Other services in the cluster access it via the ClusterIP Service.

**Deploy to Kubernetes:**

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create secrets (edit first!)
kubectl apply -f secret.yaml

# Create config
kubectl apply -f configmap.yaml

# Deploy API
kubectl apply -f deployment-api.yaml

# Deploy workers
kubectl apply -f deployment-workers.yaml

# Create service
kubectl apply -f service.yaml

# Apply network policy (optional, for restricting access)
kubectl apply -f network-policy.yaml

# Check status
kubectl get all -n notification-service

# View logs
kubectl logs -n notification-service -l app=notification-api -f
```

---

### 3. Cloud Platforms

#### AWS ECS

```json
{
  "family": "notification-service",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/notification-task-role",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/notification-execution-role",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "notification-api",
      "image": "ghcr.io/khodakivskyi/notification-service:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/notification-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024"
}
```

#### Google Cloud Run

```bash
# Deploy API
gcloud run deploy notification-api \
  --image ghcr.io/khodakivskyi/notification-service:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,PORT=3001 \
  --set-secrets DATABASE_URL=database-url:latest,SMTP_PASS=smtp-pass:latest \
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1

# Deploy workers
gcloud run deploy notification-workers \
  --image ghcr.io/khodakivskyi/notification-service:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,SMTP_PASS=smtp-pass:latest \
  --command node \
  --args dist/workers.js \
  --min-instances 2 \
  --max-instances 20 \
  --memory 512Mi \
  --cpu 1
```

---

## Internal Load Balancing

Since this is a B2B microservice, it should only be accessible within your internal network.

### Kubernetes Service (Recommended)

The service is already exposed via Kubernetes Service (ClusterIP) which provides internal load balancing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: notification-api
  namespace: notification-service
spec:
  selector:
    app: notification-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP  # Internal only, not exposed to internet
```

Other services in the cluster can reach it at: `http://notification-api.notification-service.svc.cluster.local`

### Docker Compose (Internal Network)

For Docker Compose deployments, services communicate over the internal Docker network:

```yaml
networks:
  internal:
    driver: bridge

services:
  notification-service:
    image: ghcr.io/khodakivskyi/notification-service:latest
    networks:
      - internal
    # No ports exposed to host - only internal network access
```

Other services on the same network can reach it at: `http://notification-service:3001`


---

## Database Setup

### PostgreSQL Production

```bash
# Create database
createdb -h db.yourdomain.com -U postgres notifications

# Create user
psql -h db.yourdomain.com -U postgres << EOF
CREATE USER notif_user WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE notifications TO notif_user;
EOF

# Run migrations
psql postgresql://notif_user:PASSWORD@db.yourdomain.com:5432/notifications \
  -f migrations/01_create_notifications_table.sql

psql postgresql://notif_user:PASSWORD@db.yourdomain.com:5432/notifications \
  -f migrations/02_create_notification_statuses_table.sql
```

### Managed Database Services

**AWS RDS:**
```bash
aws rds create-db-instance \
  --db-instance-identifier notification-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username notif_admin \
  --master-user-password STRONG_PASSWORD \
  --allocated-storage 20 \
  --backup-retention-period 7 \
  --multi-az
```

**Google Cloud SQL:**
```bash
gcloud sql instances create notification-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup-start-time=03:00 \
  --enable-bin-log
```

---

## Scaling Strategies

### Horizontal Scaling

**Scale API:**
```bash
# Docker Compose
docker-compose up -d --scale notification-service=5

# Kubernetes
kubectl scale deployment notification-api --replicas=10 -n notification-service
```

**Scale Workers:**
```bash
# Docker Compose
docker-compose up -d --scale workers=10

# Kubernetes
kubectl scale deployment notification-workers --replicas=20 -n notification-service
```

### Auto-scaling

**Kubernetes HPA:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-api-hpa
  namespace: notification-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Health Checks

### Application Health

```bash
# Liveness (is app running?)
curl http://localhost:3001/api/health

# Readiness (is app ready to serve traffic?)
curl http://localhost:3001/api/ready
```

### External Monitoring

**Uptime monitoring:**
- Use UptimeRobot, Pingdom, or similar
- Monitor `/api/health` endpoint
- Alert on failures

**Example with curl:**
```bash
#!/bin/bash
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://notifications.yourdomain.com/api/health)
  if [ "$STATUS" != "200" ]; then
    echo "ALERT: Service unhealthy (HTTP $STATUS)"
    # Send notification
  fi
  sleep 60
done
```

---

## Backup Strategy

### Database Backups

**Automated daily backup:**

```bash
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y-%m-%d-%H%M)
DATABASE_URL="postgresql://user:pass@db:5432/notifications"

# Create backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/backup-$DATE.sql.gz"

# Retain last 30 days
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/backup-$DATE.sql.gz" s3://backups/notification-service/
```

**Cron job:**
```cron
0 3 * * * /opt/scripts/backup-database.sh
```

### Application Data

```bash
# Backup RabbitMQ definitions
curl -u admin:password http://rabbitmq:15672/api/definitions > rabbitmq-definitions.json

# Backup configuration
tar -czf config-backup.tar.gz .env nginx.conf docker-compose.yml
```

---

## Rollback Procedure

### Docker Compose

```bash
# Rollback to previous version
docker-compose pull
docker-compose down
docker-compose up -d --force-recreate

# Or specify version
docker-compose down
docker tag ghcr.io/khodakivskyi/notification-service:1.0.0 notification-service:latest
docker-compose up -d
```

### Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/notification-api -n notification-service

# Rollback to specific revision
kubectl rollout undo deployment/notification-api --to-revision=2 -n notification-service

# Check rollout history
kubectl rollout history deployment/notification-api -n notification-service
```

---

## Security Checklist

- [ ] Deploy within private network (VPC/Kubernetes cluster) - NO public internet exposure
- [ ] Use mTLS or TLS for service-to-service communication
- [ ] Set strong passwords for database and RabbitMQ
- [ ] Enable API key authentication (recommended for production)
- [ ] Generate unique API keys for each calling service (if auth enabled)
- [ ] Enable rate limiting per API key
- [ ] Restrict database access to internal network only
- [ ] Keep Docker images updated
- [ ] Use secrets management (Kubernetes Secrets, AWS Secrets Manager, Vault)
- [ ] Enable network policies to restrict ingress/egress
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
- [ ] Audit API key usage and rotate keys periodically

---

## Next Steps

- [System Architecture](overview.md) - High-level system design
- [Message Queue](message-queue.md) - RabbitMQ configuration
- [Database Schema](database.md) - PostgreSQL tables and migrations
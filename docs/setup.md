# Development Setup

Guide for setting up local development environment.

> **About this service:** This is a backend-to-backend (B2B) microservice for sending email notifications. It's designed to be called by other backend services (auth, orders, etc.) and should NOT be exposed to end users. See [System Architecture](overview.md) for details.

## Prerequisites

### Required Software

- **Node.js** 24+ ([Download](https://nodejs.org/))
- **npm** 10+ (included with Node.js)
- **Docker** 24+ ([Download](https://www.docker.com/))
- **Docker Compose** 2.0+ (included with Docker Desktop)
- **Git** 2.0+
- **PostgreSQL** 15+ (or via Docker)
- **RabbitMQ** 3.12+ (or via Docker)

### Optional Tools

- **VSCode** with extensions:
    - ESLint
    - Prettier
    - TypeScript
    - Docker
- **Postman** or **Insomnia** for API testing
- **Redis** 7+ (if testing rate limiting)
- **pgAdmin** or **DBeaver** (database GUI)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/khodakivskyi/notification-service.git
cd notification-service
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Production dependencies (Express, TypeScript, etc.)
- Development dependencies (ESLint, Prettier, Vitest)
- Git hooks via Husky

### 3. Setup Git Hooks

```bash
npm run init-hooks
```

This configures:
- **pre-commit**: Runs linter and formatter
- **commit-msg**: Validates commit message format (Conventional Commits)

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Minimal Configuration:**
```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notifications
RABBITMQ_URL=amqp://guest:guest@localhost:5672

SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

**Using Mailtrap for Development:**

1. Sign up at [mailtrap.io](https://mailtrap.io/)
2. Get SMTP credentials from inbox settings
3. Use in `.env` file

### 5. Start Dependencies

```bash
# Start PostgreSQL and RabbitMQ via Docker Compose
docker-compose up -d db rabbitmq

# Verify services are running
docker ps
```

**Expected Output:**
```
CONTAINER ID   IMAGE                       STATUS         PORTS
abc123         postgres:15-alpine          Up 10 seconds  0.0.0.0:5432->5432/tcp
def456         rabbitmq:3-management       Up 10 seconds  0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

### 6. Run Database Migrations

```bash
# Apply migrations
psql $DATABASE_URL -f migrations/01_create_notifications_table.sql
psql $DATABASE_URL -f migrations/02_create_notification_statuses_table.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

**Expected Output:**
```
                List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | notification_statuses | table | postgres
 public | notifications         | table | postgres
```

### 7. Build TypeScript

```bash
npm run build
```

**Output:**
```
dist/
├── index.js
├── workers.js
├── app.js
├── config/
├── routes/
├── services/
└── ...
```

## Running the Service

### Development Mode (with hot reload)

**Terminal 1: API Server**
```bash
npm run dev
```

**Terminal 2: Workers**
```bash
npm run dev:workers
```

**Output:**
```
[10:00:00] [info]: Database connected
[10:00:00] [info]: RabbitMQ connected
[10:00:00] [info]: Email queue initialized
[10:00:00] [info]: Server started on port 3001
```

### Production Mode

```bash
# Build
npm run build

# Start API
npm start

# Start workers (separate terminal)
npm run start:workers
```

## Testing Setup

### Run Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Output

```
 ✓ src/__tests__/health.test.ts (2)
   ✓ Health Routes (2)
     ✓ GET /api/health returns 200
     ✓ GET /api/ready returns 200

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  10:00:00
   Duration  1.23s
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 2. Make Changes

Edit files in `src/` directory:
```
src/
├── routes/          # API endpoints
├── services/        # Business logic
├── config/          # Configuration
├── middleware/      # Express middleware
├── repositories/    # Database access
├── queues/          # RabbitMQ integration
└── __tests__/       # Test files
```

### 3. Run Linter

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### 4. Format Code

```bash
# Check formatting
npm run format:check

# Auto-format
npm run format
```

### 5. Test Changes

```bash
# Unit tests
npm test

# Manual API testing
curl -X POST http://localhost:3001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","subject":"Test","message":"Hello"}'
```

### 6. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format:**
```
type: subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Maintenance tasks

**Example:**
```bash
git commit -m "feat: add SMS notification support

- Add SMS service
- Add Twilio integration
- Add SMS queue worker

Closes #123"
```

### 7. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create Pull Request on GitHub.

## Common Issues

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start if not running
docker-compose up -d db

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### RabbitMQ Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

**Solution:**
```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Start if not running
docker-compose up -d rabbitmq

# Check RabbitMQ logs
docker logs rabbitmq
```

### TypeScript Compilation Errors

```
error TS2304: Cannot find name 'process'
```

**Solution:**
```bash
# Install type definitions
npm install --save-dev @types/node

# Clean and rebuild
rm -rf dist
npm run build
```

## Useful Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start development workers
npm run dev:workers

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage

# Run linter
npm run lint

# Fix linting errors
npm run lint:fix

# Check code formatting
npm run format:check

# Format code
npm run format

# Setup git hooks
npm run init-hooks

# Clean build directory
rm -rf dist

# View logs
tail -f logs/combined.log

# Database migrations
psql $DATABASE_URL -f migrations/01_create_notifications_table.sql

# Access PostgreSQL CLI
psql $DATABASE_URL

# Access RabbitMQ Management UI
open http://localhost:15672
```

## Next Steps

- [Project Structure](structure.md) - Understand codebase organization
- [Coding Standards](standards.md) - Style guide and best practices
- [API Examples](api-examples.md) - Test API endpoints
- [API Examples](../api/examples.md) - Test API endpoints
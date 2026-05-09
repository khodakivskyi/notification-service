# Contributing to Notification Service

Thank you for your interest in contributing to the Notification Service! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to build something great together.

## Getting Started

### Prerequisites

- Node.js 24+
- Docker and Docker Compose
- Git

### Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/notification-service.git
   cd notification-service
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Setup git hooks**

   ```bash
   npm run init-hooks
   ```

5. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your settings (especially SMTP for email testing)
   ```

6. **Start dependencies**

   ```bash
   docker-compose up -d db rabbitmq
   ```

7. **Run database migrations**

   ```bash
   psql $DATABASE_URL -f migrations/01_create_notifications_table.sql
   psql $DATABASE_URL -f migrations/02_create_notification_statuses_table.sql
   ```

8. **Start development server**

   ```bash
   npm run dev          # API server
   npm run dev:workers  # Workers (separate terminal)
   ```

For detailed setup instructions, see [Development Setup](docs/setup.md).

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming conventions:**
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 2. Make your changes

- Follow the [coding standards](docs/standards.md)
- Write tests for new functionality
- Update documentation if needed

### 3. Run checks

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting errors
npm run format      # Format code with Prettier
npm test            # Run tests
```

### 4. Commit your changes

```bash
git add .
git commit -m "feat: add amazing feature"
```

See [Commit Guidelines](#commit-guidelines) for message format.

### 5. Push and create PR

```bash
git push origin feat/your-feature-name
```

Then open a Pull Request on GitHub.

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, semicolons) |
| `refactor` | Code refactoring (no feature change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies |

### Examples

```bash
# Feature
git commit -m "feat: add SMS notification support"

# Bug fix
git commit -m "fix: resolve email template rendering issue"

# Documentation
git commit -m "docs: update API examples"

# With body
git commit -m "feat: add webhook callbacks

- Add callbackUrl field to notification request
- Implement HTTP POST to callback URL on status change
- Add retry logic for failed callbacks

Closes #42"
```

### Rules

- Use lowercase for type and subject
- No period at the end of subject
- Keep subject under 72 characters
- Use imperative mood ("add" not "added")

## Pull Request Process

### Before submitting

- [ ] Code follows project style guide
- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions

### PR Description Template

```markdown
## Summary
Brief description of changes

## Changes
- Added feature X
- Fixed bug Y
- Updated documentation Z

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

## Related Issues
Closes #123
```

### Review Process

1. Submit PR against `main` branch
2. Wait for CI checks to pass
3. Address reviewer feedback
4. Maintainer will merge when approved

## Coding Standards

See [Coding Standards](docs/standards.md) for detailed guidelines.

### Quick Reference

- **TypeScript**: Use explicit types, avoid `any`
- **Functions**: Keep small (< 50 lines), single responsibility
- **Errors**: Use custom error classes, let errors bubble up
- **Logging**: Use structured logs with context
- **Database**: Always use parameterized queries
- **Tests**: Follow Arrange-Act-Assert pattern

### File Structure

```typescript
// 1. Imports
import express from 'express';

// 2. Types/Interfaces
interface NotificationData { ... }

// 3. Constants
const MAX_RETRIES = 3;

// 4. Functions/Classes
class NotificationService { ... }

// 5. Exports
export default new NotificationService();
```

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Writing Tests

- Place tests in `src/__tests__/`
- Name files as `*.test.ts`
- Use descriptive test names
- Mock external dependencies

```typescript
describe('NotificationRepository', () => {
  describe('create', () => {
    it('should create notification with valid data', async () => {
      // Arrange
      const data = { ... };
      
      // Act
      const result = await repository.create(data);
      
      // Assert
      expect(result.id).toBeDefined();
    });
  });
});
```

## Documentation

### When to Update Docs

- Adding new features
- Changing API endpoints
- Modifying configuration options
- Fixing incorrect information

### Documentation Files

| File | Content |
|------|---------|
| `README.md` | Project overview |
| `docs/index.md` | Documentation home |
| `docs/overview.md` | System architecture |
| `docs/api-design.md` | API structure |
| `docs/api-examples.md` | Integration examples |
| `docs/setup.md` | Development setup |
| `docs/deployment.md` | Production deployment |

### Style Guide

- Use clear, concise language
- Include code examples
- Test all commands before documenting
- Keep examples realistic but safe

## Questions?

- Check [existing issues](https://github.com/khodakivskyi/notification-service/issues)
- Open a [discussion](https://github.com/khodakivskyi/notification-service/discussions)
- Create a [new issue](https://github.com/khodakivskyi/notification-service/issues/new)

Thank you for contributing!

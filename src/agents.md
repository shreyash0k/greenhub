# AI Agent Guide - Source Directory (src/)

## Purpose

This is the root source directory for GreenHub, a GitHub contribution reminder system. The codebase is organized into modular components that work together to:

1. Check GitHub contributions daily via GraphQL API
2. Send email reminders if no contributions are detected
3. Schedule reminder checks at specific times (8 PM and 11 PM EST)
4. Log all operations for monitoring and debugging

**Architecture Pattern**: Service-oriented with clear separation of concerns. Each service is responsible for a specific domain (GitHub API, Email, Notifications) and can be tested/modified independently.

**Design Philosophy**: Keep it simple (KISS), fail gracefully, log everything, and make it easy to extend for the future web app (Phase 2).

---

## Directory Structure

```
src/
├── index.ts                    # Application entry point - bootstraps all services
├── services/                   # Business logic layer
│   ├── github.service.ts       # GitHub GraphQL API integration
│   ├── email.service.ts        # Email sending via Resend
│   └── notification.service.ts # Orchestrates check-and-notify workflow
├── scheduler/                  # Time-based job scheduling
│   └── cron.ts                # Cron job configuration
├── utils/                      # Shared utilities
│   └── logger.ts              # Winston logging configuration
└── types/                      # TypeScript type definitions
    └── index.ts               # Shared interfaces and types
```

---

## Key Files and Responsibilities

### index.ts (Application Entry Point)
**Location**: `src/index.ts`
**Lines**: ~130 lines

**Responsibilities**:
- Load environment variables from `.env`
- Validate required configuration
- Initialize all services (GitHub, Email, Notification)
- Start the scheduler
- Handle graceful shutdown (SIGINT, SIGTERM)
- Handle uncaught exceptions and promise rejections

**Key Functions**:
- `validateConfig()` - Ensures all required env vars are present
- `main()` - Main application bootstrap
- `setupGracefulShutdown()` - Cleanup on exit

**Dependencies**:
- All services from `./services/`
- ReminderScheduler from `./scheduler/`
- Logger from `./utils/`

---

## Data Flow

```
index.ts (Bootstrap)
    ↓
ReminderScheduler.start()
    ↓
[Cron triggers at 8 PM / 11 PM EST]
    ↓
NotificationService.checkAndNotify()
    ↓
GitHubService.hasContributionToday()
    ↓
    ├─→ Has contribution → Skip (log and return)
    └─→ No contribution → EmailService.sendReminder()
                              ↓
                         Log result
```

---

## AI Agent Guidelines

### When Modifying This Directory

1. **Maintain Service Independence**: Services should not directly depend on each other's implementation details. Use dependency injection (constructor parameters).

2. **Follow Error Handling Pattern**:
   ```typescript
   try {
     // Operation
     logger.info('Success message', { contextData });
   } catch (error) {
     logger.error('Error message', {
       error: error instanceof Error ? error.message : 'Unknown error',
       stack: error instanceof Error ? error.stack : undefined
     });
     // Handle or rethrow
   }
   ```

3. **Use Structured Logging**: Always include context objects with log statements:
   ```typescript
   logger.info('Message', { username, action, result });
   ```

4. **Export Only What's Needed**: Keep classes and functions private unless they need to be used externally.

5. **Type Everything**: Use TypeScript types from `./types/` for all function parameters and return values.

### Code Style Conventions

- **File naming**: `*.service.ts` for services, `*.ts` for other modules
- **Class naming**: PascalCase with descriptive names (e.g., `GitHubService`)
- **Method naming**: camelCase with verb prefixes (e.g., `hasContributionToday()`)
- **Constants**: UPPER_SNAKE_CASE for constants (e.g., `CACHE_TTL`)
- **Private members**: Prefix with `private` keyword (e.g., `private cache`)
- **ES Modules**: Always use `.js` extension in imports (TypeScript requirement for ES modules)

### Anti-Patterns to Avoid

❌ **Don't**: Hard-code configuration values
✅ **Do**: Use environment variables and validate them at startup

❌ **Don't**: Catch and suppress errors silently
✅ **Do**: Log errors with full context and rethrow if appropriate

❌ **Don't**: Create circular dependencies between services
✅ **Do**: Use dependency injection and clear hierarchy

❌ **Don't**: Use `any` types
✅ **Do**: Create proper types in `./types/` or use library types

---

## Common Tasks for AI Agents

### Task 1: Adding a New Service

**Example**: Adding a SMSService for text message reminders

1. Create `src/services/sms.service.ts`:
   ```typescript
   import { logger } from '../utils/logger.js';

   export class SMSService {
     constructor(private config: { apiKey: string; phoneNumber: string }) {}

     async sendSMS(to: string, message: string): Promise<boolean> {
       try {
         // Implementation
         logger.info('SMS sent', { to });
         return true;
       } catch (error) {
         logger.error('SMS failed', { to, error });
         return false;
       }
     }
   }
   ```

2. Add configuration validation in `src/index.ts`:
   ```typescript
   const required = [
     // ... existing
     'SMS_API_KEY',
     'SMS_PHONE_NUMBER'
   ];
   ```

3. Initialize in `main()`:
   ```typescript
   const smsService = new SMSService({
     apiKey: process.env.SMS_API_KEY!,
     phoneNumber: process.env.SMS_PHONE_NUMBER!
   });
   ```

4. Use in NotificationService (modify constructor and methods)

5. Update `README.md` with new environment variables

### Task 2: Modifying the Entry Point (index.ts)

**When to modify**:
- Adding new services
- Changing configuration validation
- Adding new environment variables
- Modifying shutdown behavior

**Best practices**:
- Keep `main()` function clean and readable
- Extract complex logic into separate functions
- Always validate new environment variables
- Test graceful shutdown with new services

### Task 3: Adding Global Error Handling

**Location**: `src/index.ts`, `setupGracefulShutdown()` function

**Example**: Add custom error reporter (e.g., Sentry)
```typescript
import * as Sentry from '@sentry/node';

// In main():
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// In setupGracefulShutdown():
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  Sentry.captureException(error);
  process.exit(1);
});
```

---

## Testing Considerations

### Unit Testing Strategy

1. **Services**: Test each service in isolation with mocked dependencies
   ```typescript
   // Example: Testing NotificationService
   const mockGitHubService = { hasContributionToday: jest.fn() };
   const mockEmailService = { sendReminder: jest.fn() };
   const notificationService = new NotificationService(
     mockGitHubService,
     mockEmailService,
     config
   );
   ```

2. **Entry Point**: Test configuration validation separately
   ```typescript
   describe('validateConfig', () => {
     it('should throw when GITHUB_TOKEN is missing', () => {
       delete process.env.GITHUB_TOKEN;
       expect(() => validateConfig()).toThrow();
     });
   });
   ```

### Integration Testing

1. **Full Flow**: Test the complete check-and-notify flow with test credentials
2. **Scheduler**: Adjust cron times to trigger immediately for testing
3. **Email**: Use a test email account or email testing service (Mailtrap, etc.)

---

## Environment Variables Reference

See detailed documentation in each service's agents.md file. Required variables:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `GITHUB_TOKEN` | GitHubService | GitHub API authentication |
| `GITHUB_USERNAME` | NotificationService | Username to check |
| `RESEND_API_KEY` | EmailService | Resend API authentication |
| `EMAIL_FROM` | EmailService | Sender email address |
| `EMAIL_TO` | NotificationService | Recipient email |
| `TIMEZONE` | ReminderScheduler | Timezone for cron jobs (default: America/New_York) |
| `NODE_ENV` | Logger | Environment mode |
| `LOG_LEVEL` | Logger | Logging verbosity |

---

## Dependencies

### External Libraries
- `@octokit/graphql` - GitHub API client
- `resend` - Email sending API
- `node-cron` - Cron job scheduling
- `winston` - Logging
- `dotenv` - Environment variable loading
- `date-fns` & `date-fns-tz` - Date/timezone handling

### Internal Dependencies
- `./services/*` - All service modules
- `./scheduler/cron.ts` - Scheduler
- `./utils/logger.ts` - Logger
- `./types/index.ts` - Type definitions

---

## Build and Run Instructions

### Development
```bash
npm run dev        # Runs with tsx (auto-reload)
```

### Production
```bash
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled JavaScript
```

### Background Daemon
```bash
pm2 start dist/index.js --name greenhub
pm2 logs greenhub
pm2 stop greenhub
```

---

## Future Considerations (Phase 2)

When migrating to the web app:

1. **Extract Services**: Move services to a shared package (`packages/shared/`)
2. **Make Config Injectable**: Instead of reading from `process.env` directly, accept config objects
3. **Add User Context**: Services should accept user object instead of global config
4. **Database Integration**: Add Prisma client and models
5. **Queue System**: Replace direct calls with BullMQ jobs

**Migration Strategy**: Keep this MVP code as-is, create new services that wrap/extend these for multi-user support.

---

## Related Documentation

- [Service Layer Guide](./services/agents.md) - Detailed service documentation
- [Scheduler Guide](./scheduler/agents.md) - Cron job patterns
- [Utilities Guide](./utils/agents.md) - Logger and utilities
- [Type Definitions](./types/agents.md) - TypeScript types
- [Root README](../README.md) - Project overview and setup

---

## Quick Reference

**Add a new service**: See "Task 1: Adding a New Service" above
**Modify configuration**: Update `validateConfig()` and `main()` in index.ts
**Change log level**: Set `LOG_LEVEL` environment variable
**Debug**: Use `npm run dev` and check console logs
**Deploy**: Build with `npm run build`, then use PM2 or systemd service

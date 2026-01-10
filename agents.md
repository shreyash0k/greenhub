# AI Agent Context for GreenHub

> **For AI Assistants**: Read this file first when working on this project. It contains essential context about the architecture, design decisions, and common questions.

## Project Overview

GreenHub is a **scheduled batch service** (not a continuously polling app) that monitors GitHub contributions and sends email reminders to help users maintain their daily commit streaks.

## Architecture Summary

### Execution Model

- **NOT a one-shot script** - runs as a persistent background process
- **NOT continuously polling** - only executes at scheduled cron times
- Uses `node-cron` for scheduling (pure Node.js, no system cron required)
- **Requires deployment as a daemon** (PM2, Docker, systemd, or similar)

### Scheduled Times

Three daily checks at (configurable in `src/scheduler/cron.ts`)
All times are in the user's configured timezone (default: America/New_York).

### Core Services

| Service                 | File                                   | Purpose                                               |
| ----------------------- | -------------------------------------- | ----------------------------------------------------- |
| **ReminderScheduler**   | `src/scheduler/cron.ts`                | Manages cron jobs, triggers checks at scheduled times |
| **NotificationService** | `src/services/notification.service.ts` | Orchestrates the check-and-notify flow                |
| **GitHubService**       | `src/services/github.service.ts`       | Queries GitHub GraphQL API for contributions          |
| **EmailService**        | `src/services/email.service.ts`        | Sends HTML emails via Resend API                      |

### Data Flow

```
Cron Trigger → NotificationService.checkAndNotify()
                    ↓
              GitHubService.hasContributionToday()
                    ↓ (if no contributions)
              EmailService.sendReminder()
                    ↓
              HTML email sent via Resend
```

## Key Technical Details

### GitHub API

- Uses **GraphQL API** via `@octokit/graphql`
- Requires Personal Access Token (no scopes needed for public data)
- Rate limit: 5000 requests/hour (authenticated)
- **1-hour in-memory cache** to minimize API calls

### Email System

- Uses **Resend** (modern email API, not SMTP)
- Free tier: 3,000 emails/month, 100/day
- Test sender: `onboarding@resend.dev` (works without domain verification)

### Timezone Handling

- Uses `date-fns-tz` for timezone-aware date calculations
- "Today" is calculated based on user's configured timezone
- Cron jobs respect the timezone setting

## File Structure

```
greenhub/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── config.ts                   # Environment variable loading
│   ├── services/
│   │   ├── github.service.ts       # GitHub GraphQL API integration
│   │   ├── email.service.ts        # Email sending with Resend
│   │   └── notification.service.ts # Orchestration logic
│   ├── scheduler/
│   │   └── cron.ts                 # Cron job scheduling
│   ├── utils/
│   │   └── logger.ts               # Winston logger configuration
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── test-now.ts                 # Manual trigger for testing
├── .env                            # Your secrets (gitignored)
├── .env.example                    # Template for environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

| Variable          | Required | Description                        | Example                            |
| ----------------- | -------- | ---------------------------------- | ---------------------------------- |
| `GITHUB_TOKEN`    | Yes      | GitHub Personal Access Token       | `ghp_abc123...`                    |
| `GITHUB_USERNAME` | Yes      | Your GitHub username               | `octocat`                          |
| `RESEND_API_KEY`  | Yes      | Resend API key                     | `re_abc123...`                     |
| `EMAIL_FROM`      | Yes      | Sender email address               | `GreenHub <onboarding@resend.dev>` |
| `EMAIL_TO`        | Yes      | Email address to receive reminders | `you@gmail.com`                    |
| `TIMEZONE`        | No       | IANA timezone for scheduling       | `America/New_York`                 |
| `NODE_ENV`        | No       | Environment mode                   | `production` or `development`      |
| `LOG_LEVEL`       | No       | Logging verbosity                  | `info`, `debug`, `error`           |

## AI Agent Guidelines

### Error Handling Pattern

Always follow this pattern when handling errors:

```typescript
try {
  // Operation
  logger.info('Success message', { contextData });
} catch (error) {
  logger.error('Error message', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  // Handle or rethrow
}
```

### Code Style Conventions

- **File naming**: `*.service.ts` for services, `*.ts` for other modules
- **Class naming**: PascalCase with descriptive names (e.g., `GitHubService`)
- **Method naming**: camelCase with verb prefixes (e.g., `hasContributionToday()`)
- **Constants**: UPPER_SNAKE_CASE for constants (e.g., `CACHE_TTL`)
- **Private members**: Prefix with `private` keyword (e.g., `private cache`)
- **ES Modules**: Always use `.js` extension in imports (TypeScript requirement for ES modules)
- **Structured Logging**: Always include context objects with log statements:
  ```typescript
  logger.info('Message', { username, action, result });
  ```

### Anti-Patterns to Avoid

- **Don't**: Hard-code configuration values
  **Do**: Use environment variables and validate them at startup

- **Don't**: Catch and suppress errors silently
  **Do**: Log errors with full context and rethrow if appropriate

- **Don't**: Create circular dependencies between services
  **Do**: Use dependency injection and clear hierarchy

- **Don't**: Use `any` types
  **Do**: Create proper types in `./types/` or use library types

## Common Tasks for AI Agents

### Adding a New Service

Example: Adding a SMSService for text message reminders

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
     'SMS_PHONE_NUMBER',
   ];
   ```

3. Initialize in `main()`:

   ```typescript
   const smsService = new SMSService({
     apiKey: process.env.SMS_API_KEY!,
     phoneNumber: process.env.SMS_PHONE_NUMBER!,
   });
   ```

4. Use in NotificationService (modify constructor and methods)

5. Update `README.md` with new environment variables

### Modifying the Entry Point (index.ts)

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

## Testing Considerations

### Unit Testing Strategy

1. **Services**: Test each service in isolation with mocked dependencies

   ```typescript
   const mockGitHubService = { hasContributionToday: jest.fn() };
   const mockEmailService = { sendReminder: jest.fn() };
   const notificationService = new NotificationService(mockGitHubService, mockEmailService, config);
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

### Manual Testing

Run the test utility to trigger an immediate check:

```bash
npx tsx src/test-now.ts
```

## Common Questions

### Q: Does this need to run 24/7?

**Yes**, the process must stay running for cron jobs to trigger. Deploy using:

- PM2 (recommended): `pm2 start dist/index.js --name greenhub`
- Docker container
- systemd service
- Or any process manager that keeps Node.js running

### Q: Can I run this as a one-time check?

Yes, use the test utility: `npx tsx src/test-now.ts`

### Q: Why isn't it sending emails?

1. Check Resend API key is valid
2. Check EMAIL_TO is correct
3. Check logs for errors
4. Verify GitHub username exists

### Q: How do I change reminder times?

Edit `src/scheduler/cron.ts` in the `start()` method.

## Development Commands

```bash
npm run dev      # Development with auto-reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled JS from dist/
npx tsx src/test-now.ts  # Test the full flow immediately
```

## Future Considerations (Phase 2)

When migrating to a web app:

1. **Extract Services**: Move services to a shared package (`packages/shared/`)
2. **Make Config Injectable**: Instead of reading from `process.env` directly, accept config objects
3. **Add User Context**: Services should accept user object instead of global config
4. **Database Integration**: Add Prisma client and models
5. **Queue System**: Replace direct calls with BullMQ jobs

**Migration Strategy**: Keep this MVP code as-is, create new services that wrap/extend these for multi-user support.

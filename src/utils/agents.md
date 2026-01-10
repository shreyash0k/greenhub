# AI Agent Guide - Utilities

## Purpose

The utilities directory contains shared helper functions and configurations used throughout the application. Currently, it contains the logging configuration, but can be extended with other utilities as needed.

**Why This Exists**: Centralizing utilities:
- Ensures consistent behavior across the app (e.g., all logs have same format)
- Provides a single place to configure shared functionality
- Makes it easy to add new utilities without polluting other directories

**Design Philosophy**: Keep utilities simple, stateless, and reusable.

---

## Files and Responsibilities

### logger.ts (~40 lines)
**Export**: `logger` (winston Logger instance)

**Purpose**: Configure and export a Winston logger with standardized formatting and transports.

**Key Features**:
- Colorized console output for development
- JSON formatting for production logs
- Automatic file logging in production (error.log + combined.log)
- Configurable log level via environment variable
- Structured logging with metadata support

**Dependencies**:
- `winston` - Logging framework
- Environment variables: `LOG_LEVEL`, `NODE_ENV`

---

## Logger Configuration

### Location
`src/utils/logger.ts`

### How It Works

The logger is a pre-configured Winston instance that's imported and used across the application:

```typescript
import { logger } from '../utils/logger.js';

logger.info('Operation completed', { userId: 123, action: 'login' });
logger.error('Operation failed', { error: err.message, stack: err.stack });
```

### Log Levels

Winston log levels (in order of priority):
1. **error** (0) - Errors and exceptions
2. **warn** (1) - Warnings and deprecations
3. **info** (2) - General information (default)
4. **http** (3) - HTTP requests (not used in MVP)
5. **verbose** (4) - Verbose information
6. **debug** (5) - Debug information
7. **silly** (6) - Very detailed debug info

**Setting Log Level**:
```bash
# In .env file
LOG_LEVEL=debug  # Show debug, info, warn, and error logs
LOG_LEVEL=info   # Show info, warn, and error logs (default)
LOG_LEVEL=error  # Show only error logs
```

### Output Formats

**Console (Development)**:
```
2024-01-09 14:30:15 [greenhub] info: GitHub check completed { username: 'octocat', hasContribution: true }
```

**Files (Production)**:
```json
{
  "timestamp": "2024-01-09 14:30:15",
  "level": "info",
  "message": "GitHub check completed",
  "service": "greenhub",
  "username": "octocat",
  "hasContribution": true
}
```

---

## AI Agent Guidelines

### When to Use the Logger

**Always log**:
- Function entry points with context
- Successful operations
- Errors and exceptions
- State changes
- External API calls

**Example**:
```typescript
async function processUser(userId: string): Promise<void> {
  logger.info('Processing user', { userId });  // Entry point

  try {
    const user = await fetchUser(userId);
    logger.debug('User fetched', { userId, email: user.email });  // Debug detail

    await sendEmail(user.email);
    logger.info('Email sent successfully', { userId, email: user.email });  // Success

  } catch (error) {
    logger.error('Failed to process user', {  // Error
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
```

### Structured Logging Pattern

Always include context as the second parameter:

```typescript
// ✅ Good - structured logging
logger.info('User logged in', { userId: 123, timestamp: Date.now() });

// ❌ Bad - unstructured (hard to parse/query)
logger.info(`User ${userId} logged in at ${timestamp}`);
```

### Log Level Guidelines

```typescript
// error - Errors that need immediate attention
logger.error('Database connection failed', { error: err.message });

// warn - Potential issues, deprecations
logger.warn('API rate limit approaching', { remaining: 10 });

// info - Important business events (default level)
logger.info('User created', { userId: 123 });

// debug - Detailed information for debugging
logger.debug('Cache hit', { key: 'user:123', ttl: 3600 });
```

---

## How to Modify the Logger

### Add New Transport (e.g., Sentry for Errors)

```typescript
import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

// Add Sentry transport for errors
if (process.env.SENTRY_DSN) {
  logger.add(new winston.transports.Stream({
    stream: {
      write: (message: string) => {
        const parsed = JSON.parse(message);
        if (parsed.level === 'error') {
          Sentry.captureMessage(parsed.message, {
            level: 'error',
            extra: parsed
          });
        }
      }
    },
    level: 'error'
  }));
}
```

### Add HTTP Request Logging

```typescript
// In logger.ts, add new format for HTTP logs
import expressWinston from 'express-winston';

export const httpLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
});

// In Express app
app.use(httpLogger);
```

### Change Console Format

```typescript
// In logger.ts, modify console transport format
new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()  // Changed from custom printf
  )
})
```

### Add Log Rotation (Production)

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

// Replace static file transport with rotating files
logger.add(new DailyRotateFile({
  filename: 'logs/greenhub-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'  // Keep logs for 14 days
}));
```

---

## Adding New Utilities

### When to Add a New Utility

Add utilities when you have:
- Reusable functions used in multiple places
- Configuration that needs to be centralized
- Helper functions that don't belong to a specific service

**Examples of good utilities**:
- Date formatting helpers
- Validation functions
- Encryption/decryption helpers
- Configuration loaders

### How to Add a New Utility

**Example**: Adding a date formatter utility

1. Create `src/utils/date.ts`:
```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Format a date in user's timezone
 * @param date Date to format
 * @param timezone IANA timezone string
 * @param formatString date-fns format string
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date,
  timezone: string,
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const zonedDate = toZonedTime(date, timezone);
  return format(zonedDate, formatString);
}

/**
 * Get start of today in user's timezone
 * @param timezone IANA timezone string
 * @returns Date object representing start of day
 */
export function getTodayStart(timezone: string): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  return new Date(zonedNow.setHours(0, 0, 0, 0));
}
```

2. Use in services:
```typescript
import { formatInTimezone, getTodayStart } from '../utils/date.js';

const dayStart = getTodayStart('America/New_York');
logger.info('Checking contributions since', {
  date: formatInTimezone(dayStart, 'America/New_York')
});
```

### Utility Best Practices

1. **Make functions pure** (no side effects)
   ```typescript
   // ✅ Good - pure function
   export function calculateTotal(items: Item[]): number {
     return items.reduce((sum, item) => sum + item.price, 0);
   }

   // ❌ Bad - has side effects
   let globalTotal = 0;
   export function calculateTotal(items: Item[]): number {
     globalTotal = items.reduce((sum, item) => sum + item.price, 0);
     return globalTotal;
   }
   ```

2. **Document with JSDoc**
   ```typescript
   /**
    * Encrypt a string using AES-256
    * @param text Plain text to encrypt
    * @param key Encryption key
    * @returns Encrypted string in base64 format
    * @throws {Error} If encryption fails
    */
   export function encrypt(text: string, key: string): string {
     // Implementation
   }
   ```

3. **Export as named exports** (not default)
   ```typescript
   // ✅ Good
   export function helperA() {}
   export function helperB() {}

   // ❌ Avoid
   export default function helper() {}
   ```

4. **Keep utilities stateless**
   ```typescript
   // ✅ Good - stateless
   export function generateId(): string {
     return Math.random().toString(36).substring(7);
   }

   // ❌ Bad - has state
   let counter = 0;
   export function generateId(): string {
     return `id-${counter++}`;
   }
   ```

---

## Testing Utilities

### Testing the Logger

```typescript
import { logger } from './logger';
import winston from 'winston';

describe('Logger', () => {
  it('should have correct log level', () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL || 'info');
  });

  it('should include default metadata', () => {
    // Check that defaultMeta includes service name
    expect((logger as any).defaultMeta).toEqual({ service: 'greenhub' });
  });

  it('should log to console in development', () => {
    // Spy on console transport
    const consoleTransport = logger.transports.find(
      t => t instanceof winston.transports.Console
    );
    expect(consoleTransport).toBeDefined();
  });
});
```

### Testing Custom Utilities

```typescript
// date.test.ts
import { formatInTimezone, getTodayStart } from './date';

describe('Date Utilities', () => {
  describe('formatInTimezone', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2024-01-09T20:00:00Z');
      const formatted = formatInTimezone(date, 'America/New_York', 'HH:mm:ss');

      expect(formatted).toBe('15:00:00');  // 8 PM UTC = 3 PM EST
    });
  });

  describe('getTodayStart', () => {
    it('should return start of day in timezone', () => {
      const start = getTodayStart('America/New_York');

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });
  });
});
```

---

## Common Logging Patterns

### Pattern 1: Try-Catch with Logging

```typescript
async function riskyOperation(): Promise<void> {
  logger.info('Starting risky operation');

  try {
    await externalAPI.call();
    logger.info('Risky operation completed successfully');
  } catch (error) {
    logger.error('Risky operation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;  // Rethrow after logging
  }
}
```

### Pattern 2: Performance Logging

```typescript
async function slowOperation(): Promise<void> {
  const startTime = Date.now();
  logger.info('Operation started');

  try {
    await performWork();

    const duration = Date.now() - startTime;
    logger.info('Operation completed', { durationMs: duration });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Operation failed', {
      durationMs: duration,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    throw error;
  }
}
```

### Pattern 3: Conditional Debug Logging

```typescript
function complexCalculation(input: number): number {
  logger.debug('Complex calculation started', { input });

  const step1 = input * 2;
  logger.debug('Step 1 complete', { input, step1 });

  const step2 = step1 + 10;
  logger.debug('Step 2 complete', { input, step1, step2 });

  const result = step2 / 3;
  logger.debug('Calculation complete', { input, result });

  return result;
}

// Set LOG_LEVEL=debug to see all steps
// Set LOG_LEVEL=info to skip debug logs
```

### Pattern 4: Redacting Sensitive Data

```typescript
import { logger } from './logger';

function logUserAction(user: { id: number; email: string; password: string }): void {
  logger.info('User action', {
    userId: user.id,
    email: user.email,
    // ❌ Never log passwords!
    // password: user.password
  });
}

// Or create a redaction utility
function redactSensitive(obj: any): any {
  const redacted = { ...obj };
  delete redacted.password;
  delete redacted.token;
  delete redacted.secret;
  return redacted;
}

logger.info('User data', redactSensitive(user));
```

---

## Environment Variables

### LOG_LEVEL
**Default**: `info`
**Valid Values**: `error`, `warn`, `info`, `debug`, `verbose`, `silly`
**Purpose**: Control logging verbosity

```bash
# Production - minimal logs
LOG_LEVEL=warn

# Development - detailed logs
LOG_LEVEL=debug

# Troubleshooting - all logs
LOG_LEVEL=silly
```

### NODE_ENV
**Default**: `development`
**Valid Values**: `development`, `production`, `test`
**Purpose**: Determine logging configuration

```bash
# Development - console only
NODE_ENV=development

# Production - console + file logs
NODE_ENV=production

# Test - suppress logs
NODE_ENV=test
```

---

## Troubleshooting

### Logs Not Appearing

**Check 1**: Verify log level
```typescript
console.log('Current log level:', process.env.LOG_LEVEL);
logger.debug('This only appears if LOG_LEVEL=debug');
```

**Check 2**: Ensure logger is imported correctly
```typescript
// ✅ Correct
import { logger } from '../utils/logger.js';  // Note .js extension

// ❌ Wrong
import logger from '../utils/logger';  // Missing .js
```

**Check 3**: Check log file permissions (production)
```bash
# Ensure logs/ directory exists and is writable
mkdir -p logs
chmod 755 logs
```

### Logs Missing Context

**Problem**: Logs don't include expected metadata

**Solution**: Always pass context as second parameter
```typescript
// ❌ Missing context
logger.info('User created');

// ✅ With context
logger.info('User created', { userId: 123, email: 'user@example.com' });
```

### Log Files Growing Too Large

**Solution**: Implement log rotation
```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

logger.add(new DailyRotateFile({
  filename: 'logs/greenhub-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',    // Rotate when file reaches 20MB
  maxFiles: '14d'    // Delete files older than 14 days
}));
```

---

## Future Considerations (Phase 2)

When migrating to web app:

### Centralized Logging

Send logs to centralized service (e.g., Datadog, Loggly):

```typescript
import { LogglyTransport } from 'winston-loggly-bulk';

if (process.env.LOGGLY_TOKEN) {
  logger.add(new LogglyTransport({
    token: process.env.LOGGLY_TOKEN,
    subdomain: 'your-subdomain',
    tags: ['greenhub', 'api'],
    json: true
  }));
}
```

### Request ID Tracking

Add request IDs for tracing:

```typescript
import { v4 as uuidv4 } from 'uuid';

// Middleware to add request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  logger.defaultMeta = { ...logger.defaultMeta, requestId: req.id };
  next();
});

// All logs will now include requestId
logger.info('Processing request', { path: req.path });
```

### User Context

Include user info in logs:

```typescript
function logWithUser(userId: string, message: string, meta?: any): void {
  logger.info(message, { ...meta, userId });
}

logWithUser('user-123', 'Action performed', { action: 'delete' });
```

---

## Dependencies

### Current Dependencies
- `winston` - Logging framework
- `winston` transports (Console, File) - Built-in

### Potential Future Dependencies
- `winston-daily-rotate-file` - Log rotation
- `winston-loggly-bulk` or similar - Centralized logging
- `@sentry/node` - Error tracking
- `express-winston` - HTTP request logging (for web app)

---

## Related Documentation

- [Parent Directory Guide](../agents.md) - Overall source structure
- [Services Guide](../services/agents.md) - Services that use logger
- [Scheduler Guide](../scheduler/agents.md) - Scheduler that uses logger

---

## Quick Reference

**Import logger**: `import { logger } from '../utils/logger.js';`
**Basic log**: `logger.info('Message', { context: 'data' });`
**Error log**: `logger.error('Error', { error: err.message, stack: err.stack });`
**Debug log**: `logger.debug('Debug info', { details });` (only shown if LOG_LEVEL=debug)
**Change log level**: Set `LOG_LEVEL` environment variable
**Add new utility**: Create file in utils/, export named functions
**Test logger**: Use Jest to spy on logger methods or check transports

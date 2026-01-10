# AI Agent Guide - Services Layer

## Purpose

The services layer contains the core business logic for GreenHub. Each service is a self-contained class responsible for a specific domain:

- **GitHubService**: Interacts with GitHub's GraphQL API to check user contributions
- **EmailService**: Sends HTML email reminders via Resend API
- **NotificationService**: Orchestrates the check-and-notify workflow

**Architecture Pattern**: Service pattern with dependency injection. Services are stateless and can be easily tested, extended, or replaced.

**Why This Exists**: Separating business logic into services makes the code:
- **Testable**: Easy to mock dependencies
- **Reusable**: Services can be used in different contexts (CLI, web app, API)
- **Maintainable**: Clear responsibilities and boundaries

---

## Files and Responsibilities

### 1. github.service.ts (~120 lines)
**Class**: `GitHubService`

**Purpose**: Query GitHub's GraphQL API to check if a user has made contributions on a given date.

**Key Methods**:
- `hasContributionToday(username, timezone)` - Returns boolean indicating if user contributed today
- `getContributionCount(username, timezone)` - Returns number of contributions for today

**Dependencies**:
- `@octokit/graphql` - GitHub GraphQL client
- `date-fns` - Date manipulation
- `date-fns-tz` - Timezone conversion
- `../utils/logger.js` - Logging

**Configuration**: Requires GitHub personal access token (passed to constructor)

---

### 2. email.service.ts (~120 lines)
**Class**: `EmailService`

**Purpose**: Send reminder emails using Resend API.

**Key Methods**:
- `sendReminder(to, githubUsername)` - Sends formatted reminder email
- `generateEmailTemplate(githubUsername)` - Creates HTML email content (private)

**Dependencies**:
- `resend` - Resend email API client
- `../utils/logger.js` - Logging

**Configuration**: Requires Resend API key and sender email address

---

### 3. notification.service.ts (~105 lines)
**Class**: `NotificationService`

**Purpose**: Orchestrate the check-and-notify workflow by coordinating GitHub checks and email sending.

**Key Methods**:
- `checkAndNotify()` - Main workflow: check GitHub, send email if needed
- `testNotification()` - Send test email (useful for testing)

**Dependencies**:
- `GitHubService` - For contribution checks
- `EmailService` - For sending reminders
- `../utils/logger.js` - Logging

**Configuration**: Requires GitHub username, email recipient, and timezone

---

## Service Architecture

### Dependency Graph
```
NotificationService
    ├─→ GitHubService
    │      └─→ GitHub GraphQL API
    └─→ EmailService
           └─→ Gmail SMTP
```

### Initialization Pattern
```typescript
// 1. Create base services
const githubService = new GitHubService(token);
const emailService = new EmailService({ user, password });

// 2. Create orchestration service
const notificationService = new NotificationService(
  githubService,
  emailService,
  { githubUsername, emailTo, timezone }
);

// 3. Use orchestration service
await notificationService.checkAndNotify();
```

---

## AI Agent Guidelines

### When to Modify Services

1. **GitHubService**: Modify when changing how we query GitHub (different API, additional data)
2. **EmailService**: Modify when changing email provider, template, or delivery method
3. **NotificationService**: Modify when changing the notification workflow or adding new notification types

### How to Add a New Service

**Example**: Adding a SlackService for Slack notifications

1. Create `src/services/slack.service.ts`:
```typescript
import { logger } from '../utils/logger.js';

export class SlackService {
  constructor(private config: { webhookUrl: string }) {}

  async sendMessage(username: string): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Hey! You haven't made a GitHub contribution today yet.`,
          username: username
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      logger.info('Slack message sent', { username });
      return true;
    } catch (error) {
      logger.error('Failed to send Slack message', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}
```

2. Update NotificationService to use it:
```typescript
constructor(
  private githubService: GitHubService,
  private emailService: EmailService,
  private slackService: SlackService,  // Add new dependency
  private config: { githubUsername: string; emailTo: string; timezone: string }
) {}

async checkAndNotify(): Promise<NotificationResult> {
  // ... existing GitHub check logic ...

  if (!hasContributed) {
    // Send both email and Slack
    const emailSent = await this.emailService.sendReminder(emailTo, githubUsername);
    const slackSent = await this.slackService.sendMessage(githubUsername);

    return { sent: emailSent || slackSent };
  }
}
```

3. Initialize in `src/index.ts`

### Error Handling Pattern

All services follow this pattern:

```typescript
async someMethod(): Promise<ReturnType> {
  try {
    logger.info('Starting operation', { context });

    // Perform operation
    const result = await externalAPI.call();

    logger.info('Operation successful', { context, result });
    return result;

  } catch (error) {
    logger.error('Operation failed', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Either return failure indicator or rethrow
    throw error; // or return false/null depending on method
  }
}
```

### Logging Best Practices

1. **Log at entry points**: Log when methods are called with context
2. **Log successful operations**: Confirm completion with relevant data
3. **Log errors with full context**: Include error message, stack, and operation context
4. **Use appropriate log levels**:
   - `debug`: Cache hits, internal operations
   - `info`: Successful operations, state changes
   - `warn`: Recoverable issues, deprecations
   - `error`: Failures, exceptions

---

## GitHubService Deep Dive

### Location
`src/services/github.service.ts`

### How It Works

1. **GraphQL Query**: Uses GitHub's GraphQL API to fetch contribution data
   ```graphql
   query($username: String!, $from: DateTime!, $to: DateTime!) {
     user(login: $username) {
       contributionsCollection(from: $from, to: $to) {
         contributionCalendar {
           totalContributions
         }
       }
     }
   }
   ```

2. **Timezone Handling**: Converts current time to user's timezone to determine "today"
   - Uses `toZonedTime()` from `date-fns-tz`
   - Gets start and end of day in the specified timezone
   - Queries GitHub with these boundaries

### Common Modifications

**Add contribution details** (not just count):
```typescript
// Modify the GraphQL query to fetch more data
const query = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;
```

**Use different GitHub API** (REST instead of GraphQL):
```typescript
async getContributionCount(username: string, timezone: string): Promise<number> {
  // Use Octokit REST API
  const octokit = new Octokit({ auth: this.token });
  const { data } = await octokit.rest.activity.listPublicEventsForUser({
    username,
    per_page: 100
  });

  // Filter events for today and count them
  const todayEvents = data.filter(event => {
    // Filter logic
  });

  return todayEvents.length;
}
```

---

## EmailService Deep Dive

### Location
`src/services/email.service.ts`

### How It Works

1. **Resend SDK Initialization**: Creates Resend client with API key
   ```typescript
   this.resend = new Resend(config.apiKey);
   this.fromEmail = config.from;
   ```

2. **Email Sending**: Uses Resend's `emails.send()` API
   - Sends HTML email with sender, recipient, subject, and body
   - Returns email ID for tracking
   - Handles errors gracefully

3. **HTML Template**: Generates responsive HTML email with:
   - Gradient header with emoji
   - Personalized greeting
   - Call-to-action button (View Your Profile)
   - Quick ideas for contributions
   - Footer with branding

### Common Modifications

**Add email tags** (for tracking/analytics):
```typescript
const { data, error } = await this.resend.emails.send({
  from: this.fromEmail,
  to: emailOptions.to,
  subject: emailOptions.subject,
  html: emailOptions.html,
  tags: [
    { name: 'category', value: 'reminder' },
    { name: 'user', value: githubUsername }
  ]
});
```

**Change email provider** (to SendGrid):
```typescript
import sgMail from '@sendgrid/mail';

constructor(config: { apiKey: string; from: string }) {
  sgMail.setApiKey(config.apiKey);
  this.fromEmail = config.from;
}

async sendReminder(to: string, githubUsername: string): Promise<boolean> {
  const msg = {
    to,
    from: this.fromEmail,
    subject: '⏰ GitHub Contribution Reminder',
    html: this.generateEmailTemplate(githubUsername)
  };

  await sgMail.send(msg);
  return true;
}
```

**Customize email template**:
```typescript
// Modify generateEmailTemplate() method
private generateEmailTemplate(githubUsername: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Hey ${githubUsername}!</h1>
        <p>Custom message here...</p>
      </body>
    </html>
  `;
}
```

**Add email attachments** (e.g., contribution graph):
```typescript
import { readFileSync } from 'fs';

async sendReminder(to: string, githubUsername: string): Promise<boolean> {
  const imageBuffer = readFileSync('./path/to/graph.png');

  const { data, error } = await this.resend.emails.send({
    from: this.fromEmail,
    to,
    subject: '⏰ GitHub Contribution Reminder',
    html: this.generateEmailTemplate(githubUsername),
    attachments: [
      {
        filename: 'contribution-graph.png',
        content: imageBuffer
      }
    ]
  });

  if (error) throw new Error(error.message);
  return true;
}
```

---

## NotificationService Deep Dive

### Location
`src/services/notification.service.ts`

### How It Works

**Main Workflow** (`checkAndNotify()`):
```
1. Check GitHub contributions
   ↓
2. If has contribution → Log and skip
   ↓
3. If no contribution → Send email
   ↓
4. Log result (success or failure)
   ↓
5. Return NotificationResult
```

**Return Type**:
```typescript
interface NotificationResult {
  sent: boolean;
  reason?: string;
  error?: Error;
}
```

### Common Modifications

**Add multiple notification channels**:
```typescript
async checkAndNotify(): Promise<NotificationResult> {
  const hasContributed = await this.githubService.hasContributionToday(
    this.config.githubUsername,
    this.config.timezone
  );

  if (hasContributed) {
    return { sent: false, reason: 'Already contributed' };
  }

  // Send via multiple channels
  const results = await Promise.allSettled([
    this.emailService.sendReminder(this.config.emailTo, this.config.githubUsername),
    this.slackService.sendMessage(this.config.githubUsername),
    this.smsService.sendSMS(this.config.phoneNumber, 'Contribute to GitHub today!')
  ]);

  const anySent = results.some(r => r.status === 'fulfilled' && r.value === true);

  return { sent: anySent };
}
```

**Add retry logic**:
```typescript
async checkAndNotify(): Promise<NotificationResult> {
  // ... existing check logic ...

  if (!hasContributed) {
    // Retry up to 3 times
    for (let i = 0; i < 3; i++) {
      const sent = await this.emailService.sendReminder(emailTo, githubUsername);
      if (sent) {
        return { sent: true };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }

    return { sent: false, reason: 'Failed after 3 retries' };
  }
}
```

**Add contribution streak tracking**:
```typescript
async checkAndNotify(): Promise<NotificationResult> {
  const hasContributed = await this.githubService.hasContributionToday(
    this.config.githubUsername,
    this.config.timezone
  );

  // Get contribution history to calculate streak
  const streak = await this.calculateStreak();

  if (!hasContributed) {
    await this.emailService.sendReminder(
      this.config.emailTo,
      this.config.githubUsername,
      { currentStreak: streak } // Pass extra data to template
    );
  }
}

private async calculateStreak(): Promise<number> {
  // Implementation to fetch past contributions and calculate streak
}
```

---

## Testing Services

### Unit Testing GitHubService

```typescript
import { GitHubService } from './github.service';

describe('GitHubService', () => {
  let service: GitHubService;
  const mockToken = 'ghp_test_token';

  beforeEach(() => {
    service = new GitHubService(mockToken);
  });

  it('should return true when user has contributions', async () => {
    // Mock @octokit/graphql response
    const result = await service.hasContributionToday('octocat', 'America/New_York');
    expect(result).toBe(true);
  });
});
```

### Unit Testing EmailService

```typescript
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService({
      user: 'test@gmail.com',
      password: 'test-password'
    });
  });

  it('should send reminder email', async () => {
    const result = await service.sendReminder('recipient@example.com', 'octocat');
    expect(result).toBe(true);
  });

  it('should generate HTML email template', () => {
    const html = (service as any).generateEmailTemplate('octocat');
    expect(html).toContain('octocat');
    expect(html).toContain('github.com/octocat');
  });
});
```

### Integration Testing NotificationService

```typescript
import { NotificationService } from './notification.service';
import { GitHubService } from './github.service';
import { EmailService } from './email.service';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockGitHubService: jest.Mocked<GitHubService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockGitHubService = {
      hasContributionToday: jest.fn()
    } as any;

    mockEmailService = {
      sendReminder: jest.fn()
    } as any;

    notificationService = new NotificationService(
      mockGitHubService,
      mockEmailService,
      {
        githubUsername: 'octocat',
        emailTo: 'test@example.com',
        timezone: 'America/New_York'
      }
    );
  });

  it('should skip notification if user has contributed', async () => {
    mockGitHubService.hasContributionToday.mockResolvedValue(true);

    const result = await notificationService.checkAndNotify();

    expect(result.sent).toBe(false);
    expect(result.reason).toContain('already contributed');
    expect(mockEmailService.sendReminder).not.toHaveBeenCalled();
  });

  it('should send notification if user has not contributed', async () => {
    mockGitHubService.hasContributionToday.mockResolvedValue(false);
    mockEmailService.sendReminder.mockResolvedValue(true);

    const result = await notificationService.checkAndNotify();

    expect(result.sent).toBe(true);
    expect(mockEmailService.sendReminder).toHaveBeenCalledWith('test@example.com', 'octocat');
  });
});
```

---

## Dependencies

### GitHubService
- `@octokit/graphql` - GitHub GraphQL client library
- `date-fns` - Date manipulation utilities
- `date-fns-tz` - Timezone conversion
- Logger from `../utils/logger.js`

### EmailService
- `resend` - Resend email API client
- Logger from `../utils/logger.js`

### NotificationService
- GitHubService - For contribution checking
- EmailService - For email sending
- Logger from `../utils/logger.js`
- Types from `../types/index.js`

---

## Anti-Patterns to Avoid

❌ **Don't** use services as singletons with global state
✅ **Do** create new instances and inject dependencies

❌ **Don't** make services depend on other services directly (import and use)
✅ **Do** use dependency injection (constructor parameters)

❌ **Don't** hard-code configuration in services
✅ **Do** pass configuration via constructor

❌ **Don't** mix concerns (e.g., database logic in EmailService)
✅ **Do** keep each service focused on one responsibility

❌ **Don't** swallow errors without logging
✅ **Do** log all errors with full context

---

## Future Considerations (Phase 2)

When migrating to multi-user web app:

1. **Make Services User-Aware**:
   ```typescript
   class GitHubService {
     async hasContributionToday(user: User): Promise<boolean> {
       // Use user.githubToken, user.githubUsername, user.timezone
     }
   }
   ```

2. **Add Database Integration**:
   ```typescript
   class NotificationService {
     async checkAndNotify(user: User): Promise<void> {
       // Save notification to database
       await prisma.notification.create({
         data: { userId: user.id, status: 'SENT' }
       });
     }
   }
   ```

3. **Extract to Shared Package**:
   Move services to `packages/shared/services/` for reuse across API and workers

---

## Related Documentation

- [Parent Directory Guide](../agents.md) - Overall source structure
- [Scheduler Guide](../scheduler/agents.md) - How services are invoked by cron jobs
- [Utilities Guide](../utils/agents.md) - Logger used by all services
- [Type Definitions](../types/agents.md) - Shared types used by services

---

## Quick Reference

**Add a new service**: Create `[name].service.ts`, export class, inject dependencies
**Modify GitHub API**: Edit `github.service.ts`, update GraphQL query
**Change email provider**: Edit `email.service.ts`, replace Resend SDK with another provider
**Test services**: Use Jest with mocked dependencies
**Error handling**: Always log errors with context, return failure indicators

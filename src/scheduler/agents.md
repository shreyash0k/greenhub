# AI Agent Guide - Scheduler

## Purpose

The scheduler module handles time-based job execution for GreenHub. It uses `node-cron` to schedule reminder checks at specific times (2 PM, 6 PM, and 10 PM EST by default).

**Why This Exists**: Separating scheduling logic from business logic makes it easy to:

- Add, modify, or remove scheduled tasks
- Test scheduling behavior independently
- Support different timezones
- Scale to multiple users in Phase 2 (with BullMQ)

**Design Philosophy**: Keep scheduling simple and reliable. Handle failures gracefully and log all triggers.

---

## Files and Responsibilities

### cron.ts (~130 lines)

**Class**: `ReminderScheduler`

**Purpose**: Manage cron jobs that trigger contribution checks at scheduled times.

**Key Methods**:

- `start()` - Initialize scheduler with default reminder times (9 PM)
- `stop()` - Stop all scheduled jobs (cleanup)
- `scheduleReminder(time, label)` - Schedule a specific reminder time (private)
- `scheduleCustom(cronExpression, label)` - Schedule with custom cron expression
- `getActiveJobCount()` - Get number of active cron jobs

**Dependencies**:

- `node-cron` - Cron job library
- `NotificationService` - Service to execute on triggers
- Logger from `../utils/logger.js`

**Configuration**: Timezone (default: `America/New_York`)

---

## How the Scheduler Works

### Initialization Flow

```typescript
// 1. Create scheduler with notification service and timezone
const scheduler = new ReminderScheduler(
  notificationService,
  "America/New_York"
);

// 2. Start scheduler (creates cron jobs for 9 PM)
scheduler.start();

// Jobs are now running and will trigger at scheduled times

// 3. Graceful shutdown (stop all jobs)
scheduler.stop();
```

### Cron Job Lifecycle

1. **Schedule**: `scheduleReminder()` creates a cron job with `node-cron`
2. **Store**: Job is added to `this.jobs` array for lifecycle management
3. **Execute**: When cron time matches, callback function runs
4. **Trigger**: Callback calls `notificationService.checkAndNotify()`
5. **Log**: Results are logged (success, failure, or skip)
6. **Cleanup**: On shutdown, `stop()` terminates all jobs

---

## Cron Expression Format

node-cron uses the standard cron format:

```
 ┌────────────── second (optional)
 │ ┌──────────── minute (0-59)
 │ │ ┌────────── hour (0-23)
 │ │ │ ┌──────── day of month (1-31)
 │ │ │ │ ┌────── month (1-12)
 │ │ │ │ │ ┌──── day of week (0-6, Sunday = 0)
 │ │ │ │ │ │
 * * * * * *
```

**Examples**:

- `0 14 * * *` = 2:00 PM every day (14:00)
- `0 18 * * *` = 6:00 PM every day (18:00)
- `0 22 * * *` = 10:00 PM every day (22:00)
- `30 14 * * 1-5` = 2:30 PM Monday-Friday
- `0 */2 * * *` = Every 2 hours
- `0 9,17 * * *` = 9 AM and 5 PM every day

**Timezone Handling**: node-cron's `timezone` option ensures times are in the specified timezone, not server time.

---

## AI Agent Guidelines

### When to Modify This Directory

1. **Changing reminder times**: Modify `start()` method
2. **Adding more reminders**: Add more `scheduleReminder()` calls
3. **Custom scheduling logic**: Use `scheduleCustom()` method
4. **Changing timezone support**: Modify constructor or make timezone dynamic

### How to Modify Reminder Times

**Example**: Change from 2 PM / 6 PM / 10 PM to 9 AM / 5 PM

```typescript
// In cron.ts, start() method
start(): void {
  this.scheduleReminder('09:00', '9 AM EST');  // Changed from 14:00
  this.scheduleReminder('17:00', '5 PM EST');  // Changed from 18:00
  // Removed 22:00 reminder

  logger.info('Reminder scheduler started', {
    timezone: this.timezone,
    reminderTimes: ['9:00 AM', '5:00 PM']  // Update log
  });
}
```

### How to Add More Reminder Times

**Example**: Add an 8 PM reminder

```typescript
start(): void {
  this.scheduleReminder('14:00', '2 PM EST');
  this.scheduleReminder('18:00', '6 PM EST');
  this.scheduleReminder('20:00', '8 PM EST');   // New reminder
  this.scheduleReminder('22:00', '10 PM EST');

  logger.info('Reminder scheduler started', {
    timezone: this.timezone,
    reminderTimes: ['2:00 PM', '6:00 PM', '8:00 PM', '10:00 PM']
  });
}
```

### How to Schedule Custom Jobs

**Example**: Run a weekly summary every Monday at 9 AM

```typescript
// After starting the scheduler
scheduler.scheduleCustom("0 9 * * 1", "Weekly Summary");
```

**Example**: Run every hour during work hours (9 AM - 5 PM)

```typescript
scheduler.scheduleCustom("0 9-17 * * *", "Hourly Reminder");
```

---

## scheduleReminder() Deep Dive

### Location

`src/scheduler/cron.ts:41-85`

### How It Works

```typescript
private scheduleReminder(time: string, label: string): void {
  // 1. Parse time string (HH:MM format)
  const [hour, minute] = time.split(':');

  // 2. Create cron expression (minute hour * * *)
  const cronExpression = `${minute} ${hour} * * *`;

  // 3. Create the cron job
  const job = cron.schedule(
    cronExpression,
    async () => {
      // 4. Execute notification service on trigger
      const result = await this.notificationService.checkAndNotify();

      // 5. Log result
      logger.info('Reminder completed', { time: label, sent: result.sent });
    },
    {
      timezone: this.timezone  // 6. Use specified timezone
    }
  );

  // 7. Store job for lifecycle management
  this.jobs.push(job);
}
```

### Parameters

- **time** (string): Time in 24-hour format `HH:MM` (e.g., "20:00" for 8 PM)
- **label** (string): Human-readable description for logging (e.g., "8 PM EST")

### Error Handling

Errors during cron execution are caught and logged:

```typescript
async () => {
  try {
    await this.notificationService.checkAndNotify();
  } catch (error) {
    logger.error("Error during scheduled reminder", {
      time: label,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
```

**Important**: Errors don't stop the scheduler. The job will run again at the next scheduled time.

---

## scheduleCustom() Usage

### Location

`src/scheduler/cron.ts:90-110`

### Purpose

Allow scheduling with custom cron expressions beyond simple daily times.

### Example Use Cases

**1. Testing (trigger in 1 minute)**:

```typescript
const now = new Date();
const nextMinute = new Date(now.getTime() + 60000);
const cronExpr = `${nextMinute.getMinutes()} ${nextMinute.getHours()} * * *`;
scheduler.scheduleCustom(cronExpr, "Test Notification");
```

**2. Weekend-only reminders**:

```typescript
// Saturday and Sunday at 2 PM
scheduler.scheduleCustom("0 14 * * 0,6", "Weekend Reminder");
```

**3. Workday reminders**:

```typescript
// Monday-Friday at 9 AM and 6 PM
scheduler.scheduleCustom("0 9,18 * * 1-5", "Workday Reminder");
```

**4. Monthly summary** (first day of month):

```typescript
scheduler.scheduleCustom("0 9 1 * *", "Monthly Summary");
```

---

## Timezone Support

### How It Works

The `timezone` option in node-cron ensures cron times are interpreted in the specified timezone, not the server's local timezone.

**Example**:

```typescript
// Server is in UTC, but user wants EST times
const scheduler = new ReminderScheduler(service, "America/New_York");

// This will trigger at 8 PM EST, regardless of server timezone
scheduler.start();
```

### Valid Timezone Values

Use IANA timezone database names:

- **US Timezones**: `America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`
- **Europe**: `Europe/London`, `Europe/Paris`, `Europe/Berlin`
- **Asia**: `Asia/Tokyo`, `Asia/Shanghai`, `Asia/Kolkata`
- **Full list**: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Changing Timezone at Runtime

The current implementation sets timezone at construction. To make it dynamic:

```typescript
class ReminderScheduler {
  private timezone: string;

  updateTimezone(newTimezone: string): void {
    // Stop existing jobs
    this.stop();

    // Update timezone
    this.timezone = newTimezone;

    // Restart with new timezone
    this.start();

    logger.info("Timezone updated", { newTimezone });
  }
}
```

---

## Lifecycle Management

### Starting the Scheduler

```typescript
// In index.ts
const scheduler = new ReminderScheduler(
  notificationService,
  "America/New_York"
);
scheduler.start();

logger.info("Scheduler started", {
  activeJobs: scheduler.getActiveJobCount(),
});
```

### Stopping the Scheduler

Called during graceful shutdown:

```typescript
// In index.ts setupGracefulShutdown()
process.on("SIGINT", () => {
  logger.info("Shutting down...");
  scheduler.stop(); // Stop all cron jobs
  process.exit(0);
});
```

### Checking Active Jobs

```typescript
const jobCount = scheduler.getActiveJobCount();
logger.info(`Currently running ${jobCount} scheduled jobs`);
```

---

## Testing the Scheduler

### Manual Testing

**Option 1**: Adjust cron times to trigger soon

```typescript
// Temporarily modify start() to trigger in 2 minutes
const now = new Date();
const testTime = new Date(now.getTime() + 2 * 60000);
const hour = testTime.getHours().toString().padStart(2, "0");
const minute = testTime.getMinutes().toString().padStart(2, "0");

this.scheduleReminder(`${hour}:${minute}`, "Test Reminder");
```

**Option 2**: Use scheduleCustom with immediate trigger

```typescript
// Schedule for next minute
const now = new Date();
const nextMin = now.getMinutes() + 1;
scheduler.scheduleCustom(`${nextMin} * * * *`, "Immediate Test");
```

### Unit Testing

```typescript
import { ReminderScheduler } from "./cron";

describe("ReminderScheduler", () => {
  let scheduler: ReminderScheduler;
  let mockNotificationService: any;

  beforeEach(() => {
    mockNotificationService = {
      checkAndNotify: jest.fn().mockResolvedValue({ sent: true }),
    };

    scheduler = new ReminderScheduler(
      mockNotificationService,
      "America/New_York"
    );
  });

  afterEach(() => {
    scheduler.stop(); // Clean up
  });

  it("should start with correct number of jobs", () => {
    scheduler.start();
    expect(scheduler.getActiveJobCount()).toBe(3); // 2 PM, 6 PM, and 10 PM
  });

  it("should stop all jobs", () => {
    scheduler.start();
    scheduler.stop();
    expect(scheduler.getActiveJobCount()).toBe(0);
  });

  it("should schedule custom job", () => {
    scheduler.start();
    scheduler.scheduleCustom("0 15 * * *", "Custom");
    expect(scheduler.getActiveJobCount()).toBe(4); // 3 default + 1 custom
  });
});
```

### Integration Testing

Test that cron jobs actually trigger:

```typescript
it("should trigger notification on schedule", async () => {
  // Schedule for 1 second from now (using setTimeout as alternative)
  const mockService = {
    checkAndNotify: jest.fn().mockResolvedValue({ sent: true }),
  };

  // Use a mock cron library or test with actual setTimeout
  await new Promise((resolve) => setTimeout(resolve, 1100));

  expect(mockService.checkAndNotify).toHaveBeenCalled();
});
```

---

## Common Patterns and Best Practices

### Pattern 1: Conditional Scheduling

Only schedule reminders on weekdays:

```typescript
start(): void {
  // Only Monday-Friday
  this.scheduleCustom('0 14 * * 1-5', '2 PM EST (Weekdays)');
  this.scheduleCustom('0 18 * * 1-5', '6 PM EST (Weekdays)');
  this.scheduleCustom('0 22 * * 1-5', '10 PM EST (Weekdays)');
}
```

### Pattern 2: Multiple Timezones

Support users in different timezones:

```typescript
class ReminderScheduler {
  startForUsers(users: Array<{ timezone: string; times: string[] }>): void {
    users.forEach((user) => {
      user.times.forEach((time) => {
        const [hour, minute] = time.split(":");
        const cronExpr = `${minute} ${hour} * * *`;

        cron.schedule(
          cronExpr,
          () => this.notificationService.checkAndNotify(user),
          { timezone: user.timezone }
        );
      });
    });
  }
}
```

### Pattern 3: Dynamic Scheduling

Add/remove jobs without restarting:

```typescript
class ReminderScheduler {
  private jobMap = new Map<string, cron.ScheduledTask>();

  addReminder(id: string, time: string, timezone: string): void {
    const [hour, minute] = time.split(":");
    const job = cron.schedule(
      `${minute} ${hour} * * *`,
      () => this.notificationService.checkAndNotify(),
      { timezone }
    );

    this.jobMap.set(id, job);
  }

  removeReminder(id: string): void {
    const job = this.jobMap.get(id);
    if (job) {
      job.stop();
      this.jobMap.delete(id);
    }
  }
}
```

---

## Troubleshooting

### Jobs Not Triggering

**Check 1**: Verify timezone

```typescript
logger.info("Scheduler config", {
  timezone: this.timezone,
  serverTime: new Date().toISOString(),
  serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
```

**Check 2**: Verify cron expression

```typescript
// Use a cron validator or test with: https://crontab.guru
const cronExpression = `${minute} ${hour} * * *`;
logger.debug("Cron expression", { cronExpression });
```

**Check 3**: Ensure scheduler is running

```typescript
const jobCount = scheduler.getActiveJobCount();
if (jobCount === 0) {
  logger.warn("No active jobs! Scheduler may not have started.");
}
```

### Jobs Triggering Multiple Times

**Cause**: Multiple scheduler instances or duplicate jobs

**Fix**: Ensure only one scheduler instance and call `start()` once:

```typescript
// Good - single instance
const scheduler = new ReminderScheduler(service, timezone);
scheduler.start();

// Bad - multiple instances
const scheduler1 = new ReminderScheduler(service, timezone);
const scheduler2 = new ReminderScheduler(service, timezone);
scheduler1.start();
scheduler2.start(); // Creates duplicate jobs!
```

### Memory Leaks

**Cause**: Not calling `stop()` on shutdown

**Fix**: Always stop scheduler in shutdown handler:

```typescript
process.on("SIGINT", () => {
  scheduler.stop(); // Important!
  process.exit(0);
});
```

---

## Future Considerations (Phase 2)

When migrating to multi-user web app, replace node-cron with BullMQ:

### Why BullMQ?

- **Scalable**: Handle thousands of users with different timezones/times
- **Persistent**: Jobs survive server restarts (stored in Redis)
- **Distributed**: Multiple workers can process jobs
- **Monitoring**: Built-in UI for job queue inspection

### Migration Example

```typescript
// Old (node-cron)
const scheduler = new ReminderScheduler(service, "America/New_York");
scheduler.start();

// New (BullMQ)
import { Queue, Worker } from "bullmq";

const reminderQueue = new Queue("reminders", {
  connection: { host: "localhost", port: 6379 },
});

// Schedule jobs for each user
users.forEach((user) => {
  user.reminderTimes.forEach((time) => {
    const [hour, minute] = time.split(":");
    reminderQueue.add(
      "check-contribution",
      { userId: user.id },
      {
        repeat: {
          pattern: `${minute} ${hour} * * *`,
          tz: user.timezone,
        },
      }
    );
  });
});

// Worker to process jobs
const worker = new Worker("reminders", async (job) => {
  const user = await fetchUser(job.data.userId);
  await notificationService.checkAndNotify(user);
});
```

---

## Dependencies

- `node-cron` - Cron job scheduling library
- `@types/node-cron` - TypeScript types for node-cron
- NotificationService from `../services/notification.service.js`
- Logger from `../utils/logger.js`

---

## Related Documentation

- [Parent Directory Guide](../agents.md) - Overall source structure
- [Services Guide](../services/agents.md) - NotificationService called by scheduler
- [Entry Point Guide](../agents.md#indexts-application-entry-point) - How scheduler is initialized

---

## Quick Reference

**Change reminder times**: Edit `start()` method, modify `scheduleReminder()` calls
**Add custom schedule**: Use `scheduleCustom(cronExpression, label)`
**Test scheduling**: Adjust times to trigger in next few minutes
**Check active jobs**: Use `getActiveJobCount()`
**Stop scheduler**: Call `stop()` method (important for cleanup)
**Timezone format**: Use IANA timezone names (e.g., `America/New_York`)

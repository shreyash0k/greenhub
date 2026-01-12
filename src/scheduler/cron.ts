import cron from 'node-cron';
import { NotificationService } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

export class ReminderScheduler {
  private jobs: cron.ScheduledTask[] = [];

  constructor(
    private notificationService: NotificationService,
    private timezone: string = 'America/New_York'
  ) { }

  /**
   * Start the scheduler with default times (9 PM)
   */
  start(): void {
    this.scheduleReminder('21:00', '9 PM EST');

    logger.info('Reminder scheduler started', {
      timezone: this.timezone,
      reminderTimes: ['9 PM EST']
    });
  }

  /**
   * Schedule a reminder at a specific time
   * @param time Time in HH:MM format (24-hour)
   * @param label Human-readable label for logging
   */
  private scheduleReminder(time: string, label: string): void {
    const [hour, minute] = time.split(':');

    // Create cron expression: "minute hour * * *"
    const cronExpression = `${minute} ${hour} * * *`;

    logger.info('Scheduling reminder', {
      time: label,
      cronExpression,
      timezone: this.timezone
    });

    const job = cron.schedule(
      cronExpression,
      async () => {
        logger.info('Reminder trigger activated', { time: label });

        try {
          const result = await this.notificationService.checkAndNotify();

          if (result.sent) {
            logger.info('Reminder notification completed successfully', {
              time: label,
              sent: true
            });
          } else {
            logger.info('Reminder notification skipped or failed', {
              time: label,
              sent: false,
              reason: result.reason
            });
          }
        } catch (error) {
          logger.error('Error during scheduled reminder', {
            time: label,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      },
      {
        timezone: this.timezone
      }
    );

    this.jobs.push(job);

    logger.debug('Cron job scheduled', {
      time: label,
      cronExpression,
      timezone: this.timezone,
      nextRun: this.getNextRunTime(cronExpression)
    });
  }

  /**
   * Schedule a custom reminder time (useful for testing or custom schedules)
   * @param cronExpression Custom cron expression
   * @param label Human-readable label
   */
  scheduleCustom(cronExpression: string, label: string): void {
    logger.info('Scheduling custom reminder', {
      cronExpression,
      label,
      timezone: this.timezone
    });

    const job = cron.schedule(
      cronExpression,
      async () => {
        logger.info('Custom reminder trigger activated', { label });
        await this.notificationService.checkAndNotify();
      },
      {
        timezone: this.timezone
      }
    );

    this.jobs.push(job);
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('Stopping all scheduled jobs', { jobCount: this.jobs.length });

    for (const job of this.jobs) {
      job.stop();
    }

    this.jobs = [];
    logger.info('All scheduled jobs stopped');
  }

  /**
   * Get a human-readable description of next run time
   * @param cronExpression Cron expression
   * @returns Description string
   */
  private getNextRunTime(cronExpression: string): string {
    const [minute, hour] = cronExpression.split(' ');
    return `Next run: ${hour}:${minute} ${this.timezone}`;
  }

  /**
   * Get the number of active jobs
   */
  getActiveJobCount(): number {
    return this.jobs.length;
  }
}

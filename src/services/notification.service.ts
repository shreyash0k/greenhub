import { GitHubService } from './github.service.js';
import { EmailService } from './email.service.js';
import { logger } from '../utils/logger.js';
import type { NotificationResult } from '../types/index.js';

export class NotificationService {
  constructor(
    private githubService: GitHubService,
    private emailService: EmailService,
    private config: {
      githubUsername: string;
      emailTo: string;
      timezone: string;
    }
  ) {}

  /**
   * Check if user has contributed today and send reminder if not
   * @returns Promise<NotificationResult> result of the notification attempt
   */
  async checkAndNotify(): Promise<NotificationResult> {
    const { githubUsername, emailTo, timezone } = this.config;

    try {
      logger.info('Starting contribution check', { username: githubUsername, timezone });

      // Check if user has made any contributions today
      const hasContributed = await this.githubService.hasContributionToday(
        githubUsername,
        timezone
      );

      // If user has already contributed, no need to send reminder
      if (hasContributed) {
        logger.info('User has already contributed today - skipping reminder', {
          username: githubUsername
        });
        return {
          sent: false,
          reason: 'User has already contributed today'
        };
      }

      // User hasn't contributed yet, send reminder
      logger.info('No contribution detected - sending reminder', {
        username: githubUsername
      });

      const emailSent = await this.emailService.sendReminder(emailTo, githubUsername);

      if (emailSent) {
        logger.info('Reminder sent successfully', {
          username: githubUsername,
          emailTo
        });
        return {
          sent: true
        };
      } else {
        logger.warn('Failed to send reminder email', {
          username: githubUsername,
          emailTo
        });
        return {
          sent: false,
          reason: 'Failed to send email'
        };
      }
    } catch (error) {
      logger.error('Error in checkAndNotify', {
        username: githubUsername,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        sent: false,
        reason: 'Exception occurred during check',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Perform a test notification (useful for testing the system)
   * @returns Promise<NotificationResult> result of the test notification
   */
  async testNotification(): Promise<NotificationResult> {
    const { githubUsername, emailTo } = this.config;

    try {
      logger.info('Sending test notification', { username: githubUsername });

      const emailSent = await this.emailService.sendReminder(emailTo, githubUsername);

      return {
        sent: emailSent,
        reason: emailSent ? 'Test notification sent' : 'Failed to send test notification'
      };
    } catch (error) {
      logger.error('Error sending test notification', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        sent: false,
        reason: 'Exception occurred during test',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}

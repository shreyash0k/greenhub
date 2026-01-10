import dotenv from 'dotenv';
import { GitHubService } from './services/github.service.js';
import { EmailService } from './services/email.service.js';
import { NotificationService } from './services/notification.service.js';
import { ReminderScheduler } from './scheduler/cron.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateConfig(): void {
  const required = [
    'GITHUB_TOKEN',
    'GITHUB_USERNAME',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'EMAIL_TO'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Main application entry point
async function main(): Promise<void> {
  try {
    logger.info('Starting GreenHub - GitHub Contribution Reminder Service');

    // Validate configuration
    validateConfig();

    // Get configuration from environment
    const config = {
      github: {
        token: process.env.GITHUB_TOKEN!,
        username: process.env.GITHUB_USERNAME!
      },
      email: {
        apiKey: process.env.RESEND_API_KEY!,
        from: process.env.EMAIL_FROM!,
        to: process.env.EMAIL_TO!
      },
      timezone: process.env.TIMEZONE || 'America/New_York',
      nodeEnv: process.env.NODE_ENV || 'development'
    };

    logger.info('Configuration loaded', {
      githubUsername: config.github.username,
      emailFrom: config.email.from,
      emailTo: config.email.to,
      timezone: config.timezone,
      nodeEnv: config.nodeEnv
    });

    // Initialize services
    const githubService = new GitHubService(config.github.token);
    const emailService = new EmailService({
      apiKey: config.email.apiKey,
      from: config.email.from
    });
    const notificationService = new NotificationService(
      githubService,
      emailService,
      {
        githubUsername: config.github.username,
        emailTo: config.email.to,
        timezone: config.timezone
      }
    );

    logger.info('Services initialized successfully');

    // Initialize and start scheduler
    const scheduler = new ReminderScheduler(notificationService, config.timezone);
    scheduler.start();

    logger.info('GreenHub is now running', {
      activeJobs: scheduler.getActiveJobCount(),
      timezone: config.timezone,
      reminderTimes: ['8:00 PM', '11:00 PM']
    });

    logger.info('Press Ctrl+C to stop the service');

    // Handle graceful shutdown
    setupGracefulShutdown(scheduler);

  } catch (error) {
    logger.error('Failed to start application', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Setup graceful shutdown handlers
function setupGracefulShutdown(scheduler: ReminderScheduler): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal} - shutting down gracefully`);

    scheduler.stop();

    logger.info('GreenHub stopped successfully');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason,
      promise
    });
  });
}

// Start the application
main().catch((error) => {
  logger.error('Fatal error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});

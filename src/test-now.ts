import dotenv from 'dotenv';
import { GitHubService } from './services/github.service.js';
import { EmailService } from './services/email.service.js';
import { NotificationService } from './services/notification.service.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

async function testNow(): Promise<void> {
  logger.info('Running immediate test of GreenHub service');

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
    timezone: process.env.TIMEZONE || 'America/New_York'
  };

  logger.info('Configuration', {
    githubUsername: config.github.username,
    emailTo: config.email.to,
    timezone: config.timezone
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

  // Run the check immediately
  logger.info('Checking GitHub contributions and sending reminder if needed...');
  const result = await notificationService.checkAndNotify();

  logger.info('Test complete', result);

  if (result.sent) {
    console.log('\n✅ Reminder email sent! Check your inbox.');
  } else {
    console.log(`\n⚠️ No email sent. Reason: ${result.reason}`);
  }
}

testNow().catch((error) => {
  logger.error('Test failed', { error: error.message });
  process.exit(1);
});

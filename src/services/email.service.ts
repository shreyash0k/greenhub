import { Resend } from 'resend';
import { logger } from '../utils/logger.js';
import type { EmailOptions } from '../types/index.js';

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(config: {
    apiKey: string;
    from: string;
  }) {
    this.resend = new Resend(config.apiKey);
    this.fromEmail = config.from;

    logger.info('Email service initialized with Resend', {
      from: config.from
    });
  }

  /**
   * Send a reminder email to the user
   * @param to Recipient email address
   * @param githubUsername GitHub username for personalization
   * @returns Promise<boolean> true if email sent successfully
   */
  async sendReminder(to: string, githubUsername: string): Promise<boolean> {
    try {
      const emailOptions: EmailOptions = {
        to,
        subject: 'GitHub Contribution Reminder',
        html: this.generateEmailTemplate(githubUsername),
      };

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
      });

      if (error) {
        throw new Error(error.message);
      }

      logger.info('Reminder email sent successfully', {
        to,
        githubUsername,
        emailId: data?.id
      });

      return true;
    } catch (error) {
      logger.error('Failed to send reminder email', {
        to,
        githubUsername,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Generate HTML email template
   * @param githubUsername GitHub username
   * @returns HTML string for email body
   */
  private generateEmailTemplate(githubUsername: string): string {
    const profileUrl = `https://github.com/${githubUsername}`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Contribution Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f6f8fa; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            Hey <strong>${githubUsername}</strong>!
          </p>

          <p style="font-size: 16px; margin-bottom: 15px;">
            It looks like you haven't made any GitHub contributions today yet. Don't break your streak!
          </p>

          <p style="font-size: 16px; margin-bottom: 20px;">
            Every commit counts towards building your consistency and keeping your contribution graph green.
          </p>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${profileUrl}"
               style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Your Profile
            </a>
          </div>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #856404;">
            <strong>💡 Quick Ideas:</strong> Fix a typo, update documentation, commit work in progress, or work on a side project!
          </p>
        </div>

        <div style="text-align: center; padding-top: 20px; border-top: 2px solid #e1e4e8; color: #586069; font-size: 12px;">
          <p style="margin: 5px 0;">GreenHub - Your GitHub Contribution Reminder</p>
          <p style="margin: 5px 0;">Keep the streak alive! 🔥</p>
        </div>
      </body>
      </html>
    `;
  }
}

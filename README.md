# GreenHub - GitHub Contribution Reminder

Never break your GitHub contribution streak again! GreenHub sends you email reminders at 8 PM and 11 PM EST if you haven't made any GitHub contributions for the day.

## Features

- Checks your GitHub contributions daily using the GitHub GraphQL API
- Sends beautiful HTML email reminders at 8 PM and 11 PM EST
- Only sends reminders if you haven't contributed yet (smart detection)
- Caches contribution data to minimize API calls
- Runs as a background service with scheduled cron jobs
- Comprehensive logging with Winston
- Graceful shutdown handling

## Prerequisites

- Node.js 20+ installed
- A GitHub account
- A Resend account (for sending emails - free tier: 3,000 emails/month)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd greenhub
npm install
```

### 2. Create GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "GreenHub Reminder"
4. **No scopes are required** (public read access is sufficient)
5. Click "Generate token" and copy the token

### 3. Create Resend API Key

Resend is a modern email API that makes sending emails simple and reliable.

1. Go to [Resend](https://resend.com) and create a free account
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Click "Create API Key"
4. Give it a name like "GreenHub MVP"
5. Copy the API key (starts with `re_`)

**For Testing**: You can use Resend's test domain `onboarding@resend.dev` as your sender email. This works immediately without any domain verification.

**For Production**: Verify your own domain in Resend to send from your domain (e.g., `noreply@yourdomain.com`).

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
GITHUB_TOKEN=ghp_your_actual_github_token
GITHUB_USERNAME=your-github-username

RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=GreenHub <onboarding@resend.dev>
EMAIL_TO=your-email@gmail.com

TIMEZONE=America/New_York
NODE_ENV=production
LOG_LEVEL=info
```

### 5. Build and Run

#### Development Mode (with auto-reload)

```bash
npm run dev
```

#### Production Mode

```bash
# Build TypeScript to JavaScript
npm run build

# Start the service
npm start
```

#### Run as Background Daemon (using PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Build the project first
npm run build

# Start with PM2
pm2 start dist/index.js --name greenhub

# View logs
pm2 logs greenhub

# Stop the service
pm2 stop greenhub

# Restart the service
pm2 restart greenhub

# Make it start on system boot
pm2 startup
pm2 save
```

## How It Works

1. **Scheduler**: Two cron jobs run daily at 8:00 PM and 11:00 PM EST
2. **GitHub Check**: When triggered, the service queries GitHub's GraphQL API to check if you've made any contributions today
3. **Smart Notification**: If you haven't contributed, it sends a beautifully formatted reminder email
4. **Caching**: Contribution data is cached for 1 hour to minimize API calls
5. **Logging**: All actions are logged for monitoring and debugging

## Project Structure

```
greenhub/
├── src/
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
│   └── index.ts                    # Application entry point
├── .env                            # Your secrets (gitignored)
├── .env.example                    # Template for environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Customization

### Change Reminder Times

Edit [src/scheduler/cron.ts](src/scheduler/cron.ts:17-18) and modify the `start()` method:

```typescript
start(): void {
  this.scheduleReminder('20:00', '8 PM EST');  // First reminder
  this.scheduleReminder('23:00', '11 PM EST'); // Second reminder
}
```

### Change Timezone

Update the `TIMEZONE` environment variable in your `.env` file:

```env
TIMEZONE=America/Los_Angeles  # Pacific Time
```

Valid timezone values follow the IANA timezone database (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`).

### Customize Email Template

Edit the `generateEmailTemplate()` method in [src/services/email.service.ts](src/services/email.service.ts:66).

## Troubleshooting

### Email Not Sending

1. **Verify API Key**: Ensure your Resend API key is correct and active
2. **Check Sender Domain**: If using a custom domain, ensure it's verified in Resend
3. **Check Logs**: Look for error messages in the console or log files
4. **Resend Dashboard**: Check the [Resend Emails](https://resend.com/emails) page for send status and errors
5. **Rate Limits**: Free tier allows 3,000 emails/month and 100 emails/day

### GitHub API Errors

1. **Check Token**: Ensure your GitHub token is valid and not expired
2. **Check Username**: Verify your GitHub username is correct (case-sensitive)
3. **Rate Limits**: The service caches data, but check if you're hitting API rate limits (5000/hour for authenticated requests)

### Scheduler Not Running

1. **Check Timezone**: Ensure the timezone is correctly set
2. **System Time**: Verify your system clock is accurate
3. **Logs**: Check the logs for any scheduler initialization errors

## Logs

Logs are output to:
- **Console**: Colorized, human-readable format
- **Files** (production only):
  - `logs/error.log`: Error-level logs only
  - `logs/combined.log`: All logs

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token | `ghp_abc123...` |
| `GITHUB_USERNAME` | Yes | Your GitHub username | `octocat` |
| `RESEND_API_KEY` | Yes | Resend API key | `re_abc123...` |
| `EMAIL_FROM` | Yes | Sender email address | `GreenHub <onboarding@resend.dev>` |
| `EMAIL_TO` | Yes | Email address to receive reminders | `you@gmail.com` |
| `TIMEZONE` | No | IANA timezone for scheduling | `America/New_York` |
| `NODE_ENV` | No | Environment mode | `production` or `development` |
| `LOG_LEVEL` | No | Logging verbosity | `info`, `debug`, `error` |

## Future Enhancements (Phase 2)

This is currently a personal MVP. Future plans include:

- Multi-user web application with authentication
- GitHub OAuth integration
- Database to store user preferences
- Web dashboard with contribution stats and streak tracking
- Customizable reminder times per user
- Support for multiple timezones
- SMS/Discord/Slack notification options
- Weekly/monthly contribution reports

## Contributing

This is currently a personal project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to use and modify for your own purposes.

## Support

If you encounter any issues:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure GitHub token and Resend API key are valid
4. Review the Troubleshooting section above

Happy coding and keep that contribution graph green!

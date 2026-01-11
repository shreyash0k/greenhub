# GreenHub - GitHub Contribution Reminder

> **AI Assistants**: See [agents.md](agents.md) for project context, architecture details, and common questions.

Never break your GitHub contribution streak again! GreenHub sends you email reminder if you haven't made any GitHub contributions for the day.

## Features

- Checks your GitHub contributions daily using the GitHub GraphQL API
- Only sends reminders if you haven't contributed yet
- Runs as a background service with scheduled cron jobs

## Prerequisites

- Node.js 20+ installed
- A GitHub account
- A Resend account (for sending emails)

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/shreyash0k/greenhub
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

Resend is an email service

1. Go to [Resend](https://resend.com) and create a free account
2. Navigate to [API Keys](https://resend.com/api-keys)
3. Click "Create API Key"
4. Give it a name like "GreenHub MVP"
5. Copy the API key (starts with `re_`)

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values

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

1. **Scheduler**: Cron jobs run daily
2. **GitHub Check**: When triggered, the service queries GitHub's GraphQL API to check if you've made any contributions today
3. **Notification**: If you haven't contributed, it sends a reminder email

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

## Contributing

This is currently a personal project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to use and modify for your own purposes.

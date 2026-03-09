# GreenHub

A web application that monitors your GitHub contributions and sends email reminders to help you maintain your daily commit streak.

## Features

- **GitHub OAuth** — Sign in with your GitHub account (no tokens to manage)
- **Automatic monitoring** — Checks your contributions at your configured reminder times
- **Email reminders** — Sends a friendly email via Resend when you haven't committed today
- **Per-user settings** — Configure timezone, reminder times, and enable/disable notifications
- **Dashboard** — See today's contribution status and recent notification history

## Tech Stack

- **Next.js 15** (App Router)
- **Auth.js v5** (GitHub OAuth)
- **Prisma** + **PostgreSQL**
- **Resend** (email delivery)
- **Tailwind CSS**
- **node-cron** (standalone worker option)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted — [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all have free tiers)
- GitHub OAuth App
- Resend API key

### 1. Clone and install

```bash
git clone <repo-url> greenhub
cd greenhub
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials. See `.env.example` for detailed descriptions.

### 3. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Homepage URL** to `http://localhost:3000`
4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`
5. Copy the **Client ID** and **Client Secret** into your `.env`

### 4. Set up the database

```bash
npx prisma db push
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## Notification Scheduling

GreenHub supports two scheduling modes:

### Option A: Vercel Cron (serverless)

Deploy to Vercel and cron is configured automatically via `vercel.json`. The endpoint `POST /api/cron/notify` runs every 30 minutes, checking all users whose reminder times are due.

### Option B: Standalone Worker (VPS / Docker / Railway)

Run the worker alongside the Next.js server:

```bash
npm run worker
```

The worker uses `node-cron` to check every 30 minutes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run worker` | Start standalone cron worker |
| `npm run db:push` | Push schema to database (no migration) |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for signing sessions |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App client secret |
| `RESEND_API_KEY` | Yes | Resend API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `CRON_SECRET` | Yes | Secret for authenticating cron requests |
| `NODE_ENV` | No | `development` or `production` |
| `TIMEZONE` | No | Default timezone for the worker |

## Deployment

### Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy — cron is automatically configured

### Railway / Self-hosted

1. Deploy the Next.js app: `npm run build && npm start`
2. Run the worker as a separate process: `npm run worker`
3. Both processes need access to the same database and environment variables

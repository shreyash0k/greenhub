# AI Agent Context for GreenHub

> **For AI Assistants**: Read this file first when working on this project. It contains essential context about the architecture, design decisions, and common questions.

## Project Overview

GreenHub is a **multi-user web application** built with Next.js that monitors GitHub contributions and sends email reminders to help users maintain their daily commit streaks. Users sign in with GitHub OAuth and configure their own reminder preferences.

## Architecture Summary

### Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Auth.js v5 (next-auth) with GitHub OAuth provider
- **Database**: PostgreSQL via Prisma ORM
- **Email**: Resend API
- **Styling**: Tailwind CSS
- **Scheduler**: Vercel Cron or standalone `node-cron` worker

### Execution Model

- **Web app**: Next.js handles the UI, API routes, and auth
- **Scheduling**: Two supported modes:
  1. **Vercel Cron** hits `POST /api/cron/notify` once daily at 2 AM UTC (Hobby plan limit; uses `skipTimeCheck` to check all enabled users)
  2. **Standalone worker** (`src/worker/cron.ts`) runs `node-cron` every 30 minutes with exact hour-matching
- **Deployment**: Vercel (production at `greenhub-eosin.vercel.app`)

### Core Services

| Service | File | Purpose |
| ----------------------- | ------------------------------------------- | --------------------------------------------------- |
| **GitHub Service** | `src/lib/services/github.service.ts` | Queries GitHub GraphQL API for contributions |
| **Email Service** | `src/lib/services/email.service.ts` | Sends HTML emails via Resend API |
| **Notification Service** | `src/lib/services/notification.service.ts` | Orchestrates check-and-notify flow for all users |
| **Auth Config** | `src/lib/auth.ts` | NextAuth config with GitHub provider + Prisma adapter |
| **Prisma Client** | `src/lib/prisma.ts` | Singleton Prisma client instance |

### Data Flow

```
Cron Trigger (Vercel Cron or node-cron worker)
 ↓
processAllDueUsers({ skipTimeCheck })
 ↓ (for each user with reminders enabled)
 ↓ skipTimeCheck=true (Vercel): check all users
 ↓ skipTimeCheck=false (worker): only users whose reminder hour matches
checkAndNotifyUser(user)
 ↓
hasContributionToday(token, username, timezone)  ← GitHub GraphQL API
 ↓ (if no contributions)
sendReminder(email, username)  ← Resend API
 ↓
NotificationLog entry created in database
```

## Key Technical Details

### Authentication

- Uses **GitHub OAuth** via Auth.js v5
- User's GitHub OAuth access token stored in the `Account` table
- Token is used to query the GitHub GraphQL API for contribution data
- GitHub username is captured on every sign-in via the `signIn` event
- Middleware protects `/dashboard` and `/settings` routes

### Database Schema

- **User** — profile + settings (timezone, reminderEnabled, reminderTimes)
- **Account** — OAuth tokens (managed by Auth.js Prisma adapter)
- **Session** — active sessions (managed by Auth.js)
- **NotificationLog** — tracks each check (contribution status + email sent)

### Services Architecture

Services are implemented as **pure functions** (not classes) for better tree-shaking and Next.js compatibility:

```typescript
// Function-based instead of class-based
export async function hasContributionToday(token, username, timezone): Promise<boolean>
export async function sendReminder(to, githubUsername): Promise<boolean>
export async function processAllDueUsers(options?: { skipTimeCheck?: boolean }): Promise<{ processed, notified }>
```

Services use **relative imports** for portability between Next.js and the standalone worker.

### Reminder Scheduling Logic

Two execution modes with different time-matching behavior:

**Vercel Cron (daily at 2 AM UTC)**:
1. Calls `processAllDueUsers({ skipTimeCheck: true })`
2. Skips hour-matching — checks all users with `reminderEnabled: true`
3. `hasNotificationToday()` prevents duplicate notifications within the same day

**Standalone Worker (every 30 minutes)**:
1. Calls `processAllDueUsers()` (default `skipTimeCheck: false`)
2. For each user with `reminderEnabled: true`:
   - Check if current hour in user's timezone matches any `reminderTimes` hour
   - Check if a `NotificationLog` entry already exists for today (prevents duplicates)
   - If due and not already notified: check GitHub contributions and send email if needed

## File Structure

```
greenhub/
├── prisma/
│   └── schema.prisma              # Database schema
├── src/
│   ├── app/
│   │   ├── globals.css            # Tailwind imports
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx           # User dashboard
│   │   ├── settings/
│   │   │   └── page.tsx           # User settings
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts       # Auth.js route handler
│   │       ├── cron/notify/
│   │       │   └── route.ts       # Cron endpoint for batch notifications
│   │       └── settings/
│   │           └── route.ts       # PATCH endpoint for user settings
│   ├── components/
│   │   ├── providers.tsx          # SessionProvider wrapper
│   │   ├── navbar.tsx             # Navigation bar
│   │   ├── dashboard/
│   │   │   ├── contribution-status.tsx
│   │   │   └── notification-history.tsx
│   │   └── settings/
│   │       └── settings-form.tsx  # Client component for settings
│   ├── lib/
│   │   ├── auth.ts                # Auth.js configuration
│   │   ├── prisma.ts              # Prisma client singleton
│   │   └── services/
│   │       ├── github.service.ts  # GitHub GraphQL API
│   │       ├── email.service.ts   # Email via Resend
│   │       └── notification.service.ts  # Orchestration + batch processing
│   ├── types/
│   │   └── next-auth.d.ts         # Session type augmentation
│   ├── worker/
│   │   └── cron.ts                # Standalone node-cron worker
│   └── middleware.ts              # Auth middleware for protected routes
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vercel.json                    # Vercel cron configuration
├── package.json
└── README.md
```

## Environment Variables

| Variable | Required | Description | Example |
| ------------------- | -------- | ----------------------------------------- | ----------------------------------------- |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/greenhub` |
| `AUTH_SECRET` | Yes | Random secret for session signing | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App client ID | `Iv1.abc123...` |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App client secret | `abc123...` |
| `RESEND_API_KEY` | Yes | Resend API key | `re_abc123...` |
| `EMAIL_FROM` | Yes | Sender email address | `GreenHub <onboarding@resend.dev>` |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint auth | Any random string |
| `AUTH_TRUST_HOST` | Yes* | Set `true` when behind a proxy/CDN (Vercel, Cloudflare) | `true` |
| `NODE_ENV` | No | Environment mode | `production` or `development` |
| `TIMEZONE` | No | Default timezone for worker | `America/New_York` |

*Required for production deployments behind a reverse proxy.

## AI Agent Guidelines

### Code Style Conventions

- **File naming**: `*.service.ts` for services, `*.tsx` for components
- **Services**: Pure exported functions (not classes)
- **Components**: Named exports, function components
- **Imports**: `@/` alias for `src/` in app code; relative imports in `lib/services/` for worker compatibility
- **Server vs Client**: Default to server components; add `"use client"` only when needed (forms, state, effects)

### Error Handling Pattern

```typescript
try {
  const result = await someOperation()
  return { success: true, data: result }
} catch (error) {
  console.error("Context for the error:", error)
  return { success: false, error: "Human-readable message" }
}
```

### Anti-Patterns to Avoid

- **Don't**: Import from `@/` paths in `src/lib/services/` (breaks the standalone worker)
  **Do**: Use relative imports in service files

- **Don't**: Read `process.env` at module scope in services
  **Do**: Use lazy initialization (see `email.service.ts` pattern)

- **Don't**: Use class-based services
  **Do**: Export plain async functions

- **Don't**: Skip the `CRON_SECRET` check in the cron endpoint
  **Do**: Always verify the Bearer token; fail with 500 if `CRON_SECRET` is unset

- **Don't**: Accept arbitrary strings for timezone or reminderTimes in the settings API
  **Do**: Validate timezone against `VALID_TIMEZONES`, enforce `HH:MM` format, cap array length

## Common Tasks for AI Agents

### Adding a New Notification Channel

1. Create `src/lib/services/sms.service.ts` with an exported `sendSMS()` function
2. Call it from `checkAndNotifyUser()` in `notification.service.ts`
3. Add user preference fields to the Prisma schema (e.g., `phoneNumber`, `smsEnabled`)
4. Add UI controls in the settings form
5. Run `npx prisma migrate dev` to update the database

### Adding a New Settings Field

1. Add the field to the `User` model in `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Add the field to `PATCH /api/settings` in `src/app/api/settings/route.ts`
4. Add the UI control in `src/components/settings/settings-form.tsx`
5. Pass the initial value from the settings page (`src/app/settings/page.tsx`)

### Modifying the Cron Logic

The cron logic lives in `src/lib/services/notification.service.ts`:
- `processAllDueUsers(options?)` — entry point; `skipTimeCheck: true` bypasses hour-matching (used by Vercel cron)
- `isReminderDue()` — checks if current hour in user's timezone matches a reminder time (used by standalone worker)
- `hasNotificationToday()` — prevents duplicate notifications
- `checkAndNotifyUser()` — checks contributions and sends email

## Development Commands

```bash
npm run dev          # Development server with hot reload
npm run build        # Production build
npm start            # Start production server
npm run worker       # Start standalone cron worker
npm run db:push      # Push schema changes (no migration files)
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio GUI
npm run lint         # Run ESLint
```

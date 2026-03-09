# Standalone Worker

Alternative to Vercel Cron for VPS, Docker, or Railway deployments.

## How It Works

`cron.ts` is a persistent Node.js process that uses `node-cron` to trigger `processAllDueUsers()` every 30 minutes. Unlike the Vercel cron route (which uses `skipTimeCheck: true`), the worker calls `processAllDueUsers()` without options, so `isReminderDue()` enforces exact hour-matching against each user's configured reminder times.

## Vercel Cron vs Standalone Worker

| Aspect | Vercel Cron (Hobby) | Standalone Worker |
|--------|---------------------|-------------------|
| Frequency | Once daily (2 AM UTC) | Every 30 minutes |
| Time matching | Skipped (`skipTimeCheck: true`) | Exact hour match via `isReminderDue()` |
| Best for | Simple daily checks | Per-hour reminder precision |

## Running

```bash
npm run worker          # uses tsx to run TypeScript directly
```

Requires `DATABASE_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` in `.env` (loaded via `dotenv/config`).

## Important

- Uses **relative imports** (not `@/`) because it runs via `tsx`, not Next.js.
- Must have access to the same PostgreSQL database as the web app.
- Only one instance should run at a time (no built-in distributed locking).
- The web app and worker can run as separate processes on the same server.
- If using the worker, disable the Vercel cron to avoid duplicate notifications (remove or empty the `crons` array in `vercel.json`).

# Standalone Worker

Alternative to Vercel Cron for VPS, Docker, or Railway deployments.

## How It Works

`cron.ts` is a persistent Node.js process that uses `node-cron` to trigger `processAllDueUsers()` every 30 minutes. It runs the same logic as the `POST /api/cron/notify` endpoint.

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

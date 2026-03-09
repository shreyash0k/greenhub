# Services

Pure async functions that encapsulate business logic. No classes.

## Files

| Service | Exports | External Dependency |
|---------|---------|---------------------|
| `github.service.ts` | `getContributionCount()`, `hasContributionToday()` | GitHub GraphQL API |
| `email.service.ts` | `sendReminder()` | Resend API |
| `notification.service.ts` | `checkAndNotifyUser()`, `processAllDueUsers(options?)` | Prisma + both services above |

## Key Design Decisions

- **Token per call**: `github.service.ts` accepts `token` as a parameter (each user has their own OAuth token from GitHub sign-in).
- **Lazy initialization**: `email.service.ts` creates the Resend client on first use, not at import time. This avoids errors when `process.env` isn't set yet.
- **Relative imports only**: These files are imported by both Next.js app code AND the standalone worker (`src/worker/cron.ts`). Use `../prisma` not `@/lib/prisma`.
- **`skipTimeCheck` option**: `processAllDueUsers({ skipTimeCheck: true })` bypasses `isReminderDue()` hour-matching. The Vercel cron route uses this because the Hobby plan only allows one daily execution, so all enabled users must be checked in a single run. The standalone worker omits this flag to preserve per-hour matching.

## Adding a New Service

1. Create `src/lib/services/yourname.service.ts`
2. Export pure async functions (not a class)
3. Use relative imports for sibling files
4. Lazy-initialize any API clients
5. Wire it into `notification.service.ts` or call it from an API route

# Lib — Shared Logic

## Structure

| File | Purpose |
|------|---------|
| `auth.ts` | Auth.js v5 config (GitHub OAuth, Prisma adapter, session callback) |
| `prisma.ts` | Singleton PrismaClient (prevents hot-reload connection exhaustion) |
| `services/` | Business logic — GitHub API, email, notification orchestration |

## Import Rules

- **App code** (pages, components, API routes): use `@/lib/...`
- **Inside `services/`**: use **relative imports** (`../prisma`, `./github.service`) so the standalone worker (`src/worker/cron.ts`) can import them without Next.js path resolution.

## Auth (`auth.ts`)

Exports: `handlers`, `auth`, `signIn`, `signOut`

- `auth()` — call in server components / API routes to get the session
- `signIn("github")` — trigger GitHub OAuth flow
- `signOut()` — end session
- `handlers` — exported as `{ GET, POST }` in the catch-all auth route

The `signIn` event updates `User.githubUsername` from the GitHub profile on every login.

## Prisma (`prisma.ts`)

Singleton pattern — reuses the client across hot reloads in development. Import as:

```typescript
import { prisma } from "@/lib/prisma"       // from app code
import { prisma } from "../prisma"           // from services/
```

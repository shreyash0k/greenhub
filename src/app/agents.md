# App Router Pages & API Routes

## Conventions

- **Pages are server components by default** — fetch data directly with `auth()` and Prisma.
- Add `"use client"` only for interactive components (forms, state, event handlers).
- Protected pages (`/dashboard`, `/settings`) should call `auth()` and `redirect("/")` if no session.
- Use `@/` import alias for all imports in app code.

## Page Pattern

```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function SomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const data = await prisma.someModel.findMany(...)

  return <div>...</div>
}
```

## API Route Pattern

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // ...
}
```

## Route Map

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/` | GET | No | Landing page (redirects to `/dashboard` if signed in) |
| `/dashboard` | GET | Yes | Contribution status + notification history |
| `/settings` | GET | Yes | User preferences form |
| `/api/auth/*` | GET/POST | No | Auth.js OAuth handlers |
| `/api/settings` | PATCH | Yes | Update user settings (validates timezone, time format, array length) |
| `/api/cron/notify` | POST | CRON_SECRET | Batch notification processing (uses `skipTimeCheck: true`) |

## API Route Details

### `/api/cron/notify` (POST)

- Returns 500 if `CRON_SECRET` env var is missing (prevents bypass when unset)
- Calls `processAllDueUsers({ skipTimeCheck: true })` so all enabled users are checked regardless of their reminder hour (required for Vercel Hobby's once-daily cron)

### `/api/settings` (PATCH)

Validates all inputs before writing to the database:
- `timezone` must be in the `VALID_TIMEZONES` allowlist (18 common timezones)
- `reminderTimes` entries must match `HH:MM` format (`/^([01]\d|2[0-3]):[0-5]\d$/`)
- `reminderTimes` array is capped at 5 entries

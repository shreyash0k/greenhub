# Components

## Conventions

- **Server components by default** — only add `"use client"` when the component needs interactivity (state, effects, event handlers).
- Use **named exports** (not default exports).
- Use `@/` import alias.
- Colocate related components in subdirectories (`dashboard/`, `settings/`).

## Structure

| File | Type | Purpose |
|------|------|---------|
| `providers.tsx` | Client | Wraps app in `SessionProvider` for `useSession()` |
| `navbar.tsx` | Server | Navigation bar with auth-aware links and sign-out |
| `dashboard/contribution-status.tsx` | Server | Green/amber card showing today's contribution count |
| `dashboard/notification-history.tsx` | Server | Recent notification log table |
| `settings/settings-form.tsx` | Client | Interactive form for timezone, reminder times, toggle |

## Server vs Client Decision

Use **server component** when the component:
- Only renders props (no state, no event handlers)
- Needs to call `auth()` or `prisma` directly

Use **client component** (`"use client"`) when the component:
- Has `useState`, `useEffect`, or event handlers
- Uses browser APIs
- Needs `useSession()` from next-auth/react

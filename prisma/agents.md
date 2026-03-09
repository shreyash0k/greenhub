# Prisma Schema & Database

## Schema Location

Single schema file: `schema.prisma`

## Models

| Model | Owner | Purpose |
|-------|-------|---------|
| `User` | App | Profile, settings, GitHub username |
| `Account` | Auth.js | OAuth tokens (access_token for GitHub API) |
| `Session` | Auth.js | Active user sessions |
| `VerificationToken` | Auth.js | Email verification (unused currently) |
| `NotificationLog` | App | Tracks contribution checks and emails sent |

## Rules

- **Do not rename or remove** `Account`, `Session`, or `VerificationToken` — Auth.js Prisma adapter requires these exact models and field names.
- Custom app fields on `User` (like `githubUsername`, `timezone`, `reminderTimes`) are safe to modify.
- Always add `onDelete: Cascade` to relations pointing to `User`.
- Use `String[]` (Postgres array) for list fields like `reminderTimes`.

## Workflow

```bash
# During development (no migration files):
npx prisma db push

# For production (creates migration files):
npx prisma migrate dev --name describe_change

# Browse data:
npx prisma studio
```

After any schema change, Prisma Client is auto-regenerated. Restart the dev server to pick up changes.

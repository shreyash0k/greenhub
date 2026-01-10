# AI Agent Guide - Type Definitions

## Purpose

The types directory contains shared TypeScript type definitions and interfaces used across the application. These types ensure type safety, provide IDE autocomplete, and serve as documentation for data structures.

**Why This Exists**: Centralizing type definitions:
- Prevents type duplication across files
- Ensures consistent data structures
- Makes refactoring safer (compiler catches breaking changes)
- Provides single source of truth for interfaces

**Design Philosophy**: Types should be descriptive, accurate, and maintainable. Prefer interfaces for objects, types for unions/intersections.

---

## Files and Responsibilities

### index.ts (~30 lines)
**Exports**: Type definitions and interfaces

**Current Types**:
- `AppConfig` - Application configuration structure
- `ContributionData` - GitHub contribution data
- `EmailOptions` - Email sending parameters
- `NotificationResult` - Result of notification attempt

**Purpose**: Define shared types used by services, scheduler, and entry point.

---

## Type Definitions

### AppConfig

**Location**: `src/types/index.ts:1-14`

```typescript
export interface AppConfig {
  github: {
    token: string;
    username: string;
  };
  email: {
    user: string;
    password: string;
    to: string;
  };
  timezone: string;
  nodeEnv: string;
}
```

**Purpose**: Structure of the application configuration loaded from environment variables.

**Used By**: `src/index.ts` (main entry point)

**Example Usage**:
```typescript
const config: AppConfig = {
  github: {
    token: process.env.GITHUB_TOKEN!,
    username: process.env.GITHUB_USERNAME!
  },
  email: {
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_APP_PASSWORD!,
    to: process.env.EMAIL_TO!
  },
  timezone: process.env.TIMEZONE || 'America/New_York',
  nodeEnv: process.env.NODE_ENV || 'development'
};
```

---

### ContributionData

**Location**: `src/types/index.ts:16-19`

```typescript
export interface ContributionData {
  totalContributions: number;
  date: Date;
}
```

**Purpose**: Represent GitHub contribution information for a specific date.

**Used By**: Could be used by GitHubService for returning detailed contribution data (currently not used, but defined for future use).

**Example Usage**:
```typescript
const data: ContributionData = {
  totalContributions: 5,
  date: new Date('2024-01-09')
};
```

---

### EmailOptions

**Location**: `src/types/index.ts:21-25`

```typescript
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}
```

**Purpose**: Parameters for sending an email.

**Used By**: `src/services/email.service.ts` (EmailService)

**Example Usage**:
```typescript
const options: EmailOptions = {
  to: 'user@example.com',
  subject: '⏰ GitHub Contribution Reminder',
  html: '<h1>Don\'t forget to contribute!</h1>'
};
```

---

### NotificationResult

**Location**: `src/types/index.ts:27-31`

```typescript
export interface NotificationResult {
  sent: boolean;
  reason?: string;
  error?: Error;
}
```

**Purpose**: Result of a notification attempt, indicating success/failure and optional details.

**Used By**:
- `src/services/notification.service.ts` (return type of `checkAndNotify()`)
- `src/scheduler/cron.ts` (processes the result)

**Example Usage**:
```typescript
// Success case
const result: NotificationResult = {
  sent: true
};

// Skip case
const result: NotificationResult = {
  sent: false,
  reason: 'User has already contributed today'
};

// Error case
const result: NotificationResult = {
  sent: false,
  reason: 'Email service unavailable',
  error: new Error('SMTP connection failed')
};
```

---

## AI Agent Guidelines

### When to Add New Types

Add types when:
1. **Shared data structures**: Used by multiple files/services
2. **Complex objects**: More than 3 properties or nested structure
3. **API contracts**: Input/output of service methods
4. **Configuration**: Application settings or options

### When NOT to Add New Types

Don't add types for:
1. **Single-use objects**: Only used in one function
2. **Simple parameters**: Use inline types for 1-2 properties
3. **Library types**: Use types from @types/* packages

### Type vs Interface

**Use `interface`** for:
- Object shapes
- Classes and their contracts
- Types that might be extended

```typescript
// ✅ Good - use interface for objects
export interface UserSettings {
  email: string;
  timezone: string;
  enabled: boolean;
}

// Can be extended
export interface AdvancedUserSettings extends UserSettings {
  customTimes: string[];
  notifications: string[];
}
```

**Use `type`** for:
- Unions
- Intersections
- Mapped types
- Primitive aliases

```typescript
// ✅ Good - use type for unions
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

// Good - use type for intersections
export type UserWithSettings = User & { settings: UserSettings };

// Good - use type for mapped types
export type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

---

## How to Add New Types

### Example 1: Adding User Type (for Phase 2)

```typescript
// In src/types/index.ts

/**
 * User account information
 */
export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  email: string;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User reminder settings
 */
export interface ReminderSettings {
  userId: string;
  reminderTimes: string[];  // Array of "HH:MM" strings
  enabled: boolean;
  weekendsOnly: boolean;
  skipIfContributed: boolean;
}

/**
 * Notification record
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  sentAt?: Date;
  scheduledFor: Date;
  hadContribution: boolean;
  error?: string;
}

/**
 * Notification type enum
 */
export type NotificationType = 'REMINDER_8PM' | 'REMINDER_11PM' | 'CUSTOM';

/**
 * Notification status enum
 */
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
```

### Example 2: Adding Service Response Types

```typescript
// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// GitHub API response
export interface GitHubApiResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: ContributionWeek[];
      };
    };
  };
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionDay {
  contributionCount: number;
  date: string;
}
```

### Example 3: Adding Validation Types with Zod (Phase 2)

```typescript
import { z } from 'zod';

// Zod schema for runtime validation
export const UserSettingsSchema = z.object({
  email: z.string().email(),
  timezone: z.string().min(1),
  reminderTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  enabled: z.boolean(),
  weekendsOnly: z.boolean().optional().default(false)
});

// Infer TypeScript type from Zod schema
export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Use for validation
const settings = UserSettingsSchema.parse(input);  // Throws if invalid
```

---

## Best Practices

### 1. Document Types with JSDoc

```typescript
/**
 * Configuration for GitHub API integration
 */
export interface GitHubConfig {
  /**
   * GitHub personal access token (ghp_...)
   * @example "ghp_abc123def456"
   */
  token: string;

  /**
   * GitHub username to check contributions for
   * @example "octocat"
   */
  username: string;
}
```

### 2. Use Strict Types (No `any`)

```typescript
// ❌ Bad - loses type safety
export interface Response {
  data: any;
}

// ✅ Good - use unknown and type guards
export interface Response {
  data: unknown;
}

function processResponse(response: Response): void {
  if (typeof response.data === 'string') {
    console.log(response.data.toUpperCase());
  }
}

// ✅ Better - use generics
export interface Response<T> {
  data: T;
}
```

### 3. Make Optional Properties Explicit

```typescript
// ❌ Unclear which properties are required
export interface Settings {
  email: string;
  timezone: string | undefined;
}

// ✅ Clear - use optional operator
export interface Settings {
  email: string;
  timezone?: string;
}
```

### 4. Use Union Types for Enums

```typescript
// ✅ Good - type-safe and lightweight
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Also okay - runtime value, but more verbose
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}
```

### 5. Avoid Deep Nesting

```typescript
// ❌ Hard to read and maintain
export interface Config {
  services: {
    github: {
      api: {
        token: string;
        endpoint: {
          graphql: string;
        };
      };
    };
  };
}

// ✅ Better - split into multiple interfaces
export interface GitHubApiEndpoint {
  graphql: string;
}

export interface GitHubApiConfig {
  token: string;
  endpoint: GitHubApiEndpoint;
}

export interface ServiceConfig {
  github: GitHubApiConfig;
}
```

---

## Type Safety Patterns

### Pattern 1: Type Guards

```typescript
export interface EmailNotification {
  type: 'email';
  to: string;
  subject: string;
}

export interface SlackNotification {
  type: 'slack';
  channel: string;
  message: string;
}

export type Notification = EmailNotification | SlackNotification;

// Type guard function
export function isEmailNotification(n: Notification): n is EmailNotification {
  return n.type === 'email';
}

// Usage
function send(notification: Notification): void {
  if (isEmailNotification(notification)) {
    // TypeScript knows this is EmailNotification
    console.log(notification.to, notification.subject);
  } else {
    // TypeScript knows this is SlackNotification
    console.log(notification.channel, notification.message);
  }
}
```

### Pattern 2: Readonly Types

```typescript
export interface MutableConfig {
  apiKey: string;
  endpoint: string;
}

// Create readonly version
export type ReadonlyConfig = Readonly<MutableConfig>;

// Or mark properties individually
export interface ImmutableConfig {
  readonly apiKey: string;
  readonly endpoint: string;
}

// Deep readonly
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
```

### Pattern 3: Utility Types

```typescript
export interface User {
  id: string;
  email: string;
  password: string;
  timezone: string;
}

// Pick only certain properties
export type PublicUser = Pick<User, 'id' | 'email' | 'timezone'>;

// Omit sensitive properties
export type SafeUser = Omit<User, 'password'>;

// Make all properties optional
export type PartialUser = Partial<User>;

// Make all properties required
export type RequiredUser = Required<Partial<User>>;
```

### Pattern 4: Discriminated Unions

```typescript
export interface SuccessResult {
  success: true;
  data: string;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type Result = SuccessResult | ErrorResult;

// TypeScript can narrow based on discriminant
function handleResult(result: Result): void {
  if (result.success) {
    // TypeScript knows this is SuccessResult
    console.log(result.data);
  } else {
    // TypeScript knows this is ErrorResult
    console.log(result.error);
  }
}
```

---

## Common Type Patterns

### API Request/Response

```typescript
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

### Pagination

```typescript
export interface PaginatedRequest {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### Error Types

```typescript
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export type ErrorCode =
  | 'GITHUB_API_ERROR'
  | 'EMAIL_SEND_FAILED'
  | 'INVALID_CONFIG'
  | 'NETWORK_ERROR';
```

---

## Testing Types

### Type-Only Tests

```typescript
// test-types.ts (not executed, only type-checked)
import type { NotificationResult } from './types';

// These should compile without errors
const validResult1: NotificationResult = { sent: true };
const validResult2: NotificationResult = { sent: false, reason: 'test' };
const validResult3: NotificationResult = {
  sent: false,
  reason: 'error',
  error: new Error('test')
};

// @ts-expect-error - missing required property
const invalid1: NotificationResult = {};

// @ts-expect-error - wrong type
const invalid2: NotificationResult = { sent: 'yes' };
```

### Runtime Type Validation

```typescript
import { z } from 'zod';

export const NotificationResultSchema = z.object({
  sent: z.boolean(),
  reason: z.string().optional(),
  error: z.instanceof(Error).optional()
});

export type NotificationResult = z.infer<typeof NotificationResultSchema>;

// Validate at runtime
function validateResult(data: unknown): NotificationResult {
  return NotificationResultSchema.parse(data);
}
```

---

## Migration Path (Phase 2)

When adding database (Prisma), you'll have two sources of types:

### Approach 1: Use Prisma Types Directly

```typescript
// Generated by Prisma
import type { User, ReminderSettings } from '@prisma/client';

// Extend Prisma types if needed
export type UserWithSettings = User & {
  reminderSettings: ReminderSettings | null;
};
```

### Approach 2: Define Your Own Types

```typescript
// src/types/index.ts - your types
export interface User {
  id: string;
  email: string;
  // ...
}

// Ensure Prisma schema matches your types
// Use Zod or other validators to enforce consistency
```

### Recommended: Hybrid Approach

```typescript
// Use Prisma types for database operations
import type { User as PrismaUser } from '@prisma/client';

// Define DTOs (Data Transfer Objects) for API
export interface UserDto {
  id: string;
  email: string;
  timezone: string;
}

// Convert between them
export function toUserDto(user: PrismaUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone
  };
}
```

---

## Dependencies

### Current Dependencies
- TypeScript compiler (for type checking)

### Future Dependencies (Phase 2)
- `@prisma/client` - Generated database types
- `zod` - Runtime validation schemas
- `@types/*` - Type definitions for external libraries

---

## Related Documentation

- [Parent Directory Guide](../agents.md) - Overall source structure
- [Services Guide](../services/agents.md) - Services that use these types
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Official TypeScript documentation

---

## Quick Reference

**Add interface**: `export interface Name { property: type; }`
**Add type alias**: `export type Name = string | number;`
**Make optional**: Use `property?: type`
**Make readonly**: Use `readonly property: type`
**Union type**: `type Status = 'active' | 'inactive';`
**Generic type**: `interface Response<T> { data: T; }`
**Extend interface**: `interface B extends A { newProp: string; }`
**Pick properties**: `type Subset = Pick<Original, 'prop1' | 'prop2'>;`
**Omit properties**: `type Without = Omit<Original, 'prop1'>;`
**Type guard**: `function isType(x: any): x is Type { return ...; }`

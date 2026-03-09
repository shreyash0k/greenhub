import { prisma } from "../prisma"
import { hasContributionToday } from "./github.service"
import { sendReminder } from "./email.service"
import { fromZonedTime, formatInTimeZone } from "date-fns-tz"

interface UserForNotification {
  id: string
  email: string | null
  githubUsername: string | null
  timezone: string
  accounts: { access_token: string | null; provider: string }[]
}

export async function checkAndNotifyUser(
  user: UserForNotification
): Promise<{ sent: boolean; reason?: string }> {
  const githubAccount = user.accounts.find((a) => a.provider === "github")

  if (!githubAccount?.access_token || !user.githubUsername || !user.email) {
    return { sent: false, reason: "Missing GitHub token, username, or email" }
  }

  try {
    const contributed = await hasContributionToday(
      githubAccount.access_token,
      user.githubUsername,
      user.timezone
    )

    const dateKey = formatInTimeZone(new Date(), user.timezone, "yyyy-MM-dd")

    if (contributed) {
      await createNotificationLog({
        userId: user.id,
        dateKey,
        hadContribution: true,
        emailSent: false,
      })
      return { sent: false, reason: "Already contributed today" }
    }

    const emailSent = await sendReminder(user.email, user.githubUsername)

    if (emailSent) {
      await createNotificationLog({
        userId: user.id,
        dateKey,
        hadContribution: false,
        emailSent: true,
      })
    }
    // When email fails, no log is created so the user will be retried on the next cron run

    return {
      sent: emailSent,
      reason: emailSent ? undefined : "Email send failed (will retry)",
    }
  } catch (error) {
    console.error(
      `Error checking contributions for ${user.githubUsername}:`,
      error
    )
    return { sent: false, reason: "Exception during check" }
  }
}

async function createNotificationLog(data: {
  userId: string
  dateKey: string
  hadContribution: boolean
  emailSent: boolean
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: data.userId,
        date: new Date(),
        dateKey: data.dateKey,
        hadContribution: data.hadContribution,
        emailSent: data.emailSent,
      },
    })
  } catch (error: unknown) {
    const isPrismaUniqueViolation =
      error != null &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"

    if (isPrismaUniqueViolation) {
      console.log(
        `Duplicate notification log skipped for user ${data.userId} on ${data.dateKey}`
      )
      return
    }
    throw error
  }
}

export async function processAllDueUsers(options?: {
  skipTimeCheck?: boolean
}): Promise<{
  processed: number
  notified: number
}> {
  const users = await prisma.user.findMany({
    where: { reminderEnabled: true },
    include: {
      accounts: {
        where: { provider: "github" },
        select: { access_token: true, provider: true },
      },
    },
  })

  let processed = 0
  let notified = 0

  for (const user of users) {
    if (!options?.skipTimeCheck && !isReminderDue(user.timezone, user.reminderTimes))
      continue

    const alreadySent = await hasNotificationToday(user.id, user.timezone)
    if (alreadySent) continue

    const result = await checkAndNotifyUser(user)
    processed++
    if (result.sent) notified++
  }

  return { processed, notified }
}

function isReminderDue(timezone: string, reminderTimes: string[]): boolean {
  const currentHour = parseInt(
    formatInTimeZone(new Date(), timezone, "HH"),
    10
  )

  return reminderTimes.some((time) => {
    const [hourStr] = time.split(":")
    return currentHour === Number(hourStr)
  })
}

async function hasNotificationToday(
  userId: string,
  timezone: string
): Promise<boolean> {
  const now = new Date()
  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd")
  const [y, m, d] = todayStr.split("-").map(Number)
  const todayStartUtc = fromZonedTime(
    new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
    timezone
  )

  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId,
      createdAt: { gte: todayStartUtc },
    },
  })

  return !!existing
}

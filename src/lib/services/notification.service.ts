import { prisma } from "../prisma"
import { hasContributionToday } from "./github.service"
import { sendReminder } from "./email.service"
import { toZonedTime } from "date-fns-tz"
import { startOfDay } from "date-fns"

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

    if (contributed) {
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          date: new Date(),
          hadContribution: true,
          emailSent: false,
        },
      })
      return { sent: false, reason: "Already contributed today" }
    }

    const emailSent = await sendReminder(user.email, user.githubUsername)

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        date: new Date(),
        hadContribution: false,
        emailSent,
      },
    })

    return {
      sent: emailSent,
      reason: emailSent ? undefined : "Email send failed",
    }
  } catch (error) {
    console.error(
      `Error checking contributions for ${user.githubUsername}:`,
      error
    )
    return { sent: false, reason: "Exception during check" }
  }
}

export async function processAllDueUsers(): Promise<{
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
    if (!isReminderDue(user.timezone, user.reminderTimes)) continue

    const alreadySent = await hasNotificationToday(user.id, user.timezone)
    if (alreadySent) continue

    const result = await checkAndNotifyUser(user)
    processed++
    if (result.sent) notified++
  }

  return { processed, notified }
}

function isReminderDue(timezone: string, reminderTimes: string[]): boolean {
  const now = new Date()
  const zonedNow = toZonedTime(now, timezone)
  const currentHour = zonedNow.getHours()

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
  const zonedNow = toZonedTime(now, timezone)
  const todayStart = startOfDay(zonedNow)

  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
  })

  return !!existing
}

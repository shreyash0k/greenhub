import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const VALID_TIMEZONES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Sao_Paulo",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
])

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_REMINDER_TIMES = 5

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { timezone, reminderEnabled, reminderTimes } = body

  const data: Record<string, unknown> = {}

  if (typeof timezone === "string") {
    if (!VALID_TIMEZONES.has(timezone)) {
      return NextResponse.json(
        { error: "Invalid timezone" },
        { status: 400 }
      )
    }
    data.timezone = timezone
  }

  if (typeof reminderEnabled === "boolean")
    data.reminderEnabled = reminderEnabled

  if (Array.isArray(reminderTimes)) {
    if (reminderTimes.length === 0) {
      return NextResponse.json(
        { error: "At least one reminder time is required" },
        { status: 400 }
      )
    }
    if (reminderTimes.length > MAX_REMINDER_TIMES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_REMINDER_TIMES} reminder times allowed` },
        { status: 400 }
      )
    }
    if (!reminderTimes.every((t: unknown) => typeof t === "string" && TIME_PATTERN.test(t))) {
      return NextResponse.json(
        { error: "Invalid reminder time format, expected HH:MM" },
        { status: 400 }
      )
    }
    const uniqueTimes = [...new Set(reminderTimes)]
    data.reminderTimes = uniqueTimes
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  return NextResponse.json({
    timezone: user.timezone,
    reminderEnabled: user.reminderEnabled,
    reminderTimes: user.reminderTimes,
  })
}

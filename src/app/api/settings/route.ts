import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { timezone, reminderEnabled, reminderTimes } = body

  const data: Record<string, unknown> = {}
  if (typeof timezone === "string") data.timezone = timezone
  if (typeof reminderEnabled === "boolean")
    data.reminderEnabled = reminderEnabled
  if (Array.isArray(reminderTimes)) data.reminderTimes = reminderTimes

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

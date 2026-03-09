import { NextResponse } from "next/server"
import { processAllDueUsers } from "@/lib/services/notification.service"

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processAllDueUsers({ skipTimeCheck: true })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Cron notify error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

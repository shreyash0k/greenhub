import { NextResponse } from "next/server"
import { processAllDueUsers } from "@/lib/services/notification.service"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processAllDueUsers()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Cron notify error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

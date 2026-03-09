import { type NextRequest, NextResponse } from "next/server"
import { processAllDueUsers } from "@/lib/services/notification.service"

async function handleCronNotify(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const skipTimeCheck =
    request.nextUrl.searchParams.get("skipTimeCheck") !== "false"

  try {
    const result = await processAllDueUsers({ skipTimeCheck })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Cron notify error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export { handleCronNotify as GET, handleCronNotify as POST }

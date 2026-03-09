import "dotenv/config"
import cron from "node-cron"
import { processAllDueUsers } from "../lib/services/notification.service"

const timezone = process.env.TIMEZONE || "UTC"

console.log(`[GreenHub Worker] Starting with timezone: ${timezone}`)
console.log("[GreenHub Worker] Cron schedule: every 30 minutes")

cron.schedule(
  "*/30 * * * *",
  async () => {
    const start = Date.now()
    console.log(
      `[GreenHub Worker] Running notification check at ${new Date().toISOString()}`
    )

    try {
      const result = await processAllDueUsers()
      const elapsed = Date.now() - start
      console.log(
        `[GreenHub Worker] Done in ${elapsed}ms - Processed: ${result.processed}, Notified: ${result.notified}`
      )
    } catch (error) {
      console.error("[GreenHub Worker] Error during notification check:", error)
    }
  },
  { timezone }
)

process.on("SIGINT", () => {
  console.log("[GreenHub Worker] Shutting down...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("[GreenHub Worker] Shutting down...")
  process.exit(0)
})

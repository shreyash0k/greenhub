import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/components/settings/settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) redirect("/")

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Settings</h1>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <SettingsForm
          initialTimezone={user.timezone}
          initialReminderEnabled={user.reminderEnabled}
          initialReminderTimes={user.reminderTimes}
        />
      </div>
    </div>
  )
}

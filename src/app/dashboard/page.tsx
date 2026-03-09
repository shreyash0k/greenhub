import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getContributionCount } from "@/lib/services/github.service"
import { ContributionStatus } from "@/components/dashboard/contribution-status"
import { NotificationHistory } from "@/components/dashboard/notification-history"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: {
        where: { provider: "github" },
        select: { access_token: true },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!user) redirect("/")

  const githubToken = user.accounts[0]?.access_token
  let contributionCount = 0
  let fetchError = false

  if (githubToken && user.githubUsername) {
    try {
      contributionCount = await getContributionCount(
        githubToken,
        user.githubUsername,
        user.timezone
      )
    } catch {
      fetchError = true
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700">
            Unable to fetch contribution data from GitHub. Please try again
            later.
          </p>
        </div>
      ) : (
        <ContributionStatus
          hasContributed={contributionCount > 0}
          contributionCount={contributionCount}
          username={user.githubUsername || ""}
        />
      )}

      <NotificationHistory notifications={user.notifications} />
    </div>
  )
}

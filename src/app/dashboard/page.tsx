import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getContributionCount } from "@/lib/services/github.service"
import { ContributionStatus } from "@/components/dashboard/contribution-status"
import { NotificationHistory } from "@/components/dashboard/notification-history"

async function refreshGithubUsername(
  userId: string,
  token: string,
  currentUsername: string | null
): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) return currentUsername
    const data = await res.json()
    const login = data.login as string | undefined
    if (login && login !== currentUsername) {
      await prisma.user.update({
        where: { id: userId },
        data: { githubUsername: login },
      })
      return login
    }
    return currentUsername
  } catch {
    return currentUsername
  }
}

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
  let errorType: "none" | "token_invalid" | "api_error" = "none"
  let username = user.githubUsername

  if (githubToken && username) {
    username = await refreshGithubUsername(session.user.id, githubToken, username)
    try {
      contributionCount = await getContributionCount(
        githubToken,
        username!,
        user.timezone
      )
    } catch (error: unknown) {
      const isAuthError =
        error != null &&
        typeof error === "object" &&
        "status" in error &&
        ((error as { status: number }).status === 401 ||
          (error as { status: number }).status === 403)
      errorType = isAuthError ? "token_invalid" : "api_error"
    }
  } else if (!githubToken) {
    errorType = "token_invalid"
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {errorType === "token_invalid" ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 font-medium mb-1">
            GitHub connection issue
          </p>
          <p className="text-red-600 text-sm">
            Your GitHub access token appears to be invalid or revoked. Please
            sign out and sign back in to reconnect your GitHub account.
          </p>
        </div>
      ) : errorType === "api_error" ? (
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
          username={username || ""}
        />
      )}

      <NotificationHistory notifications={user.notifications} />
    </div>
  )
}

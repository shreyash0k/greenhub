import { graphql } from "@octokit/graphql"
import { startOfDay, endOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"

interface ContributionsResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number
      }
    }
  }
}

export async function getContributionCount(
  token: string,
  username: string,
  timezone: string = "America/New_York"
): Promise<number> {
  const graphqlWithAuth = graphql.defaults({
    headers: { authorization: `token ${token}` },
  })

  const now = new Date()
  const zonedDate = toZonedTime(now, timezone)
  const dayStart = startOfDay(zonedDate)
  const dayEnd = endOfDay(zonedDate)

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `

  const response = await graphqlWithAuth<ContributionsResponse>(query, {
    username,
    from: dayStart.toISOString(),
    to: dayEnd.toISOString(),
  })

  return response.user.contributionsCollection.contributionCalendar.totalContributions
}

export async function hasContributionToday(
  token: string,
  username: string,
  timezone: string = "America/New_York"
): Promise<boolean> {
  const count = await getContributionCount(token, username, timezone)
  return count > 0
}

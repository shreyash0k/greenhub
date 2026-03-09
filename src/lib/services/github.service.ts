import { graphql } from "@octokit/graphql"
import { fromZonedTime, formatInTimeZone } from "date-fns-tz"

interface ContributionsResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number
      }
    }
  }
}

function getDayBoundsUtc(timezone: string): { start: Date; end: Date } {
  const now = new Date()
  const todayStr = formatInTimeZone(now, timezone, "yyyy-MM-dd")
  const [y, m, d] = todayStr.split("-").map(Number)

  const start = fromZonedTime(
    new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
    timezone
  )
  const end = fromZonedTime(
    new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)),
    timezone
  )
  return { start, end }
}

export async function getContributionCount(
  token: string,
  username: string,
  timezone: string = "America/New_York"
): Promise<number> {
  const graphqlWithAuth = graphql.defaults({
    headers: { authorization: `token ${token}` },
  })

  const { start, end } = getDayBoundsUtc(timezone)

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
    from: start.toISOString(),
    to: end.toISOString(),
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

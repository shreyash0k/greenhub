import { graphql } from '@octokit/graphql';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { logger } from '../utils/logger.js';

interface ContributionsResponse {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
      };
    };
  };
}

export class GitHubService {
  private graphqlClient: typeof graphql;

  constructor(token: string) {
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
  }

  /**
   * Check if a user has made any contributions today
   * @param username GitHub username
   * @param timezone Timezone for determining "today" (default: America/New_York)
   * @returns Promise<boolean> true if user has made contributions today
   */
  async hasContributionToday(username: string, timezone: string = 'America/New_York'): Promise<boolean> {
    try {
      const count = await this.getContributionCount(username, timezone);
      logger.info('Checked GitHub contributions', { username, count, hasContributions: count > 0 });
      return count > 0;
    } catch (error) {
      logger.error('Error checking GitHub contributions', { username, error });
      throw error;
    }
  }

  /**
   * Get the number of contributions for today
   * @param username GitHub username
   * @param timezone Timezone for determining "today"
   * @returns Promise<number> number of contributions today
   */
  async getContributionCount(username: string, timezone: string = 'America/New_York'): Promise<number> {
    try {
      // Get today's date range in the user's timezone
      const now = new Date();
      const zonedDate = toZonedTime(now, timezone);
      const dayStart = startOfDay(zonedDate);
      const dayEnd = endOfDay(zonedDate);

      logger.debug('Querying GitHub API for contributions', {
        username,
        timezone,
        from: dayStart.toISOString(),
        to: dayEnd.toISOString()
      });

      // Query GitHub GraphQL API
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
      `;

      const response = await this.graphqlClient<ContributionsResponse>(query, {
        username,
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
      });

      const totalContributions = response.user.contributionsCollection.contributionCalendar.totalContributions;

      return totalContributions;
    } catch (error) {
      logger.error('Failed to fetch contribution count from GitHub API', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

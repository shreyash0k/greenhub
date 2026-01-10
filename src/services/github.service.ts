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
  private cache: Map<string, { contributions: number; timestamp: number }>;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

  constructor(token: string) {
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });
    this.cache = new Map();
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
    // Check cache first
    const cacheKey = `${username}-${timezone}-${new Date().toDateString()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug('Using cached contribution count', { username, count: cached.contributions });
      return cached.contributions;
    }

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

      // Cache the result
      this.cache.set(cacheKey, {
        contributions: totalContributions,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();

      return totalContributions;
    } catch (error) {
      logger.error('Failed to fetch contribution count from GitHub API', {
        username,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Clear old cache entries to prevent memory leaks
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

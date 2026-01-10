export interface AppConfig {
  github: {
    token: string;
    username: string;
  };
  email: {
    user: string;
    password: string;
    to: string;
  };
  timezone: string;
  nodeEnv: string;
}

export interface ContributionData {
  totalContributions: number;
  date: Date;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface NotificationResult {
  sent: boolean;
  reason?: string;
  error?: Error;
}

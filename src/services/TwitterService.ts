import { TwitterApi } from 'twitter-api-v2';
import OAuth from 'oauth';
import { RateLimiter } from './RateLimiter';

interface TwitterAuthTokens {
  access_token: string;
  access_token_secret: string;
}

export interface TwitterUserProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  verified?: boolean;
  description?: string;
}

interface CachedProfile {
  profile: TwitterUserProfile;
  timestamp: number;
}

export class TwitterService {
  private oauth: OAuth.OAuth;
  private requestTokens: Map<string, { token: string; secret: string }> = new Map();
  private rateLimiter: RateLimiter;
  private profileCache: Map<string, CachedProfile> = new Map();
  private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.oauth = new OAuth.OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      process.env.X_API_KEY!,
      process.env.X_API_SECRET!,
      '1.0A',
      process.env.X_CALLBACK_URL!,
      'HMAC-SHA1'
    );
    
    // Conservative rate limiting for free plan
    this.rateLimiter = new RateLimiter(15 * 60 * 1000, 50); // 50 requests per 15 minutes
  }

  async getRequestToken(): Promise<{ authUrl: string; requestToken: string }> {
    return new Promise((resolve, reject) => {
      this.oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
        if (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          reject(new Error(`Failed to get request token: ${errorMessage}`));
          return;
        }

        const requestToken = oauthToken;
        this.requestTokens.set(requestToken, {
          token: oauthToken,
          secret: oauthTokenSecret
        });

        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
        resolve({ authUrl, requestToken });
      });
    });
  }

  async getAccessToken(requestToken: string, oauthVerifier: string): Promise<TwitterAuthTokens> {
    return new Promise((resolve, reject) => {
      const tokenData = this.requestTokens.get(requestToken);
      if (!tokenData) {
        reject(new Error('Invalid request token'));
        return;
      }

      this.oauth.getOAuthAccessToken(
        tokenData.token,
        tokenData.secret,
        oauthVerifier,
        (error, oauthAccessToken, oauthAccessTokenSecret) => {
          if (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            reject(new Error(`Failed to get access token: ${errorMessage}`));
            return;
          }

          this.requestTokens.delete(requestToken);
          resolve({
            access_token: oauthAccessToken,
            access_token_secret: oauthAccessTokenSecret
          });
        }
      );
    });
  }

  async getUserProfile(accessToken: string, accessTokenSecret: string, forceRefresh: boolean = false): Promise<TwitterUserProfile> {
    const cacheKey = `${accessToken}_profile`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.profileCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        console.log('Returning cached profile data');
        return cached.profile;
      }
    }

    // Check rate limit
    if (!this.rateLimiter.canMakeRequest('user_profile')) {
      const resetTime = new Date(this.rateLimiter.getResetTime('user_profile'));
      throw new Error(`Rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}`);
    }

    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    try {
      console.log('Fetching fresh profile data from X API');
      const user = await client.v2.me({
        'user.fields': ['public_metrics', 'profile_image_url', 'verified', 'description']
      });

      const metrics = user.data.public_metrics || {};
      const profile: TwitterUserProfile = {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        profile_image_url: user.data.profile_image_url,
        public_metrics: {
          followers_count: metrics.followers_count || 0,
          following_count: metrics.following_count || 0,
          tweet_count: metrics.tweet_count || 0,
          listed_count: metrics.listed_count || 0
        },
        verified: user.data.verified,
        description: user.data.description
      };

      // Cache the result
      this.profileCache.set(cacheKey, {
        profile,
        timestamp: Date.now()
      });

      return profile;
    } catch (error: any) {
      // Check if it's a rate limit error from X
      if (error.code === 429 || (error.data && error.data.status === 429)) {
        throw new Error('X API rate limit exceeded. Please wait 15 minutes before trying again.');
      }
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  async getUserTweets(accessToken: string, accessTokenSecret: string, userId: string, maxResults: number = 10) {
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessToken,
      accessSecret: accessTokenSecret,
    });

    try {
      const tweets = await client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'context_annotations'],
        exclude: ['retweets', 'replies']
      });

      return tweets.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch user tweets: ${error.message}`);
    }
  }

  // Get rate limit information for debugging/UI display
  getRateLimitStatus(): {
    remainingRequests: number;
    resetTime: number;
    canMakeRequest: boolean;
  } {
    const remaining = this.rateLimiter.getRemainingRequests('user_profile');
    const resetTime = this.rateLimiter.getResetTime('user_profile');
    const canMakeRequest = this.rateLimiter.canMakeRequest('user_profile_check'); // Check without consuming

    return {
      remainingRequests: remaining,
      resetTime,
      canMakeRequest: remaining > 0
    };
  }

  // Clear cache for a specific user (useful for testing)
  clearCache(accessToken?: string): void {
    if (accessToken) {
      const cacheKey = `${accessToken}_profile`;
      this.profileCache.delete(cacheKey);
    } else {
      this.profileCache.clear();
    }
  }
}

export const twitterService = new TwitterService();
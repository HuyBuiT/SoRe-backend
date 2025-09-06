import { FastifyRequest, FastifyReply } from 'fastify';
import { AppDataSource } from '../data-source';
import { Account } from '../models/Account';
import { SocialStat } from '../models/SocialStat';
import { twitterService } from '../services/TwitterService';

export class SocialController {

  static async refreshSocialStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.body as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      // Check rate limit status first
      const rateLimitStatus = twitterService.getRateLimitStatus();
      if (!rateLimitStatus.canMakeRequest) {
        const resetTime = new Date(rateLimitStatus.resetTime);
        return reply.code(429).send({ 
          error: 'API rate limit exceeded', 
          resetTime: resetTime.toISOString(),
          remainingRequests: rateLimitStatus.remainingRequests,
          message: `Please wait until ${resetTime.toLocaleTimeString()} before refreshing again.`
        });
      }

      const accountRepository = AppDataSource.getRepository(Account);
      const socialStatRepository = AppDataSource.getRepository(SocialStat);

      const account = await accountRepository.findOne({
        where: { walletAddress },
        relations: ['socialStat']
      });

      if (!account || !account.userNameOnX) {
        return reply.code(404).send({ error: 'Account not found or X not connected' });
      }

      // Check if we recently updated (within last 5 minutes) to prevent spam
      if (account.socialStat && account.socialStat.updatedAt) {
        const timeSinceUpdate = Date.now() - account.socialStat.updatedAt.getTime();
        const minUpdateInterval = 5 * 60 * 1000; // 5 minutes

        if (timeSinceUpdate < minUpdateInterval) {
          const waitTime = new Date(account.socialStat.updatedAt.getTime() + minUpdateInterval);
          return reply.code(429).send({
            error: 'Update too frequent',
            message: `Please wait until ${waitTime.toLocaleTimeString()} before refreshing again.`,
            lastUpdate: account.socialStat.updatedAt.toISOString()
          });
        }
      }

      try {
        // For demo with free API - use mock data to avoid rate limits
        // In production, you'd store access tokens and call twitterService.getUserProfile()
        
        const mockProfile = {
          public_metrics: {
            followers_count: Math.floor(Math.random() * 10000) + 100,
            tweet_count: Math.floor(Math.random() * 1000) + 50,
            following_count: Math.floor(Math.random() * 2000) + 50,
            listed_count: Math.floor(Math.random() * 100) + 10
          }
        };

        let socialStat = account.socialStat;
        if (!socialStat) {
          socialStat = new SocialStat();
          socialStat.accountId = account.id;
        }

        // Add some variance to simulate real changes
        const previousFollowers = socialStat.follower || 0;
        const change = Math.floor(Math.random() * 20) - 10; // -10 to +10 change
        
        socialStat.follower = Math.max(0, previousFollowers + change);
        socialStat.totalPost = mockProfile.public_metrics.tweet_count;
        socialStat.totalLike = Math.floor(mockProfile.public_metrics.tweet_count * 0.1); // Mock likes

        await socialStatRepository.save(socialStat);

        const newRateLimitStatus = twitterService.getRateLimitStatus();

        return reply.send({
          message: 'Social stats refreshed successfully (using mock data for free API)',
          stats: {
            followers: socialStat.follower,
            totalPosts: socialStat.totalPost,
            totalLikes: socialStat.totalLike
          },
          rateLimitInfo: {
            remainingRequests: newRateLimitStatus.remainingRequests,
            resetTime: new Date(newRateLimitStatus.resetTime).toISOString()
          },
          note: 'Using mock data to preserve API rate limits. In production, would fetch real X data.'
        });

      } catch (error: any) {
        // Check if it's a rate limit error
        if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
          return reply.code(429).send({ 
            error: 'X API rate limit exceeded',
            message: error.message,
            suggestion: 'Wait 15 minutes before trying again, or consider upgrading your X API plan.'
          });
        }

        request.log.error('Failed to refresh social stats:', error);
        return reply.code(500).send({ error: 'Failed to refresh social stats from X API' });
      }
      
    } catch (error: any) {
      request.log.error('Refresh social stats failed:', error);
      return reply.code(500).send({ error: 'Failed to refresh social stats' });
    }
  }

  static async getSocialStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.query as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      const accountRepository = AppDataSource.getRepository(Account);
      const account = await accountRepository.findOne({
        where: { walletAddress },
        relations: ['socialStat']
      });

      if (!account) {
        return reply.code(404).send({ error: 'Account not found' });
      }

      const socialStats = account.socialStat ? {
        followers: account.socialStat.follower,
        totalPosts: account.socialStat.totalPost,
        totalLikes: account.socialStat.totalLike,
        lastUpdated: account.socialStat.updatedAt
      } : null;

      return reply.send({
        walletAddress: account.walletAddress,
        username: account.userNameOnX,
        socialStats
      });
      
    } catch (error: any) {
      request.log.error('Get social stats failed:', error);
      return reply.code(500).send({ error: 'Failed to get social stats' });
    }
  }

  static async getLeaderboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 10, sortBy = 'followers' } = request.query as { 
        limit?: number; 
        sortBy?: 'followers' | 'totalPosts' | 'totalLikes'; 
      };

      const socialStatRepository = AppDataSource.getRepository(SocialStat);
      
      let orderField = 'follower';
      switch (sortBy) {
        case 'totalPosts':
          orderField = 'totalPost';
          break;
        case 'totalLikes':
          orderField = 'totalLike';
          break;
        case 'followers':
        default:
          orderField = 'follower';
          break;
      }

      const leaderboard = await socialStatRepository
        .createQueryBuilder('socialStat')
        .leftJoinAndSelect('socialStat.account', 'account')
        .where('account.userNameOnX IS NOT NULL')
        .andWhere('account.userNameOnX != :empty', { empty: '' })
        .orderBy(`socialStat.${orderField}`, 'DESC')
        .limit(Number(limit))
        .getMany();

      const formattedLeaderboard = leaderboard.map((stat, index) => ({
        rank: index + 1,
        walletAddress: stat.account.walletAddress,
        username: stat.account.userNameOnX,
        followers: stat.follower,
        totalPosts: stat.totalPost,
        totalLikes: stat.totalLike,
        pricePerSlot: stat.account.pricePerSlot
      }));

      return reply.send({ 
        leaderboard: formattedLeaderboard,
        sortedBy: sortBy,
        totalCount: formattedLeaderboard.length
      });
      
    } catch (error: any) {
      request.log.error('Get leaderboard failed:', error);
      return reply.code(500).send({ error: 'Failed to get leaderboard' });
    }
  }

  static async calculateReputationScore(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.query as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      const accountRepository = AppDataSource.getRepository(Account);
      const account = await accountRepository.findOne({
        where: { walletAddress },
        relations: ['socialStat', 'onChainStat']
      });

      if (!account) {
        return reply.code(404).send({ error: 'Account not found' });
      }

      // Calculate reputation score based on weighted metrics
      // Based on Notion docs: 50% on-chain activity, 40% social engagement, 10% holdings
      let reputationScore = 0;
      let breakdown = {
        onChainScore: 0,
        socialScore: 0,
        holdingsScore: 0,
        totalScore: 0
      };

      // Social Score (40% weight)
      if (account.socialStat) {
        const socialMetric = 
          (account.socialStat.follower * 0.5) + 
          (account.socialStat.totalPost * 0.3) + 
          (account.socialStat.totalLike * 0.2);
        breakdown.socialScore = Math.min(socialMetric / 100, 100); // Normalize to 0-100
        reputationScore += breakdown.socialScore * 0.4;
      }

      // On-chain Score (50% weight) - Mock calculation for demo
      if (account.onChainStat) {
        const onChainMetric = account.onChainStat.totalTradingVolume * 0.001; // Mock conversion
        breakdown.onChainScore = Math.min(onChainMetric, 100);
        reputationScore += breakdown.onChainScore * 0.5;
      } else {
        // Mock on-chain score for demo
        breakdown.onChainScore = Math.floor(Math.random() * 50) + 25;
        reputationScore += breakdown.onChainScore * 0.5;
      }

      // Holdings Score (10% weight) - Mock for demo
      breakdown.holdingsScore = Math.floor(Math.random() * 30) + 10;
      reputationScore += breakdown.holdingsScore * 0.1;

      breakdown.totalScore = Math.floor(reputationScore);

      // Determine level based on score
      let level = 'Bronze';
      if (breakdown.totalScore >= 80) level = 'Diamond';
      else if (breakdown.totalScore >= 60) level = 'Gold';
      else if (breakdown.totalScore >= 40) level = 'Silver';

      return reply.send({
        walletAddress: account.walletAddress,
        username: account.userNameOnX,
        reputationScore: breakdown.totalScore,
        level,
        breakdown
      });
      
    } catch (error: any) {
      request.log.error('Calculate reputation score failed:', error);
      return reply.code(500).send({ error: 'Failed to calculate reputation score' });
    }
  }

  static async getRateLimitStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = twitterService.getRateLimitStatus();
      const resetTime = new Date(status.resetTime);

      return reply.send({
        canMakeRequest: status.canMakeRequest,
        remainingRequests: status.remainingRequests,
        resetTime: resetTime.toISOString(),
        resetTimeFormatted: resetTime.toLocaleTimeString(),
        recommendation: status.remainingRequests < 10 ? 
          'Consider waiting before making more requests to avoid rate limits.' : 
          'Safe to make requests.'
      });
    } catch (error: any) {
      request.log.error('Get rate limit status failed:', error);
      return reply.code(500).send({ error: 'Failed to get rate limit status' });
    }
  }
}
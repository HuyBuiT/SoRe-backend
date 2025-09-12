import { FastifyRequest, FastifyReply } from 'fastify';
import { twitterService } from '../services/TwitterService';
import { AppDataSource } from '../data-source';
import { Account } from '../models/Account';
import { SocialStat } from '../models/SocialStat';

interface SessionData {
  walletAddress?: string;
  requestToken?: string;
}

// Temporary OAuth token storage (in production, use Redis)
// Key: oauth_token, Value: wallet address and timestamp
const oauthTokens = new Map<string, {
  walletAddress: string;
  timestamp: number;
}>();

// Clean up expired tokens (older than 10 minutes)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthTokens.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthTokens.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export class AuthController {
  
  static async connectX(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.body as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      const { authUrl, requestToken } = await twitterService.getRequestToken();
      
      // Store wallet address with the request token (X will return this token in callback)
      oauthTokens.set(requestToken, {
        walletAddress,
        timestamp: Date.now()
      });
      
      return reply.send({ 
        authUrl,
        message: 'Redirect user to X authorization URL'
      });
    } catch (error: any) {
      request.log.error('X OAuth initiation failed:', error);
      return reply.code(500).send({ error: 'Failed to initiate X authentication' });
    }
  }

  static async xCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { oauth_token, oauth_verifier } = request.query as { 
        oauth_token: string; 
        oauth_verifier: string; 
      };

      if (!oauth_token || !oauth_verifier) {
        return reply.code(400).send({ error: 'Missing OAuth parameters' });
      }

      // Retrieve wallet address using the oauth_token (request token)
      const tokenData = oauthTokens.get(oauth_token);
      if (!tokenData) {
        return reply.code(400).send({ error: 'Invalid or expired OAuth token' });
      }

      // Clean up the used token
      oauthTokens.delete(oauth_token);

      // Get access tokens
      const tokens = await twitterService.getAccessToken(oauth_token, oauth_verifier);
      
      // Get user profile
      const profile = await twitterService.getUserProfile(
        tokens.access_token, 
        tokens.access_token_secret
      );

      // Save/update user data in database
      const accountRepository = AppDataSource.getRepository(Account);
      const socialStatRepository = AppDataSource.getRepository(SocialStat);

      let account = await accountRepository.findOne({
        where: { walletAddress: tokenData.walletAddress },
        relations: ['socialStat']
      });

      if (!account) {
        account = new Account();
        account.walletAddress = tokenData.walletAddress;
        account.userNameOnX = profile.username;
        account.pricePerSlot = 0; // Default price
        account = await accountRepository.save(account);
      } else {
        account.userNameOnX = profile.username;
        await accountRepository.save(account);
      }

      // Update or create social stats
      let socialStat = account.socialStat;
      if (!socialStat) {
        socialStat = new SocialStat();
        socialStat.accountId = account.id;
      }

      socialStat.follower = profile.public_metrics.followers_count;
      socialStat.totalPost = profile.public_metrics.tweet_count;
      socialStat.totalLike = 0; // Will be updated with detailed metrics later

      await socialStatRepository.save(socialStat);

      // Store encrypted tokens (in production, encrypt these)
      // For now, we'll store basic info and re-authenticate when needed
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/dashboard?connected=true&username=${profile.username}`);
      
    } catch (error: any) {
      request.log.error('X OAuth callback failed:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return reply.redirect(`${frontendUrl}/dashboard?error=auth_failed`);
    }
  }

  static async disconnectX(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.body as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      const accountRepository = AppDataSource.getRepository(Account);
      const account = await accountRepository.findOne({
        where: { walletAddress }
      });

      if (!account) {
        return reply.code(404).send({ error: 'Account not found' });
      }

      // Clear X username and related data
      account.userNameOnX = '';
      await accountRepository.save(account);

      return reply.send({ message: 'X account disconnected successfully' });
      
    } catch (error: any) {
      request.log.error('X disconnect failed:', error);
      return reply.code(500).send({ error: 'Failed to disconnect X account' });
    }
  }

  static async getXStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { walletAddress } = request.query as { walletAddress: string };
      
      if (!walletAddress) {
        return reply.code(400).send({ error: 'Wallet address is required' });
      }

      const accountRepository = AppDataSource.getRepository(Account);
      let account = await accountRepository.findOne({
        where: { walletAddress },
        relations: ['socialStat']
      });

      if (!account) {
        // Auto-create basic user account for new wallet connection
        account = new Account();
        account.walletAddress = walletAddress;
        account.userNameOnX = '';
        account.pricePerSlot = 0;
        account.displayName = '';
        account.avatarUrl = '';
        account.reputation = 0;
        account.level = 'Bronze';
        account.completedSessions = 0;
        account.rating = 0;
        account.expertise = '';
        account.availableSlots = 0;
        account.description = 'Client account created automatically when wallet connected';
        account.tags = '';
        account.bookedSlots = 0;
        account.isAvailable = false; // Not a KOL by default
        account.availabilitySchedule = '';
        account.minBookingDuration = 30;
        account.maxBookingDuration = 240;
        account = await accountRepository.save(account);
        
        request.log.info(`Auto-created account for wallet: ${walletAddress}`);
      }

      return reply.send({
        connected: !!account.userNameOnX,
        username: account.userNameOnX || null,
        socialStats: account.socialStat ? {
          followers: account.socialStat.follower,
          totalPosts: account.socialStat.totalPost,
          totalLikes: account.socialStat.totalLike
        } : null
      });
      
    } catch (error: any) {
      request.log.error('Get X status failed:', error);
      return reply.code(500).send({ error: 'Failed to get X connection status' });
    }
  }
}
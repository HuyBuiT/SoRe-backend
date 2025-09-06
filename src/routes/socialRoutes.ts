import { FastifyInstance } from 'fastify';
import { SocialController } from '../controllers/SocialController';

export async function socialRoutes(fastify: FastifyInstance) {
  // Social metrics endpoints
  fastify.post('/refresh-stats', {
    schema: {
      tags: ['Social Metrics'],
      summary: 'Refresh social statistics',
      description: 'Refreshes social metrics for a user from X API (uses mock data to preserve free API quota)',
      body: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { 
            type: 'string',
            description: 'User\'s wallet address'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' }
              }
            },
            rateLimitInfo: {
              type: 'object',
              properties: {
                remainingRequests: { type: 'number' },
                resetTime: { type: 'string', format: 'date-time' }
              }
            },
            note: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        429: { 
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            resetTime: { type: 'string', format: 'date-time' },
            remainingRequests: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, SocialController.refreshSocialStats);

  fastify.get('/stats', {
    schema: {
      tags: ['Social Metrics'],
      summary: 'Get user social statistics',
      description: 'Retrieves cached social statistics for a user',
      querystring: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { 
            type: 'string',
            description: 'User\'s wallet address'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            walletAddress: { type: 'string' },
            username: { type: 'string' },
            socialStats: {
              type: 'object',
              nullable: true,
              properties: {
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' },
                lastUpdated: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, SocialController.getSocialStats);

  fastify.get('/leaderboard', {
    schema: {
      tags: ['Social Metrics'],
      summary: 'Get user leaderboard',
      description: 'Retrieves the top users ranked by social metrics',
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'number',
            default: 10,
            description: 'Number of users to return (max 100)'
          },
          sortBy: {
            type: 'string',
            enum: ['followers', 'totalPosts', 'totalLikes'],
            default: 'followers',
            description: 'Metric to sort by'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            leaderboard: {
              type: 'array',
              items: {
              type: 'object',
              properties: {
                rank: { type: 'number' },
                walletAddress: { type: 'string' },
                username: { type: 'string' },
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' },
                pricePerSlot: { type: 'number' }
              }
            }
            },
            sortedBy: { type: 'string' },
            totalCount: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, SocialController.getLeaderboard);

  fastify.get('/reputation', {
    schema: {
      tags: ['Social Metrics'],
      summary: 'Calculate reputation score',
      description: 'Calculates and returns the reputation score for a user based on weighted metrics (50% on-chain, 40% social, 10% holdings)',
      querystring: {
        type: 'object',
        required: ['walletAddress'],
        properties: {
          walletAddress: { 
            type: 'string',
            description: 'User\'s wallet address'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            walletAddress: { type: 'string' },
            username: { type: 'string' },
            reputationScore: { type: 'number' },
            level: { type: 'string', enum: ['Bronze', 'Silver', 'Gold', 'Diamond'] },
            breakdown: {
              type: 'object',
              properties: {
                onChainScore: { type: 'number' },
                socialScore: { type: 'number' },
                holdingsScore: { type: 'number' },
                totalScore: { type: 'number' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, SocialController.calculateReputationScore);

  fastify.get('/rate-limit-status', {
    schema: {
      tags: ['Social Metrics'],
      summary: 'Get API rate limit status',
      description: 'Returns current rate limit status for X API calls to help prevent exceeding quotas',
      response: {
        200: {
          type: 'object',
          properties: {
            canMakeRequest: { type: 'boolean' },
            remainingRequests: { type: 'number' },
            resetTime: { type: 'string', format: 'date-time' },
            resetTimeFormatted: { type: 'string' },
            recommendation: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, SocialController.getRateLimitStatus);
}
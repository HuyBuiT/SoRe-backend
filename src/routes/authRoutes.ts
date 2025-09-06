import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/AuthController';

export async function authRoutes(fastify: FastifyInstance) {
  // X (Twitter) OAuth routes
  fastify.post('/connect-x', {
    schema: {
      tags: ['Authentication'],
      summary: 'Initiate X (Twitter) OAuth connection',
      description: 'Starts the OAuth flow to connect a user\'s X account to their wallet address',
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
            authUrl: { 
              type: 'string',
              description: 'URL to redirect user to for X authorization'
            },
            message: { type: 'string' }
          }
        },
        400: {
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
  }, AuthController.connectX);

  fastify.get('/x/callback', {
    schema: {
      tags: ['Authentication'],
      summary: 'Handle X OAuth callback',
      description: 'Handles the callback from X OAuth and completes the connection process',
      querystring: {
        type: 'object',
        required: ['oauth_token', 'oauth_verifier'],
        properties: {
          oauth_token: { type: 'string' },
          oauth_verifier: { type: 'string' }
        }
      },
      response: {
        302: {
          description: 'Redirects to frontend with success/error status'
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, AuthController.xCallback);

  fastify.post('/disconnect-x', {
    schema: {
      tags: ['Authentication'],
      summary: 'Disconnect X account',
      description: 'Disconnects the X account from the user\'s wallet',
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
            message: { type: 'string' }
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
  }, AuthController.disconnectX);

  fastify.get('/x/status', {
    schema: {
      tags: ['Authentication'],
      summary: 'Get X connection status',
      description: 'Retrieves the current X connection status for a wallet address',
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
            connected: { type: 'boolean' },
            username: { type: 'string', nullable: true },
            socialStats: {
              type: 'object',
              nullable: true,
              properties: {
                followers: { type: 'number' },
                totalPosts: { type: 'number' },
                totalLikes: { type: 'number' }
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
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, AuthController.getXStatus);
}
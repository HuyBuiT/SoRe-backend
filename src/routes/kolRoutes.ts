import { FastifyInstance } from 'fastify';
import { KOLController } from '../controllers/KOLController';

export async function kolRoutes(fastify: FastifyInstance) {
  // Get KOLs with pagination
  fastify.get('/kols', {
    schema: {
      tags: ['KOL'],
      summary: 'Get KOLs with pagination',
      description: 'Retrieve paginated list of KOLs (Key Opinion Leaders)',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 3, minimum: 1, maximum: 100 },
          sortBy: { type: 'string', enum: ['reputation', 'price', 'rating'], default: 'reputation' },
          filter: { type: 'string', default: 'all' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  kol: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      username: { type: 'string' },
                      avatar: { type: 'string' },
                      reputation: { type: 'number' },
                      level: { type: 'string', enum: ['Bronze', 'Silver', 'Gold', 'Diamond'] },
                      followers: { type: 'number' },
                      completedSessions: { type: 'number' },
                      rating: { type: 'number' },
                      expertise: { type: 'array', items: { type: 'string' } },
                      walletAddress: { type: 'string' }
                    }
                  },
                  pricePerSlot: { type: 'number' },
                  availableSlots: { type: 'number' },
                  description: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  bookedSlots: { type: 'number' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                current_page: { type: 'number' },
                total_pages: { type: 'number' },
                total_items: { type: 'number' },
                items_per_page: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, KOLController.getKOLs);

  // Create a new KOL
  fastify.post('/kols', {
    schema: {
      tags: ['KOL'],
      summary: 'Create a new KOL',
      description: 'Register a new Key Opinion Leader with their profile information',
      body: {
        type: 'object',
        required: ['name', 'username', 'walletAddress', 'pricePerSlot', 'expertise', 'description'],
        properties: {
          name: { type: 'string', description: 'Display name of the KOL' },
          username: { type: 'string', description: 'Username (e.g., @username)' },
          walletAddress: { type: 'string', description: 'Blockchain wallet address' },
          pricePerSlot: { type: 'number', minimum: 0, description: 'Price per consultation slot in SOMI' },
          expertise: { type: 'array', items: { type: 'string' }, description: 'Array of expertise categories' },
          description: { type: 'string', description: 'Short description of services offered' },
          bio: { type: 'string', description: 'Optional detailed biography' },
          socialLinks: {
            type: 'object',
            properties: {
              twitter: { type: 'string' },
              discord: { type: 'string' },
              telegram: { type: 'string' }
            }
          },
          availableSlots: { type: 'number', minimum: 1, default: 10, description: 'Number of available consultation slots' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                kol: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    username: { type: 'string' },
                    avatar: { type: 'string' },
                    reputation: { type: 'number' },
                    level: { type: 'string', enum: ['Bronze', 'Silver', 'Gold', 'Diamond'] },
                    followers: { type: 'number' },
                    completedSessions: { type: 'number' },
                    rating: { type: 'number' },
                    expertise: { type: 'array', items: { type: 'string' } },
                    walletAddress: { type: 'string' }
                  }
                },
                pricePerSlot: { type: 'number' },
                availableSlots: { type: 'number' },
                description: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                bookedSlots: { type: 'number' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, KOLController.createKOL);

  // Seed KOL data (development only)
  fastify.post('/kols/seed', {
    schema: {
      tags: ['KOL'],
      summary: 'Seed KOL data',
      description: 'Seed database with sample KOL data (development only)',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            count: { type: 'number' }
          }
        }
      }
    }
  }, KOLController.seedKOLData);
}
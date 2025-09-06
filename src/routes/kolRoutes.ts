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
          limit: { type: 'integer', default: 3, minimum: 1, maximum: 10 }
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
                      expertise: { type: 'array', items: { type: 'string' } }
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
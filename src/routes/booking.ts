import { FastifyInstance } from 'fastify';
import { BookingController } from '../controllers/BookingController';

export async function bookingRoutes(fastify: FastifyInstance) {
  const bookingController = new BookingController();

  // Create a new booking request
  fastify.post('/bookings', {
    schema: {
      body: {
        type: 'object',
        required: ['kolId', 'clientId', 'bookingDate', 'startTime', 'endTime', 'reason', 'durationMinutes'],
        properties: {
          kolId: { type: 'string' },
          clientId: { type: 'string' },
          bookingDate: { type: 'string', format: 'date' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          reason: { type: 'string' },
          durationMinutes: { type: 'number' },
          timezone: { type: 'string' }
        }
      }
    }
  }, bookingController.createBooking.bind(bookingController));

  // Get all bookings for a KOL
  fastify.get('/bookings/kol/:kolId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          kolId: { type: 'string' }
        }
      }
    }
  }, bookingController.getBookingsForKOL.bind(bookingController));

  // Get all bookings for a client
  fastify.get('/bookings/client/:clientId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          clientId: { type: 'string' }
        }
      }
    }
  }, bookingController.getBookingsForClient.bind(bookingController));

  // Get pending bookings for a KOL (notifications)
  fastify.get('/bookings/kol/:kolId/pending', {
    schema: {
      params: {
        type: 'object',
        properties: {
          kolId: { type: 'string' }
        }
      }
    }
  }, bookingController.getPendingBookings.bind(bookingController));

  // Update booking status (accept/reject)
  fastify.put('/bookings/:bookingId/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          bookingId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string',
            enum: ['accepted', 'rejected', 'completed', 'cancelled']
          },
          rejectionReason: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    }
  }, bookingController.updateBookingStatus.bind(bookingController));

  // Update KOL pricing and availability
  fastify.put('/kols/:kolId/pricing', {
    schema: {
      params: {
        type: 'object',
        properties: {
          kolId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          pricePerSlot: { type: 'number' },
          isAvailable: { type: 'boolean' },
          minBookingDuration: { type: 'number' },
          maxBookingDuration: { type: 'number' },
          availabilitySchedule: { type: 'string' }
        }
      }
    }
  }, bookingController.updateKOLPricing.bind(bookingController));

  // Get booking by ID
  fastify.get('/bookings/:bookingId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          bookingId: { type: 'string' }
        }
      }
    }
  }, bookingController.getBookingById.bind(bookingController));
}
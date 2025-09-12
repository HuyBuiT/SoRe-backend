import { FastifyReply, FastifyRequest } from 'fastify';
import { AppDataSource } from '../data-source';
import { Booking, BookingStatus } from '../models/Booking';
import { Account } from '../models/Account';

interface CreateBookingRequest {
  kolId: string;  // Can be database ID or wallet address
  clientId: string; // Can be database ID or wallet address  
  bookingDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  durationMinutes: number;
  timezone?: string;
}

interface UpdateBookingStatusRequest {
  status: BookingStatus;
  rejectionReason?: string;
  notes?: string;
}

export class BookingController {
  private bookingRepository = AppDataSource.getRepository(Booking);
  private accountRepository = AppDataSource.getRepository(Account);

  async createBooking(request: FastifyRequest<{ Body: CreateBookingRequest }>, reply: FastifyReply) {
    try {
      const { kolId, clientId, bookingDate, startTime, endTime, reason, durationMinutes, timezone = 'UTC' } = request.body;

      // Find KOL (by ID or wallet address)
      let kol = null;
      if (/^\d+$/.test(kolId)) {
        // Only treat as database ID if it's purely numeric (no 0x prefix or letters)
        kol = await this.accountRepository.findOne({ where: { id: parseInt(kolId) } });
      } else {
        kol = await this.accountRepository.findOne({ where: { walletAddress: kolId } });
      }

      if (!kol) {
        return reply.status(404).send({ error: 'KOL not found' });
      }

      // Find client (by ID or wallet address)
      let client = null;
      if (/^\d+$/.test(clientId)) {
        // Only treat as database ID if it's purely numeric (no 0x prefix or letters)
        client = await this.accountRepository.findOne({ where: { id: parseInt(clientId) } });
      } else {
        // Try to find client by wallet address
        client = await this.accountRepository.findOne({ where: { walletAddress: clientId } });
        
        // If client doesn't exist, create a basic client account
        if (!client) {
          const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${clientId}`;
          client = this.accountRepository.create({
            walletAddress: clientId,
            userNameOnX: clientId.substring(0, 10), // Truncated address as username
            displayName: `Client ${clientId.substring(0, 8)}...`,
            avatarUrl,
            pricePerSlot: 0,
            expertise: JSON.stringify([]),
            description: 'Client account created automatically',
            reputation: 0,
            level: 'Bronze',
            completedSessions: 0,
            rating: 0,
            tags: JSON.stringify([]),
            bookedSlots: 0,
            isAvailable: false,
            availableSlots: 0
          });
          client = await this.accountRepository.save(client);
        }
      }

      if (!client) {
        return reply.status(404).send({ error: 'Failed to create or find client' });
      }

      if (!kol.isAvailable) {
        return reply.status(400).send({ error: 'KOL is not available for bookings' });
      }

      // Check if duration meets minimum requirements
      if (durationMinutes < kol.minBookingDuration) {
        return reply.status(400).send({ 
          error: `Minimum booking duration is ${kol.minBookingDuration} minutes` 
        });
      }

      if (durationMinutes > kol.maxBookingDuration) {
        return reply.status(400).send({ 
          error: `Maximum booking duration is ${kol.maxBookingDuration} minutes` 
        });
      }

      // Calculate price based on KOL's pricing (STT per slot)
      const price = kol.pricePerSlot;

      // Check for scheduling conflicts
      const existingBooking = await this.bookingRepository.findOne({
        where: {
          kolId: kol.id,
          bookingDate: new Date(bookingDate),
          status: BookingStatus.ACCEPTED
        }
      });

      if (existingBooking) {
        const existingStart = existingBooking.startTime;
        const existingEnd = existingBooking.endTime;
        
        // Simple time overlap check
        if (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        ) {
          return reply.status(400).send({ error: 'Time slot is already booked' });
        }
      }

      // Create booking
      const booking = this.bookingRepository.create({
        kolId: kol.id,
        clientId: client.id,
        bookingDate: new Date(bookingDate),
        startTime,
        endTime,
        reason,
        price,
        durationMinutes,
        timezone,
        status: BookingStatus.PENDING
      });

      const savedBooking = await this.bookingRepository.save(booking);

      return reply.send({
        success: true,
        booking: savedBooking,
        message: 'Booking request sent to KOL'
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getBookingsForKOL(request: FastifyRequest<{ Params: { kolId: string } }>, reply: FastifyReply) {
    try {
      const { kolId } = request.params;
      
      const bookings = await this.bookingRepository.find({
        where: { kolId: parseInt(kolId) },
        relations: ['client'],
        order: { createdAt: 'DESC' }
      });

      return reply.send({ bookings });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getBookingsForClient(request: FastifyRequest<{ Params: { clientId: string } }>, reply: FastifyReply) {
    try {
      const { clientId } = request.params;
      
      const bookings = await this.bookingRepository.find({
        where: { clientId: parseInt(clientId) },
        relations: ['kol'],
        order: { createdAt: 'DESC' }
      });

      return reply.send({ bookings });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async updateBookingStatus(request: FastifyRequest<{ 
    Params: { bookingId: string }, 
    Body: UpdateBookingStatusRequest 
  }>, reply: FastifyReply) {
    try {
      const { bookingId } = request.params;
      const { status, rejectionReason, notes } = request.body;

      const booking = await this.bookingRepository.findOne({
        where: { id: parseInt(bookingId) },
        relations: ['kol', 'client']
      });

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      if (booking.status !== BookingStatus.PENDING) {
        return reply.status(400).send({ 
          error: `Booking is already ${booking.status}` 
        });
      }

      booking.status = status;
      if (status === BookingStatus.REJECTED && rejectionReason) {
        booking.rejectionReason = rejectionReason;
      }
      if (notes) {
        booking.notes = notes;
      }
      booking.updatedAt = new Date();

      const updatedBooking = await this.bookingRepository.save(booking);

      return reply.send({
        success: true,
        booking: updatedBooking,
        message: status === BookingStatus.ACCEPTED ? 'Booking accepted' : 'Booking rejected'
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getPendingBookings(request: FastifyRequest<{ Params: { kolId: string } }>, reply: FastifyReply) {
    try {
      const { kolId } = request.params;
      
      const pendingBookings = await this.bookingRepository.find({
        where: { 
          kolId: parseInt(kolId), 
          status: BookingStatus.PENDING 
        },
        relations: ['client'],
        order: { createdAt: 'DESC' }
      });

      return reply.send({ 
        bookings: pendingBookings,
        count: pendingBookings.length
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async updateKOLPricing(request: FastifyRequest<{ 
    Params: { kolId: string }, 
    Body: { 
      pricePerSlot?: number;
      isAvailable?: boolean;
      minBookingDuration?: number;
      maxBookingDuration?: number;
      availabilitySchedule?: string;
    } 
  }>, reply: FastifyReply) {
    try {
      const { kolId } = request.params;
      const updates = request.body;

      const kol = await this.accountRepository.findOne({ where: { id: parseInt(kolId) } });
      
      if (!kol) {
        return reply.status(404).send({ error: 'KOL not found' });
      }

      // Update pricing fields
      if (updates.pricePerSlot !== undefined) kol.pricePerSlot = updates.pricePerSlot;
      if (updates.isAvailable !== undefined) kol.isAvailable = updates.isAvailable;
      if (updates.minBookingDuration !== undefined) kol.minBookingDuration = updates.minBookingDuration;
      if (updates.maxBookingDuration !== undefined) kol.maxBookingDuration = updates.maxBookingDuration;
      if (updates.availabilitySchedule !== undefined) kol.availabilitySchedule = updates.availabilitySchedule;

      kol.updatedAt = new Date();
      const updatedKOL = await this.accountRepository.save(kol);

      return reply.send({
        success: true,
        kol: updatedKOL,
        message: 'Pricing updated successfully'
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }

  async getBookingById(request: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) {
    try {
      const { bookingId } = request.params;
      
      const booking = await this.bookingRepository.findOne({
        where: { id: parseInt(bookingId) },
        relations: ['kol', 'client']
      });

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      return reply.send({ booking });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  }
}
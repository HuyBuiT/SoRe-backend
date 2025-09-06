import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { Account } from './Account';

export enum BookingStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity()
export class Booking extends BaseTimestamp {
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'kol_id' })
  kol: Account;

  @Column({ name: 'kol_id' })
  kolId: number;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'client_id' })
  client: Account;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column('text', { name: 'reason' })
  reason: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
    name: 'status'
  })
  status: BookingStatus;

  @Column('decimal', { precision: 10, scale: 2, name: 'price' })
  price: number;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string;

  @Column('text', { name: 'notes', nullable: true })
  notes: string;

  @Column({ name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ name: 'timezone', default: 'UTC' })
  timezone: string;
}
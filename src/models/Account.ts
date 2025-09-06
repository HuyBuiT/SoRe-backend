import 'reflect-metadata';
import { Entity, Column, OneToOne, OneToMany } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { SocialStat } from './SocialStat';
import { OnChainStat } from './OnChainStat';
import { NFT } from './NFT';
import { BuyTransaction } from './BuyTransaction';
import { Booking } from './Booking';

@Entity()
export class Account extends BaseTimestamp {
  @Column({ name: 'wallet_address' })
  walletAddress: string;

  @Column({ name: 'user_name_on_x' })
  userNameOnX: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'price_per_slot' })
  pricePerSlot: number;

  // Additional KOL fields
  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'avatar_url' })
  avatarUrl: string;

  @Column({ name: 'reputation', default: 0 })
  reputation: number;

  @Column({ name: 'level', default: 'Bronze' })
  level: string;

  @Column({ name: 'completed_sessions', default: 0 })
  completedSessions: number;

  @Column('decimal', { precision: 3, scale: 2, name: 'rating', default: 0 })
  rating: number;

  @Column('text', { name: 'expertise', nullable: true })
  expertise: string; // JSON string array

  @Column({ name: 'available_slots', default: 10 })
  availableSlots: number;

  @Column('text', { name: 'description', nullable: true })
  description: string;

  @Column('text', { name: 'tags', nullable: true })
  tags: string; // JSON string array

  @Column({ name: 'booked_slots', default: 0 })
  bookedSlots: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column('text', { name: 'availability_schedule', nullable: true })
  availabilitySchedule: string; // JSON string with weekly schedule

  @Column({ name: 'min_booking_duration', default: 30 })
  minBookingDuration: number; // minutes

  @Column({ name: 'max_booking_duration', default: 240 })
  maxBookingDuration: number; // minutes

  @Column('decimal', { precision: 10, scale: 2, name: 'hourly_rate', nullable: true })
  hourlyRate: number;

  @OneToOne(() => SocialStat, socialStat => socialStat.account)
  socialStat: SocialStat;

  @OneToOne(() => OnChainStat, onChainStat => onChainStat.account)
  onChainStat: OnChainStat;

  @OneToOne(() => NFT, nft => nft.account)
  nft: NFT;

  @OneToMany(() => BuyTransaction, buyTransaction => buyTransaction.buyerAccount)
  buyTransactions: BuyTransaction[];

  @OneToMany(() => BuyTransaction, buyTransaction => buyTransaction.kolAccount)
  kolTransactions: BuyTransaction[];

  @OneToMany(() => Booking, booking => booking.kol)
  receivedBookings: Booking[];

  @OneToMany(() => Booking, booking => booking.client)
  madeBookings: Booking[];
}
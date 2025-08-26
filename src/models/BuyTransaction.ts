import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { Account } from './Account';

export enum PurchaseStatus {
  PENDING = 'Pending',
  REFUNDED = 'Refunded',
  CANCEL = 'Cancel',
  FINISH = 'Finish',
  REJECT = 'Reject',
  IN_PROGRESS = 'InProgress'
}

@Entity()
export class BuyTransaction extends BaseTimestamp {
  @Column({ name: 'buyer_account_id' })
  buyerAccountId: number;

  @Column({ name: 'kol_account_id' })
  kolAccountId: number;

  @Column()
  txhash: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'price_per_slot' })
  pricePerSlot: number;

  @Column({ name: 'purchase_status', type: 'varchar' })
  purchaseStatus: PurchaseStatus;

  @Column('text', { nullable: true })
  reason: string;

  @Column('timestamp', { name: 'from_timestamp' })
  fromTimestamp: Date;

  @Column('timestamp', { name: 'to_timestamp' })
  toTimestamp: Date;

  @ManyToOne(() => Account, account => account.buyTransactions)
  @JoinColumn({ name: 'buyer_account_id' })
  buyerAccount: Account;

  @ManyToOne(() => Account, account => account.kolTransactions)
  @JoinColumn({ name: 'kol_account_id' })
  kolAccount: Account;
}
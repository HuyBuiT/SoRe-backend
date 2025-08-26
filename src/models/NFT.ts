import 'reflect-metadata';
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { Account } from './Account';

@Entity()
export class NFT extends BaseTimestamp {
  @Column({ name: 'account_id' })
  accountId: number;

  @Column()
  address: string;

  @Column({ name: 'total_onchain_point' })
  totalOnchainPoint: number;

  @Column({ name: 'total_social_point' })
  totalSocialPoint: number;

  @Column({ name: 'total_stake_point' })
  totalStakePoint: number;

  @Column()
  level: number;

  @OneToOne(() => Account, account => account.nft)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
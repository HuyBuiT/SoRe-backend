import 'reflect-metadata';
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { Account } from './Account';

@Entity()
export class SocialStat extends BaseTimestamp {
  @Column({ name: 'account_id' })
  accountId: number;

  @Column()
  follower: number;

  @Column({ name: 'total_post' })
  totalPost: number;

  @Column({ name: 'total_like' })
  totalLike: number;

  @OneToOne(() => Account, account => account.socialStat)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
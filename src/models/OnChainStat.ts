import 'reflect-metadata';
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { Account } from './Account';

@Entity()
export class OnChainStat extends BaseTimestamp {
  @Column({ name: 'account_id' })
  accountId: number;

  @Column({ name: 'total_tx' })
  totalTx: number;

  @Column('decimal', { precision: 20, scale: 8, name: 'native_token_stake' })
  nativeTokenStake: number;

  @Column('decimal', { precision: 20, scale: 2, name: 'total_trading_volume' })
  totalTradingVolume: number;

  @Column('decimal', { precision: 20, scale: 8, name: 'total_gas_used' })
  totalGasUsed: number;

  @OneToOne(() => Account, account => account.onChainStat)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';

@Entity()
export class PointMechanism extends BaseTimestamp {
  @Column('decimal', { precision: 10, scale: 4, comment: '1p / 10$', name: 'volume_per_day' })
  VolumePerDay: number;

  @Column('decimal', { precision: 10, scale: 4, comment: '1p / 5 tx', name: 'total_tx_per_day' })
  totalTxPerDay: number;

  @Column('decimal', { precision: 10, scale: 4, comment: '1p / 10$', name: 'native_token_stake_per_day' })
  nativeTokenStakePerDay: number;

  @Column('decimal', { precision: 10, scale: 4, comment: '1p / 0.001$', name: 'total_gas_used_per_day' })
  totalGasUsedPerDay: number;
}
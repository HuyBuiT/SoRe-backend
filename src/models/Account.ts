import 'reflect-metadata';
import { Entity, Column, OneToOne, OneToMany } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';
import { SocialStat } from './SocialStat';
import { OnChainStat } from './OnChainStat';
import { NFT } from './NFT';
import { BuyTransaction } from './BuyTransaction';

@Entity()
export class Account extends BaseTimestamp {
  @Column({ name: 'wallet_address' })
  walletAddress: string;

  @Column({ name: 'user_name_on_x' })
  userNameOnX: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'price_per_slot' })
  pricePerSlot: number;

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
}
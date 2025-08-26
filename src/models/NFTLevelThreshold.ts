import 'reflect-metadata';
import { Entity, Column } from 'typeorm';
import { BaseTimestamp } from './BaseTimestamp';

@Entity()
export class NFTLevelThreshold extends BaseTimestamp {
  @Column({ comment: 'Level 1: 100 p', name: 'level_1' })
  level1: number;

  @Column({ comment: 'Level 2: 200 p', name: 'level_2' })
  level2: number;

  @Column({ comment: 'Level 3: 300 p', name: 'level_3' })
  level3: number;

  @Column({ comment: 'Level 4: 400 p', name: 'level_4' })
  level4: number;

  @Column({ comment: 'Level 5: 500 p', name: 'level_5' })
  level5: number;
}
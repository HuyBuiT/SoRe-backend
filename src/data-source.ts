import "reflect-metadata";
import { DataSource } from "typeorm";
import 'dotenv/config';
import { Account } from "./models/Account";
import { NFT } from "./models/NFT";
import { SocialStat } from "./models/SocialStat";
import { OnChainStat } from "./models/OnChainStat";
import { BuyTransaction } from "./models/BuyTransaction";
import { NFTLevelThreshold } from "./models/NFTLevelThreshold";
import { PointMechanism } from "./models/PointMechanism";
import { Booking } from "./models/Booking";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "sore_db",
  synchronize: false,
  logging: false,
  entities: [
    Account,
    NFT,
    SocialStat,
    OnChainStat,
    BuyTransaction,
    NFTLevelThreshold,
    PointMechanism,
    Booking
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: ["src/subscribers/*.ts"],
  ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});
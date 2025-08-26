import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756203893660 implements MigrationInterface {
    name = 'Migration1756203893660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "social_stat" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "account_id" integer NOT NULL, "follower" integer NOT NULL, "total_post" integer NOT NULL, "total_like" integer NOT NULL, CONSTRAINT "REL_e9f95c0893bd799bdaea49ce7f" UNIQUE ("account_id"), CONSTRAINT "PK_46fb782fa9671e0bb813b84dcc1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "on_chain_stat" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "account_id" integer NOT NULL, "total_tx" integer NOT NULL, "native_token_stake" numeric(20,8) NOT NULL, "total_trading_volume" numeric(20,2) NOT NULL, "total_gas_used" numeric(20,8) NOT NULL, CONSTRAINT "REL_0a6192aaddd77f278ce057a1f7" UNIQUE ("account_id"), CONSTRAINT "PK_fe8ba6fe5a0e230c902e62da033" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nft" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "account_id" integer NOT NULL, "address" character varying NOT NULL, "total_onchain_point" integer NOT NULL, "total_social_point" integer NOT NULL, "total_stake_point" integer NOT NULL, "level" integer NOT NULL, CONSTRAINT "REL_bb010b22de4327155315efeb6e" UNIQUE ("account_id"), CONSTRAINT "PK_8f46897c58e23b0e7bf6c8e56b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "buy_transaction" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "buyer_account_id" integer NOT NULL, "kol_account_id" integer NOT NULL, "txhash" character varying NOT NULL, "price_per_slot" numeric(10,2) NOT NULL, "purchase_status" character varying NOT NULL, "reason" text, "from_timestamp" TIMESTAMP NOT NULL, "to_timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_0b05b490bcc98b3472c8a1c436e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "wallet_address" character varying NOT NULL, "user_name_on_x" character varying NOT NULL, "price_per_slot" numeric(10,2) NOT NULL, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nft_level_threshold" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "level_1" integer NOT NULL, "level_2" integer NOT NULL, "level_3" integer NOT NULL, "level_4" integer NOT NULL, "level_5" integer NOT NULL, CONSTRAINT "PK_b43874884ed9bd09bad4ce27e20" PRIMARY KEY ("id")); COMMENT ON COLUMN "nft_level_threshold"."level_1" IS 'Level 1: 100 p'; COMMENT ON COLUMN "nft_level_threshold"."level_2" IS 'Level 2: 200 p'; COMMENT ON COLUMN "nft_level_threshold"."level_3" IS 'Level 3: 300 p'; COMMENT ON COLUMN "nft_level_threshold"."level_4" IS 'Level 4: 400 p'; COMMENT ON COLUMN "nft_level_threshold"."level_5" IS 'Level 5: 500 p'`);
        await queryRunner.query(`CREATE TABLE "point_mechanism" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "volume_per_day" numeric(10,4) NOT NULL, "total_tx_per_day" numeric(10,4) NOT NULL, "native_token_stake_per_day" numeric(10,4) NOT NULL, "total_gas_used_per_day" numeric(10,4) NOT NULL, CONSTRAINT "PK_eba378dcffeffc7f0dfe10b3fa1" PRIMARY KEY ("id")); COMMENT ON COLUMN "point_mechanism"."volume_per_day" IS '1p / 10$'; COMMENT ON COLUMN "point_mechanism"."total_tx_per_day" IS '1p / 5 tx'; COMMENT ON COLUMN "point_mechanism"."native_token_stake_per_day" IS '1p / 10$'; COMMENT ON COLUMN "point_mechanism"."total_gas_used_per_day" IS '1p / 0.001$'`);
        await queryRunner.query(`ALTER TABLE "social_stat" ADD CONSTRAINT "FK_e9f95c0893bd799bdaea49ce7ff" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "on_chain_stat" ADD CONSTRAINT "FK_0a6192aaddd77f278ce057a1f76" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nft" ADD CONSTRAINT "FK_bb010b22de4327155315efeb6ea" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "buy_transaction" ADD CONSTRAINT "FK_b74f6d3526556094431725a8955" FOREIGN KEY ("buyer_account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "buy_transaction" ADD CONSTRAINT "FK_7296b426a38a824b08a9ecac074" FOREIGN KEY ("kol_account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "buy_transaction" DROP CONSTRAINT "FK_7296b426a38a824b08a9ecac074"`);
        await queryRunner.query(`ALTER TABLE "buy_transaction" DROP CONSTRAINT "FK_b74f6d3526556094431725a8955"`);
        await queryRunner.query(`ALTER TABLE "nft" DROP CONSTRAINT "FK_bb010b22de4327155315efeb6ea"`);
        await queryRunner.query(`ALTER TABLE "on_chain_stat" DROP CONSTRAINT "FK_0a6192aaddd77f278ce057a1f76"`);
        await queryRunner.query(`ALTER TABLE "social_stat" DROP CONSTRAINT "FK_e9f95c0893bd799bdaea49ce7ff"`);
        await queryRunner.query(`DROP TABLE "point_mechanism"`);
        await queryRunner.query(`DROP TABLE "nft_level_threshold"`);
        await queryRunner.query(`DROP TABLE "account"`);
        await queryRunner.query(`DROP TABLE "buy_transaction"`);
        await queryRunner.query(`DROP TABLE "nft"`);
        await queryRunner.query(`DROP TABLE "on_chain_stat"`);
        await queryRunner.query(`DROP TABLE "social_stat"`);
    }

}

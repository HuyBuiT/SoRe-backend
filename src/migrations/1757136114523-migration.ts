import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1757136114523 implements MigrationInterface {
    name = 'Migration1757136114523'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" ADD "display_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "account" ADD "avatar_url" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "account" ADD "reputation" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "level" character varying NOT NULL DEFAULT 'Bronze'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "completed_sessions" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "rating" numeric(3,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "expertise" text`);
        await queryRunner.query(`ALTER TABLE "account" ADD "available_slots" integer NOT NULL DEFAULT '10'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "account" ADD "tags" text`);
        await queryRunner.query(`ALTER TABLE "account" ADD "booked_slots" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "booked_slots"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "tags"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "available_slots"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "expertise"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "rating"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "completed_sessions"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "level"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "reputation"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "avatar_url"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "display_name"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1757144986329 implements MigrationInterface {
    name = 'Migration1757144986329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."booking_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "booking" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "kol_id" integer NOT NULL, "client_id" integer NOT NULL, "booking_date" date NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "reason" text NOT NULL, "status" "public"."booking_status_enum" NOT NULL DEFAULT 'pending', "price" numeric(10,2) NOT NULL, "rejection_reason" text, "notes" text, "duration_minutes" integer NOT NULL, "timezone" character varying NOT NULL DEFAULT 'UTC', CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "account" ADD "is_available" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "account" ADD "availability_schedule" text`);
        await queryRunner.query(`ALTER TABLE "account" ADD "min_booking_duration" integer NOT NULL DEFAULT '30'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "max_booking_duration" integer NOT NULL DEFAULT '240'`);
        await queryRunner.query(`ALTER TABLE "account" ADD "hourly_rate" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "booking" ADD CONSTRAINT "FK_0d2a9d24b70d431a3f9b1f65e1b" FOREIGN KEY ("kol_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking" ADD CONSTRAINT "FK_65f5f7fdebd59a3289ee2f77b73" FOREIGN KEY ("client_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "booking" DROP CONSTRAINT "FK_65f5f7fdebd59a3289ee2f77b73"`);
        await queryRunner.query(`ALTER TABLE "booking" DROP CONSTRAINT "FK_0d2a9d24b70d431a3f9b1f65e1b"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "hourly_rate"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "max_booking_duration"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "min_booking_duration"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "availability_schedule"`);
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "is_available"`);
        await queryRunner.query(`DROP TABLE "booking"`);
        await queryRunner.query(`DROP TYPE "public"."booking_status_enum"`);
    }

}

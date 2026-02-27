ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'superadmin';

ALTER TABLE "public"."changelogs" ALTER COLUMN "created_by" DROP NOT NULL;

ALTER TABLE "public"."changelogs" DROP CONSTRAINT IF EXISTS "fk_changelogs_created_by";

ALTER TABLE "public"."changelogs"
  ADD CONSTRAINT "fk_changelogs_created_by"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- DESTRUCTIVE: remove changelog feature database objects
-- This migration is intentionally not reversible.

DROP TRIGGER IF EXISTS "trigger_update_changelogs_updated_at" ON "public"."changelogs";
DROP VIEW IF EXISTS "public"."changelogs_with_creator";
DROP TABLE IF EXISTS "public"."changelogs";
DROP FUNCTION IF EXISTS "public"."update_changelogs_updated_at"();

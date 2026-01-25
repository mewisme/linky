-- DESTRUCTIVE: Drops shared_streaks table and related objects.
-- Shared Streaks feature has been removed. This migration is not reversible
-- without re-adding the table definition from 002_phase2_social_retention.sql.

DROP TABLE IF EXISTS "public"."shared_streaks";

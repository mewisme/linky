-- Remove level_rewards and user_level_rewards (grant tracking).

DROP TABLE IF EXISTS "public"."user_level_rewards";

DROP TRIGGER IF EXISTS "trigger_update_level_rewards_updated_at" ON "public"."level_rewards";
DROP TRIGGER IF EXISTS "set_updated_at" ON "public"."level_rewards";
DROP TABLE IF EXISTS "public"."level_rewards";
DROP FUNCTION IF EXISTS "public"."update_level_rewards_updated_at"();

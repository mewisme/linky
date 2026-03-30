-- DESTRUCTIVE: remove user economy, admin seasons/economy, and favorite exp boost surfaces
-- This migration is intentionally not reversible.

DROP TRIGGER IF EXISTS "trigger_update_coin_shop_items_updated_at" ON "public"."coin_shop_items";
DROP TRIGGER IF EXISTS "trigger_update_user_wallets_updated_at" ON "public"."user_wallets";
DROP TRIGGER IF EXISTS "trigger_update_user_weekly_checkins_updated_at" ON "public"."user_weekly_checkins";
DROP TRIGGER IF EXISTS "trigger_update_user_monthly_checkins_updated_at" ON "public"."user_monthly_checkins";
DROP TRIGGER IF EXISTS "trigger_update_seasons_updated_at" ON "public"."seasons";
DROP TRIGGER IF EXISTS "trigger_update_favorite_exp_boost_rules_updated_at" ON "public"."favorite_exp_boost_rules";

DROP FUNCTION IF EXISTS "public"."get_economy_stats"();
DROP FUNCTION IF EXISTS "public"."snapshot_economy_metrics"();
DROP FUNCTION IF EXISTS "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid");
DROP FUNCTION IF EXISTS "public"."update_seasons_updated_at"();
DROP FUNCTION IF EXISTS "public"."update_favorite_exp_boost_rules_updated_at"();
DROP FUNCTION IF EXISTS "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint);
DROP FUNCTION IF EXISTS "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid");
DROP FUNCTION IF EXISTS "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" "text");
DROP FUNCTION IF EXISTS "public"."claim_weekly_checkin"("p_user_id" "uuid");
DROP FUNCTION IF EXISTS "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date");
DROP FUNCTION IF EXISTS "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer);
DROP FUNCTION IF EXISTS "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer);
DROP FUNCTION IF EXISTS "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer);
DROP FUNCTION IF EXISTS "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer);
DROP FUNCTION IF EXISTS "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer);
DROP FUNCTION IF EXISTS "public"."buyback_cost_for_index"("p_index" integer);
DROP FUNCTION IF EXISTS "public"."prestige_user"("p_user_id" "uuid");
DROP FUNCTION IF EXISTS "public"."fn_prestige_rank_tier"("p_prestige_points" integer);
DROP FUNCTION IF EXISTS "public"."update_coin_shop_items_updated_at"();
DROP FUNCTION IF EXISTS "public"."update_user_wallets_updated_at"();
DROP FUNCTION IF EXISTS "public"."update_user_weekly_checkins_updated_at"();
DROP FUNCTION IF EXISTS "public"."update_user_monthly_checkins_updated_at"();

DROP TABLE IF EXISTS "public"."user_prestige_history";
DROP TABLE IF EXISTS "public"."user_season_records";
DROP TABLE IF EXISTS "public"."seasons";
DROP TABLE IF EXISTS "public"."economy_metrics_daily";
DROP TABLE IF EXISTS "public"."favorite_exp_boost_rules";
DROP TABLE IF EXISTS "public"."user_active_boosts";
DROP TABLE IF EXISTS "public"."user_owned_items";
DROP TABLE IF EXISTS "public"."coin_shop_items";
DROP TABLE IF EXISTS "public"."user_weekly_checkins";
DROP TABLE IF EXISTS "public"."user_monthly_checkins";
DROP TABLE IF EXISTS "public"."user_coin_transactions";
DROP TABLE IF EXISTS "public"."user_exp_transactions";
DROP TABLE IF EXISTS "public"."user_wallets";

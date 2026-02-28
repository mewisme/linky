-- Revoke anon/authenticated and grant ALL to service_role for all remaining public tables and views.
-- Tables already handled in 028: economy_config, user_wallets, user_coin_transactions,
-- user_exp_transactions, user_weekly_checkins, user_monthly_checkins.

REVOKE ALL ON TABLE "public"."interest_tags" FROM "anon";
REVOKE ALL ON TABLE "public"."interest_tags" FROM "authenticated";
GRANT ALL ON TABLE "public"."interest_tags" TO "service_role";

REVOKE ALL ON TABLE "public"."user_details" FROM "anon";
REVOKE ALL ON TABLE "public"."user_details" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_details" TO "service_role";

REVOKE ALL ON TABLE "public"."user_embeddings" FROM "anon";
REVOKE ALL ON TABLE "public"."user_embeddings" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_embeddings" TO "service_role";

REVOKE ALL ON TABLE "public"."user_levels" FROM "anon";
REVOKE ALL ON TABLE "public"."user_levels" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_levels" TO "service_role";

REVOKE ALL ON TABLE "public"."users" FROM "anon";
REVOKE ALL ON TABLE "public"."users" FROM "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

REVOKE ALL ON TABLE "public"."broadcast_history" FROM "anon";
REVOKE ALL ON TABLE "public"."broadcast_history" FROM "authenticated";
GRANT ALL ON TABLE "public"."broadcast_history" TO "service_role";

REVOKE ALL ON TABLE "public"."call_history" FROM "anon";
REVOKE ALL ON TABLE "public"."call_history" FROM "authenticated";
GRANT ALL ON TABLE "public"."call_history" TO "service_role";

REVOKE ALL ON TABLE "public"."changelogs" FROM "anon";
REVOKE ALL ON TABLE "public"."changelogs" FROM "authenticated";
GRANT ALL ON TABLE "public"."changelogs" TO "service_role";

REVOKE ALL ON TABLE "public"."coin_shop_items" FROM "anon";
REVOKE ALL ON TABLE "public"."coin_shop_items" FROM "authenticated";
GRANT ALL ON TABLE "public"."coin_shop_items" TO "service_role";

REVOKE ALL ON TABLE "public"."economy_health_reports" FROM "anon";
REVOKE ALL ON TABLE "public"."economy_health_reports" FROM "authenticated";
GRANT ALL ON TABLE "public"."economy_health_reports" TO "service_role";

REVOKE ALL ON TABLE "public"."economy_metrics_daily" FROM "anon";
REVOKE ALL ON TABLE "public"."economy_metrics_daily" FROM "authenticated";
GRANT ALL ON TABLE "public"."economy_metrics_daily" TO "service_role";

REVOKE ALL ON TABLE "public"."favorite_exp_boost_rules" FROM "anon";
REVOKE ALL ON TABLE "public"."favorite_exp_boost_rules" FROM "authenticated";
GRANT ALL ON TABLE "public"."favorite_exp_boost_rules" TO "service_role";

REVOKE ALL ON TABLE "public"."level_feature_unlocks" FROM "anon";
REVOKE ALL ON TABLE "public"."level_feature_unlocks" FROM "authenticated";
GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "service_role";

REVOKE ALL ON TABLE "public"."level_rewards" FROM "anon";
REVOKE ALL ON TABLE "public"."level_rewards" FROM "authenticated";
GRANT ALL ON TABLE "public"."level_rewards" TO "service_role";

REVOKE ALL ON TABLE "public"."notifications" FROM "anon";
REVOKE ALL ON TABLE "public"."notifications" FROM "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

REVOKE ALL ON TABLE "public"."push_subscriptions" FROM "anon";
REVOKE ALL ON TABLE "public"."push_subscriptions" FROM "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";

REVOKE ALL ON TABLE "public"."report_contexts" FROM "anon";
REVOKE ALL ON TABLE "public"."report_contexts" FROM "authenticated";
GRANT ALL ON TABLE "public"."report_contexts" TO "service_role";

REVOKE ALL ON TABLE "public"."reports" FROM "anon";
REVOKE ALL ON TABLE "public"."reports" FROM "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";

REVOKE ALL ON TABLE "public"."seasons" FROM "anon";
REVOKE ALL ON TABLE "public"."seasons" FROM "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";

REVOKE ALL ON TABLE "public"."streak_exp_bonuses" FROM "anon";
REVOKE ALL ON TABLE "public"."streak_exp_bonuses" FROM "authenticated";
GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "service_role";

REVOKE ALL ON TABLE "public"."user_active_boosts" FROM "anon";
REVOKE ALL ON TABLE "public"."user_active_boosts" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_active_boosts" TO "service_role";

REVOKE ALL ON TABLE "public"."user_blocks" FROM "anon";
REVOKE ALL ON TABLE "public"."user_blocks" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";

REVOKE ALL ON TABLE "public"."user_exp_daily" FROM "anon";
REVOKE ALL ON TABLE "public"."user_exp_daily" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_exp_daily" TO "service_role";

REVOKE ALL ON TABLE "public"."user_favorite_limits" FROM "anon";
REVOKE ALL ON TABLE "public"."user_favorite_limits" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_favorite_limits" TO "service_role";

REVOKE ALL ON TABLE "public"."user_favorites" FROM "anon";
REVOKE ALL ON TABLE "public"."user_favorites" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";

REVOKE ALL ON TABLE "public"."user_level_rewards" FROM "anon";
REVOKE ALL ON TABLE "public"."user_level_rewards" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_level_rewards" TO "service_role";

REVOKE ALL ON TABLE "public"."user_owned_items" FROM "anon";
REVOKE ALL ON TABLE "public"."user_owned_items" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_owned_items" TO "service_role";

REVOKE ALL ON TABLE "public"."user_prestige_history" FROM "anon";
REVOKE ALL ON TABLE "public"."user_prestige_history" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_prestige_history" TO "service_role";

REVOKE ALL ON TABLE "public"."user_season_records" FROM "anon";
REVOKE ALL ON TABLE "public"."user_season_records" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_season_records" TO "service_role";

REVOKE ALL ON TABLE "public"."user_settings" FROM "anon";
REVOKE ALL ON TABLE "public"."user_settings" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";

REVOKE ALL ON TABLE "public"."user_streak_days" FROM "anon";
REVOKE ALL ON TABLE "public"."user_streak_days" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_streak_days" TO "service_role";

REVOKE ALL ON TABLE "public"."user_streak_freeze_grants" FROM "anon";
REVOKE ALL ON TABLE "public"."user_streak_freeze_grants" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "service_role";

REVOKE ALL ON TABLE "public"."user_streak_freeze_inventory" FROM "anon";
REVOKE ALL ON TABLE "public"."user_streak_freeze_inventory" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "service_role";

REVOKE ALL ON TABLE "public"."user_streaks" FROM "anon";
REVOKE ALL ON TABLE "public"."user_streaks" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";

REVOKE ALL ON TABLE "public"."admin_users_unified" FROM "anon";
REVOKE ALL ON TABLE "public"."admin_users_unified" FROM "authenticated";
GRANT ALL ON TABLE "public"."admin_users_unified" TO "service_role";

REVOKE ALL ON TABLE "public"."changelogs_with_creator" FROM "anon";
REVOKE ALL ON TABLE "public"."changelogs_with_creator" FROM "authenticated";
GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "service_role";

REVOKE ALL ON TABLE "public"."public_user_info" FROM "anon";
REVOKE ALL ON TABLE "public"."public_user_info" FROM "authenticated";
GRANT ALL ON TABLE "public"."public_user_info" TO "service_role";

REVOKE ALL ON TABLE "public"."user_details_expanded" FROM "anon";
REVOKE ALL ON TABLE "public"."user_details_expanded" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_details_expanded" TO "service_role";

REVOKE ALL ON TABLE "public"."user_favorites_with_stats" FROM "anon";
REVOKE ALL ON TABLE "public"."user_favorites_with_stats" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "service_role";

REVOKE ALL ON TABLE "public"."user_settings_v" FROM "anon";
REVOKE ALL ON TABLE "public"."user_settings_v" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_settings_v" TO "service_role";

REVOKE ALL ON TABLE "public"."users_with_details" FROM "anon";
REVOKE ALL ON TABLE "public"."users_with_details" FROM "authenticated";
GRANT ALL ON TABLE "public"."users_with_details" TO "service_role";

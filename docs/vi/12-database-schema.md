# 12 -- Schema cơ sở dữ liệu

## Mục đích

Liệt kê toàn bộ bảng, view và hàm RPC Supabase/Postgres được sử dụng, kèm mô tả cột và tác dụng phụ.

## Phạm vi

Mọi bảng, view và RPC được tham chiếu trong mã nguồn.

## Phụ thuộc

- [02-architecture.md](02-architecture.md)

---

## 1. Bảng lõi

users (id, clerk_user_id, email, first_name, last_name, avatar_url, role, deleted, deleted_at, created_at, updated_at). user_details (user_id, bio, gender, date_of_birth, country, timezone, interest_tag_ids, ...). user_settings (user_id, theme, language, notifications_enabled, ...).

---

## 2. Tiến độ và streak

user_levels (user_id, total_exp_seconds). user_streaks (user_id, current_streak, longest_streak, last_valid_date, ...). user_streak_days (user_id, date, total_call_seconds, is_valid). user_exp_daily (user_id, date, exp_seconds, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed). user_level_rewards, user_streak_freeze_inventory, user_streak_freeze_grants.

---

## 3. Xã hội và kinh tế

user_favorites, user_favorite_limits, user_blocks. user_wallets (coin_balance, vault_coin_balance, total_earned, total_spent). user_coin_transactions (type, amount, source, metadata). economy_config, economy_metrics_daily, economy_health_reports. seasons (name, start_at, end_at, is_active, decay_threshold, decay_rate).

---

## 4. Giao tiếp và tham chiếu

call_history (caller_id, callee_id, started_at, ended_at, duration_seconds). notifications, push_subscriptions. reports, report_contexts. broadcast_history. interest_tags, changelogs. level_rewards, level_feature_unlocks, favorite_exp_boost_rules, streak_exp_bonuses. admin_config. user_embeddings (embedding vector, model_name, source_hash).

---

## 5. View

user_details_expanded, users_with_details, public_user_info, user_favorites_with_stats, admin_users_unified, changelogs_with_creator.

---

## 6. Hàm RPC (tóm tắt)

increment_user_exp, increment_user_exp_daily, increment_daily_exp_with_milestones, upsert_user_streak_day, prepare_streak_freeze, convert_exp_to_coin, purchase_shop_item, purchase_boost, claim_weekly_checkin, claim_monthly_checkin, claim_monthly_buyback, prestige_user, apply_user_seasonal_decay, snapshot_economy_metrics, get_economy_stats, find_similar_users_by_embedding. Chi tiết tham số và tác dụng phụ xem [en/12-database-schema.md](../en/12-database-schema.md).

---

## Thành phần liên quan

[07-economy-system.md](07-economy-system.md), [10-caching-architecture.md](10-caching-architecture.md), [14-api-contracts.md](14-api-contracts.md).

## Rủi ro

Service role bỏ qua RLS. Thay đổi RPC cần migration. Không có công cụ migration schema tự động được ghi nhận. User xóa mềm tích lũy không dọn.

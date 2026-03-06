# 07 -- Hệ thống kinh tế

## Mục đích

Mô tả kinh tế ảo Linky: mô hình hai loại tiền (EXP và Coin), ví, chuyển đổi, cửa hàng, boost, daily/weekly/monthly, prestige, decay mùa và stabilizer tự động.

## Phạm vi

Các domain economy, economy-shop, economy-boost, economy-daily, economy-weekly, economy-monthly, economy-season, economy-prestige và economy-stabilizer.context.

## Phụ thuộc

- [02-architecture.md](02-architecture.md), [04-video-chat-system.md](04-video-chat-system.md)

---

## 1. Mô hình tiền tệ

EXP: sinh ra từ thời lượng gọi (1 giây = 1 EXP cơ bản, nhân với streak/favorite). Coin: từ chuyển đổi EXP, thưởng daily/weekly/monthly, level reward; dùng mua shop/boost; có thể bị decay mùa (trên ngưỡng). Ví: coin_balance, vault_coin_balance (không decay), total_earned, total_spent.

---

## 2. EXP và chuyển đổi

addCallExp áp dụng streak bonus và favorite exp boost; ghi daily milestone (600/1800/3600 giây). convert_exp_to_coin: RPC, tối thiểu 100 EXP, bội số 100; trả về exp_spent, base_coins, bonus_coins, total_coins, new_coin_balance. Lỗi: INSUFFICIENT_EXP, INVALID_AMOUNT.

---

## 3. Shop, Boost, Weekly, Monthly

Shop: purchase_shop_item RPC; lỗi ITEM_NOT_FOUND, ALREADY_OWNED, INSUFFICIENT_COINS. Boost: exp_boost_30m (120 coin, 30 phút, 1.2x), daily_reward_multiplier (80 coin, 24h, 2x). Weekly: 7 ngày check-in, thưởng 2,3,4,5,6,8,18 coin; claim_weekly_checkin. Monthly: lịch theo ngày, buyback bằng EXP (chi phí 300+count*100, tối đa 800).

---

## 4. Prestige và mùa

prestige_user RPC: reset level/EXP, tăng vault bonus, cập nhật rank (plastic → ... → transcendent). Season: start_at, end_at, is_active, decay_threshold, decay_rate; chỉ một mùa active; apply_user_seasonal_decay RPC khi mùa kết thúc (vault không decay).

---

## 5. Economy Stabilizer

Đọc economy_metrics_daily (8 ngày), áp dụng: (1) 7 ngày liên tiếp mint > burn*1.3 → giảm conversion_bonus_multiplier 0.02 (sàn 0.5); (2) avg_coin_per_user > cap → tăng cosmetic_price_multiplier 0.05 (trần 2); (3) top_10_percent_ratio > 0.65 → tăng seasonal_decay_rate 0.05 (trần 0.8). Ghi economy_health_reports. Có thể tắt qua economy_config stabilization_enabled.

---

## Thành phần liên quan

[09-admin-system.md](09-admin-system.md), [12-database-schema.md](12-database-schema.md), [19-scalability-strategy.md](19-scalability-strategy.md).

## Rủi ro

Stabilizer chỉ giảm conversion bonus, không tự phục hồi deflation. Decay mùa không hoàn tác. RPC không idempotent; gọi trùng có thể sai trạng thái.

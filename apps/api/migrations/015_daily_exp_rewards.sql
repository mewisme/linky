ALTER TABLE "public"."user_exp_daily"
  ADD COLUMN IF NOT EXISTS "milestone_600_claimed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "milestone_1800_claimed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "milestone_3600_claimed" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN "public"."user_exp_daily"."milestone_600_claimed" IS 'Daily milestone 600 EXP -> 2 coins claimed for this date';
COMMENT ON COLUMN "public"."user_exp_daily"."milestone_1800_claimed" IS 'Daily milestone 1800 EXP -> 6 coins claimed for this date';
COMMENT ON COLUMN "public"."user_exp_daily"."milestone_3600_claimed" IS 'Daily milestone 3600 EXP -> 12 coins claimed for this date';

CREATE OR REPLACE FUNCTION "public"."increment_daily_exp_with_milestones"(
  "p_user_id" "uuid",
  "p_date" date,
  "p_exp_seconds" bigint
)
RETURNS TABLE(
  "exp_earned" bigint,
  "milestone_600_claimed" boolean,
  "milestone_1800_claimed" boolean,
  "milestone_3600_claimed" boolean
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_exp bigint;
  v_600 boolean;
  v_1800 boolean;
  v_3600 boolean;
  v_updated integer;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO user_exp_daily (user_id, date, exp_seconds, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed)
  VALUES (p_user_id, p_date, p_exp_seconds, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + p_exp_seconds,
    updated_at = now();

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_exp, v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 600 AND NOT v_600 THEN
    UPDATE user_exp_daily SET milestone_600_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_600_claimed AND exp_seconds >= 600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, 2, 2, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + 2,
        total_earned = user_wallets.total_earned + 2;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', 2, 'daily_milestone_600', jsonb_build_object('local_date', p_date, 'threshold', 600));
    END IF;
  END IF;

  SELECT ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed INTO v_600, v_1800, v_3600
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 1800 AND NOT v_1800 THEN
    UPDATE user_exp_daily SET milestone_1800_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_1800_claimed AND exp_seconds >= 1800;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, 6, 6, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + 6,
        total_earned = user_wallets.total_earned + 6;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', 6, 'daily_milestone_1800', jsonb_build_object('local_date', p_date, 'threshold', 1800));
    END IF;
  END IF;

  SELECT ud.milestone_1800_claimed, ud.milestone_3600_claimed INTO v_1800, v_3600
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 3600 AND NOT v_3600 THEN
    UPDATE user_exp_daily SET milestone_3600_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_3600_claimed AND exp_seconds >= 3600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, 12, 12, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + 12,
        total_earned = user_wallets.total_earned + 12;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', 12, 'daily_milestone_3600', jsonb_build_object('local_date', p_date, 'threshold', 3600));
    END IF;
  END IF;

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO exp_earned, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id AND ud.date = p_date;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) IS 'Increments daily EXP for a user and grants milestone coin rewards atomically.';

GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "service_role";

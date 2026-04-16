CREATE OR REPLACE FUNCTION "public"."grant_user_exp_daily_only"(
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
  v_effective_exp bigint;
  v_exp bigint;
  v_600 boolean;
  v_1800 boolean;
  v_3600 boolean;
  v_updated integer;
  v_daily_reward_multiplier double precision := 1.0;
  v_milestone_reward_multiplier numeric(10,4) := 1.0;
  v_reward_600 integer;
  v_reward_1800 integer;
  v_reward_3600 integer;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  v_effective_exp := p_exp_seconds;

  INSERT INTO user_exp_daily (
    user_id,
    date,
    exp_seconds,
    milestone_600_claimed,
    milestone_1800_claimed,
    milestone_3600_claimed
  )
  VALUES (p_user_id, p_date, v_effective_exp, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + v_effective_exp,
    updated_at = now();

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_exp, v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0)
  INTO v_milestone_reward_multiplier
  FROM economy_config ec
  WHERE ec.key = 'milestone_reward_multiplier';

  v_reward_600 := (2 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_1800 := (6 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_3600 := (12 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;

  IF v_exp >= 600 AND NOT v_600 THEN
    UPDATE user_exp_daily ud
    SET milestone_600_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_600_claimed
      AND ud.exp_seconds >= 600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_600, v_reward_600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_600,
        total_earned = user_wallets.total_earned + v_reward_600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_600,
        'daily_milestone_600',
        jsonb_build_object('local_date', p_date, 'threshold', 600)
      );
    END IF;
  END IF;

  SELECT ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  IF v_exp >= 1800 AND NOT v_1800 THEN
    UPDATE user_exp_daily ud
    SET milestone_1800_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_1800_claimed
      AND ud.exp_seconds >= 1800;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_1800, v_reward_1800, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_1800,
        total_earned = user_wallets.total_earned + v_reward_1800;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_1800,
        'daily_milestone_1800',
        jsonb_build_object('local_date', p_date, 'threshold', 1800)
      );
    END IF;
  END IF;

  SELECT ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  IF v_exp >= 3600 AND NOT v_3600 THEN
    UPDATE user_exp_daily ud
    SET milestone_3600_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_3600_claimed
      AND ud.exp_seconds >= 3600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_3600, v_reward_3600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_3600,
        total_earned = user_wallets.total_earned + v_reward_3600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_3600,
        'daily_milestone_3600',
        jsonb_build_object('local_date', p_date, 'threshold', 3600)
      );
    END IF;
  END IF;

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO exp_earned, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  RETURN NEXT;
END;
$$;

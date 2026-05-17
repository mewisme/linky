-- Remove dependency on dropped tables public.user_wallets and public.user_coin_transactions.
-- Daily EXP milestones still update user_exp_daily claim flags only.

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

  IF v_exp >= 600 AND NOT v_600 THEN
    UPDATE user_exp_daily ud
    SET milestone_600_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_600_claimed
      AND ud.exp_seconds >= 600;
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
  END IF;

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO exp_earned, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) IS 'Updates user_exp_daily and milestone claim flags only (no user_levels or economy tables).';

-- Remove dependency on missing table public.user_exp_transactions.
-- Keep total EXP and prestige_points updates intact.

CREATE OR REPLACE FUNCTION "public"."grant_user_exp_total"(
  "p_user_id" "uuid",
  "p_exp_seconds" bigint,
  "p_date" date,
  "p_reason" text
)
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_effective_exp bigint;
  v_divisor bigint := 2000;
  v_points integer;
  v_config jsonb;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  v_effective_exp := p_exp_seconds;

  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, v_effective_exp)
  ON CONFLICT (user_id)
  DO UPDATE SET total_exp_seconds = GREATEST(0, user_levels.total_exp_seconds + v_effective_exp);

  UPDATE users
  SET lifetime_exp = lifetime_exp + v_effective_exp
  WHERE id = p_user_id;

  SELECT value_json INTO v_config
  FROM economy_config
  WHERE key = 'prestige_divisor';

  IF v_config IS NOT NULL THEN
    v_divisor := (v_config#>>'{}')::bigint;
  END IF;

  IF v_divisor IS NULL OR v_divisor <= 0 THEN
    v_divisor := 2000;
  END IF;

  SELECT floor((SELECT lifetime_exp FROM users WHERE id = p_user_id) / v_divisor)::integer
  INTO v_points;

  UPDATE users
  SET prestige_points = v_points
  WHERE id = p_user_id;
END;
$$;

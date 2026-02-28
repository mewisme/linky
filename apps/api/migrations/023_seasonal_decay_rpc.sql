CREATE OR REPLACE FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid")
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_decay_threshold integer;
  v_decay_rate numeric(5,4);
  v_coin_balance integer;
  v_excess integer;
  v_decay_amount integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_season_records
    WHERE user_id = p_user_id AND season_id = p_season_id AND decay_processed = true
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM seasons WHERE id = p_season_id AND end_at <= now()
  ) THEN
    RAISE EXCEPTION 'SEASON_NOT_EXPIRED' USING errcode = 'check_violation';
  END IF;

  SELECT decay_threshold, decay_rate INTO v_decay_threshold, v_decay_rate
  FROM seasons WHERE id = p_season_id;

  SELECT coin_balance INTO v_coin_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_coin_balance IS NULL THEN
    INSERT INTO user_season_records (user_id, season_id, decay_processed)
    VALUES (p_user_id, p_season_id, true)
    ON CONFLICT (user_id, season_id) DO UPDATE SET decay_processed = true;
    RETURN;
  END IF;

  v_excess := GREATEST(v_coin_balance - v_decay_threshold, 0);

  IF v_excess > 0 THEN
    v_decay_amount := FLOOR(v_excess * v_decay_rate)::integer;

    IF v_decay_amount > 0 THEN
      UPDATE user_wallets
      SET coin_balance = coin_balance - v_decay_amount,
          vault_coin_balance = vault_coin_balance + v_decay_amount
      WHERE user_id = p_user_id;

      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'seasonal_decay',
        -v_decay_amount,
        'seasonal_decay',
        jsonb_build_object('season_id', p_season_id, 'threshold', v_decay_threshold, 'rate', v_decay_rate)
      );

      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'vault_deposit',
        v_decay_amount,
        'seasonal_decay',
        jsonb_build_object('season_id', p_season_id)
      );
    END IF;
  END IF;

  INSERT INTO user_season_records (user_id, season_id, decay_processed)
  VALUES (p_user_id, p_season_id, true)
  ON CONFLICT (user_id, season_id) DO UPDATE SET decay_processed = true;
END;
$$;

ALTER FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") IS 'Applies soft decay for one user for an expired season. Idempotent; no-op if already processed. Raises SEASON_NOT_EXPIRED if season not ended.';

CREATE OR REPLACE FUNCTION "public"."snapshot_economy_metrics"()
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_date date := (now() AT TIME ZONE 'UTC')::date;
  v_total_coin_supply bigint;
  v_total_vault_supply bigint;
  v_total_exp_supply bigint;
  v_total_coin_minted bigint;
  v_total_coin_burned bigint;
BEGIN
  SELECT COALESCE(SUM(coin_balance), 0)::bigint INTO v_total_coin_supply FROM user_wallets;
  SELECT COALESCE(SUM(vault_coin_balance), 0)::bigint INTO v_total_vault_supply FROM user_wallets;
  SELECT COALESCE(SUM(total_exp_seconds), 0)::bigint INTO v_total_exp_supply FROM user_levels;
  SELECT COALESCE(SUM(amount), 0)::bigint INTO v_total_coin_minted FROM user_coin_transactions WHERE amount > 0;
  SELECT COALESCE(SUM(ABS(amount)), 0)::bigint INTO v_total_coin_burned FROM user_coin_transactions WHERE amount < 0;

  INSERT INTO economy_metrics_daily (date, total_coin_supply, total_vault_supply, total_exp_supply, total_coin_minted, total_coin_burned)
  VALUES (v_date, v_total_coin_supply, v_total_vault_supply, v_total_exp_supply, v_total_coin_minted, v_total_coin_burned)
  ON CONFLICT (date) DO UPDATE SET
    total_coin_supply = EXCLUDED.total_coin_supply,
    total_vault_supply = EXCLUDED.total_vault_supply,
    total_exp_supply = EXCLUDED.total_exp_supply,
    total_coin_minted = EXCLUDED.total_coin_minted,
    total_coin_burned = EXCLUDED.total_coin_burned;
END;
$$;

ALTER FUNCTION "public"."snapshot_economy_metrics"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."snapshot_economy_metrics"() IS 'Upserts daily economy aggregates for today UTC into economy_metrics_daily.';

GRANT ALL ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."snapshot_economy_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."snapshot_economy_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."snapshot_economy_metrics"() TO "service_role";

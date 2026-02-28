CREATE OR REPLACE FUNCTION "public"."get_economy_stats"()
RETURNS TABLE(
  "total_coin_supply" bigint,
  "total_coins_minted" bigint,
  "total_exp_burned" bigint,
  "daily_mint_rate" bigint,
  "daily_burn_rate" bigint
)
LANGUAGE "plpgsql"
STABLE
AS $$
BEGIN
  total_coin_supply := (SELECT COALESCE(SUM(coin_balance), 0)::bigint FROM user_wallets);

  total_coins_minted := (
    SELECT COALESCE(SUM(amount), 0)::bigint
    FROM user_coin_transactions
    WHERE amount > 0
  );

  total_exp_burned := (
    SELECT COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM user_exp_transactions
    WHERE amount < 0
  );

  daily_mint_rate := (
    SELECT COALESCE(SUM(amount), 0)::bigint
    FROM user_coin_transactions
    WHERE amount > 0 AND created_at >= now() - interval '24 hours'
  );

  daily_burn_rate := (
    SELECT COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM user_coin_transactions
    WHERE type IN ('shop_purchase', 'boost_purchase') AND created_at >= now() - interval '24 hours'
  );

  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."get_economy_stats"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."get_economy_stats"() IS 'Read-only aggregate stats for admin economy dashboard.';

GRANT ALL ON FUNCTION "public"."get_economy_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_economy_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_economy_stats"() TO "service_role";

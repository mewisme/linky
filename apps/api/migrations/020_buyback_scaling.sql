CREATE OR REPLACE FUNCTION "public"."buyback_cost_for_index"("p_index" integer)
RETURNS integer
LANGUAGE "plpgsql"
IMMUTABLE
AS $$
BEGIN
  RETURN LEAST(300 + (p_index * 100), 800);
END;
$$;

ALTER FUNCTION "public"."buyback_cost_for_index"("p_index" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) IS 'Monthly buyback EXP cost: 300 + (index * 100), capped at 800';

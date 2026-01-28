CREATE TABLE IF NOT EXISTS "public"."user_exp_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" date NOT NULL,
    "exp_seconds" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_exp_daily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_exp_daily_user_id_date_key" UNIQUE ("user_id", "date"),
    CONSTRAINT "check_exp_seconds" CHECK (("exp_seconds" >= 0))
);

ALTER TABLE "public"."user_exp_daily" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_exp_daily" IS 'Stores daily EXP totals (with bonuses) for each user. This is the source of truth for expEarnedToday calculations.';

COMMENT ON COLUMN "public"."user_exp_daily"."user_id" IS 'Foreign key reference to users table';

COMMENT ON COLUMN "public"."user_exp_daily"."date" IS 'Local date (YYYY-MM-DD) in user timezone when EXP was earned';

COMMENT ON COLUMN "public"."user_exp_daily"."exp_seconds" IS 'Total EXP earned on this date (includes streak and favorite bonuses)';

CREATE INDEX IF NOT EXISTS "user_exp_daily_user_id_date_idx" ON "public"."user_exp_daily" ("user_id", "date");

CREATE OR REPLACE FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_exp_daily (user_id, date, exp_seconds)
  VALUES (p_user_id, p_date, p_exp_seconds)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + p_exp_seconds,
    updated_at = now();
END;
$$;

ALTER FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) IS 'Increments daily EXP for a user on a specific date. Creates row if missing.';

GRANT ALL ON TABLE "public"."user_exp_daily" TO "anon";
GRANT ALL ON TABLE "public"."user_exp_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."user_exp_daily" TO "service_role";

GRANT ALL ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "service_role";

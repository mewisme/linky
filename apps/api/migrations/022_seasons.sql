CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "is_active" boolean NOT NULL DEFAULT false,
    "decay_threshold" integer NOT NULL DEFAULT 500,
    "decay_rate" numeric(5,4) NOT NULL DEFAULT 0.3,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "check_decay_threshold" CHECK (("decay_threshold" >= 0)),
    CONSTRAINT "check_decay_rate" CHECK (("decay_rate" >= 0 AND "decay_rate" <= 1))
);

ALTER TABLE "public"."seasons" OWNER TO "postgres";

COMMENT ON TABLE "public"."seasons" IS 'Seasonal periods for soft decay. Only one active season at a time.';

CREATE UNIQUE INDEX "idx_seasons_single_active" ON "public"."seasons" ((true)) WHERE ("is_active" = true);

CREATE TABLE IF NOT EXISTS "public"."user_season_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "decay_processed" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_season_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_season_records_user_season_key" UNIQUE ("user_id", "season_id")
);

ALTER TABLE "public"."user_season_records" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_season_records" IS 'Tracks per-user decay processing per season for idempotency.';

CREATE INDEX IF NOT EXISTS "idx_user_season_records_season" ON "public"."user_season_records" ("season_id");
CREATE INDEX IF NOT EXISTS "idx_user_season_records_user" ON "public"."user_season_records" ("user_id");

ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "fk_user_season_records_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "fk_user_season_records_season" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."economy_metrics_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" date NOT NULL,
    "total_coin_supply" bigint NOT NULL DEFAULT 0,
    "total_vault_supply" bigint NOT NULL DEFAULT 0,
    "total_exp_supply" bigint NOT NULL DEFAULT 0,
    "total_coin_minted" bigint NOT NULL DEFAULT 0,
    "total_coin_burned" bigint NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "economy_metrics_daily_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "economy_metrics_daily_date_key" UNIQUE ("date")
);

ALTER TABLE "public"."economy_metrics_daily" OWNER TO "postgres";

COMMENT ON TABLE "public"."economy_metrics_daily" IS 'Daily snapshot of economy aggregates for reporting.';

CREATE INDEX IF NOT EXISTS "idx_economy_metrics_daily_date" ON "public"."economy_metrics_daily" ("date" DESC);

ALTER TABLE "public"."user_wallets"
    ADD COLUMN IF NOT EXISTS "vault_coin_balance" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."user_wallets"
    ADD CONSTRAINT "check_vault_coin_balance" CHECK (("vault_coin_balance" >= 0));

CREATE OR REPLACE FUNCTION "public"."update_seasons_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_seasons_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trigger_update_seasons_updated_at"
  BEFORE UPDATE ON "public"."seasons"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_seasons_updated_at"();

GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";

GRANT ALL ON TABLE "public"."user_season_records" TO "anon";
GRANT ALL ON TABLE "public"."user_season_records" TO "authenticated";
GRANT ALL ON TABLE "public"."user_season_records" TO "service_role";

GRANT ALL ON TABLE "public"."economy_metrics_daily" TO "anon";
GRANT ALL ON TABLE "public"."economy_metrics_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_metrics_daily" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "service_role";

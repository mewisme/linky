CREATE OR REPLACE FUNCTION "public"."update_user_wallets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_user_wallets_updated_at"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "coin_balance" integer NOT NULL DEFAULT 0,
    "total_earned" integer NOT NULL DEFAULT 0,
    "total_spent" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_wallets_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "check_coin_balance" CHECK (("coin_balance" >= 0)),
    CONSTRAINT "check_total_earned" CHECK (("total_earned" >= 0)),
    CONSTRAINT "check_total_spent" CHECK (("total_spent" >= 0))
);

ALTER TABLE "public"."user_wallets" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_wallets" IS 'One wallet per user for coin balance and lifetime stats.';

CREATE TABLE IF NOT EXISTS "public"."user_coin_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" text NOT NULL,
    "amount" integer NOT NULL,
    "source" text NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_coin_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."user_coin_transactions" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_coin_transactions" IS 'Append-only ledger for coin movements.';

COMMENT ON COLUMN "public"."user_coin_transactions"."type" IS 'exp_conversion | level_reward | admin_adjustment';

CREATE TABLE IF NOT EXISTS "public"."user_exp_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" text NOT NULL,
    "amount" integer NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_exp_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."user_exp_transactions" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_exp_transactions" IS 'Append-only ledger for EXP movements.';

COMMENT ON COLUMN "public"."user_exp_transactions"."type" IS 'call_duration | exp_conversion | admin_adjustment';

CREATE INDEX IF NOT EXISTS "idx_user_wallets_user_id" ON "public"."user_wallets" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_coin_transactions_user_id" ON "public"."user_coin_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_coin_transactions_created_at" ON "public"."user_coin_transactions" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_exp_transactions_user_id" ON "public"."user_exp_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_exp_transactions_created_at" ON "public"."user_exp_transactions" ("created_at" DESC);

CREATE OR REPLACE TRIGGER "trigger_update_user_wallets_updated_at"
  BEFORE UPDATE ON "public"."user_wallets"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_user_wallets_updated_at"();

ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "fk_user_wallets_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "fk_user_coin_transactions_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_exp_transactions"
    ADD CONSTRAINT "fk_user_exp_transactions_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint)
RETURNS TABLE(
  "exp_spent" bigint,
  "base_coins" integer,
  "bonus_coins" integer,
  "total_coins" integer,
  "new_coin_balance" integer
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_current_exp bigint;
  v_bonus_pct integer := 0;
  v_base integer;
  v_bonus integer;
  v_total integer;
  v_prev_balance integer;
  v_new_balance integer;
BEGIN
  IF p_exp_amount IS NULL OR p_exp_amount < 100 OR p_exp_amount % 100 != 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING errcode = 'check_violation';
  END IF;

  SELECT total_exp_seconds INTO v_current_exp
  FROM user_levels
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_exp IS NULL OR v_current_exp < p_exp_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_EXP' USING errcode = 'check_violation';
  END IF;

  IF p_exp_amount >= 10000 THEN
    v_bonus_pct := 15;
  ELSIF p_exp_amount >= 5000 THEN
    v_bonus_pct := 10;
  ELSIF p_exp_amount >= 1000 THEN
    v_bonus_pct := 5;
  END IF;

  v_base := (p_exp_amount / 100)::integer;
  v_bonus := (v_base * v_bonus_pct / 100)::integer;
  v_total := v_base + v_bonus;

  UPDATE user_levels
  SET total_exp_seconds = total_exp_seconds - p_exp_amount
  WHERE user_id = p_user_id;

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, 'exp_conversion', -(p_exp_amount)::integer, jsonb_build_object('conversion_total_coins', v_total));

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_total, v_total, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_total,
    total_earned = user_wallets.total_earned + v_total;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (
    p_user_id,
    'exp_conversion',
    v_total,
    'exp_conversion',
    jsonb_build_object('exp_spent', p_exp_amount, 'base_coins', v_base, 'bonus_coins', v_bonus)
  );

  SELECT coin_balance INTO v_new_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  exp_spent := p_exp_amount;
  base_coins := v_base;
  bonus_coins := v_bonus;
  total_coins := v_total;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) IS 'Atomically deducts EXP, upserts wallet, writes both ledger entries. Min 100 EXP, multiple of 100.';

GRANT ALL ON TABLE "public"."user_wallets" TO "anon";
GRANT ALL ON TABLE "public"."user_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_wallets" TO "service_role";

GRANT ALL ON TABLE "public"."user_coin_transactions" TO "anon";
GRANT ALL ON TABLE "public"."user_coin_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coin_transactions" TO "service_role";

GRANT ALL ON TABLE "public"."user_exp_transactions" TO "anon";
GRANT ALL ON TABLE "public"."user_exp_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_exp_transactions" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_user_wallets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_wallets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_wallets_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) TO "service_role";

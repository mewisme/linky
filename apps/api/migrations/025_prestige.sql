DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prestige_rank') THEN
    CREATE TYPE "public"."prestige_rank" AS ENUM (
      'plastic', 'bronze', 'silver', 'gold', 'platinum', 'diamond',
      'immortal', 'ascendant', 'eternal', 'mythic', 'celestial', 'transcendent'
    );
  END IF;
END
$$;

ALTER TYPE "public"."prestige_rank" OWNER TO "postgres";

COMMENT ON TYPE "public"."prestige_rank" IS 'Prestige rank names; each rank has tiers I-III except transcendent.';

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "prestige_rank" "public"."prestige_rank" NOT NULL DEFAULT 'plastic',
  ADD COLUMN IF NOT EXISTS "prestige_tier" integer,
  ADD COLUMN IF NOT EXISTS "prestige_points" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lifetime_exp" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_prestiges" integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_prestige_points') THEN
    ALTER TABLE "public"."users" ADD CONSTRAINT "check_prestige_points" CHECK (prestige_points >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_lifetime_exp') THEN
    ALTER TABLE "public"."users" ADD CONSTRAINT "check_lifetime_exp" CHECK (lifetime_exp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_total_prestiges') THEN
    ALTER TABLE "public"."users" ADD CONSTRAINT "check_total_prestiges" CHECK (total_prestiges >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_prestige_tier') THEN
    ALTER TABLE "public"."users" ADD CONSTRAINT "check_prestige_tier" CHECK (prestige_tier IS NULL OR (prestige_tier >= 1 AND prestige_tier <= 3));
  END IF;
END
$$;

COMMENT ON COLUMN "public"."users"."prestige_rank" IS 'Current prestige rank from cumulative prestige points.';
COMMENT ON COLUMN "public"."users"."prestige_tier" IS '1-3 for ranks below transcendent; null for transcendent.';
COMMENT ON COLUMN "public"."users"."prestige_points" IS 'Cumulative floor(lifetime_exp / prestige_divisor); never decreases.';
COMMENT ON COLUMN "public"."users"."lifetime_exp" IS 'Total EXP ever earned; only increases on EXP add, not on conversion or prestige.';
COMMENT ON COLUMN "public"."users"."total_prestiges" IS 'Number of times user has prestiged.';

CREATE TABLE IF NOT EXISTS "public"."user_prestige_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "season_id" uuid,
  "exp_before_reset" bigint NOT NULL,
  "level_before_reset" integer NOT NULL,
  "prestige_points_awarded" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_prestige_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."user_prestige_history" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_prestige_history" IS 'Log of each prestige reset for a user.';

CREATE INDEX IF NOT EXISTS "idx_user_prestige_history_user_id" ON "public"."user_prestige_history" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_prestige_history_created_at" ON "public"."user_prestige_history" ("created_at" DESC);

ALTER TABLE ONLY "public"."user_prestige_history"
  ADD CONSTRAINT "fk_user_prestige_history_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_prestige_history"
  ADD CONSTRAINT "fk_user_prestige_history_season" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "public"."economy_config" (
  "key" text NOT NULL,
  "value_json" jsonb NOT NULL,
  CONSTRAINT "economy_config_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "public"."economy_config" OWNER TO "postgres";

COMMENT ON TABLE "public"."economy_config" IS 'Tunable economy parameters; value_json holds numeric or small structure.';

INSERT INTO "public"."economy_config" ("key", "value_json")
VALUES
  ('prestige_min_level', to_jsonb(50)),
  ('prestige_min_total_exp', to_jsonb(100000)),
  ('prestige_divisor', to_jsonb(2000)),
  ('prestige_vault_multiplier', to_jsonb(50))
ON CONFLICT ("key") DO NOTHING;

CREATE OR REPLACE FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint)
RETURNS integer
LANGUAGE "plpgsql"
IMMUTABLE
AS $$
DECLARE
  v_level integer := 1;
  v_exp_required bigint := 0;
  v_base integer := 300;
  v_step integer := 120;
BEGIN
  IF p_total_exp_seconds IS NULL OR p_total_exp_seconds <= 0 THEN
    RETURN 1;
  END IF;
  WHILE v_exp_required + v_base + (v_level - 1) * v_step <= p_total_exp_seconds LOOP
    v_exp_required := v_exp_required + v_base + (v_level - 1) * v_step;
    v_level := v_level + 1;
  END LOOP;
  RETURN v_level;
END;
$$;

ALTER FUNCTION "public"."fn_exp_to_level"(bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_exp_to_level"(bigint) IS 'Level from total_exp_seconds using base=300, step=120 (matches app level-from-exp).';

CREATE OR REPLACE FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer)
RETURNS TABLE("rank" "public"."prestige_rank", "tier" integer)
LANGUAGE "plpgsql"
IMMUTABLE
AS $$
DECLARE
  v_rank_idx integer;
  v_tier integer;
  v_points integer := COALESCE(p_prestige_points, 0);
BEGIN
  IF v_points >= 3600 THEN
    rank := 'transcendent'::"public"."prestige_rank";
    tier := NULL;
    RETURN NEXT;
    RETURN;
  END IF;
  v_rank_idx := LEAST(11, v_points / 300);
  v_tier := (v_points % 300) / 100 + 1;
  IF v_tier < 1 THEN v_tier := 1; END IF;
  IF v_tier > 3 THEN v_tier := 3; END IF;
  rank := CASE v_rank_idx
    WHEN 0 THEN 'plastic'::"public"."prestige_rank"
    WHEN 1 THEN 'bronze'::"public"."prestige_rank"
    WHEN 2 THEN 'silver'::"public"."prestige_rank"
    WHEN 3 THEN 'gold'::"public"."prestige_rank"
    WHEN 4 THEN 'platinum'::"public"."prestige_rank"
    WHEN 5 THEN 'diamond'::"public"."prestige_rank"
    WHEN 6 THEN 'immortal'::"public"."prestige_rank"
    WHEN 7 THEN 'ascendant'::"public"."prestige_rank"
    WHEN 8 THEN 'eternal'::"public"."prestige_rank"
    WHEN 9 THEN 'mythic'::"public"."prestige_rank"
    WHEN 10 THEN 'celestial'::"public"."prestige_rank"
    ELSE 'transcendent'::"public"."prestige_rank"
  END;
  tier := v_tier;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."fn_prestige_rank_tier"(integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_prestige_rank_tier"(integer) IS 'Derives prestige_rank and tier (1-3 or null) from prestige_points.';

CREATE OR REPLACE FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint)
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_divisor bigint := 2000;
  v_points integer;
  v_rank "public"."prestige_rank";
  v_tier integer;
  v_config jsonb;
BEGIN
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, p_seconds)
  ON CONFLICT (user_id)
  DO UPDATE SET total_exp_seconds = user_levels.total_exp_seconds + p_seconds;

  UPDATE users
  SET lifetime_exp = lifetime_exp + p_seconds
  WHERE id = p_user_id;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_divisor';
  IF v_config IS NOT NULL THEN
    v_divisor := (v_config#>>'{}')::bigint;
  END IF;
  IF v_divisor IS NULL OR v_divisor <= 0 THEN
    v_divisor := 2000;
  END IF;

  SELECT floor((SELECT lifetime_exp FROM users WHERE id = p_user_id) / v_divisor)::integer INTO v_points;

  SELECT f.rank, f.tier INTO v_rank, v_tier
  FROM fn_prestige_rank_tier(v_points) f;

  UPDATE users
  SET prestige_points = v_points,
      prestige_rank = v_rank,
      prestige_tier = v_tier
  WHERE id = p_user_id;
END;
$$;

ALTER FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) IS 'Increments user_levels and users.lifetime_exp; recalculates prestige_points, prestige_rank, prestige_tier.';

CREATE OR REPLACE FUNCTION "public"."prestige_user"("p_user_id" "uuid")
RETURNS TABLE(
  "vault_bonus" integer,
  "new_total_prestiges" integer,
  "prestige_rank" "public"."prestige_rank",
  "prestige_tier" integer
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_total_exp bigint;
  v_level integer;
  v_total_prestiges integer;
  v_min_level integer := 50;
  v_min_exp bigint := 100000;
  v_mult integer := 50;
  v_vault_bonus integer;
  v_season_id uuid;
  v_config jsonb;
  v_rank "public"."prestige_rank";
  v_tier integer;
BEGIN
  SELECT ul.total_exp_seconds INTO v_total_exp
  FROM user_levels ul
  WHERE ul.user_id = p_user_id
  FOR UPDATE;

  IF v_total_exp IS NULL THEN
    INSERT INTO user_levels (user_id, total_exp_seconds) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RAISE EXCEPTION 'PRESTIGE_THRESHOLD_NOT_MET' USING errcode = 'check_violation';
  END IF;

  v_level := fn_exp_to_level(v_total_exp);

  SELECT u.total_prestiges INTO v_total_prestiges
  FROM users u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF v_total_prestiges IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING errcode = 'check_violation';
  END IF;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_min_level';
  IF v_config IS NOT NULL THEN
    v_min_level := (v_config#>>'{}')::integer;
  END IF;
  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_min_total_exp';
  IF v_config IS NOT NULL THEN
    v_min_exp := (v_config#>>'{}')::bigint;
  END IF;

  IF v_level < v_min_level AND v_total_exp < v_min_exp THEN
    RAISE EXCEPTION 'PRESTIGE_THRESHOLD_NOT_MET' USING errcode = 'check_violation';
  END IF;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_vault_multiplier';
  IF v_config IS NOT NULL THEN
    v_mult := (v_config#>>'{}')::integer;
  END IF;
  IF v_mult IS NULL OR v_mult <= 0 THEN
    v_mult := 50;
  END IF;

  v_total_prestiges := v_total_prestiges + 1;
  v_vault_bonus := v_total_prestiges * v_mult;

  UPDATE user_levels SET total_exp_seconds = 0 WHERE user_id = p_user_id;

  UPDATE users SET total_prestiges = v_total_prestiges WHERE id = p_user_id;

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent, vault_coin_balance)
  VALUES (p_user_id, 0, 0, 0, v_vault_bonus)
  ON CONFLICT (user_id) DO UPDATE SET
    vault_coin_balance = user_wallets.vault_coin_balance + v_vault_bonus;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (
    p_user_id,
    'vault_deposit',
    v_vault_bonus,
    'prestige',
    jsonb_build_object('total_prestiges', v_total_prestiges, 'prestige_vault_multiplier', v_mult)
  );

  SELECT id INTO v_season_id FROM seasons WHERE is_active = true LIMIT 1;

  INSERT INTO user_prestige_history (user_id, season_id, exp_before_reset, level_before_reset, prestige_points_awarded)
  VALUES (p_user_id, v_season_id, v_total_exp, v_level, 0);

  SELECT u.prestige_rank, u.prestige_tier INTO v_rank, v_tier FROM users u WHERE u.id = p_user_id;

  vault_bonus := v_vault_bonus;
  new_total_prestiges := v_total_prestiges;
  prestige_user.prestige_rank := v_rank;
  prestige_user.prestige_tier := v_tier;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."prestige_user"("p_user_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") IS 'Atomic prestige: reset EXP/level, increment total_prestiges, grant vault bonus, log history.';

DROP VIEW IF EXISTS "public"."admin_users_unified";

CREATE VIEW "public"."admin_users_unified" AS
SELECT
  "u"."id" AS "user_id",
  "u"."clerk_user_id",
  "u"."email",
  "u"."role",
  "u"."deleted",
  "u"."created_at",
  "u"."first_name",
  "u"."last_name",
  "u"."avatar_url",
  "u"."country",
  "u"."updated_at",
  "u"."deleted_at",
  "u"."prestige_rank",
  "u"."prestige_tier",
  "u"."prestige_points",
  "u"."lifetime_exp",
  "u"."total_prestiges",
  "ud"."bio",
  "ud"."gender",
  "ud"."date_of_birth",
  COALESCE(
    (SELECT array_agg("it"."name" ORDER BY "it"."name") FROM "public"."interest_tags" "it" WHERE "it"."id" = ANY(COALESCE("ud"."interest_tags", '{}'::uuid[]))),
    '{}'::text[]
  ) AS "interest_tags",
  "ue"."model_name" AS "embedding_model",
  "ue"."source_hash" AS "embedding_source_hash",
  "ue"."updated_at" AS "embedding_updated_at",
  "ul"."total_exp_seconds"
FROM "public"."users" "u"
LEFT JOIN "public"."user_details" "ud" ON "u"."id" = "ud"."user_id"
LEFT JOIN "public"."user_embeddings" "ue" ON "u"."id" = "ue"."user_id"
LEFT JOIN "public"."user_levels" "ul" ON "u"."id" = "ul"."user_id";

ALTER VIEW "public"."admin_users_unified" OWNER TO "postgres";

GRANT SELECT ON "public"."admin_users_unified" TO "anon";
GRANT SELECT ON "public"."admin_users_unified" TO "authenticated";
GRANT SELECT ON "public"."admin_users_unified" TO "service_role";

GRANT ALL ON TABLE "public"."user_prestige_history" TO "anon";
GRANT ALL ON TABLE "public"."user_prestige_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_prestige_history" TO "service_role";

GRANT ALL ON TABLE "public"."economy_config" TO "anon";
GRANT ALL ON TABLE "public"."economy_config" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_config" TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."fn_exp_to_level"(bigint) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_exp_to_level"(bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_exp_to_level"(bigint) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"(integer) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"(integer) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") TO "service_role";

-- Favorite EXP bonuses: type=favorite with config {"relation": "mutual"|"one_way"}.

ALTER TABLE "public"."exp_bonuses"
  DROP CONSTRAINT IF EXISTS "exp_bonuses_type_check";

ALTER TABLE "public"."exp_bonuses"
  ADD CONSTRAINT "exp_bonuses_type_check" CHECK (
    "type" IN ('streak', 'level', 'favorite')
  );

ALTER TABLE "public"."exp_bonuses"
  DROP CONSTRAINT IF EXISTS "exp_bonuses_config_range_check";

ALTER TABLE "public"."exp_bonuses"
  ADD CONSTRAINT "exp_bonuses_config_valid_check" CHECK (
    (
      "type" = 'favorite'
      AND "config" ? 'relation'
      AND "config" ->> 'relation' IN ('mutual', 'one_way')
      AND NOT ("config" ? 'min')
      AND NOT ("config" ? 'max')
    )
    OR (
      "type" IN ('streak', 'level')
      AND ("config" ? 'min' OR "config" ? 'max')
      AND (
        NOT ("config" ? 'min')
        OR ("config" ->> 'min')::int >= 0
      )
      AND (
        NOT ("config" ? 'min')
        OR NOT ("config" ? 'max')
        OR ("config" ->> 'max')::int >= ("config" ->> 'min')::int
      )
    )
  );

COMMENT ON COLUMN "public"."exp_bonuses"."config" IS 'streak/level: inclusive min and/or max. favorite: {"relation":"mutual"|"one_way"} when calling a favorite match.';

INSERT INTO "public"."exp_bonuses" ("bonus_multiplier", "type", "config")
SELECT 2.00, 'favorite', '{"relation": "mutual"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."exp_bonuses"
  WHERE "type" = 'favorite' AND "config" ->> 'relation' = 'mutual'
);

INSERT INTO "public"."exp_bonuses" ("bonus_multiplier", "type", "config")
SELECT 1.25, 'favorite', '{"relation": "one_way"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."exp_bonuses"
  WHERE "type" = 'favorite' AND "config" ->> 'relation' = 'one_way'
);

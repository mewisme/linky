-- Allow exp_bonuses.config to specify only min or only max (open-ended range).
-- min only  -> no upper bound; max only -> no lower bound (streak/level still >= 0 at runtime).

ALTER TABLE "public"."exp_bonuses"
  DROP CONSTRAINT IF EXISTS "exp_bonuses_config_range_check";

ALTER TABLE "public"."exp_bonuses"
  ADD CONSTRAINT "exp_bonuses_config_range_check" CHECK (
    ("config" ? 'min' OR "config" ? 'max')
    AND (
      NOT ("config" ? 'min')
      OR ("config" ->> 'min')::int >= 0
    )
    AND (
      NOT ("config" ? 'min')
      OR NOT ("config" ? 'max')
      OR ("config" ->> 'max')::int >= ("config" ->> 'min')::int
    )
  );

COMMENT ON COLUMN "public"."exp_bonuses"."config" IS 'Inclusive range: at least one of min or max. Omit max for no upper bound; omit min for no lower bound (e.g. {"min": 10}, {"max": 7}).';

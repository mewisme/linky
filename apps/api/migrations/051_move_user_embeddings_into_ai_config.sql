-- Move user_embeddings admin_config (dimension) into ai.embedding.dimension.

DO $$
DECLARE
  v_ue_dim integer;
  v_ai jsonb;
BEGIN
  SELECT ("value"->>'dimension')::integer INTO v_ue_dim
  FROM "public"."admin_config"
  WHERE "key" = 'user_embeddings';

  SELECT "value" INTO v_ai
  FROM "public"."admin_config"
  WHERE "key" = 'ai';

  IF v_ue_dim IS NOT NULL AND (v_ai IS NULL OR v_ai->'embedding'->>'dimension' IS NULL) THEN
    IF v_ai IS NULL THEN
      INSERT INTO "public"."admin_config" ("key", "value")
      VALUES ('ai', jsonb_build_object('embedding', jsonb_build_object('dimension', v_ue_dim)))
      ON CONFLICT ("key") DO UPDATE
      SET "value" = jsonb_set(
        COALESCE("public"."admin_config"."value", '{}'::jsonb),
        '{embedding,dimension}',
        to_jsonb(v_ue_dim),
        true
      );
    ELSE
      UPDATE "public"."admin_config"
      SET "value" = jsonb_set(
        v_ai,
        '{embedding,dimension}',
        to_jsonb(v_ue_dim),
        true
      )
      WHERE "key" = 'ai';
    END IF;
  END IF;
END $$;

DELETE FROM "public"."admin_config" WHERE "key" = 'user_embeddings';

CREATE OR REPLACE FUNCTION "public"."get_user_embedding_dimension"()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ("value"->'embedding'->>'dimension')::integer
      FROM "public"."admin_config"
      WHERE "key" = 'ai'
    ),
    3072
  );
$$;

DROP TRIGGER IF EXISTS "trigger_notify_admin_config_user_embeddings" ON "public"."admin_config";
DROP FUNCTION IF EXISTS "public"."notify_admin_config_user_embeddings"();

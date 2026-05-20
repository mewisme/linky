-- Multi-dimension user embeddings: one nullable vector column per supported size.
-- Active dimension is read from admin_config key `user_embeddings` -> {"dimension": N}.

ALTER TABLE "public"."user_embeddings"
  ADD COLUMN IF NOT EXISTS "e384" vector(384),
  ADD COLUMN IF NOT EXISTS "e768" vector(768),
  ADD COLUMN IF NOT EXISTS "e1024" vector(1024),
  ADD COLUMN IF NOT EXISTS "e1536" vector(1536),
  ADD COLUMN IF NOT EXISTS "e3072" vector(3072);

UPDATE "public"."user_embeddings"
SET "e1024" = "embedding"
WHERE "embedding" IS NOT NULL
  AND "e1024" IS NULL;

DROP INDEX IF EXISTS "public"."idx_user_embeddings_embedding_ivfflat";

ALTER TABLE "public"."user_embeddings"
  DROP COLUMN IF EXISTS "embedding";

-- IVFFlat/HNSW on `vector` max 2000 dims (pgvector 0.8.0). e3072 uses HNSW+halfvec in 049.
-- Go API linear-scans vectors; optional indexes in 049 + halfvec query fix in 050.

INSERT INTO "public"."admin_config" ("key", "value")
VALUES ('user_embeddings', '{"dimension": 3072}'::jsonb)
ON CONFLICT ("key") DO NOTHING;

CREATE OR REPLACE FUNCTION "public"."get_user_embedding_dimension"()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ("value"->>'dimension')::integer
      FROM "public"."admin_config"
      WHERE "key" = 'user_embeddings'
    ),
    3072
  );
$$;

CREATE OR REPLACE FUNCTION "public"."user_embedding_column_for_dimension"("p_dimension" integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE "p_dimension"
    WHEN 384 THEN 'e384'
    WHEN 768 THEN 'e768'
    WHEN 1024 THEN 'e1024'
    WHEN 1536 THEN 'e1536'
    WHEN 3072 THEN 'e3072'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION "public"."notify_admin_config_user_embeddings"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."key" = 'user_embeddings' THEN
    PERFORM pg_notify('linky_admin_config', 'user_embeddings');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trigger_notify_admin_config_user_embeddings" ON "public"."admin_config";

CREATE TRIGGER "trigger_notify_admin_config_user_embeddings"
  AFTER INSERT OR UPDATE OF "value" ON "public"."admin_config"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."notify_admin_config_user_embeddings"();

CREATE OR REPLACE FUNCTION "public"."create_user_embedding_on_user_insert"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO "public"."user_embeddings" ("user_id", "model_name", "source_hash")
  VALUES (NEW."id", NULL, '')
  ON CONFLICT ("user_id") DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."find_similar_users_by_embedding"(
  "p_user_id" uuid,
  "p_limit" integer DEFAULT 10,
  "p_threshold" double precision DEFAULT NULL,
  "p_exclude_user_ids" uuid[] DEFAULT NULL
)
RETURNS TABLE("user_id" uuid, "similarity_score" double precision)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_dim integer;
  v_col text;
  sql text;
BEGIN
  v_dim := "public"."get_user_embedding_dimension"();
  v_col := "public"."user_embedding_column_for_dimension"(v_dim);
  IF v_col IS NULL THEN
    RETURN;
  END IF;

  sql := format(
    $q$
      WITH "base" AS (
        SELECT %1$I AS "emb"
        FROM "public"."user_embeddings"
        WHERE "user_id" = $1
          AND %1$I IS NOT NULL
        LIMIT 1
      )
      SELECT
        "ue"."user_id",
        (1 - ("ue".%1$I <=> "b"."emb"))::double precision AS "similarity_score"
      FROM "public"."user_embeddings" "ue"
      CROSS JOIN "base" "b"
      WHERE "ue"."user_id" != $1
        AND "ue".%1$I IS NOT NULL
        AND ($3 IS NULL OR (1 - ("ue".%1$I <=> "b"."emb")) >= $3)
        AND ($4 IS NULL OR "ue"."user_id" != ALL($4))
      ORDER BY "ue".%1$I <=> "b"."emb"
      LIMIT $2
    $q$,
    v_col
  );

  RETURN QUERY EXECUTE sql USING p_user_id, p_limit, p_threshold, p_exclude_user_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."get_user_embedding_dimension"() TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."user_embedding_column_for_dimension"(integer) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."notify_admin_config_user_embeddings"() TO "service_role";

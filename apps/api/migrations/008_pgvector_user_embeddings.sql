CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "public"."user_embeddings"
  ALTER COLUMN "embedding" TYPE vector(768)
  USING (
    CASE
      WHEN "embedding" IS NULL THEN NULL
      ELSE ('[' || array_to_string("embedding", ',') || ']')::vector(768)
    END
  );

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_embedding_ivfflat"
  ON "public"."user_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 1);

CREATE OR REPLACE FUNCTION "public"."find_similar_users_by_embedding"(
  "p_user_id" "uuid",
  "p_limit" integer DEFAULT 10,
  "p_threshold" double precision DEFAULT NULL,
  "p_exclude_user_ids" "uuid"[] DEFAULT NULL
)
RETURNS TABLE ("user_id" "uuid", "similarity_score" double precision)
LANGUAGE "sql"
STABLE
AS $$
  WITH "base" AS (
    SELECT "embedding"
    FROM "public"."user_embeddings"
    WHERE "user_id" = "p_user_id"
      AND "embedding" IS NOT NULL
    LIMIT 1
  )
  SELECT
    "ue"."user_id",
    (1 - ("ue"."embedding" <=> "b"."embedding"))::double precision AS "similarity_score"
  FROM "public"."user_embeddings" "ue"
  CROSS JOIN "base" "b"
  WHERE "ue"."user_id" != "p_user_id"
    AND "ue"."embedding" IS NOT NULL
    AND ("p_threshold" IS NULL OR (1 - ("ue"."embedding" <=> "b"."embedding")) >= "p_threshold")
    AND ("p_exclude_user_ids" IS NULL OR "ue"."user_id" != ALL("p_exclude_user_ids"))
  ORDER BY "ue"."embedding" <=> "b"."embedding"
  LIMIT "p_limit";
$$;

ALTER FUNCTION "public"."find_similar_users_by_embedding"("uuid", integer, double precision, "uuid"[]) OWNER TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."find_similar_users_by_embedding"("uuid", integer, double precision, "uuid"[]) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."find_similar_users_by_embedding"("uuid", integer, double precision, "uuid"[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."find_similar_users_by_embedding"("uuid", integer, double precision, "uuid"[]) TO "service_role";

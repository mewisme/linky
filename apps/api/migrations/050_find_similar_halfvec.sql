-- pgvector 0.8.0: dimensions > 2000 must use halfvec in queries to hit the HNSW index on e3072.

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

  IF v_dim > 2000 THEN
    sql := format(
      $q$
        WITH "base" AS (
          SELECT %1$I::halfvec(%2$s) AS "emb"
          FROM "public"."user_embeddings"
          WHERE "user_id" = $1
            AND %1$I IS NOT NULL
          LIMIT 1
        )
        SELECT
          "ue"."user_id",
          (1 - ("ue".%1$I::halfvec(%2$s) <=> "b"."emb"))::double precision AS "similarity_score"
        FROM "public"."user_embeddings" "ue"
        CROSS JOIN "base" "b"
        WHERE "ue"."user_id" != $1
          AND "ue".%1$I IS NOT NULL
          AND ($3 IS NULL OR (1 - ("ue".%1$I::halfvec(%2$s) <=> "b"."emb")) >= $3)
          AND ($4 IS NULL OR "ue"."user_id" != ALL($4))
        ORDER BY "ue".%1$I::halfvec(%2$s) <=> "b"."emb"
        LIMIT $2
      $q$,
      v_col,
      v_dim
    );
  ELSE
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
  END IF;

  RETURN QUERY EXECUTE sql USING p_user_id, p_limit, p_threshold, p_exclude_user_ids;
END;
$$;

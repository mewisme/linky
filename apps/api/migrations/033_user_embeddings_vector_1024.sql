DROP INDEX IF EXISTS "public"."idx_user_embeddings_embedding_ivfflat";

UPDATE "public"."user_embeddings"
SET "embedding" = NULL
WHERE "embedding" IS NOT NULL;

ALTER TABLE "public"."user_embeddings"
  ALTER COLUMN "embedding" TYPE vector(1024);

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_embedding_ivfflat"
  ON "public"."user_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 1);

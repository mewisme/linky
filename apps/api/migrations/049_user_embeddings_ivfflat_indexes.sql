-- Optional ANN indexes (pgvector 0.8.0). Run after 048.
-- vector type: ivfflat/hnsw max 2000 dims. e3072 uses HNSW on halfvec(3072) (max 4000 dims).
-- Run as one session in Supabase SQL editor so SET maintenance_work_mem applies.

SET maintenance_work_mem = '256MB';

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_e384_ivfflat"
  ON "public"."user_embeddings" USING ivfflat ("e384" vector_cosine_ops) WITH (lists = 1)
  WHERE "e384" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_e768_ivfflat"
  ON "public"."user_embeddings" USING ivfflat ("e768" vector_cosine_ops) WITH (lists = 1)
  WHERE "e768" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_e1024_ivfflat"
  ON "public"."user_embeddings" USING ivfflat ("e1024" vector_cosine_ops) WITH (lists = 1)
  WHERE "e1024" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_e1536_ivfflat"
  ON "public"."user_embeddings" USING ivfflat ("e1536" vector_cosine_ops) WITH (lists = 1)
  WHERE "e1536" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_e3072_hnsw"
  ON "public"."user_embeddings" USING hnsw (("e3072"::halfvec(3072)) halfvec_cosine_ops)
  WHERE "e3072" IS NOT NULL;

RESET maintenance_work_mem;

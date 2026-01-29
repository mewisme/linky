CREATE TABLE IF NOT EXISTS "public"."user_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "embedding" real[],
    "model_name" character varying(100),
    "source_hash" character varying(64) DEFAULT '' NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_embeddings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_embeddings_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "fk_user_embeddings_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."user_embeddings" OWNER TO "postgres";

CREATE INDEX IF NOT EXISTS "idx_user_embeddings_user_id" ON "public"."user_embeddings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_embeddings_source_hash" ON "public"."user_embeddings" ("source_hash");

CREATE OR REPLACE FUNCTION "public"."update_user_embeddings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_user_embeddings_updated_at"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trigger_update_user_embeddings_updated_at" BEFORE UPDATE ON "public"."user_embeddings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_embeddings_updated_at"();

GRANT ALL ON TABLE "public"."user_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."user_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_embeddings" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "service_role";

CREATE OR REPLACE FUNCTION "public"."create_user_embedding_on_user_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_embeddings (user_id, embedding, model_name, source_hash)
  VALUES (NEW.id, NULL, NULL, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_user_embedding_on_user_insert"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "trigger_create_user_embedding_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_embedding_on_user_insert"();

GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "service_role";

INSERT INTO "public"."user_embeddings" ("user_id", "embedding", "model_name", "source_hash", "created_at", "updated_at")
SELECT "u"."id", NULL, NULL, '', "now"(), "now"()
FROM "public"."users" "u"
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."user_embeddings" "ue" WHERE "ue"."user_id" = "u"."id"
);

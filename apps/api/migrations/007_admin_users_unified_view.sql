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
  "ud"."bio",
  "ud"."gender",
  "ud"."date_of_birth",
  COALESCE(
    (
      SELECT array_agg("it"."name" ORDER BY "it"."name")
      FROM "public"."interest_tags" "it"
      WHERE "it"."id" = ANY(COALESCE("ud"."interest_tags", '{}'::uuid[]))
    ),
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

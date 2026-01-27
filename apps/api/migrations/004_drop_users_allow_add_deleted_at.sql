-- Drop users.allow, ensure deleted/deleted_at exist for soft-delete.
-- Clerk is source of truth; webhook updates DB only.

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "deleted" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

ALTER TABLE "public"."users"
  DROP COLUMN IF EXISTS "allow";

CREATE OR REPLACE VIEW "public"."changelogs_with_creator" AS
 SELECT "c"."id",
    "c"."version",
    "c"."title",
    "c"."release_date",
    "c"."s3_key",
    "c"."is_published",
    "c"."order",
    "c"."created_at",
    "c"."updated_at",
    "json_build_object"('id', "u"."id", 'clerk_user_id', "u"."clerk_user_id", 'email', "u"."email", 'first_name', "u"."first_name", 'last_name', "u"."last_name", 'avatar_url', "u"."avatar_url", 'country', "u"."country", 'role', "u"."role", 'created_at', "u"."created_at", 'updated_at', "u"."updated_at") AS "created_by"
   FROM ("public"."changelogs" "c"
     LEFT JOIN "public"."users" "u" ON (("c"."created_by" = "u"."id")));

CREATE OR REPLACE VIEW "public"."users_with_details" AS
 SELECT "u"."id",
    "u"."clerk_user_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    "u"."role",
    "u"."created_at" AS "user_created_at",
    "u"."updated_at" AS "user_updated_at",
    "ud"."id" AS "details_id",
    "ud"."date_of_birth",
    "ud"."gender",
    "ud"."languages",
    "ud"."bio",
    "ud"."created_at" AS "details_created_at",
    "ud"."updated_at" AS "details_updated_at",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."user_details" "ud" ON (("u"."id" = "ud"."user_id")));

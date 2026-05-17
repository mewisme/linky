DROP VIEW IF EXISTS "public"."admin_reports_unified";

CREATE VIEW "public"."admin_reports_unified" AS
SELECT
  "r"."id",
  "r"."reporter_user_id",
  "r"."reported_user_id",
  "r"."reason",
  "r"."status",
  "r"."admin_notes",
  "r"."reviewed_by",
  "r"."reviewed_at",
  "r"."created_at",
  "r"."updated_at",
  "reporter"."first_name" AS "reporter_first_name",
  "reporter"."last_name"  AS "reporter_last_name",
  "reporter"."avatar_url" AS "reporter_avatar_url",
  "reporter"."email"      AS "reporter_email",
  "reported"."first_name" AS "reported_first_name",
  "reported"."last_name"  AS "reported_last_name",
  "reported"."avatar_url" AS "reported_avatar_url",
  "reported"."email"      AS "reported_email",
  "reviewer"."first_name" AS "reviewed_by_first_name",
  "reviewer"."last_name"  AS "reviewed_by_last_name",
  "reviewer"."avatar_url" AS "reviewed_by_avatar_url"
FROM "public"."reports" "r"
LEFT JOIN "public"."users" "reporter" ON "r"."reporter_user_id" = "reporter"."id"
LEFT JOIN "public"."users" "reported" ON "r"."reported_user_id" = "reported"."id"
LEFT JOIN "public"."users" "reviewer" ON "r"."reviewed_by"      = "reviewer"."id";

ALTER VIEW "public"."admin_reports_unified" OWNER TO "postgres";

GRANT SELECT ON "public"."admin_reports_unified" TO "anon";
GRANT SELECT ON "public"."admin_reports_unified" TO "authenticated";
GRANT SELECT ON "public"."admin_reports_unified" TO "service_role";

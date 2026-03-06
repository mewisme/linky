CREATE TABLE IF NOT EXISTS "public"."admin_config" (
  "key" text NOT NULL,
  "value" jsonb,
  PRIMARY KEY ("key")
);

REVOKE ALL ON TABLE "public"."admin_config" FROM "anon";
REVOKE ALL ON TABLE "public"."admin_config" FROM "authenticated";
GRANT ALL ON TABLE "public"."admin_config" TO "service_role";

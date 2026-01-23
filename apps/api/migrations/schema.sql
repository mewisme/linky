


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'member'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_details_on_user_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a new user_details record with the new user's ID
  INSERT INTO user_details (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_details already exists
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_details_on_user_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_user_details_on_user_insert"() IS 'Automatically creates a user_details record when a new user is inserted into the users table';



CREATE OR REPLACE FUNCTION "public"."fn_init_user_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a new user_settings record with the new user's ID
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_settings already exists

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_init_user_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_init_user_settings"() IS 'Initialize user_settings when a new user is inserted';



CREATE OR REPLACE FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, p_seconds)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_exp_seconds = user_levels.total_exp_seconds + p_seconds;
END;
$$;


ALTER FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) IS 'Increments user experience points by adding seconds. Creates row if missing.';



CREATE OR REPLACE FUNCTION "public"."increment_visitor"("ip" "text") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update visitors
  set
    visit_count = visit_count + 1,
    last_visit = now()
  where visitors.ip = increment_visitor.ip;
$$;


ALTER FUNCTION "public"."increment_visitor"("ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."page_views_timeseries"("days" integer) RETURNS TABLE("day" "date", "views" bigint)
    LANGUAGE "sql"
    AS $$
  select
    date(created_at) as day,
    count(*) as views
  from page_views
  where created_at >= now() - (days || ' days')::interval
  group by day
  order by day;
$$;


ALTER FUNCTION "public"."page_views_timeseries"("days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_streak_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM update_user_streak_summary(NEW.user_id, NEW.date, NEW.is_valid);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_streak_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_update_streak_summary"() IS 'Trigger function to automatically update streak summary when streak day is inserted or updated';



CREATE OR REPLACE FUNCTION "public"."update_call_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_call_history_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_changelogs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_changelogs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_interest_tags_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_interest_tags_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_feature_unlocks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_level_feature_unlocks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_rewards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_level_rewards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak_exp_bonuses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_streak_exp_bonuses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_details_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_details_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_favorite_limits_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_favorite_limits_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_levels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_levels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_summary RECORD;
  v_new_current_streak INTEGER;
  v_new_longest_streak INTEGER;
BEGIN
  SELECT current_streak, longest_streak, last_valid_date
  INTO v_existing_summary
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    IF p_is_valid THEN
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 1, 1, p_date);
    ELSE
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 0, 0, NULL);
    END IF;
    RETURN;
  END IF;
  
  IF NOT p_is_valid THEN
    UPDATE user_streaks
    SET current_streak = 0,
        last_valid_date = NULL
    WHERE user_id = p_user_id;
    RETURN;
  END IF;
  
  IF v_existing_summary.last_valid_date IS NULL THEN
    v_new_current_streak := 1;
  ELSIF v_existing_summary.last_valid_date = p_date - INTERVAL '1 day' THEN
    v_new_current_streak := v_existing_summary.current_streak + 1;
  ELSE
    v_new_current_streak := 1;
  END IF;
  
  v_new_longest_streak := GREATEST(v_existing_summary.longest_streak, v_new_current_streak);
  
  UPDATE user_streaks
  SET current_streak = v_new_current_streak,
      longest_streak = v_new_longest_streak,
      last_valid_date = p_date
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) IS 'Updates user streak summary. Handles increment/reset logic based on consecutive valid days.';



CREATE OR REPLACE FUNCTION "public"."update_user_streaks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_streaks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_users_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_users_updated_at"() IS 'Automatically updates the updated_at timestamp when a user record is updated';



CREATE OR REPLACE FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) RETURNS TABLE("first_time_valid" boolean, "current_streak" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_old_valid BOOLEAN := false;
  v_old_total INTEGER := 0;
  v_new_total INTEGER;
  v_is_valid BOOLEAN;
  v_found BOOLEAN := false;
  v_streak INTEGER := 0;
BEGIN
  SELECT is_valid, total_call_seconds INTO v_old_valid, v_old_total
  FROM user_streak_days
  WHERE user_id = p_user_id AND date = p_date;

  v_found := FOUND;
  IF NOT FOUND THEN
    v_old_valid := false;
    v_old_total := 0;
  END IF;
  v_new_total := v_old_total + p_total_call_seconds;
  v_is_valid := v_new_total >= 300;

  INSERT INTO user_streak_days (user_id, date, total_call_seconds, is_valid)
  VALUES (p_user_id, p_date, p_total_call_seconds, v_is_valid)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_call_seconds = user_streak_days.total_call_seconds + p_total_call_seconds,
    is_valid = (user_streak_days.total_call_seconds + p_total_call_seconds) >= 300;

  first_time_valid := (NOT v_found OR NOT v_old_valid) AND v_is_valid;

  IF first_time_valid OR v_is_valid THEN
    SELECT s.current_streak INTO v_streak
    FROM user_streaks s
    WHERE s.user_id = p_user_id;
    current_streak := COALESCE(v_streak, 0);
  ELSE
    current_streak := 0;
  END IF;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."visitors_timeseries"("days" integer) RETURNS TABLE("day" "date", "visitors" bigint)
    LANGUAGE "sql"
    AS $$
  select
    date(first_visit) as day,
    count(*) as visitors
  from visitors
  where first_visit >= now() - (days || ' days')::interval
  group by day
  order by day;
$$;


ALTER FUNCTION "public"."visitors_timeseries"("days" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."call_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "caller_id" "uuid" NOT NULL,
    "callee_id" "uuid" NOT NULL,
    "caller_country" character varying(2),
    "callee_country" character varying(2),
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_different_users" CHECK (("caller_id" <> "callee_id")),
    CONSTRAINT "check_duration" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" >= 0)))
);


ALTER TABLE "public"."call_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."call_history" IS 'Stores call history records with timestamps and country information';



COMMENT ON COLUMN "public"."call_history"."caller_id" IS 'User ID of the caller';



COMMENT ON COLUMN "public"."call_history"."callee_id" IS 'User ID of the callee';



COMMENT ON COLUMN "public"."call_history"."caller_country" IS 'Country code (ISO 3166-1 alpha-2) of the caller';



COMMENT ON COLUMN "public"."call_history"."callee_country" IS 'Country code (ISO 3166-1 alpha-2) of the callee';



COMMENT ON COLUMN "public"."call_history"."duration_seconds" IS 'Call duration in seconds, calculated from started_at and ended_at';



CREATE TABLE IF NOT EXISTS "public"."changelogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "release_date" timestamp with time zone NOT NULL,
    "s3_key" character varying(500) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."changelogs" OWNER TO "postgres";


COMMENT ON TABLE "public"."changelogs" IS 'Stores changelog entries with version metadata and S3 references to markdown files';



COMMENT ON COLUMN "public"."changelogs"."version" IS 'Version identifier (e.g., "1.0.0", "2.1.3")';



COMMENT ON COLUMN "public"."changelogs"."title" IS 'Display title for the changelog entry';



COMMENT ON COLUMN "public"."changelogs"."release_date" IS 'When the version was released';



COMMENT ON COLUMN "public"."changelogs"."s3_key" IS 'S3 path to the markdown file (e.g., "changelogs/1.0.0.md")';



COMMENT ON COLUMN "public"."changelogs"."created_by" IS 'Admin user who created this changelog entry';



COMMENT ON COLUMN "public"."changelogs"."is_published" IS 'Whether this changelog is published and visible to users';



COMMENT ON COLUMN "public"."changelogs"."order" IS 'Custom sorting order (higher = more recent, null falls back to release_date)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_user_id" "text" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "allow" boolean DEFAULT false NOT NULL,
    "country" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


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
    "json_build_object"('id', "u"."id", 'clerk_user_id', "u"."clerk_user_id", 'email', "u"."email", 'first_name', "u"."first_name", 'last_name', "u"."last_name", 'avatar_url', "u"."avatar_url", 'country', "u"."country", 'role', "u"."role", 'allow', "u"."allow", 'created_at', "u"."created_at", 'updated_at', "u"."updated_at") AS "created_by"
   FROM ("public"."changelogs" "c"
     LEFT JOIN "public"."users" "u" ON (("c"."created_by" = "u"."id")));


ALTER VIEW "public"."changelogs_with_creator" OWNER TO "postgres";


COMMENT ON VIEW "public"."changelogs_with_creator" IS 'Changelogs view with creator user information expanded from users table instead of just created_by UUID';



CREATE TABLE IF NOT EXISTS "public"."interest_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "category" character varying(50),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interest_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."interest_tags" IS 'Defines available interest tags that users can select';



COMMENT ON COLUMN "public"."interest_tags"."name" IS 'Unique name of the interest tag';



COMMENT ON COLUMN "public"."interest_tags"."description" IS 'Description of what this interest tag represents';



COMMENT ON COLUMN "public"."interest_tags"."icon" IS 'Icon identifier or emoji for the tag';



COMMENT ON COLUMN "public"."interest_tags"."category" IS 'Category grouping for the tag (e.g., sports, music, technology)';



COMMENT ON COLUMN "public"."interest_tags"."is_active" IS 'Whether this tag is currently active and available for selection';



CREATE TABLE IF NOT EXISTS "public"."level_feature_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_required" integer NOT NULL,
    "feature_key" character varying(100) NOT NULL,
    "feature_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_level_required" CHECK (("level_required" > 0))
);


ALTER TABLE "public"."level_feature_unlocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."level_feature_unlocks" IS 'Admin-defined feature unlock rules based on level thresholds';



COMMENT ON COLUMN "public"."level_feature_unlocks"."level_required" IS 'Level at which this feature is unlocked';



COMMENT ON COLUMN "public"."level_feature_unlocks"."feature_key" IS 'String identifier for the feature (e.g., reaction_types, favorite_limit, avatar_frames)';



COMMENT ON COLUMN "public"."level_feature_unlocks"."feature_payload" IS 'Extensible JSON payload containing feature-specific configuration';



COMMENT ON COLUMN "public"."level_feature_unlocks"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."level_feature_unlocks"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."level_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_required" integer NOT NULL,
    "reward_type" character varying(100) NOT NULL,
    "reward_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_level_required" CHECK (("level_required" > 0))
);


ALTER TABLE "public"."level_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."level_rewards" IS 'Admin-defined rewards granted at specific level milestones';



COMMENT ON COLUMN "public"."level_rewards"."level_required" IS 'Level at which this reward is granted';



COMMENT ON COLUMN "public"."level_rewards"."reward_type" IS 'Type identifier for the reward (e.g., avatar_frame, badge, currency)';



COMMENT ON COLUMN "public"."level_rewards"."reward_payload" IS 'Extensible JSON payload containing reward-specific data';



COMMENT ON COLUMN "public"."level_rewards"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."level_rewards"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip" "text" NOT NULL,
    "path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date_of_birth" "date",
    "gender" character varying(20),
    "languages" "text"[],
    "interest_tags" "uuid"[],
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_age" CHECK ((("date_of_birth" IS NULL) OR ("date_of_birth" <= CURRENT_DATE)))
);


ALTER TABLE "public"."user_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_details" IS 'Stores detailed user information for personalized filters and matching. All users should have a corresponding record (created automatically via trigger or backfilled)';



COMMENT ON COLUMN "public"."user_details"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_details"."date_of_birth" IS 'User date of birth for age calculation';



COMMENT ON COLUMN "public"."user_details"."gender" IS 'User gender';



COMMENT ON COLUMN "public"."user_details"."languages" IS 'Array of languages the user speaks';



COMMENT ON COLUMN "public"."user_details"."interest_tags" IS 'Array of interest tag IDs (UUID) referencing interest_tags table';



COMMENT ON COLUMN "public"."user_details"."bio" IS 'User biography or description';



CREATE OR REPLACE VIEW "public"."public_user_info" AS
 SELECT "u"."id",
    "u"."avatar_url",
    "u"."first_name",
    "u"."last_name",
    "ud"."date_of_birth",
    "ud"."gender",
    "ud"."bio",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."user_details" "ud" ON (("u"."id" = "ud"."user_id")));


ALTER VIEW "public"."public_user_info" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_user_info" IS 'Public user information view with expanded interest tags for user matching and display';



CREATE TABLE IF NOT EXISTS "public"."report_contexts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "call_id" "uuid",
    "room_id" "text",
    "call_started_at" timestamp with time zone,
    "call_ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "reporter_role" "text",
    "reported_role" "text",
    "ended_by" "uuid",
    "reported_at_offset_seconds" integer,
    "chat_snapshot" "jsonb",
    "behavior_flags" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_contexts" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_contexts" IS 'Stores immutable context snapshots for user reports';



COMMENT ON COLUMN "public"."report_contexts"."report_id" IS 'Foreign key to reports table';



COMMENT ON COLUMN "public"."report_contexts"."call_id" IS 'Foreign key to call_history table if report is tied to a call';



COMMENT ON COLUMN "public"."report_contexts"."room_id" IS 'Room ID from RoomService if report was created during active call';



COMMENT ON COLUMN "public"."report_contexts"."call_started_at" IS 'Timestamp when the call started';



COMMENT ON COLUMN "public"."report_contexts"."call_ended_at" IS 'Timestamp when the call ended';



COMMENT ON COLUMN "public"."report_contexts"."duration_seconds" IS 'Call duration in seconds';



COMMENT ON COLUMN "public"."report_contexts"."reporter_role" IS 'Role of reporter: caller or callee';



COMMENT ON COLUMN "public"."report_contexts"."reported_role" IS 'Role of reported user: caller or callee';



COMMENT ON COLUMN "public"."report_contexts"."ended_by" IS 'User ID who ended or skipped the call';



COMMENT ON COLUMN "public"."report_contexts"."reported_at_offset_seconds" IS 'Seconds into call when report was created';



COMMENT ON COLUMN "public"."report_contexts"."chat_snapshot" IS 'JSONB snapshot of chat messages during call';



COMMENT ON COLUMN "public"."report_contexts"."behavior_flags" IS 'JSONB object containing call metadata and reporter-provided flags';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_user_id" "uuid" NOT NULL,
    "reported_user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_different_users" CHECK (("reporter_user_id" <> "reported_user_id")),
    CONSTRAINT "check_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::"text"[])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."reports" IS 'Stores user reports against other users';



COMMENT ON COLUMN "public"."reports"."reporter_user_id" IS 'User ID of the person making the report';



COMMENT ON COLUMN "public"."reports"."reported_user_id" IS 'User ID of the person being reported';



COMMENT ON COLUMN "public"."reports"."reason" IS 'Reason for the report provided by the reporter';



COMMENT ON COLUMN "public"."reports"."status" IS 'Status of the report: pending, reviewed, resolved, dismissed';



COMMENT ON COLUMN "public"."reports"."admin_notes" IS 'Admin notes about the report review';



COMMENT ON COLUMN "public"."reports"."reviewed_by" IS 'Admin user ID who reviewed the report';



COMMENT ON COLUMN "public"."reports"."reviewed_at" IS 'Timestamp when the report was reviewed';



CREATE TABLE IF NOT EXISTS "public"."streak_exp_bonuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "min_streak" integer NOT NULL,
    "max_streak" integer NOT NULL,
    "bonus_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_bonus_multiplier" CHECK (("bonus_multiplier" >= 1.00)),
    CONSTRAINT "check_max_streak" CHECK (("max_streak" >= "min_streak")),
    CONSTRAINT "check_min_streak" CHECK (("min_streak" >= 0))
);


ALTER TABLE "public"."streak_exp_bonuses" OWNER TO "postgres";


COMMENT ON TABLE "public"."streak_exp_bonuses" IS 'Admin-defined EXP bonus multipliers based on streak length ranges';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."min_streak" IS 'Minimum streak length (inclusive) for this bonus';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."max_streak" IS 'Maximum streak length (inclusive) for this bonus';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."bonus_multiplier" IS 'Multiplier applied to EXP when streak is within this range (e.g., 1.50 for 50% bonus)';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."updated_at" IS 'Timestamp when the record was last updated';



CREATE OR REPLACE VIEW "public"."user_details_expanded" AS
 SELECT "id",
    "user_id",
    "date_of_birth",
    "gender",
    "languages",
    "bio",
    "created_at",
    "updated_at",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM "public"."user_details" "ud";


ALTER VIEW "public"."user_details_expanded" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_details_expanded" IS 'User details with expanded interest tags as JSON array';



CREATE TABLE IF NOT EXISTS "public"."user_favorite_limits" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "used_count" integer DEFAULT 0 NOT NULL,
    "daily_limit" integer DEFAULT 10 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_favorite_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorite_limits" IS 'Tracks daily favorite usage limits per user';



COMMENT ON COLUMN "public"."user_favorite_limits"."user_id" IS 'The user whose limit is being tracked';



COMMENT ON COLUMN "public"."user_favorite_limits"."date" IS 'The date for which the limit applies';



COMMENT ON COLUMN "public"."user_favorite_limits"."used_count" IS 'Number of favorites added on this date';



COMMENT ON COLUMN "public"."user_favorite_limits"."daily_limit" IS 'Maximum favorites allowed per day';



CREATE TABLE IF NOT EXISTS "public"."user_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "favorite_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_not_self" CHECK (("user_id" <> "favorite_user_id"))
);


ALTER TABLE "public"."user_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorites" IS 'Stores unilateral favorite relationships between users';



COMMENT ON COLUMN "public"."user_favorites"."user_id" IS 'The user who is marking someone as favorite';



COMMENT ON COLUMN "public"."user_favorites"."favorite_user_id" IS 'The user being marked as favorite';



CREATE OR REPLACE VIEW "public"."user_favorites_with_stats" AS
 SELECT "uf"."id",
    "uf"."user_id",
    "uf"."favorite_user_id",
    "uf"."created_at",
    "u"."clerk_user_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    COALESCE("match_stats"."match_count", (0)::bigint) AS "match_count",
    COALESCE("match_stats"."total_duration", (0)::bigint) AS "total_duration",
        CASE
            WHEN (COALESCE("match_stats"."match_count", (0)::bigint) > 0) THEN (COALESCE("match_stats"."total_duration", (0)::bigint) / "match_stats"."match_count")
            ELSE (0)::bigint
        END AS "average_duration"
   FROM (("public"."user_favorites" "uf"
     JOIN "public"."users" "u" ON (("uf"."favorite_user_id" = "u"."id")))
     LEFT JOIN ( SELECT
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."caller_id"
                    ELSE "ch"."callee_id"
                END AS "user_a",
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."callee_id"
                    ELSE "ch"."caller_id"
                END AS "user_b",
            "count"(*) AS "match_count",
            "sum"(COALESCE("ch"."duration_seconds", 0)) AS "total_duration"
           FROM "public"."call_history" "ch"
          WHERE ("ch"."duration_seconds" IS NOT NULL)
          GROUP BY
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."caller_id"
                    ELSE "ch"."callee_id"
                END,
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."callee_id"
                    ELSE "ch"."caller_id"
                END) "match_stats" ON (((("uf"."user_id" = "match_stats"."user_a") AND ("uf"."favorite_user_id" = "match_stats"."user_b")) OR (("uf"."user_id" = "match_stats"."user_b") AND ("uf"."favorite_user_id" = "match_stats"."user_a")))));


ALTER VIEW "public"."user_favorites_with_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_favorites_with_stats" IS 'User favorites with call statistics including match count, total duration, and average duration';



CREATE TABLE IF NOT EXISTS "public"."user_level_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "level_reward_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_level_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_level_rewards" IS 'Tracks which level rewards have been granted to each user';



COMMENT ON COLUMN "public"."user_level_rewards"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_level_rewards"."level_reward_id" IS 'Foreign key reference to level_rewards table';



COMMENT ON COLUMN "public"."user_level_rewards"."granted_at" IS 'Timestamp when the reward was granted to the user';



CREATE TABLE IF NOT EXISTS "public"."user_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_exp_seconds" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_total_exp_seconds" CHECK (("total_exp_seconds" >= 0))
);


ALTER TABLE "public"."user_levels" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_levels" IS 'Stores user experience points accumulated from call duration';



COMMENT ON COLUMN "public"."user_levels"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_levels"."total_exp_seconds" IS 'Total experience points in seconds accumulated from completed calls';



COMMENT ON COLUMN "public"."user_levels"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."user_levels"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "default_mute_mic" boolean DEFAULT false NOT NULL,
    "default_disable_camera" boolean DEFAULT false NOT NULL,
    "notification_sound_enabled" boolean DEFAULT true NOT NULL,
    "notification_preferences" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Stores user preferences and call settings. All users should have a corresponding record (created automatically via trigger or backfilled)';



COMMENT ON COLUMN "public"."user_settings"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_settings"."default_mute_mic" IS 'Default microphone mute state for calls';



COMMENT ON COLUMN "public"."user_settings"."default_disable_camera" IS 'Default camera disabled state for calls';



COMMENT ON COLUMN "public"."user_settings"."notification_sound_enabled" IS 'Whether notification sounds are enabled';



COMMENT ON COLUMN "public"."user_settings"."notification_preferences" IS 'JSON object for extensible notification preferences';



CREATE OR REPLACE VIEW "public"."user_settings_v" AS
 SELECT "us"."id",
    "us"."user_id",
    "u"."clerk_user_id",
    "us"."default_mute_mic",
    "us"."default_disable_camera",
    "us"."notification_sound_enabled",
    "us"."notification_preferences",
    "us"."created_at",
    "us"."updated_at"
   FROM ("public"."user_settings" "us"
     LEFT JOIN "public"."users" "u" ON (("us"."user_id" = "u"."id")));


ALTER VIEW "public"."user_settings_v" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_settings_v" IS 'User settings with user information';



CREATE TABLE IF NOT EXISTS "public"."user_streak_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "total_call_seconds" integer DEFAULT 0 NOT NULL,
    "is_valid" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_total_call_seconds" CHECK (("total_call_seconds" >= 0))
);


ALTER TABLE "public"."user_streak_days" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streak_days" IS 'Stores daily call duration records for streak calculation';



COMMENT ON COLUMN "public"."user_streak_days"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_streak_days"."date" IS 'UTC date for the streak day';



COMMENT ON COLUMN "public"."user_streak_days"."total_call_seconds" IS 'Total call duration in seconds for this UTC day';



COMMENT ON COLUMN "public"."user_streak_days"."is_valid" IS 'Whether this day counts as a valid streak day (>= 300 seconds)';



COMMENT ON COLUMN "public"."user_streak_days"."created_at" IS 'Timestamp when the record was created';



CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_valid_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_current_streak" CHECK (("current_streak" >= 0)),
    CONSTRAINT "check_longest_streak" CHECK (("longest_streak" >= 0))
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streaks" IS 'Stores user streak summary with current and longest streak';



COMMENT ON COLUMN "public"."user_streaks"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_streaks"."current_streak" IS 'Current consecutive valid streak days';



COMMENT ON COLUMN "public"."user_streaks"."longest_streak" IS 'Longest streak achieved by the user';



COMMENT ON COLUMN "public"."user_streaks"."last_valid_date" IS 'Last UTC date that was a valid streak day';



COMMENT ON COLUMN "public"."user_streaks"."updated_at" IS 'Timestamp when the record was last updated';



CREATE OR REPLACE VIEW "public"."users_with_details" AS
 SELECT "u"."id",
    "u"."clerk_user_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    "u"."role",
    "u"."allow",
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


ALTER VIEW "public"."users_with_details" OWNER TO "postgres";


COMMENT ON VIEW "public"."users_with_details" IS 'Complete user profile combining users table with expanded user details and interest tags';



CREATE TABLE IF NOT EXISTS "public"."visitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip" "text" NOT NULL,
    "first_visit" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_visit" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visit_count" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."visitors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "changelogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "changelogs_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."interest_tags"
    ADD CONSTRAINT "interest_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."interest_tags"
    ADD CONSTRAINT "interest_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_feature_unlocks"
    ADD CONSTRAINT "level_feature_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_rewards"
    ADD CONSTRAINT "level_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_report_id_key" UNIQUE ("report_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streak_exp_bonuses"
    ADD CONSTRAINT "streak_exp_bonuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_feature_unlocks"
    ADD CONSTRAINT "unique_level_feature" UNIQUE ("level_required", "feature_key");



ALTER TABLE ONLY "public"."level_rewards"
    ADD CONSTRAINT "unique_level_reward" UNIQUE ("level_required", "reward_type");



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "unique_user_level_reward" UNIQUE ("user_id", "level_reward_id");



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "unique_user_streak_day" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_favorite_limits"
    ADD CONSTRAINT "user_favorite_limits_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_unique" UNIQUE ("user_id", "favorite_user_id");



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "user_level_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "user_levels_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "user_streak_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_clerk_user_id_key" UNIQUE ("clerk_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_visitor_id_key" UNIQUE ("ip");



CREATE INDEX "idx_call_history_callee_id" ON "public"."call_history" USING "btree" ("callee_id");



CREATE INDEX "idx_call_history_caller_callee" ON "public"."call_history" USING "btree" ("caller_id", "callee_id");



CREATE INDEX "idx_call_history_caller_id" ON "public"."call_history" USING "btree" ("caller_id");



CREATE INDEX "idx_call_history_started_at" ON "public"."call_history" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_changelogs_is_published" ON "public"."changelogs" USING "btree" ("is_published");



CREATE INDEX "idx_changelogs_order" ON "public"."changelogs" USING "btree" ("order" DESC NULLS LAST);



CREATE INDEX "idx_changelogs_release_date" ON "public"."changelogs" USING "btree" ("release_date" DESC);



CREATE INDEX "idx_changelogs_version" ON "public"."changelogs" USING "btree" ("version");



CREATE INDEX "idx_interest_tags_category" ON "public"."interest_tags" USING "btree" ("category");



CREATE INDEX "idx_interest_tags_is_active" ON "public"."interest_tags" USING "btree" ("is_active");



CREATE INDEX "idx_interest_tags_name" ON "public"."interest_tags" USING "btree" ("name");



CREATE INDEX "idx_level_feature_unlocks_feature_key" ON "public"."level_feature_unlocks" USING "btree" ("feature_key");



CREATE INDEX "idx_level_feature_unlocks_level_required" ON "public"."level_feature_unlocks" USING "btree" ("level_required");



CREATE INDEX "idx_level_rewards_level_required" ON "public"."level_rewards" USING "btree" ("level_required");



CREATE INDEX "idx_level_rewards_reward_type" ON "public"."level_rewards" USING "btree" ("reward_type");



CREATE INDEX "idx_page_views_created_at" ON "public"."page_views" USING "btree" ("created_at");



CREATE INDEX "idx_page_views_ip" ON "public"."page_views" USING "btree" ("ip");



CREATE INDEX "idx_page_views_path" ON "public"."page_views" USING "btree" ("path");



CREATE INDEX "idx_report_contexts_call_id" ON "public"."report_contexts" USING "btree" ("call_id");



CREATE INDEX "idx_report_contexts_created_at" ON "public"."report_contexts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_report_contexts_report_id" ON "public"."report_contexts" USING "btree" ("report_id");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_reported_user_id" ON "public"."reports" USING "btree" ("reported_user_id");



CREATE INDEX "idx_reports_reporter_user_id" ON "public"."reports" USING "btree" ("reporter_user_id");



CREATE INDEX "idx_reports_reviewed_by" ON "public"."reports" USING "btree" ("reviewed_by");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "idx_streak_exp_bonuses_max_streak" ON "public"."streak_exp_bonuses" USING "btree" ("max_streak");



CREATE INDEX "idx_streak_exp_bonuses_min_streak" ON "public"."streak_exp_bonuses" USING "btree" ("min_streak");



CREATE INDEX "idx_user_details_gender" ON "public"."user_details" USING "btree" ("gender");



CREATE INDEX "idx_user_details_interest_tags" ON "public"."user_details" USING "gin" ("interest_tags");



CREATE INDEX "idx_user_details_languages" ON "public"."user_details" USING "gin" ("languages");



CREATE INDEX "idx_user_details_user_id" ON "public"."user_details" USING "btree" ("user_id");



CREATE INDEX "idx_user_favorite_limits_date" ON "public"."user_favorite_limits" USING "btree" ("date");



CREATE INDEX "idx_user_favorite_limits_user_id" ON "public"."user_favorite_limits" USING "btree" ("user_id");



CREATE INDEX "idx_user_favorites_created_at" ON "public"."user_favorites" USING "btree" ("created_at");



CREATE INDEX "idx_user_favorites_favorite_user_id" ON "public"."user_favorites" USING "btree" ("favorite_user_id");



CREATE INDEX "idx_user_favorites_user_id" ON "public"."user_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_user_level_rewards_granted_at" ON "public"."user_level_rewards" USING "btree" ("granted_at" DESC);



CREATE INDEX "idx_user_level_rewards_level_reward_id" ON "public"."user_level_rewards" USING "btree" ("level_reward_id");



CREATE INDEX "idx_user_level_rewards_user_id" ON "public"."user_level_rewards" USING "btree" ("user_id");



CREATE INDEX "idx_user_levels_total_exp_seconds" ON "public"."user_levels" USING "btree" ("total_exp_seconds" DESC);



CREATE INDEX "idx_user_levels_user_id" ON "public"."user_levels" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_streak_days_date" ON "public"."user_streak_days" USING "btree" ("date" DESC);



CREATE INDEX "idx_user_streak_days_is_valid" ON "public"."user_streak_days" USING "btree" ("user_id", "is_valid", "date" DESC);



CREATE INDEX "idx_user_streak_days_user_date" ON "public"."user_streak_days" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_user_streak_days_user_id" ON "public"."user_streak_days" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_current_streak" ON "public"."user_streaks" USING "btree" ("current_streak" DESC);



CREATE INDEX "idx_user_streaks_longest_streak" ON "public"."user_streaks" USING "btree" ("longest_streak" DESC);



CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_visitors_ip" ON "public"."visitors" USING "btree" ("ip");



CREATE INDEX "idx_visitors_last_visit" ON "public"."visitors" USING "btree" ("last_visit");



CREATE OR REPLACE TRIGGER "trg_users_after_insert_init_settings" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_init_user_settings"();



CREATE OR REPLACE TRIGGER "trigger_create_user_details_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_details_on_user_insert"();



CREATE OR REPLACE TRIGGER "trigger_update_call_history_updated_at" BEFORE UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_call_history_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_changelogs_updated_at" BEFORE UPDATE ON "public"."changelogs" FOR EACH ROW EXECUTE FUNCTION "public"."update_changelogs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_interest_tags_updated_at" BEFORE UPDATE ON "public"."interest_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_interest_tags_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_feature_unlocks_updated_at" BEFORE UPDATE ON "public"."level_feature_unlocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_feature_unlocks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_rewards_updated_at" BEFORE UPDATE ON "public"."level_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_streak_exp_bonuses_updated_at" BEFORE UPDATE ON "public"."streak_exp_bonuses" FOR EACH ROW EXECUTE FUNCTION "public"."update_streak_exp_bonuses_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_details_updated_at" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_details_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_levels_updated_at" BEFORE UPDATE ON "public"."user_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_levels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_streaks_updated_at" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_streaks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_users_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_user_streak_days_update_summary" AFTER INSERT OR UPDATE OF "is_valid", "total_call_seconds" ON "public"."user_streak_days" FOR EACH ROW WHEN (("new"."is_valid" = true)) EXECUTE FUNCTION "public"."trigger_update_streak_summary"();



CREATE OR REPLACE TRIGGER "user_favorite_limits_updated_at_trigger" BEFORE UPDATE ON "public"."user_favorite_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_favorite_limits_updated_at"();



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "fk_call_history_callee" FOREIGN KEY ("callee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "fk_call_history_caller" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "fk_changelogs_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_call" FOREIGN KEY ("call_id") REFERENCES "public"."call_history"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_ended_by" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_report" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reported" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reporter" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "fk_user_details_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_reward" FOREIGN KEY ("level_reward_id") REFERENCES "public"."level_rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "fk_user_levels_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "fk_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "fk_user_streak_days_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "fk_user_streaks_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorite_limits"
    ADD CONSTRAINT "user_favorite_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_favorite_user_id_fkey" FOREIGN KEY ("favorite_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_visitor"("ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_visitor"("ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_visitor"("ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."page_views_timeseries"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."page_views_timeseries"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."page_views_timeseries"("days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."visitors_timeseries"("days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."visitors_timeseries"("days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."visitors_timeseries"("days" integer) TO "service_role";



GRANT ALL ON TABLE "public"."call_history" TO "anon";
GRANT ALL ON TABLE "public"."call_history" TO "authenticated";
GRANT ALL ON TABLE "public"."call_history" TO "service_role";



GRANT ALL ON TABLE "public"."changelogs" TO "anon";
GRANT ALL ON TABLE "public"."changelogs" TO "authenticated";
GRANT ALL ON TABLE "public"."changelogs" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "anon";
GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "authenticated";
GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "service_role";



GRANT ALL ON TABLE "public"."interest_tags" TO "anon";
GRANT ALL ON TABLE "public"."interest_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."interest_tags" TO "service_role";



GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "anon";
GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "authenticated";
GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."level_rewards" TO "anon";
GRANT ALL ON TABLE "public"."level_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "anon";
GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON TABLE "public"."user_details" TO "anon";
GRANT ALL ON TABLE "public"."user_details" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details" TO "service_role";



GRANT ALL ON TABLE "public"."public_user_info" TO "anon";
GRANT ALL ON TABLE "public"."public_user_info" TO "authenticated";
GRANT ALL ON TABLE "public"."public_user_info" TO "service_role";



GRANT ALL ON TABLE "public"."report_contexts" TO "anon";
GRANT ALL ON TABLE "public"."report_contexts" TO "authenticated";
GRANT ALL ON TABLE "public"."report_contexts" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "anon";
GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "authenticated";
GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "service_role";



GRANT ALL ON TABLE "public"."user_details_expanded" TO "anon";
GRANT ALL ON TABLE "public"."user_details_expanded" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details_expanded" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorite_limits" TO "anon";
GRANT ALL ON TABLE "public"."user_favorite_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorite_limits" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_level_rewards" TO "anon";
GRANT ALL ON TABLE "public"."user_level_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."user_level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."user_levels" TO "anon";
GRANT ALL ON TABLE "public"."user_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."user_levels" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings_v" TO "anon";
GRANT ALL ON TABLE "public"."user_settings_v" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings_v" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_days" TO "anon";
GRANT ALL ON TABLE "public"."user_streak_days" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streak_days" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_details" TO "anon";
GRANT ALL ON TABLE "public"."users_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."visitors" TO "anon";
GRANT ALL ON TABLE "public"."visitors" TO "authenticated";
GRANT ALL ON TABLE "public"."visitors" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








CREATE OR REPLACE FUNCTION "public"."set_updated_at"()
RETURNS trigger
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  row_record record;
BEGIN
  FOR row_record IN
    SELECT
      namespace_data.nspname AS schema_name,
      class_data.relname AS table_name
    FROM pg_class class_data
    JOIN pg_namespace namespace_data
      ON namespace_data.oid = class_data.relnamespace
    LEFT JOIN pg_depend dep
      ON dep.classid = 'pg_class'::regclass
      AND dep.objid = class_data.oid
      AND dep.deptype = 'e'
    WHERE namespace_data.nspname = 'public'
      AND class_data.relkind = 'r'
      AND dep.objid IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()',
      row_record.schema_name,
      row_record.table_name
    );

    EXECUTE format(
      'UPDATE %I.%I SET updated_at = now() WHERE updated_at IS NULL',
      row_record.schema_name,
      row_record.table_name
    );

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger trigger_data
      WHERE trigger_data.tgrelid = format('%I.%I', row_record.schema_name, row_record.table_name)::regclass
        AND trigger_data.tgname = 'set_updated_at'
        AND NOT trigger_data.tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        row_record.schema_name,
        row_record.table_name
      );
    END IF;
  END LOOP;
END;
$$;

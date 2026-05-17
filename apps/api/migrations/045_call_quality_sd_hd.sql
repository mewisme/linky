UPDATE public.user_settings
SET "call" = jsonb_set(
  COALESCE("call", '{}'::jsonb),
  '{quality}',
  to_jsonb(
    CASE
      WHEN "call"->>'quality' IN ('720p', '1080p') THEN 'hd'
      ELSE 'sd'
    END
  ),
  true
)
WHERE "call"->>'quality' IS DISTINCT FROM 'sd'
  AND "call"->>'quality' IS DISTINCT FROM 'hd';

ALTER TABLE public.user_settings
  ALTER COLUMN "call" SET DEFAULT jsonb_build_object(
    'default_mute_mic', false,
    'default_disable_camera', false,
    'quality', 'sd'
  );

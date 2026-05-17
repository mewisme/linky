ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS "call" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "notification" jsonb DEFAULT '{}'::jsonb;

UPDATE public.user_settings
SET
  "call" = jsonb_build_object(
    'default_mute_mic', COALESCE(default_mute_mic, false),
    'default_disable_camera', COALESCE(default_disable_camera, false),
    'quality', 'auto'
  ),
  "notification" = jsonb_build_object(
    'sound_enabled', COALESCE(notification_sound_enabled, true),
    'preferences', COALESCE(notification_preferences, '{}'::jsonb)
  );

ALTER TABLE public.user_settings
  ALTER COLUMN "call" SET NOT NULL,
  ALTER COLUMN "notification" SET NOT NULL,
  ALTER COLUMN "call" SET DEFAULT jsonb_build_object(
    'default_mute_mic', false,
    'default_disable_camera', false,
    'quality', 'auto'
  ),
  ALTER COLUMN "notification" SET DEFAULT jsonb_build_object(
    'sound_enabled', true,
    'preferences', '{}'::jsonb
  );

ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS default_mute_mic,
  DROP COLUMN IF EXISTS default_disable_camera,
  DROP COLUMN IF EXISTS notification_sound_enabled,
  DROP COLUMN IF EXISTS notification_preferences;

COMMENT ON COLUMN public.user_settings."call" IS 'Call preferences (default_mute_mic, default_disable_camera, quality)';
COMMENT ON COLUMN public.user_settings."notification" IS 'Notification preferences (sound_enabled, preferences extensible map)';

DROP VIEW IF EXISTS public.user_settings_v;

CREATE VIEW public.user_settings_v AS
 SELECT us.id,
    us.user_id,
    u.clerk_user_id,
    us.language,
    us.shader,
    us.sidebar,
    us."call",
    us."notification",
    us.created_at,
    us.updated_at
   FROM public.user_settings us
   LEFT JOIN public.users u ON us.user_id = u.id;

ALTER VIEW public.user_settings_v OWNER TO "postgres";

GRANT SELECT ON public.user_settings_v TO "anon";
GRANT SELECT ON public.user_settings_v TO "authenticated";
GRANT SELECT ON public.user_settings_v TO "service_role";

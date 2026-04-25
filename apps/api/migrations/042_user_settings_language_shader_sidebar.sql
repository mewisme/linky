ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS language text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shader json DEFAULT '{}'::json,
  ADD COLUMN IF NOT EXISTS sidebar json DEFAULT '{}'::json;

DROP VIEW IF EXISTS public.user_settings_v;

CREATE VIEW public.user_settings_v AS
 SELECT us.id,
    us.user_id,
    u.clerk_user_id,
    us.default_mute_mic,
    us.default_disable_camera,
    us.notification_sound_enabled,
    us.notification_preferences,
    us.language,
    us.shader,
    us.sidebar,
    us.created_at,
    us.updated_at
   FROM public.user_settings us
   LEFT JOIN public.users u ON us.user_id = u.id;

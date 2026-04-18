ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS user_settings_ui_locale_check;

ALTER TABLE user_settings
  DROP COLUMN IF EXISTS ui_locale;

CREATE OR REPLACE VIEW public.user_settings_v AS
 SELECT us.id,
    us.user_id,
    u.clerk_user_id,
    us.default_mute_mic,
    us.default_disable_camera,
    us.notification_sound_enabled,
    us.notification_preferences,
    us.created_at,
    us.updated_at
   FROM public.user_settings us
   LEFT JOIN public.users u ON us.user_id = u.id;

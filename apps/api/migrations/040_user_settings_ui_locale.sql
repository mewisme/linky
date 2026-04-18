ALTER TABLE user_settings
  ADD COLUMN ui_locale text
  CHECK (ui_locale IS NULL OR ui_locale IN ('en', 'vi'));

CREATE OR REPLACE VIEW public.user_settings_v AS
 SELECT us.id,
    us.user_id,
    u.clerk_user_id,
    us.default_mute_mic,
    us.default_disable_camera,
    us.notification_sound_enabled,
    us.notification_preferences,
    us.ui_locale,
    us.created_at,
    us.updated_at
   FROM public.user_settings us
   LEFT JOIN public.users u ON us.user_id = u.id;

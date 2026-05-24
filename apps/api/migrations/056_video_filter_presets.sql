-- Video filter presets for real-time WebGL camera effects.
-- Admin manages presets; users select them during calls (session-only, not persisted).

CREATE TABLE IF NOT EXISTS public.video_filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  fragment_shader text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Mirror updated_at triggers from other tables
CREATE TRIGGER handle_video_filter_presets_updated_at
  BEFORE UPDATE ON public.video_filter_presets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: only service_role can write
ALTER TABLE public.video_filter_presets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.video_filter_presets FROM anon;
REVOKE ALL ON TABLE public.video_filter_presets FROM authenticated;
GRANT ALL ON TABLE public.video_filter_presets TO service_role;

-- Public read access (list active presets without fragment_shader payload)
GRANT SELECT (id, slug, name, description, thumbnail_url, sort_order, is_active, created_at, updated_at)
  ON TABLE public.video_filter_presets TO anon;
GRANT SELECT (id, slug, name, description, thumbnail_url, sort_order, is_active, created_at, updated_at)
  ON TABLE public.video_filter_presets TO authenticated;
GRANT SELECT (id, slug, name, description, fragment_shader, thumbnail_url, sort_order, is_active, created_at, updated_at)
  ON TABLE public.video_filter_presets TO service_role;

DROP FUNCTION IF EXISTS public.increment_visitor(text);
DROP FUNCTION IF EXISTS public.page_views_timeseries(integer);
DROP FUNCTION IF EXISTS public.visitors_timeseries(integer);

DROP INDEX IF EXISTS public.idx_page_views_created_at;
DROP INDEX IF EXISTS public.idx_page_views_ip;
DROP INDEX IF EXISTS public.idx_page_views_path;
DROP INDEX IF EXISTS public.idx_visitors_ip;
DROP INDEX IF EXISTS public.idx_visitors_last_visit;

DROP TABLE IF EXISTS public.page_views;
DROP TABLE IF EXISTS public.visitors;

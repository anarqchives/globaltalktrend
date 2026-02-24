
-- Extend retention from 7 days to 12 months
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.trend_snapshots WHERE snapshot_at < now() - INTERVAL '12 months';
END;
$function$;

-- Add indexes for historical queries
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_title_time ON public.trend_snapshots (title, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_category_time ON public.trend_snapshots (category, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_country_time ON public.trend_snapshots (country_code, snapshot_at DESC);

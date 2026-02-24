
-- Table to store periodic trend snapshots for critical moment detection
CREATE TABLE public.trend_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  category TEXT,
  country_code TEXT,
  volume_raw INTEGER DEFAULT 0,
  change_percent NUMERIC DEFAULT 0,
  source_count INTEGER DEFAULT 1,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS (public read for critical moment detection, no user-specific data)
ALTER TABLE public.trend_snapshots ENABLE ROW LEVEL SECURITY;

-- Everyone can read snapshots (public data, not user-specific)
CREATE POLICY "Snapshots are viewable by everyone"
ON public.trend_snapshots
FOR SELECT
USING (true);

-- Only service role can insert (via edge function)
-- No INSERT policy for anon/authenticated - edge function uses service role

-- Index for efficient time-based queries
CREATE INDEX idx_snapshots_time ON public.trend_snapshots (snapshot_at DESC);
CREATE INDEX idx_snapshots_title_time ON public.trend_snapshots (title, snapshot_at DESC);

-- Auto-cleanup: delete snapshots older than 7 days via a function
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM public.trend_snapshots WHERE snapshot_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

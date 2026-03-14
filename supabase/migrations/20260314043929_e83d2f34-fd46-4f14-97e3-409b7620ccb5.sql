CREATE TABLE IF NOT EXISTS public.trend_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_title_hash TEXT UNIQUE NOT NULL,
  original_title TEXT NOT NULL,
  generated_context TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  lang TEXT NOT NULL DEFAULT 'pt',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_trend_context_hash ON public.trend_context_cache(trend_title_hash);
CREATE INDEX idx_trend_context_expires ON public.trend_context_cache(expires_at);

ALTER TABLE public.trend_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached contexts"
  ON public.trend_context_cache FOR SELECT
  TO public
  USING (true);
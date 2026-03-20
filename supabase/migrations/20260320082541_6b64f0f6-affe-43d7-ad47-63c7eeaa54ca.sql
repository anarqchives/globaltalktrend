
-- Create watchlist table for cross-device persistence
CREATE TABLE public.watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  category text,
  country_code text,
  last_score integer,
  last_volume text,
  last_change text,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, title, platform)
);

-- Enable RLS
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
ON public.watchlist FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist"
ON public.watchlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
ON public.watchlist FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own watchlist"
ON public.watchlist FOR DELETE
USING (auth.uid() = user_id);

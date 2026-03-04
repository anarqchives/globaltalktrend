
-- Create saved_cards table for Bento Dashboard
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  category TEXT,
  country_code TEXT,
  source_url TEXT,
  thumbnail TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own saved cards"
ON public.saved_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved cards"
ON public.saved_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards"
ON public.saved_cards FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved cards"
ON public.saved_cards FOR UPDATE
USING (auth.uid() = user_id);

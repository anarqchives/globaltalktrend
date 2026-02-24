
-- Table for user feedback on trends (thumbs up/down/flag)
CREATE TABLE public.trend_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_title TEXT NOT NULL,
  platform TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('useful', 'not_useful', 'report')),
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trend_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (even anonymous via session_id)
CREATE POLICY "Anyone can submit feedback"
ON public.trend_feedback
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.trend_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for analytics
CREATE INDEX idx_trend_feedback_title ON public.trend_feedback(trend_title);
CREATE INDEX idx_trend_feedback_type ON public.trend_feedback(feedback_type);

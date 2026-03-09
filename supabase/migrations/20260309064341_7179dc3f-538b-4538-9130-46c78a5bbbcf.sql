
-- Comments on saved cards (boards)
CREATE TABLE public.board_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.saved_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read comments on public boards
CREATE POLICY "Anyone can view comments" ON public.board_comments
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments" ON public.board_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.board_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.board_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_board_comments_card_id ON public.board_comments(card_id);
CREATE INDEX idx_board_comments_user_id ON public.board_comments(user_id);

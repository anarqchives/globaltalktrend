
-- Achievements catalog
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  points_reward integer NOT NULL DEFAULT 0,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements FOR SELECT
USING (true);

-- User points
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  points integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
ON public.user_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points"
ON public.user_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_points_action ON public.user_points(action);

-- User achievements (unlocked)
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Seed default achievements
INSERT INTO public.achievements (key, name, description, icon, points_reward, criteria) VALUES
  ('explorer_10', 'Explorador', 'Viu trends de 10 países diferentes', '🌍', 50, '{"type": "countries_viewed", "count": 10}'),
  ('all_categories', 'Categorias', 'Usou todos os filtros de categoria', '🎯', 30, '{"type": "all_categories_used"}'),
  ('streak_5', 'Madrugador', 'Acessou o site 5 dias seguidos', '🔥', 40, '{"type": "login_streak", "count": 5}'),
  ('streak_30', 'Dedicação Total', 'Acessou o site 30 dias seguidos', '💎', 200, '{"type": "login_streak", "count": 30}'),
  ('first_share', 'Influenciador', 'Compartilhou uma trend pela primeira vez', '📢', 10, '{"type": "shares", "count": 1}'),
  ('share_10', 'Mega Influenciador', 'Compartilhou 10 trends', '🌟', 50, '{"type": "shares", "count": 10}'),
  ('first_alert', 'Vigia', 'Criou seu primeiro alerta', '🔔', 10, '{"type": "alerts_created", "count": 1}'),
  ('expand_50', 'Curioso', 'Expandiu 50 cards de trends', '🔎', 30, '{"type": "cards_expanded", "count": 50}'),
  ('night_owl', 'Coruja Noturna', 'Acessou o site entre 0h e 5h', '🦉', 15, '{"type": "night_access"}'),
  ('first_view', 'Primeiro Passo', 'Visualizou sua primeira trend', '👣', 5, '{"type": "trends_viewed", "count": 1}');

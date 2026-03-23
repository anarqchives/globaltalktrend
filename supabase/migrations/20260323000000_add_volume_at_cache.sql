-- Add volume_at_cache to trend_context_cache for smart invalidation
ALTER TABLE trend_context_cache
  ADD COLUMN IF NOT EXISTS volume_at_cache BIGINT DEFAULT 0;

-- Index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_trend_context_cache_hash_lang
  ON trend_context_cache (trend_title_hash, lang);

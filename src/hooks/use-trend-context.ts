import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrendContextItem {
  title: string;
  description?: string;
  category?: string;
  platform?: string;
  volume?: string;
  countryCode?: string;
}

interface UseTrendContextOptions {
  trends: TrendContextItem[];
  lang?: string;
  enabled?: boolean;
  minVolume?: number;
}

const LOCAL_CACHE_KEY = 'gtt_trend_context_cache';
const LOCAL_CACHE_TTL = 60 * 60 * 1000; // 1h

function getLocalCache(): Record<string, { context: string; ts: number }> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
  } catch { return {}; }
}

function saveLocalCache(cache: Record<string, { context: string; ts: number }>) {
  try {
    const entries = Object.entries(cache);
    const trimmed = entries.length > 500 ? Object.fromEntries(entries.slice(-400)) : cache;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

export function useTrendContext({ trends, lang = 'pt', enabled = true, minVolume = 0 }: UseTrendContextOptions) {
  const [contexts, setContexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastKeysRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || trends.length === 0) return;

    // Filter by minimum volume
    const eligible = trends.filter(t => {
      if (!minVolume) return true;
      const vol = parseInt(String(t.volume || '0').replace(/[^\d]/g, ''), 10);
      return vol >= minVolume;
    });

    if (eligible.length === 0) return;

    // Deduplicate by title
    const key = eligible.map(t => t.title).sort().join('|');
    if (key === lastKeysRef.current) return;
    lastKeysRef.current = key;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchContexts = async () => {
      setLoading(true);

      // Check local cache first
      const localCache = getLocalCache();
      const now = Date.now();
      const cached: Record<string, string> = {};
      const uncached: TrendContextItem[] = [];

      for (const t of eligible) {
        const cacheKey = `${lang}:${t.title}`;
        const entry = localCache[cacheKey];
        if (entry && now - entry.ts < LOCAL_CACHE_TTL) {
          cached[t.title] = entry.context;
        } else {
          uncached.push(t);
        }
      }

      // Apply cached immediately
      if (Object.keys(cached).length > 0) {
        setContexts(prev => ({ ...prev, ...cached }));
      }

      if (uncached.length === 0) {
        setLoading(false);
        return;
      }

      // Batch in groups of 20
      const BATCH_SIZE = 20;
      for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        if (controller.signal.aborted) break;

        const batch = uncached.slice(i, i + BATCH_SIZE);
        try {
          const { data, error } = await supabase.functions.invoke('analyze-trend-context', {
            body: {
              trends: batch.map(t => ({
                title: t.title,
                platform: t.platform || '',
                volume: t.volume || '',
                category: t.category || '',
                countryCode: t.countryCode || '',
              })),
              lang,
            },
          });

          if (error || !data?.contexts) continue;

          const newContexts: Record<string, string> = {};
          const updatedCache = getLocalCache();

          for (const c of data.contexts) {
            if (c.title && c.context) {
              newContexts[c.title] = c.context;
              updatedCache[`${lang}:${c.title}`] = { context: c.context, ts: Date.now() };
            }
          }

          saveLocalCache(updatedCache);
          setContexts(prev => ({ ...prev, ...newContexts }));
        } catch {
          // Silently fail — don't break UI
        }
      }

      setLoading(false);
    };

    fetchContexts();

    return () => { controller.abort(); };
  }, [trends, lang, enabled, minVolume]);

  return { contexts, loading };
}

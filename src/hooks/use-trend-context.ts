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
const LOCAL_CACHE_TTL = 60 * 60 * 1000;

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
  const [loading, setLoading]   = useState(false);
  const abortRef    = useRef<AbortController | null>(null);
  const lastKeysRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || trends.length === 0) return;

    const eligible = trends.filter(t => {
      if (!minVolume) return true;
      const vol = parseInt(String(t.volume || '0').replace(/[^\d]/g, ''), 10);
      return vol >= minVolume;
    });

    if (eligible.length === 0) return;

    const key = eligible.map(t => t.title).sort().join('|');
    if (key === lastKeysRef.current) return;
    lastKeysRef.current = key;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchContexts = async () => {
      setLoading(true);

      const localCache = getLocalCache();
      const now        = Date.now();
      const cached:   Record<string, string> = {};
      const uncached: TrendContextItem[]     = [];

      for (const t of eligible) {
        const cacheKey = `${lang}:${t.title}`;
        const entry    = localCache[cacheKey];
        if (entry && now - entry.ts < LOCAL_CACHE_TTL) {
          cached[t.title] = entry.context;
        } else {
          uncached.push(t);
        }
      }

      if (Object.keys(cached).length > 0) {
        setContexts(prev => ({ ...prev, ...cached }));
      }

      if (uncached.length === 0) { setLoading(false); return; }

      try {
        if (controller.signal.aborted) { setLoading(false); return; }

        const titles = uncached.map(t => t.title);

        const { data: rows, error } = await supabase
          .from('trend_context_cache')
          .select('original_title, generated_context')
          .in('original_title', titles)
          .gt('expires_at', new Date().toISOString())
          .limit(100);

        if (!error && rows && rows.length > 0) {
          const newContexts: Record<string, string> = {};
          const updatedCache = getLocalCache();

          for (const row of rows) {
            if (row.original_title && row.generated_context) {
              newContexts[row.original_title] = row.generated_context;
              updatedCache[`${lang}:${row.original_title}`] = {
                context: row.generated_context,
                ts:      Date.now(),
              };
            }
          }

          saveLocalCache(updatedCache);
          setContexts(prev => ({ ...prev, ...newContexts }));
        }
      } catch { /* silently fail */ }

      setLoading(false);
    };

    fetchContexts();

    return () => { controller.abort(); };
  }, [trends, lang, enabled, minVolume]);

  return { contexts, loading };
}

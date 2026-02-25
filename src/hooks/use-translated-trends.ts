import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "@/components/TrendCard";

const TRANSLATION_CACHE_KEY = "gtt_translation_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 500;
const BATCH_SIZE = 25;

interface TranslationCacheEntry {
  title: string;
  details?: string;
  ts: number;
}

type TranslationCache = Record<string, TranslationCacheEntry>;

function getCacheKey(originalTitle: string, lang: string): string {
  return `${lang}::${originalTitle.slice(0, 80)}`;
}

function loadCache(): TranslationCache {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return {};
    const cache: TranslationCache = JSON.parse(raw);
    const now = Date.now();
    // Prune expired entries
    for (const key of Object.keys(cache)) {
      if (now - cache[key].ts > CACHE_TTL) delete cache[key];
    }
    return cache;
  } catch {
    return {};
  }
}

function saveCache(cache: TranslationCache) {
  try {
    // Limit cache size
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const sorted = keys.sort((a, b) => cache[a].ts - cache[b].ts);
      for (let i = 0; i < sorted.length - MAX_CACHE_ENTRIES; i++) {
        delete cache[sorted[i]];
      }
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full, ignore */ }
}

// Languages where most content is already in that language (no translation needed for matching sources)
const SOURCE_LANGS: Record<string, string[]> = {
  pt: ["IBGE"],
  en: ["Hacker News", "GitHub", "Stack Overflow", "The Guardian", "arXiv", "PubMed", "OpenAlex", "Crossref", "NOAA", "GDELT"],
};

function needsTranslation(trend: TrendCardProps, lang: string): boolean {
  // If lang matches the likely source language of the platform, skip
  for (const [sourceLang, platforms] of Object.entries(SOURCE_LANGS)) {
    if (lang === sourceLang && platforms.includes(trend.platform)) return false;
  }
  return true;
}

export function useTranslatedTrends(trends: TrendCardProps[], lang: string) {
  const [translated, setTranslated] = useState<TrendCardProps[]>(trends);
  const [isTranslating, setIsTranslating] = useState(false);
  const cacheRef = useRef<TranslationCache>(loadCache());
  const lastLangRef = useRef(lang);
  const lastTrendsKeyRef = useRef("");

  const translateBatch = useCallback(async (
    items: { index: number; title: string; details?: string }[],
    targetLang: string,
  ): Promise<Map<number, { title: string; details?: string }>> => {
    const result = new Map<number, { title: string; details?: string }>();
    if (items.length === 0) return result;

    try {
      const { data, error } = await supabase.functions.invoke("translate-trends", {
        body: {
          items: items.map((i) => ({ title: i.title, details: i.details })),
          targetLang,
        },
      });
      if (error || !data?.translations) return result;

      const translations = data.translations as { title: string; details?: string }[];
      for (let i = 0; i < items.length && i < translations.length; i++) {
        const t = translations[i];
        if (t.title && t.title !== items[i].title) {
          result.set(items[i].index, t);
          // Cache it
          const key = getCacheKey(items[i].title, targetLang);
          cacheRef.current[key] = { ...t, ts: Date.now() };
        }
      }
      saveCache(cacheRef.current);
    } catch (e) {
      console.error("Translation batch error:", e);
    }
    return result;
  }, []);

  useEffect(() => {
    // If trends empty, just pass through
    if (trends.length === 0) {
      setTranslated(trends);
      return;
    }

    // Generate a key to avoid re-translating same set
    const trendsKey = `${lang}::${trends.slice(0, 5).map(t => t.title).join("|")}`;
    if (trendsKey === lastTrendsKeyRef.current && lang === lastLangRef.current) {
      return; // Already processed this set
    }
    lastLangRef.current = lang;
    lastTrendsKeyRef.current = trendsKey;

    // Step 1: Apply cached translations immediately
    const cache = cacheRef.current;
    const withCached = trends.map((t) => {
      if (!needsTranslation(t, lang)) return t;
      const key = getCacheKey(t.title, lang);
      const cached = cache[key];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return {
          ...t,
          title: cached.title,
          details: cached.details || t.details,
          description: cached.details || t.description,
          translated: true,
        } as TrendCardProps & { translated?: boolean };
      }
      return t;
    });
    setTranslated(withCached);

    // Step 2: Find uncached items that need translation
    const uncached: { index: number; title: string; details?: string }[] = [];
    for (let i = 0; i < trends.length; i++) {
      if (!needsTranslation(trends[i], lang)) continue;
      const key = getCacheKey(trends[i].title, lang);
      if (!cache[key] || Date.now() - cache[key].ts > CACHE_TTL) {
        uncached.push({ index: i, title: trends[i].title, details: trends[i].details });
      }
    }

    if (uncached.length === 0) return;

    // Step 3: Batch translate uncached items
    setIsTranslating(true);
    const batches: { index: number; title: string; details?: string }[][] = [];
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      batches.push(uncached.slice(i, i + BATCH_SIZE));
    }

    (async () => {
      const allResults = new Map<number, { title: string; details?: string }>();
      // Translate batches sequentially to avoid overwhelming AI
      for (const batch of batches) {
        const results = await translateBatch(batch, lang);
        results.forEach((v, k) => allResults.set(k, v));
      }

      if (allResults.size > 0) {
        setTranslated((prev) => {
          return prev.map((t, i) => {
            const tr = allResults.get(i);
            if (tr) {
              return {
                ...t,
                title: tr.title,
                details: tr.details || t.details,
                description: tr.details || t.description,
                translated: true,
              } as TrendCardProps & { translated?: boolean };
            }
            return t;
          });
        });
      }
      setIsTranslating(false);
    })();
  }, [trends, lang, translateBatch]);

  return { translatedTrends: translated, isTranslating };
}

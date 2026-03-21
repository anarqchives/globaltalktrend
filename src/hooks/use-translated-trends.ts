import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "@/components/TrendCard";

const TRANSLATION_CACHE_KEY = "gtt_translation_cache_v2";
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_ENTRIES = 800;
const BATCH_SIZE = 25;
const MAX_CONCURRENT_BATCHES = 2;

interface TranslationCacheEntry {
  title: string;
  details?: string;
  ts: number;
}

type TranslationCache = Record<string, TranslationCacheEntry>;

function getCacheKey(originalTitle: string, lang: string): string {
  return `${lang}::${originalTitle.slice(0, 100)}`;
}

function loadCache(): TranslationCache {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return {};
    const cache: TranslationCache = JSON.parse(raw);
    const now = Date.now();
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
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const sorted = keys.sort((a, b) => cache[a].ts - cache[b].ts);
      for (let i = 0; i < sorted.length - MAX_CACHE_ENTRIES; i++) {
        delete cache[sorted[i]];
      }
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage full */ }
}

// Detect if text is already in the target language heuristically
const LANG_INDICATORS: Record<string, RegExp> = {
  pt: /\b(que|para|com|uma|não|são|mais|como|foi|está|por|dos|das|tem|ser|nos|aos)\b/i,
  en: /\b(the|and|for|with|that|this|from|will|about|their|which|there|these|have|been)\b/i,
  es: /\b(que|para|con|una|más|como|por|los|las|del|desde|está|tiene|son|pero)\b/i,
  fr: /\b(les|des|pour|dans|une|avec|sur|par|qui|que|est|sont|cette|nous|leur)\b/i,
  de: /\b(der|die|das|und|ist|ein|eine|mit|auf|für|von|nicht|sich|den|dem)\b/i,
  it: /\b(che|per|con|una|del|della|sono|dal|gli|nel|alla|sulla|questo|quella)\b/i,
  ru: /[\u0400-\u04FF]/,
  zh: /[\u4E00-\u9FFF]/,
  ja: /[\u3040-\u309F\u30A0-\u30FF]/,
  ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  ar: /[\u0600-\u06FF]/,
  hi: /[\u0900-\u097F]/,
};

function needsTranslation(trend: TrendCardProps, lang: string): boolean {
  const title = trend.title || "";
  if (!title.trim()) return false;

  // If the title already matches the target language pattern, skip
  const targetPattern = LANG_INDICATORS[lang];
  if (targetPattern && targetPattern.test(title)) {
    // For script-based languages (CJK, Cyrillic, Arabic, Hindi), if it matches, it's already in language
    if (["ru", "zh", "ja", "ko", "ar", "hi"].includes(lang)) return false;
    // For Latin-script languages, require multiple word matches to be confident
    const words = title.split(/\s+/);
    const matchCount = words.filter(w => targetPattern.test(w)).length;
    if (matchCount >= 3 || matchCount / words.length > 0.3) return false;
  }

  return true;
}

// Extended type preserving original title for cross-platform matching
export type TranslatedTrendCardProps = TrendCardProps & { _originalTitle?: string; translated?: boolean };

export function useTranslatedTrends(trends: TrendCardProps[], lang: string) {
  const [translated, setTranslated] = useState<TranslatedTrendCardProps[]>(trends);
  const [isTranslating, setIsTranslating] = useState(false);
  const cacheRef = useRef<TranslationCache>(loadCache());
  const lastLangRef = useRef(lang);
  const lastTrendsKeyRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const translateBatch = useCallback(async (
    items: { index: number; title: string; details?: string }[],
    targetLang: string,
    signal?: AbortSignal,
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
      
      if (signal?.aborted) return result;
      if (error || !data?.translations) return result;

      const translations = data.translations as { title: string; details?: string }[];
      for (let i = 0; i < items.length && i < translations.length; i++) {
        const t = translations[i];
        if (t.title && t.title !== items[i].title) {
          result.set(items[i].index, t);
          const key = getCacheKey(items[i].title, targetLang);
          cacheRef.current[key] = { ...t, ts: Date.now() };
        }
      }
      saveCache(cacheRef.current);
    } catch (e) {
      if (signal?.aborted) return result;
      console.error("Translation batch error:", e);
    }
    return result;
  }, []);

  useEffect(() => {
    // Cancel previous translation in progress
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (trends.length === 0) {
      setTranslated(trends);
      return;
    }

    // Check if any trends actually need translation
    const hasTranslatable = trends.some(t => needsTranslation(t, lang));
    if (!hasTranslatable) {
      setTranslated(trends.map(t => ({ ...t, _originalTitle: t.title })));
      lastLangRef.current = lang;
      lastTrendsKeyRef.current = "";
      setIsTranslating(false);
      return;
    }

    // Generate key to detect changes
    const trendsKey = `${lang}::${trends.length}::${trends.slice(0, 3).map(t => t.title.slice(0, 20)).join("|")}`;
    if (trendsKey === lastTrendsKeyRef.current && lang === lastLangRef.current) {
      return;
    }
    lastLangRef.current = lang;
    lastTrendsKeyRef.current = trendsKey;

    // Step 1: Apply cached translations immediately
    const cache = cacheRef.current;
    const withCached: TranslatedTrendCardProps[] = trends.map((t) => {
      if (!needsTranslation(t, lang)) return { ...t, _originalTitle: t.title };
      const key = getCacheKey(t.title, lang);
      const cached = cache[key];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return {
          ...t,
          _originalTitle: t.title,
          title: cached.title,
          details: cached.details || t.details,
          description: cached.details || t.description,
          translated: true,
        };
      }
      return { ...t, _originalTitle: t.title };
    });
    setTranslated(withCached);

    // Step 2: Find uncached items needing translation
    const uncached: { index: number; title: string; details?: string }[] = [];
    for (let i = 0; i < trends.length; i++) {
      if (!needsTranslation(trends[i], lang)) continue;
      const key = getCacheKey(trends[i].title, lang);
      if (!cache[key] || Date.now() - cache[key].ts > CACHE_TTL) {
        uncached.push({ index: i, title: trends[i].title, details: trends[i].details });
      }
    }

    if (uncached.length === 0) return;

    // Step 3: Parallel batch translation with concurrency control
    setIsTranslating(true);
    const batches: { index: number; title: string; details?: string }[][] = [];
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      batches.push(uncached.slice(i, i + BATCH_SIZE));
    }

    (async () => {
      const allResults = new Map<number, { title: string; details?: string }>();
      
      // Process batches with controlled concurrency
      for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
        if (controller.signal.aborted) break;
        
        const chunk = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
        const results = await Promise.all(
          chunk.map(batch => translateBatch(batch, lang, controller.signal))
        );
        
        for (const result of results) {
          result.forEach((v, k) => allResults.set(k, v));
        }

        // Apply partial results immediately for faster UX
        if (allResults.size > 0 && !controller.signal.aborted) {
          setTranslated((prev) => {
            return prev.map((t, idx) => {
              const tr = allResults.get(idx);
              if (tr && !t.translated) {
                return {
                  ...t,
                  title: tr.title,
                  details: tr.details || t.details,
                  description: tr.details || t.description,
                  translated: true,
                };
              }
              return t;
            });
          });
        }
      }

      if (!controller.signal.aborted) {
        setIsTranslating(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [trends, lang, translateBatch]);

  return { translatedTrends: translated as TranslatedTrendCardProps[], isTranslating };
}

/**
 * Trend cache utilities — extracted from use-trends.ts
 * Manages source health, per-source last-good cache, and predictive cache.
 */
import { TrendCardProps } from "@/components/TrendCard";
import { FilterState } from "@/components/FilterBar";

export const CACHE_KEY = "gtt_trends_cache";
export const CACHE_TTL = 5 * 60 * 1000; // 5 min
const PREDICTIVE_CACHE_KEY = "gtt_predictive_cache";
export const SOURCE_HEALTH_KEY = "gtt_source_health";
const SOURCE_CACHE_KEY = "gtt_source_last_good";
const SOURCE_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// ─── Source Health Tracker ──────────────────────────────────────────
export type SourceHealthEntry = { ok: boolean; count: number; lastOk: number; failures: number };
export type SourceHealthMap = Record<string, SourceHealthEntry>;

export function loadSourceHealth(): SourceHealthMap {
  try {
    const raw = localStorage.getItem(SOURCE_HEALTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveSourceHealth(health: SourceHealthMap) {
  try { localStorage.setItem(SOURCE_HEALTH_KEY, JSON.stringify(health)); } catch {}
}

export function updateSourceHealth(health: SourceHealthMap, platform: string, ok: boolean, count: number): SourceHealthMap {
  const prev = health[platform] || { ok: false, count: 0, lastOk: 0, failures: 0 };
  return {
    ...health,
    [platform]: {
      ok,
      count,
      lastOk: ok ? Date.now() : prev.lastOk,
      failures: ok ? 0 : prev.failures + 1,
    },
  };
}

// ─── Per-Source Last-Good Cache ────────────────────────────────────
function loadSourceLastGood(): Record<string, { ts: number; trends: TrendCardProps[] }> {
  try {
    const raw = localStorage.getItem(SOURCE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const cutoff = Date.now() - SOURCE_CACHE_MAX_AGE;
    const pruned: Record<string, { ts: number; trends: TrendCardProps[] }> = {};
    for (const [k, v] of Object.entries(parsed) as [string, { ts: number; trends: TrendCardProps[] }][]) {
      if (v.ts > cutoff) pruned[k] = v;
    }
    return pruned;
  } catch { return {}; }
}

export function saveSourceLastGood(functionName: string, trends: TrendCardProps[]) {
  if (trends.length === 0) return;
  try {
    const cache = loadSourceLastGood();
    cache[functionName] = { ts: Date.now(), trends: trends.slice(0, 30) };
    const entries = Object.entries(cache).sort((a, b) => b[1].ts - a[1].ts).slice(0, 20);
    localStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

export function getSourceLastGood(functionName: string): TrendCardProps[] {
  const cache = loadSourceLastGood();
  const entry = cache[functionName];
  if (entry && entry.trends.length > 0) {
    return entry.trends.map(t => ({ ...t, time: "cache" }));
  }
  return [];
}

// ─── Predictive Cache ──────────────────────────────────────────────
type PredictiveCacheEntry = { ts: number; data: TrendCardProps[] };
type PredictiveCache = Record<string, PredictiveCacheEntry>;

function getPredictiveCacheKey(filters: FilterState): string {
  return `${filters.country}|${filters.category}|${filters.type}`;
}

function getTimeSlotKey(): string {
  const now = new Date();
  return `${now.getDay()}:${now.getHours()}`;
}

function loadPredictiveCache(): PredictiveCache {
  try {
    const raw = localStorage.getItem(PREDICTIVE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PredictiveCache;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const pruned: PredictiveCache = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.ts > cutoff) pruned[key] = entry;
    }
    return pruned;
  } catch { return {}; }
}

function savePredictiveCache(cache: PredictiveCache) {
  try {
    const entries = Object.entries(cache).sort((a, b) => b[1].ts - a[1].ts).slice(0, 30);
    localStorage.setItem(PREDICTIVE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

export function saveToPredictiveCache(filters: FilterState, data: TrendCardProps[]) {
  if (data.length === 0) return;
  const cache = loadPredictiveCache();
  const key = `${getPredictiveCacheKey(filters)}:${getTimeSlotKey()}`;
  cache[key] = { ts: Date.now(), data: data.slice(0, 30) };
  savePredictiveCache(cache);
}

export function getFromPredictiveCache(filters: FilterState): TrendCardProps[] | null {
  const cache = loadPredictiveCache();
  const filterKey = getPredictiveCacheKey(filters);
  const timeSlot = getTimeSlotKey();
  
  const exactKey = `${filterKey}:${timeSlot}`;
  if (cache[exactKey]?.data?.length) return cache[exactKey].data;
  
  const candidates = Object.entries(cache)
    .filter(([k]) => k.startsWith(filterKey + ":"))
    .sort((a, b) => b[1].ts - a[1].ts);
  if (candidates.length > 0) return candidates[0][1].data;
  
  return null;
}

// ─── Session Cache ─────────────────────────────────────────────────
type TrendsCachePayload = { ts: number; data: TrendCardProps[] };

export function getCachedTrends(): TrendsCachePayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrendsCachePayload;
    if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

export function getStaleCachedTrends(): TrendCardProps[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrendsCachePayload;
    return parsed?.data || [];
  } catch { return []; }
}

export function setCachedTrends(data: TrendCardProps[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data.slice(0, 120) }));
  } catch {}
}

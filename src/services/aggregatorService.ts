/**
 * Aggregator — unifies all 6 new client-side API services.
 * Runs in parallel, deduplicates, sorts by date.
 */
import { fetchGdeltTrends } from "./gdeltService";
import { fetchNewsDataTrends } from "./newsDataService";
import { fetchTheNewsApiTrends } from "./theNewsApiService";
import { fetchMediastackTrends } from "./mediastackService";
import { fetchAlphaVantageTrends } from "./alphaVantageService";
import { fetchFixerTrends } from "./fixerService";
import type { TrendCardProps } from "@/components/TrendCard";

// ─── Unified type ──────────────────────────────────────────────────
export interface UnifiedTrend {
  id: string;
  title: string;
  context: string;
  source: string;
  sourceType: "imprensa-verificada" | "imprensa" | "dados-oficiais" | "academico" | "enciclopedico" | "social";
  sourceTag: string;
  date: string;
  country: string;
  category: string;
  image: string | null;
  url: string;
  value: string | null;
  change: string | null;
  tags: string[];
  verified: boolean;
}

// ─── Dedup ─────────────────────────────────────────────────────────
const SOURCE_PRIORITY: Record<string, number> = {
  "imprensa-verificada": 5, "dados-oficiais": 4, "imprensa": 3, "academico": 2, "enciclopedico": 1, "social": 0,
};

function tokenize(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2)
  );
}

function similarity(a: string, b: string): number {
  const sa = tokenize(a), sb = tokenize(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let common = 0;
  for (const w of sa) if (sb.has(w)) common++;
  return common / Math.max(sa.size, sb.size);
}

function dedup(items: UnifiedTrend[]): UnifiedTrend[] {
  const seen = new Map<string, UnifiedTrend>();
  // URL dedup
  for (const item of items) {
    if (item.url && seen.has(item.url)) {
      const existing = seen.get(item.url)!;
      if ((SOURCE_PRIORITY[item.sourceType] || 0) > (SOURCE_PRIORITY[existing.sourceType] || 0)) {
        seen.set(item.url, item);
      }
    } else if (item.url) {
      seen.set(item.url, item);
    }
  }

  // Title similarity dedup
  const result: UnifiedTrend[] = [];
  const titleIndex: { title: string; idx: number }[] = [];

  for (const item of seen.values()) {
    let isDup = false;
    for (const { title, idx } of titleIndex) {
      if (similarity(item.title, title) > 0.7) {
        // Keep higher priority
        if ((SOURCE_PRIORITY[item.sourceType] || 0) > (SOURCE_PRIORITY[result[idx].sourceType] || 0)) {
          result[idx] = item;
        }
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      titleIndex.push({ title: item.title, idx: result.length });
      result.push(item);
    }
  }
  return result;
}

// ─── Convert to TrendCardProps ─────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  "imprensa-verificada": "📰", "imprensa": "🗞️", "dados-oficiais": "📊",
  "academico": "🔬", "enciclopedico": "📚", "social": "💬",
};

const TRUST_MAP: Record<string, string> = {
  "imprensa-verificada": "verified", "dados-oficiais": "official", "imprensa": "standard",
};

function toTrendCard(t: UnifiedTrend): TrendCardProps {
  const timeDiff = Date.now() - new Date(t.date).getTime();
  const mins = Math.floor(timeDiff / 60000);
  const time = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;

  return {
    icon: ICON_MAP[t.sourceType] || "📰",
    platform: t.source,
    title: t.title,
    category: t.category,
    time,
    volume: t.value || "—",
    change: t.change || "—",
    changePositive: t.change ? !t.change.startsWith("-") : true,
    sparkData: Array.from({ length: 10 }, () => Math.random() * 100),
    details: t.context || undefined,
    description: t.context || undefined,
    countryCode: t.country?.toUpperCase() || "GL",
    sourceUrl: t.url || undefined,
    trustBadge: TRUST_MAP[t.sourceType] || undefined,
    thumbnail: t.image || undefined,
    publishedAt: t.date,
  };
}

// ─── Cache ─────────────────────────────────────────────────────────
const AGG_CACHE_TTL = 15 * 60 * 1000;
let aggCache: { data: TrendCardProps[]; ts: number } | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// ─── Public API ────────────────────────────────────────────────────
export async function fetchAggregatedTrends(
  filters?: { country?: string; category?: string }
): Promise<TrendCardProps[]> {
  if (aggCache && Date.now() - aggCache.ts < AGG_CACHE_TTL) {
    return filterTrends(aggCache.data, filters);
  }

  const keys = {
    newsData: import.meta.env.VITE_NEWSDATA_API_KEY as string | undefined,
    theNewsApi: import.meta.env.VITE_THENEWSAPI_KEY as string | undefined,
    mediastack: import.meta.env.VITE_MEDIASTACK_KEY as string | undefined,
    alphaVantage: import.meta.env.VITE_ALPHAVANTAGE_KEY as string | undefined,
    fixer: import.meta.env.VITE_FIXER_KEY as string | undefined,
  };

  const country = filters?.country || undefined;

  const results = await Promise.allSettled([
    fetchGdeltTrends(country),
    keys.newsData ? fetchNewsDataTrends(keys.newsData, country, filters?.category) : Promise.resolve([]),
    keys.theNewsApi ? fetchTheNewsApiTrends(keys.theNewsApi) : Promise.resolve([]),
    keys.mediastack ? fetchMediastackTrends(keys.mediastack, country?.toLowerCase()) : Promise.resolve([]),
    keys.alphaVantage ? fetchAlphaVantageTrends(keys.alphaVantage) : Promise.resolve([]),
    keys.fixer ? fetchFixerTrends(keys.fixer) : Promise.resolve([]),
  ]);

  const labels = ["GDELT", "NewsData", "TheNewsAPI", "Mediastack", "AlphaVantage", "Fixer"];
  const allUnified: UnifiedTrend[] = [];

  results.forEach((r, i) => {
    const count = r.status === "fulfilled" ? r.value.length : 0;
    recordSourceStat(labels[i], count);
    if (r.status === "fulfilled") {
      if (import.meta.env.DEV) console.log(`✅ Aggregator/${labels[i]}: ${r.value.length} itens`);
      allUnified.push(...r.value);
    } else {
      console.warn(`⚠️ Aggregator/${labels[i]} failed:`, r.reason);
    }
  });

  const deduped = dedup(allUnified);
  deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cards = deduped.map(toTrendCard);
  aggCache = { data: cards, ts: Date.now() };

  if (import.meta.env.DEV) console.log(`📦 Aggregator total: ${allUnified.length} raw → ${cards.length} deduped`);
  return filterTrends(cards, filters);
}

function filterTrends(
  data: TrendCardProps[], filters?: { country?: string; category?: string }
): TrendCardProps[] {
  let result = data;
  if (filters?.country && filters.country !== "GL") {
    result = result.filter((t) => t.countryCode?.toLowerCase() === filters.country?.toLowerCase());
  }
  if (filters?.category && filters.category !== "Todas") {
    result = result.filter((t) => t.category === filters.category);
  }
  return result;
}

// Auto-refresh every 15 min
export function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = setInterval(() => {
    aggCache = null; // force next fetch to refresh
  }, AGG_CACHE_TTL);
}

export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// ─── Diagnostics API ───────────────────────────────────────────────
export interface AggregatorSourceStatus {
  name: string;
  enabled: boolean;
  reason?: string;
  lastFetchCount: number | null;
  lastFetchTime: Date | null;
  cached: boolean;
}

const sourceStats: Record<string, { count: number; ts: number }> = {};

export function recordSourceStat(name: string, count: number) {
  sourceStats[name] = { count, ts: Date.now() };
}

export function getAggregatorDiagnostics(): AggregatorSourceStatus[] {
  const keys = {
    newsData: import.meta.env.VITE_NEWSDATA_API_KEY as string | undefined,
    theNewsApi: import.meta.env.VITE_THENEWSAPI_KEY as string | undefined,
    mediastack: import.meta.env.VITE_MEDIASTACK_KEY as string | undefined,
    alphaVantage: import.meta.env.VITE_ALPHAVANTAGE_KEY as string | undefined,
    fixer: import.meta.env.VITE_FIXER_KEY as string | undefined,
  };

  const sources: { name: string; key: string | undefined; reason?: string }[] = [
    { name: "GDELT", key: "open" },
    { name: "NewsData", key: keys.newsData, reason: "VITE_NEWSDATA_API_KEY" },
    { name: "TheNewsAPI", key: keys.theNewsApi, reason: "VITE_THENEWSAPI_KEY" },
    { name: "Mediastack", key: keys.mediastack, reason: "VITE_MEDIASTACK_KEY" },
    { name: "AlphaVantage", key: keys.alphaVantage, reason: "VITE_ALPHAVANTAGE_KEY" },
    { name: "Fixer", key: keys.fixer, reason: "VITE_FIXER_KEY" },
  ];

  return sources.map((s) => {
    const enabled = s.key === "open" || !!s.key;
    const stat = sourceStats[s.name];
    return {
      name: s.name,
      enabled,
      reason: enabled ? undefined : `Missing ${s.reason}`,
      lastFetchCount: stat?.count ?? null,
      lastFetchTime: stat ? new Date(stat.ts) : null,
      cached: !!aggCache && Date.now() - aggCache.ts < AGG_CACHE_TTL,
    };
  });
}

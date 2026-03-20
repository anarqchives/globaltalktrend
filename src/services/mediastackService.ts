/**
 * Mediastack API — free tier (HTTP only).
 */
import type { UnifiedTrend } from "./aggregatorService";

// Free plan: HTTP only
const ENDPOINT = "http://api.mediastack.com/v1/news";
const CACHE_TTL = 20 * 60 * 1000;
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

const CATEGORY_REVERSE: Record<string, string> = {
  general: "Geral", business: "Economia", entertainment: "Entretenimento",
  health: "Ciências", science: "Ciências", sports: "Esportes", technology: "Tecnologia",
};

export async function fetchMediastackTrends(apiKey: string, countries?: string): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const params = new URLSearchParams({
      access_key: apiKey, languages: "pt,en",
      categories: "general,business,entertainment,health,science,sports,technology",
      limit: "50",
    });
    if (countries) params.set("countries", countries);

    const res = await fetch(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`Mediastack ${res.status}`);
    const json = await res.json();
    const items: any[] = json?.data || [];

    const trends: UnifiedTrend[] = items.map((d) => ({
      id: `mediastack-${btoa(d.title || "").slice(0, 20)}`,
      title: d.title || "",
      context: d.description || "",
      source: d.source || "Mediastack",
      sourceType: "imprensa" as const,
      sourceTag: "MEDIASTACK",
      date: d.published_at ? new Date(d.published_at).toISOString() : new Date().toISOString(),
      country: d.country?.toLowerCase() || "GL",
      category: CATEGORY_REVERSE[d.category] || "Geral",
      image: d.image || null,
      url: d.url || "",
      value: null, change: null, tags: [], verified: false,
    }));

    cache = { data: trends, ts: Date.now() };
    return trends;
  } catch (e) {
    // Mixed-content or API failure — silent fallback
    console.warn("Mediastack fetch failed (HTTP mixed-content likely):", e);
    return cache?.data || [];
  }
}

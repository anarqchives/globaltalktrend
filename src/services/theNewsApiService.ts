/**
 * TheNewsAPI — free tier.
 */
import type { UnifiedTrend } from "./aggregatorService";

const ENDPOINT = "https://api.thenewsapi.com/v1/news/all";
const CACHE_TTL = 20 * 60 * 1000;
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

const CATEGORY_REVERSE: Record<string, string> = {
  general: "Geral", science: "Ciências", technology: "Tecnologia",
  business: "Economia", entertainment: "Entretenimento", health: "Ciências", sports: "Esportes",
};

export async function fetchTheNewsApiTrends(apiKey: string): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const params = new URLSearchParams({
      api_token: apiKey, language: "en,pt", limit: "50",
      categories: "general,science,technology,business,entertainment,health,sports",
      published_after: yesterday,
    });
    const res = await fetch(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`TheNewsAPI ${res.status}`);
    const json = await res.json();
    const items: any[] = json?.data || [];

    const trends: UnifiedTrend[] = items.map((d) => ({
      id: d.uuid || `thenewsapi-${btoa(d.title || "").slice(0, 20)}`,
      title: d.title || "",
      context: d.description || d.snippet || "",
      source: d.source || "TheNewsAPI",
      sourceType: "imprensa" as const,
      sourceTag: "THENEWSAPI",
      date: d.published_at ? new Date(d.published_at).toISOString() : new Date().toISOString(),
      country: d.locale?.slice(0, 2)?.toLowerCase() || "GL",
      category: CATEGORY_REVERSE[d.categories?.[0]] || "Geral",
      image: d.image_url || null,
      url: d.url || "",
      value: null, change: null, tags: [], verified: false,
    }));

    cache = { data: trends, ts: Date.now() };
    return trends;
  } catch (e) {
    console.warn("TheNewsAPI fetch failed:", e);
    return cache?.data || [];
  }
}

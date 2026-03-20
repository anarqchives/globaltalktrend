/**
 * NewsData.io API — free tier (10 results/request, 200 credits/day).
 */
import type { UnifiedTrend } from "./aggregatorService";

const ENDPOINT = "https://newsdata.io/api/1/latest";
const CACHE_TTL = 30 * 60 * 1000; // 30 min
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

const CATEGORY_MAP: Record<string, string> = {
  "Geopolítica": "politics,world", "Economia": "business", "Tecnologia": "technology",
  "Ciências": "science", "Saúde": "health", "Entretenimento": "entertainment",
  "Esportes": "sports", "Meio Ambiente": "environment", "Educação": "education", "Cultura": "top",
};

const REVERSE_CATEGORY: Record<string, string> = {
  politics: "Geopolítica", world: "Geopolítica", business: "Economia",
  technology: "Tecnologia", science: "Ciências", health: "Ciências",
  entertainment: "Entretenimento", sports: "Esportes", environment: "Ciências",
  education: "Cultura", top: "Geral",
};

export async function fetchNewsDataTrends(
  apiKey: string, country?: string, category?: string
): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const params = new URLSearchParams({ apikey: apiKey, language: "pt,en", size: "10" });
    if (country && country !== "GL") params.set("country", country.toLowerCase());
    if (category && CATEGORY_MAP[category]) params.set("category", CATEGORY_MAP[category]);

    const res = await fetch(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`NewsData ${res.status}`);
    const data = await res.json();
    const results: any[] = data?.results || [];

    const trends: UnifiedTrend[] = results.map((r) => ({
      id: `newsdata-${btoa(r.title || "").slice(0, 20)}`,
      title: r.title || "",
      context: r.description || "",
      source: r.source_name || "NewsData",
      sourceType: "imprensa" as const,
      sourceTag: "NEWSDATA",
      date: r.pubDate ? new Date(r.pubDate).toISOString() : new Date().toISOString(),
      country: r.country?.[0]?.toLowerCase() || "GL",
      category: REVERSE_CATEGORY[r.category?.[0]] || "Geral",
      image: r.image_url || null,
      url: r.source_url || r.link || "",
      value: null, change: null, tags: [], verified: false,
    }));

    cache = { data: trends, ts: Date.now() };
    return trends;
  } catch (e) {
    console.warn("NewsData fetch failed:", e);
    return cache?.data || [];
  }
}

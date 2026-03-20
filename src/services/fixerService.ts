/**
 * Fixer.io — exchange rates. Free tier: HTTP, EUR base only.
 * 100 req/month — cache 6h.
 */
import type { UnifiedTrend } from "./aggregatorService";

const ENDPOINT = "http://data.fixer.io/api/latest";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

export async function fetchFixerTrends(apiKey: string): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const res = await fetch(`${ENDPOINT}?access_key=${apiKey}&symbols=USD,BRL,GBP,JPY,CNY`);
    if (!res.ok) throw new Error(`Fixer ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Fixer API error");

    const r = data.rates || {};
    const trend: UnifiedTrend = {
      id: "fixer-rates-latest",
      title: `Câmbio Global: EUR/USD ${r.USD?.toFixed(4)}, EUR/BRL ${r.BRL?.toFixed(4)}`,
      context: `Taxas atualizadas: 1 EUR = ${r.USD?.toFixed(4)} USD, ${r.BRL?.toFixed(4)} BRL, ${r.GBP?.toFixed(4)} GBP, ${r.JPY?.toFixed(2)} JPY, ${r.CNY?.toFixed(4)} CNY.`,
      source: "Fixer.io", sourceType: "dados-oficiais", sourceTag: "FIXER",
      date: new Date(data.timestamp * 1000).toISOString(),
      country: "GL", category: "Economia", image: null, url: "",
      value: `EUR/USD ${r.USD?.toFixed(4)}`, change: null,
      tags: ["câmbio", "euro"], verified: true,
    };

    cache = { data: [trend], ts: Date.now() };
    return [trend];
  } catch (e) {
    console.warn("Fixer fetch failed (HTTP mixed-content likely):", e);
    return cache?.data || [];
  }
}

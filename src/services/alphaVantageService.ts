/**
 * Alpha Vantage — market data for Economia category.
 * 25 req/day limit — cache 1h.
 */
import type { UnifiedTrend } from "./aggregatorService";

const BASE = "https://www.alphavantage.co/query";
const CACHE_TTL = 60 * 60 * 1000; // 1h
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

export async function fetchAlphaVantageTrends(apiKey: string): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const [gainersRes, fxRes] = await Promise.allSettled([
      fetch(`${BASE}?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`),
      fetch(`${BASE}?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=BRL&apikey=${apiKey}`),
    ]);

    const trends: UnifiedTrend[] = [];

    // Top gainers/losers
    if (gainersRes.status === "fulfilled" && gainersRes.value.ok) {
      const data = await gainersRes.value.json();
      const gainers: any[] = (data?.top_gainers || []).slice(0, 5);
      const losers: any[] = (data?.top_losers || []).slice(0, 3);

      for (const g of gainers) {
        trends.push({
          id: `av-gain-${g.ticker}`,
          title: `${g.ticker} sobe ${g.change_percentage} — Destaque do mercado`,
          context: `${g.ticker}: preço ${g.price}, variação ${g.change_amount} (${g.change_percentage}). Volume: ${g.volume}.`,
          source: "Alpha Vantage", sourceType: "dados-oficiais", sourceTag: "ALPHA VANTAGE",
          date: new Date().toISOString(), country: "us", category: "Economia",
          image: null, url: `https://finance.yahoo.com/quote/${g.ticker}`,
          value: g.price, change: g.change_percentage, tags: ["mercado", "ações"],
          verified: true,
        });
      }
      for (const l of losers) {
        trends.push({
          id: `av-loss-${l.ticker}`,
          title: `${l.ticker} cai ${l.change_percentage} — Queda expressiva`,
          context: `${l.ticker}: preço ${l.price}, variação ${l.change_amount} (${l.change_percentage}). Volume: ${l.volume}.`,
          source: "Alpha Vantage", sourceType: "dados-oficiais", sourceTag: "ALPHA VANTAGE",
          date: new Date().toISOString(), country: "us", category: "Economia",
          image: null, url: `https://finance.yahoo.com/quote/${l.ticker}`,
          value: l.price, change: l.change_percentage, tags: ["mercado", "ações"],
          verified: true,
        });
      }
    }

    // USD/BRL exchange
    if (fxRes.status === "fulfilled" && fxRes.value.ok) {
      const data = await fxRes.value.json();
      const rate = data?.["Realtime Currency Exchange Rate"];
      if (rate) {
        trends.push({
          id: "av-fx-usdbrl",
          title: `Câmbio USD/BRL: R$ ${parseFloat(rate["5. Exchange Rate"]).toFixed(2)}`,
          context: `Cotação atualizada: 1 USD = R$ ${rate["5. Exchange Rate"]}. Última atualização: ${rate["6. Last Refreshed"]}.`,
          source: "Alpha Vantage", sourceType: "dados-oficiais", sourceTag: "ALPHA VANTAGE",
          date: new Date().toISOString(), country: "br", category: "Economia",
          image: null, url: "", value: rate["5. Exchange Rate"], change: null,
          tags: ["câmbio", "dólar"], verified: true,
        });
      }
    }

    cache = { data: trends, ts: Date.now() };
    return trends;
  } catch (e) {
    console.warn("AlphaVantage fetch failed:", e);
    return cache?.data || [];
  }
}

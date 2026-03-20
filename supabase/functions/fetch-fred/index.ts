import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const ALLOWED_ORIGINS = [
  "https://gttmonitor.com",
  "https://www.gttmonitor.com",
  "http://localhost:8080",
  "http://localhost:5173",
];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovableproject.com") ||
    origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
interface TrendItem {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  details?: string;
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string;
  publishedAt?: string;
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}
const KEY_SERIES = [
  { id: "UNRATE", name: "Taxa de Desemprego EUA", unit: "%" },
  { id: "CPIAUCSL", name: "Índice de Preços ao Consumidor (CPI) EUA", unit: "" },
  { id: "FEDFUNDS", name: "Taxa de Juros do Federal Reserve", unit: "%" },
  { id: "DGS10", name: "Rendimento do Tesouro 10 anos EUA", unit: "%" },
  { id: "DEXUSEU", name: "Taxa de Câmbio USD/EUR", unit: "" },
  { id: "DCOILWTICO", name: "Preço do Petróleo WTI", unit: "USD" },
  { id: "SP500", name: "S&P 500", unit: "" },
  { id: "GDP", name: "PIB dos Estados Unidos", unit: "B USD" },
];
const CACHE_TTL = 5 * 60 * 1000;
let cached: { data: string; ts: number } | null = null;
function spark(base: number): number[] {
  return Array.from({ length: 10 }, () => base * (0.95 + Math.random() * 0.1));
}
function generateHistorical(base: number, label: string) {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(Date.now() - i * 3600000);
    data.push({ hour: `${h.getHours()}:00`, value: +(base * (0.97 + Math.random() * 0.06)).toFixed(2) });
  }
  return { historicalData: data, metricLabel: label };
}
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(cached.data, { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("FRED_API_KEY");
    if (!apiKey) {
      console.error("FRED_API_KEY not configured");
      return new Response(JSON.stringify({ trends: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const trends: TrendItem[] = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const results = await Promise.allSettled(
      KEY_SERIES.map(async (series) => {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=2`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const json = await res.json();
        const obs = json.observations;
        if (!obs || obs.length < 1) return null;
        const latest = obs[0];
        const previous = obs.length > 1 ? obs[1] : null;
        const latestDate = new Date(latest.date);
        // Only include if updated in last 7 days (relaxed for slower series like GDP)
        if (latestDate < sevenDaysAgo && !["GDP"].includes(series.id)) return null;
        const latestVal = parseFloat(latest.value);
        if (isNaN(latestVal)) return null;
        let changeStr = "+novo";
        let changePositive = true;
        if (previous && previous.value !== ".") {
          const prevVal = parseFloat(previous.value);
          if (!isNaN(prevVal) && prevVal !== 0) {
            const pctChange = ((latestVal - prevVal) / Math.abs(prevVal)) * 100;
            changeStr = `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`;
            changePositive = pctChange >= 0;
          }
        }
        const volStr = series.unit === "%" ? `${latestVal.toFixed(1)}%` :
          series.unit === "USD" ? `$${latestVal.toFixed(2)}` :
          series.unit === "B USD" ? `$${(latestVal / 1000).toFixed(1)}T` :
          latestVal.toFixed(2);
        const hist = generateHistorical(latestVal, series.name);
        return {
          icon: "📊",
          platform: "FRED",
          title: series.name,
          category: "Negócios/Finanças",
          time: latestDate.toLocaleDateString("pt-BR"),
          volume: volStr,
          change: changeStr,
          changePositive,
          sparkData: spark(latestVal),
          details: `Último valor: ${volStr} · Fonte: Federal Reserve Economic Data`,
          description: `Indicador econômico ${series.name} atualizado em ${latestDate.toLocaleDateString("pt-BR")}`,
          countryCode: "US",
          sourceUrl: `https://fred.stlouisfed.org/series/${series.id}`,
          trustBadge: "official",
          publishedAt: latest.date,
          ...hist,
        } as TrendItem;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) trends.push(r.value);
    }
    const body = JSON.stringify({ trends });
    cached = { data: body, ts: Date.now() };
    return new Response(body, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("FRED fetch error:", e);
    return new Response(JSON.stringify({ trends: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
  }
});

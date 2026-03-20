import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const ALLOWED_ORIGINS = [
  'https://gttmonitor.com',
  'https://www.gttmonitor.com',
  'http://localhost:8080',
  'http://localhost:5173',
];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}
let cache: { ts: number; data: any[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;
const WHO_INDICATORS = [
  { code: "WHOSIS_000001", name: "Expectativa de vida ao nascer", unit: "anos" },
  { code: "WHS2_131", name: "Mortalidade infantil por 1000 nascidos", unit: "por 1000" },
  { code: "NCD_BMI_30A", name: "Prevalência de obesidade em adultos", unit: "%" },
  { code: "WHS6_102", name: "Cobertura de vacinação DTP3", unit: "%" },
  { code: "MALARIA_EST_INCIDENCE", name: "Incidência estimada de Malária", unit: "por 1000" },
];
async function fetchIndicator(code: string): Promise<any[]> {
  try {
    const url = `https://ghoapi.azureedge.net/api/${code}?$filter=TimeDim ge 2023&$orderby=TimeDim desc&$top=10`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "GlobalTalk/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.value || [];
  } catch { return []; }
}
serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify({ trends: cache.data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const results = await Promise.all(
      WHO_INDICATORS.map(ind => fetchIndicator(ind.code))
    );
    const trends: any[] = [];
    const seen = new Set<string>();
    results.forEach((items, idx) => {
      const indicator = WHO_INDICATORS[idx];
      items.forEach((item: any) => {
        const country = item.SpatialDim || "GL";
        const year = item.TimeDim || "";
        const value = item.NumericValue;
        if (value === null || value === undefined) return;
        // Only recent data
        const yearNum = parseInt(year);
        if (yearNum < 2023) return;
        // Deduplicate by indicator+country
        const key = `${indicator.code}:${country}`;
        if (seen.has(key)) return;
        seen.add(key);
        const formattedValue = typeof value === "number" ? value.toFixed(1) : String(value);
        trends.push({
          icon: "🏥",
          platform: "OMS (WHO)",
          title: `${indicator.name}: ${country} registra ${formattedValue}${indicator.unit}`,
          category: "Saúde",
          time: `${year}`,
          volume: `${formattedValue} ${indicator.unit}`,
          change: "+dados",
          changePositive: true,
          sparkData: Array.from({ length: 10 }, (_, i) => Math.round(30 + Math.random() * 40 + i * 3)),
          details: `Dados oficiais da Organização Mundial da Saúde · Ano: ${year} · País: ${country}`,
          description: `${indicator.name}: ${formattedValue}${indicator.unit}`,
          sourceUrl: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${indicator.code}`,
          countryCode: country.length === 3 ? country.slice(0, 2) : country,
          trustBadge: "official",
        });
      });
    });
    const limited = trends.slice(0, 10);
    cache = { ts: Date.now(), data: limited };
    return new Response(JSON.stringify({ trends: limited }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("WHO error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://globaltalktrend.lovable.app',
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

const INDICATORS = [
  { id: "NGDP_RPCH", name: "Crescimento do PIB", unit: "%" },
  { id: "PCPIPCH", name: "Inflação", unit: "%" },
  { id: "LUR", name: "Desemprego", unit: "%" },
];

const TOP_ECONOMIES: Record<string, string> = {
  USA: "US", CHN: "CN", JPN: "JP", DEU: "DE", GBR: "GB", FRA: "FR",
  IND: "IN", BRA: "BR", ITA: "IT", CAN: "CA", KOR: "KR", RUS: "RU",
  AUS: "AU", ESP: "ES", MEX: "MX",
};

const COUNTRY_NAMES: Record<string, string> = {
  USA: "EUA", CHN: "China", JPN: "Japão", DEU: "Alemanha", GBR: "Reino Unido",
  FRA: "França", IND: "Índia", BRA: "Brasil", ITA: "Itália", CAN: "Canadá",
  KOR: "Coreia do Sul", RUS: "Rússia", AUS: "Austrália", ESP: "Espanha", MEX: "México",
};

async function fetchIndicator(indicatorId: string): Promise<any> {
  try {
    const url = `https://www.imf.org/external/datamapper/api/v1/${indicatorId}?periods=2025,2026`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": "GlobalTalk/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
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

    const results = await Promise.all(INDICATORS.map(i => fetchIndicator(i.id)));

    const trends: any[] = [];
    const topCountries = Object.keys(TOP_ECONOMIES);

    results.forEach((data, idx) => {
      if (!data) return;
      const indicator = INDICATORS[idx];
      const values = data?.values?.[indicator.id] || {};

      topCountries.forEach(countryCode3 => {
        const countryData = values[countryCode3];
        if (!countryData) return;

        const val2026 = countryData["2026"];
        const val2025 = countryData["2025"];
        if (val2026 === undefined && val2025 === undefined) return;

        const currentVal = val2026 ?? val2025;
        const year = val2026 !== undefined ? "2026" : "2025";
        const formatted = typeof currentVal === "number" ? currentVal.toFixed(1) : String(currentVal);
        const countryName = COUNTRY_NAMES[countryCode3] || countryCode3;
        const isoCode = TOP_ECONOMIES[countryCode3] || "GL";

        // Flag extreme values
        const isExtreme = indicator.id === "PCPIPCH" && currentVal > 20 ||
                         indicator.id === "NGDP_RPCH" && (currentVal > 6 || currentVal < -1) ||
                         indicator.id === "LUR" && currentVal > 10;

        let change = `${formatted}${indicator.unit}`;
        if (val2025 !== undefined && val2026 !== undefined) {
          const diff = val2026 - val2025;
          change = `${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp`;
        }

        trends.push({
          icon: "🌐",
          platform: "FMI (IMF)",
          title: `${indicator.name} ${countryName}: ${formatted}${indicator.unit} em ${year}`,
          category: "Negócios/Finanças",
          time: year,
          volume: `${formatted}${indicator.unit}`,
          change,
          changePositive: indicator.id === "NGDP_RPCH" ? currentVal > 0 : indicator.id === "LUR" ? currentVal < 5 : currentVal < 5,
          sparkData: Array.from({ length: 10 }, (_, i) => Math.round(30 + Math.random() * 30 + i * 2)),
          details: `Previsão do FMI para ${year} · ${indicator.name}: ${formatted}${indicator.unit} · País: ${countryName}`,
          description: `${indicator.name}: ${formatted}${indicator.unit}`,
          sourceUrl: "https://www.imf.org/external/datamapper",
          countryCode: isoCode,
          trustBadge: "official",
          _extreme: isExtreme,
        });
      });
    });

    // Prioritize extreme values, then limit
    trends.sort((a, b) => (b._extreme ? 1 : 0) - (a._extreme ? 1 : 0));
    const limited = trends.slice(0, 15).map(({ _extreme, ...rest }) => rest);

    cache = { ts: Date.now(), data: limited };

    return new Response(JSON.stringify({ trends: limited }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("IMF error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

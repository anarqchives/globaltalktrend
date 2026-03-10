import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://globaltalktrend.lovable.app',
  'https://globaltalktrend.com',
  'https://www.globaltalktrend.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string; // "official" | "scientific" | "verified"
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}

function generateHistorical(baseValue: number, label: string) {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

function sparkRandom() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ── The Guardian ──
async function fetchGuardian(): Promise<TrendItem[]> {
  const key = Deno.env.get("GUARDIAN_API_KEY");
  if (!key) { console.log("📰 The Guardian: chave ausente (GUARDIAN_API_KEY)"); return []; }
  try {
    console.log("📰 The Guardian: buscando...");
    const res = await fetch(
      `https://content.guardianapis.com/search?order-by=newest&page-size=12&show-fields=trailText&api-key=${key}`
    );
    if (!res.ok) {
      console.log("📰 The Guardian retornou: 0 itens");
      console.log("❌ The Guardian falhou. Verificar:");
      console.log("   - Chave da API válida?");
      console.log("   - Cota excedida?");
      console.log("   - Erro CORS?");
      console.error("Guardian error:", res.status);
      return [];
    }
    const data = await res.json();
    const guardianItems = (data.response?.results || []).map((a: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 10 + 3), "artigos");
      return {
        icon: "🏛️",
        platform: "The Guardian",
        title: a.webTitle || "Sem título",
        category: a.sectionName || "Notícias",
        time: "agora",
        volume: "The Guardian",
        change: "+novo",
        changePositive: true,
        sparkData: sparkRandom(),
        details: a.fields?.trailText?.slice(0, 200) || "",
        sourceUrl: a.webUrl || "",
        countryCode: "GB",
        trustBadge: "verified",
        historicalData,
        metricLabel,
      };
    });
    console.log("📰 The Guardian retornou:", guardianItems.length, "itens");
    if (guardianItems.length === 0) {
      console.log("❌ The Guardian falhou. Verificar:");
      console.log("   - Chave da API válida?");
      console.log("   - Cota excedida?");
      console.log("   - Erro CORS?");
    }
    return guardianItems;
  } catch (e) {
    console.log("📰 The Guardian retornou: 0 itens");
    console.log("❌ The Guardian falhou. Verificar:");
    console.log("   - Chave da API válida?");
    console.log("   - Cota excedida?");
    console.log("   - Erro CORS?");
    console.error("Guardian fetch error:", e);
    return [];
  }
}

// ── World Bank ──
async function fetchWorldBank(): Promise<TrendItem[]> {
  try {
    // Fetch latest indicators - GDP growth, inflation, etc.
    const indicators = [
      { id: "NY.GDP.MKTP.KD.ZG", name: "Crescimento do PIB", cat: "Economia" },
      { id: "FP.CPI.TOTL.ZG", name: "Inflação (CPI)", cat: "Economia" },
      { id: "SL.UEM.TOTL.ZS", name: "Taxa de Desemprego", cat: "Economia" },
    ];
    const results: TrendItem[] = [];
    for (const ind of indicators) {
      try {
        const res = await fetch(
          `https://api.worldbank.org/v2/country/BRA;USA;CHN;IND;DEU/indicator/${ind.id}?format=json&per_page=5&date=2022:2024&mrv=1`
        );
        if (!res.ok) continue;
        const data = await res.json();
        const entries = data[1] || [];
        for (const entry of entries.slice(0, 3)) {
          if (!entry.value) continue;
          const countryMap: Record<string, string> = { BR: "BR", US: "US", CN: "CN", IN: "IN", DE: "DE" };
          const cc = countryMap[entry.country?.id] || entry.countryiso3code?.slice(0, 2) || "US";
          const { historicalData, metricLabel } = generateHistorical(Math.abs(entry.value), "índice");
          results.push({
            icon: "🌐",
            platform: "World Bank",
            title: `${ind.name}: ${entry.country?.value || ""}`,
            category: ind.cat,
            time: `${entry.date}`,
            volume: `${Number(entry.value).toFixed(1)}%`,
            change: entry.value > 0 ? `+${Number(entry.value).toFixed(1)}%` : `${Number(entry.value).toFixed(1)}%`,
            changePositive: entry.value > 0,
            sparkData: sparkRandom(),
            details: `${ind.name} de ${entry.country?.value} em ${entry.date}: ${Number(entry.value).toFixed(2)}%. Fonte: Banco Mundial.`,
            sourceUrl: `https://data.worldbank.org/indicator/${ind.id}?locations=${entry.countryiso3code}`,
            countryCode: cc,
            trustBadge: "official",
            historicalData,
            metricLabel,
          });
        }
      } catch { /* skip indicator */ }
    }
    return results.slice(0, 12);
  } catch (e) { console.error("World Bank fetch error:", e); return []; }
}

// ── IBGE ──
async function fetchIBGE(): Promise<TrendItem[]> {
  try {
    const res = await fetch("https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=12");
    if (!res.ok) { console.error("IBGE error:", res.status); return []; }
    const data = await res.json();
    const items = data.items || data || [];
    return (Array.isArray(items) ? items : []).slice(0, 12).map((n: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 8 + 2), "publicações");
      return {
        icon: "🇧🇷",
        platform: "IBGE",
        title: n.titulo || n.title || "Dados IBGE",
        category: "Dados Oficiais",
        time: "agora",
        volume: "IBGE",
        change: "+novo",
        changePositive: true,
        sparkData: sparkRandom(),
        details: (n.introducao || n.introducao || "").replace(/<[^>]*>/g, "").slice(0, 200),
        sourceUrl: n.link || `https://agenciadenoticias.ibge.gov.br/${n.id ? `agencia-noticias/${n.id}` : ""}`,
        countryCode: "BR",
        trustBadge: "official",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) { console.error("IBGE fetch error:", e); return []; }
}

// ── OpenAlex ──
async function fetchOpenAlex(): Promise<TrendItem[]> {
  try {
    const res = await fetch(
      "https://api.openalex.org/works?sort=cited_by_count:desc&per_page=12&filter=from_publication_date:2024-01-01&mailto=globaltalk@lovable.app"
    );
    if (!res.ok) { console.error("OpenAlex error:", res.status); return []; }
    const data = await res.json();
    return (data.results || []).map((w: any) => {
      const citations = w.cited_by_count || 0;
      const { historicalData, metricLabel } = generateHistorical(citations / 24, "citações");
      return {
        icon: "🔬",
        platform: "OpenAlex",
        title: w.title || "Artigo científico",
        category: "Ciência",
        time: w.publication_year ? `${w.publication_year}` : "recente",
        volume: `${citations >= 1000 ? `${(citations / 1000).toFixed(1)}K` : citations} citações`,
        change: citations > 100 ? "+alto impacto" : "+novo",
        changePositive: true,
        sparkData: sparkRandom(),
        details: w.abstract_inverted_index
          ? Object.keys(w.abstract_inverted_index).slice(0, 30).join(" ") + "..."
          : `Publicado em ${w.primary_location?.source?.display_name || "revista científica"}`,
        sourceUrl: w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : w.id || "",
        countryCode: w.authorships?.[0]?.countries?.[0] || "US",
        trustBadge: "scientific",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) { console.error("OpenAlex fetch error:", e); return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      return new Response(cachedResponse.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [guardian, worldBank, ibge, openAlex] = await Promise.all([
      fetchGuardian(),
      fetchWorldBank(),
      fetchIBGE(),
      fetchOpenAlex(),
    ]);

    const trends = [...guardian, ...worldBank, ...ibge, ...openAlex];
    console.log(`fetch-extra-sources: ${guardian.length} Guardian, ${worldBank.length} WorldBank, ${ibge.length} IBGE, ${openAlex.length} OpenAlex`);

    const responseData = JSON.stringify({ trends });
    cachedResponse = { data: responseData, timestamp: Date.now() };

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-extra-sources:", error);
    return new Response(
      JSON.stringify({ error: "Failed", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

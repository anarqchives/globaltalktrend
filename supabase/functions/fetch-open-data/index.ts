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
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string;
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

function spark() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

// ── Cache ──
const cache: Record<string, { data: string; ts: number }> = {};
function cached(key: string, ttlMs: number): string | null {
  const c = cache[key];
  if (c && Date.now() - c.ts < ttlMs) return c.data;
  return null;
}
function setCache(key: string, data: string) {
  cache[key] = { data, ts: Date.now() };
}

// ── Wikipedia Pageviews (100% open, no key) ──
async function fetchWikipediaPageviews(): Promise<TrendItem[]> {
  try {
    const yesterday = new Date(Date.now() - 86400000);
    const dateStr = `${yesterday.getFullYear()}/${String(yesterday.getMonth() + 1).padStart(2, "0")}/${String(yesterday.getDate()).padStart(2, "0")}`;
    
    const projects = [
      { wiki: "en.wikipedia", cc: "US", lang: "en" },
      { wiki: "pt.wikipedia", cc: "BR", lang: "pt" },
      { wiki: "de.wikipedia", cc: "DE", lang: "de" },
      { wiki: "fr.wikipedia", cc: "FR", lang: "fr" },
      { wiki: "ja.wikipedia", cc: "JP", lang: "ja" },
    ];

    const results: TrendItem[] = [];
    for (const p of projects) {
      try {
        const res = await fetch(
          `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${p.wiki}/all-access/${dateStr}`,
          { headers: { "User-Agent": "GlobalTalkTrending/1.0 (globaltalk@lovable.app)" } }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const articles = data?.items?.[0]?.articles || [];
        // Filter out Main_Page and Special: pages
        const filtered = articles
          .filter((a: any) => !a.article.startsWith("Special:") && a.article !== "Main_Page" && !a.article.startsWith("Wikipedia:"))
          .slice(0, 5);

        for (const a of filtered) {
          const views = a.views || 0;
          const { historicalData, metricLabel } = generateHistorical(views / 24, "views/hora");
          const title = decodeURIComponent(a.article.replace(/_/g, " "));
          results.push({
            icon: "📚",
            platform: "Wikipedia",
            title,
            category: "Conhecimento",
            time: "ontem",
            volume: views >= 1000000 ? `${(views / 1000000).toFixed(1)}M views` : views >= 1000 ? `${(views / 1000).toFixed(0)}K views` : `${views} views`,
            change: "+popular",
            changePositive: true,
            sparkData: spark(),
            details: `Artigo mais acessado na Wikipedia (${p.lang}). ${views.toLocaleString()} visualizações.`,
            description: `Top article on ${p.lang}.wikipedia.org`,
            sourceUrl: `https://${p.lang}.wikipedia.org/wiki/${a.article}`,
            countryCode: p.cc,
            trustBadge: "verified",
            historicalData,
            metricLabel,
          });
        }
      } catch { /* skip */ }
    }
    return results;
  } catch (e) {
    console.error("Wikipedia error:", e);
    return [];
  }
}

// ── arXiv (100% open, no key) ──
async function fetchArxiv(): Promise<TrendItem[]> {
  try {
    const categories = ["cs.AI", "cs.LG", "physics.gen-ph", "q-bio.GN"];
    const results: TrendItem[] = [];
    for (const cat of categories) {
      try {
        const res = await fetch(
          `https://export.arxiv.org/api/query?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&max_results=3`
        );
        if (!res.ok) continue;
        const text = await res.text();
        // Simple XML parsing for entries
        const entries = text.split("<entry>").slice(1);
        for (const entry of entries) {
          const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
          const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
          const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
          const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
          
          const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || "Artigo arXiv";
          const summary = summaryMatch?.[1]?.replace(/\s+/g, " ").trim().slice(0, 200) || "";
          const url = linkMatch?.[1]?.trim() || "";
          const published = publishedMatch?.[1]?.trim() || "";

          const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 50 + 10), "downloads");
          results.push({
            icon: "📄",
            platform: "arXiv",
            title: title.slice(0, 120),
            category: "Ciência",
            time: published ? new Date(published).toLocaleDateString() : "recente",
            volume: cat,
            change: "+novo",
            changePositive: true,
            sparkData: spark(),
            details: summary,
            description: summary.slice(0, 150),
            sourceUrl: url,
            countryCode: "US",
            trustBadge: "scientific",
            historicalData,
            metricLabel,
          });
        }
      } catch { /* skip category */ }
    }
    return results.slice(0, 10);
  } catch (e) {
    console.error("arXiv error:", e);
    return [];
  }
}

// ── PubMed Central (100% open, no key) ──
async function fetchPubMed(): Promise<TrendItem[]> {
  try {
    // Search for trending health topics
    const res = await fetch(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=date&retmax=8&term=trending+OR+outbreak+OR+pandemic+OR+vaccine&datetype=pdat&reldate=7"
    );
    if (!res.ok) return [];
    const data = await res.json();
    const ids = data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Fetch summaries
    const sumRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`
    );
    if (!sumRes.ok) return [];
    const sumData = await sumRes.json();
    const results: TrendItem[] = [];

    for (const id of ids.slice(0, 6)) {
      const article = sumData?.result?.[id];
      if (!article) continue;
      const title = article.title || "Estudo PubMed";
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 5), "citações");
      results.push({
        icon: "🧬",
        platform: "PubMed",
        title: title.slice(0, 120),
        category: "Saúde",
        time: article.pubdate || "recente",
        volume: `PMID: ${id}`,
        change: "+novo",
        changePositive: true,
        sparkData: spark(),
        details: article.sorttitle?.slice(0, 200) || `Publicado em ${article.source || "revista médica"}`,
        description: `${article.source || ""} - ${article.pubdate || ""}`,
        sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        countryCode: "US",
        trustBadge: "scientific",
        historicalData,
        metricLabel,
      });
    }
    return results;
  } catch (e) {
    console.error("PubMed error:", e);
    return [];
  }
}

// ── IMF Data (100% open, no key) ──
async function fetchIMF(): Promise<TrendItem[]> {
  try {
    // IMF news RSS-like endpoint
    const res = await fetch("https://www.imf.org/en/News/Rss?Language=ENG");
    if (!res.ok) {
      // Fallback: try data API
      const res2 = await fetch("https://www.imf.org/external/datamapper/api/v1/NGDP_RPCH?periods=2024");
      if (!res2.ok) return [];
      const data = await res2.json();
      const values = data?.values?.NGDP_RPCH || {};
      const results: TrendItem[] = [];
      const countryMap: Record<string, { cc: string; name: string }> = {
        USA: { cc: "US", name: "Estados Unidos" },
        BRA: { cc: "BR", name: "Brasil" },
        CHN: { cc: "CN", name: "China" },
        DEU: { cc: "DE", name: "Alemanha" },
        JPN: { cc: "JP", name: "Japão" },
        GBR: { cc: "GB", name: "Reino Unido" },
        FRA: { cc: "FR", name: "França" },
        IND: { cc: "IN", name: "Índia" },
      };
      for (const [iso3, info] of Object.entries(countryMap)) {
        const countryData = values[iso3];
        if (!countryData) continue;
        const year2024 = countryData["2024"];
        if (year2024 === undefined) continue;
        const val = Number(year2024);
        const { historicalData, metricLabel } = generateHistorical(Math.abs(val) * 10, "índice");
        results.push({
          icon: "💹",
          platform: "IMF",
          title: `Crescimento PIB ${info.name}: ${val.toFixed(1)}%`,
          category: "Negócios/Finanças",
          time: "2024",
          volume: `${val.toFixed(1)}%`,
          change: val > 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`,
          changePositive: val > 0,
          sparkData: spark(),
          details: `Projeção de crescimento real do PIB de ${info.name} para 2024, segundo o FMI.`,
          sourceUrl: `https://www.imf.org/external/datamapper/NGDP_RPCH@WEO`,
          countryCode: info.cc,
          trustBadge: "official",
          historicalData,
          metricLabel,
        });
      }
      return results.slice(0, 8);
    }
    // Parse RSS
    const text = await res.text();
    const items = text.split("<item>").slice(1, 7);
    return items.map((item) => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]>/);
      const title = titleMatch?.[1] || "IMF Report";
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 15 + 5), "relatórios");
      return {
        icon: "💹",
        platform: "IMF",
        title: title.slice(0, 120),
        category: "Negócios/Finanças",
        time: "recente",
        volume: "IMF",
        change: "+novo",
        changePositive: true,
        sparkData: spark(),
        details: descMatch?.[1]?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
        sourceUrl: linkMatch?.[1] || "https://www.imf.org",
        countryCode: "US",
        trustBadge: "official",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("IMF error:", e);
    return [];
  }
}

// ── FRED (needs key, graceful fallback) ──
async function fetchFRED(): Promise<TrendItem[]> {
  const key = Deno.env.get("FRED_API_KEY");
  if (!key) {
    console.log("FRED_API_KEY not set — skipping FRED");
    return [];
  }
  try {
    const series = [
      { id: "CPIAUCSL", name: "Inflação EUA (CPI)", cat: "Negócios/Finanças" },
      { id: "UNRATE", name: "Desemprego EUA", cat: "Negócios/Finanças" },
      { id: "DFF", name: "Taxa de Juros Federal", cat: "Negócios/Finanças" },
    ];
    const results: TrendItem[] = [];
    for (const s of series) {
      try {
        const res = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${key}&file_type=json&sort_order=desc&limit=1`
        );
        if (!res.ok) continue;
        const data = await res.json();
        const obs = data?.observations?.[0];
        if (!obs || obs.value === ".") continue;
        const val = Number(obs.value);
        const { historicalData, metricLabel } = generateHistorical(Math.abs(val), "índice");
        results.push({
          icon: "📈",
          platform: "FRED",
          title: `${s.name}: ${val.toFixed(1)}`,
          category: s.cat,
          time: obs.date || "recente",
          volume: `${val.toFixed(2)}`,
          change: val > 0 ? `${val.toFixed(1)}` : `${val.toFixed(1)}`,
          changePositive: true,
          sparkData: spark(),
          details: `Último dado da série ${s.id} (Federal Reserve Bank of St. Louis).`,
          sourceUrl: `https://fred.stlouisfed.org/series/${s.id}`,
          countryCode: "US",
          trustBadge: "official",
          historicalData,
          metricLabel,
        });
      } catch { /* skip */ }
    }
    return results;
  } catch (e) {
    console.error("FRED error:", e);
    return [];
  }
}

// ── NOAA Climate Alerts (needs key, graceful fallback) ──
async function fetchNOAA(): Promise<TrendItem[]> {
  // NOAA weather alerts API is actually open (no key needed for alerts)
  try {
    const res = await fetch("https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe&limit=8", {
      headers: { "User-Agent": "GlobalTalkTrending/1.0 (globaltalk@lovable.app)" },
    });
    if (!res.ok) {
      console.log("NOAA alerts error:", res.status);
      return [];
    }
    const data = await res.json();
    const features = data?.features || [];
    return features.slice(0, 6).map((f: any) => {
      const props = f.properties || {};
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 10 + 5), "alertas");
      return {
        icon: "🌪️",
        platform: "NOAA",
        title: `${props.event || "Alerta climático"} — ${(props.areaDesc || "").slice(0, 60)}`,
        category: "Clima/Meio Ambiente",
        time: props.sent ? new Date(props.sent).toLocaleTimeString() : "agora",
        volume: props.severity || "Severe",
        change: `+${props.urgency || "alerta"}`,
        changePositive: false,
        sparkData: spark(),
        details: (props.headline || props.description || "").slice(0, 250),
        description: props.headline?.slice(0, 150) || "",
        sourceUrl: props["@id"] || "https://www.weather.gov",
        countryCode: "US",
        trustBadge: "official",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("NOAA error:", e);
    return [];
  }
}

// ── GDELT (100% open, no key) ──
async function fetchGDELT(): Promise<TrendItem[]> {
  try {
    const res = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?query=conflict+OR+protest&mode=ArtList&maxrecords=6&format=json&sort=DateDesc");
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data?.articles || [];
    return articles.slice(0, 6).map((a: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 5), "menções");
      return {
        icon: "⚠️",
        platform: "GDELT",
        title: (a.title || "Evento global").slice(0, 120),
        category: "Conflitos/Crises",
        time: a.seendate ? new Date(a.seendate).toLocaleDateString() : "recente",
        volume: a.domain || "GDELT",
        change: "+monitorado",
        changePositive: false,
        sparkData: spark(),
        details: `Fonte: ${a.domain || "mídia global"}. Idioma: ${a.language || "en"}.`,
        description: (a.title || "").slice(0, 150),
        sourceUrl: a.url || "https://www.gdeltproject.org",
        countryCode: a.sourcecountry?.slice(0, 2)?.toUpperCase() || "US",
        trustBadge: "verified",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("GDELT error:", e);
    return [];
  }
}

// ── Crossref (100% open, no key) ──
async function fetchCrossref(): Promise<TrendItem[]> {
  try {
    const res = await fetch(
      "https://api.crossref.org/works?sort=published&order=desc&rows=6&filter=from-pub-date:2025-01-01&mailto=globaltalk@lovable.app"
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.message?.items || [];
    return items.slice(0, 6).map((w: any) => {
      const title = w.title?.[0] || "Publicação acadêmica";
      const refs = w["is-referenced-by-count"] || 0;
      const { historicalData, metricLabel } = generateHistorical(refs || 1, "referências");
      return {
        icon: "📖",
        platform: "Crossref",
        title: title.slice(0, 120),
        category: "Ciência",
        time: w.created?.["date-time"] ? new Date(w.created["date-time"]).toLocaleDateString() : "recente",
        volume: `${refs} refs`,
        change: refs > 10 ? "+citado" : "+novo",
        changePositive: true,
        sparkData: spark(),
        details: `Publicado em ${w["container-title"]?.[0] || "revista acadêmica"}. DOI: ${w.DOI || "N/A"}`,
        sourceUrl: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : ""),
        countryCode: "US",
        trustBadge: "scientific",
        historicalData,
        metricLabel,
      };
    });
  } catch (e) {
    console.error("Crossref error:", e);
    return [];
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cacheKey = "open-data-all";
    const cachedData = cached(cacheKey, 30 * 60 * 1000); // 30 min cache
    if (cachedData) {
      return new Response(cachedData, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [wikipedia, arxiv, pubmed, imf, fred, noaa, gdelt, crossref] = await Promise.all([
      fetchWikipediaPageviews().catch(() => [] as TrendItem[]),
      fetchArxiv().catch(() => [] as TrendItem[]),
      fetchPubMed().catch(() => [] as TrendItem[]),
      fetchIMF().catch(() => [] as TrendItem[]),
      fetchFRED().catch(() => [] as TrendItem[]),
      fetchNOAA().catch(() => [] as TrendItem[]),
      fetchGDELT().catch(() => [] as TrendItem[]),
      fetchCrossref().catch(() => [] as TrendItem[]),
    ]);

    const trends = [...wikipedia, ...arxiv, ...pubmed, ...imf, ...fred, ...noaa, ...gdelt, ...crossref];

    console.log(`fetch-open-data: Wikipedia=${wikipedia.length}, arXiv=${arxiv.length}, PubMed=${pubmed.length}, IMF=${imf.length}, FRED=${fred.length}, NOAA=${noaa.length}, GDELT=${gdelt.length}, Crossref=${crossref.length}, Total=${trends.length}`);

    const responseData = JSON.stringify({ trends });
    setCache(cacheKey, responseData);

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-open-data:", error);
    return new Response(
      JSON.stringify({ error: "Failed", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

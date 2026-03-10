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
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

// ─── In-memory cache (5 min) ───────────────────────────────────────
let cache: { ts: number; data: any[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── FIPS to ISO country code mapping ──────────────────────────────
const FIPS_TO_ISO: Record<string, string> = {
  US: "US", UK: "GB", FR: "FR", GM: "DE", IT: "IT", SP: "ES", BR: "BR",
  RS: "RU", CH: "CN", JA: "JP", IN: "IN", AS: "AU", CA: "CA", MX: "MX",
  CO: "CO", AR: "AR", SF: "ZA", EG: "EG", NI: "NG", KE: "KE", IS: "IL",
  TU: "TR", IR: "IR", PK: "PK", SA: "SA", KS: "KR", TW: "TW", ID: "ID",
  TH: "TH", VM: "VN", PL: "PL", UP: "UA", SZ: "CH", AU: "AT", BE: "BE",
  NL: "NL", SW: "SE", NO: "NO", DA: "DK", FI: "FI", PO: "PT", GR: "GR",
};

function fipsToIso(fips?: string): string {
  if (!fips) return "GL";
  const code = fips.toUpperCase().slice(0, 2);
  return FIPS_TO_ISO[code] || "GL";
}

// ─── Sentiment from GDELT tone ─────────────────────────────────────
function toneToSentiment(tone?: number): string {
  if (tone === undefined || tone === null) return "neutro";
  if (tone > 2) return "positivo";
  if (tone < -2) return "negativo";
  return "neutro";
}

function sentimentEmoji(sentiment: string): string {
  if (sentiment === "positivo") return "📈";
  if (sentiment === "negativo") return "📉";
  return "➡️";
}

// ─── Category inference from domain/theme ──────────────────────────
function inferCategory(title: string, domain?: string): string {
  const t = (title + " " + (domain || "")).toLowerCase();
  if (/politi|elect|govern|president|congress|senat|parliament|diplomac/i.test(t)) return "Política";
  if (/econom|financ|market|stock|trade|gdp|inflat|bank|currenc/i.test(t)) return "Negócios/Finanças";
  if (/tech|ai\b|artificial|software|cyber|digital|robot|crypto|blockchain/i.test(t)) return "Tecnologia";
  if (/sport|football|soccer|basketball|olympic|tennis|fifa/i.test(t)) return "Esportes";
  if (/health|medic|vaccine|disease|hospital|pandemic|virus|drug/i.test(t)) return "Saúde";
  if (/climate|weather|environment|carbon|emission|flood|drought|hurricane/i.test(t)) return "Clima/Meio Ambiente";
  if (/war|conflict|military|attack|bomb|terror|violen|protest|refugee/i.test(t)) return "Conflitos/Crises";
  if (/science|research|study|discover|space|nasa|quantum|physics/i.test(t)) return "Ciência";
  if (/entertain|movie|film|music|celebrity|award|oscar|grammy/i.test(t)) return "Entretenimento";
  if (/culture|art|museum|festival|religion|tradition/i.test(t)) return "Cultura";
  return "Geral";
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    // Check cache
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify({ trends: cache.data }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // GDELT DOC 2.0 — single broad query, fetch in parallel with timeout
    const fetchGdelt = async (query: string, maxRecords: number): Promise<any[]> => {
      try {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${maxRecords}&format=json&sort=HybridRel&timespan=60min`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
          headers: { "User-Agent": "GlobalTalkTrend/1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) { await response.text(); return []; }
        const text = await response.text();
        if (!text.startsWith("{") && !text.startsWith("[")) return [];
        const data = JSON.parse(text);
        return Array.isArray(data?.articles) ? data.articles : [];
      } catch { return []; }
    };

    const results = await Promise.all([
      fetchGdelt("world OR global OR crisis OR breaking OR war OR election", 25),
      fetchGdelt("economy OR technology OR climate OR health OR science", 15),
    ]);
    
    const articles = [...results[0], ...results[1]];
    console.log("GDELT total articles:", articles.length);

    if (!Array.isArray(articles) || articles.length === 0) {
      console.log("GDELT: No articles returned");
      return new Response(JSON.stringify({ trends: [] }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Map articles to TrendCardProps
    const trends = articles.slice(0, 25).map((article: any) => {
      const title = (article.title || "").trim();
      const tone = article.tone !== undefined ? parseFloat(article.tone) : undefined;
      const sentiment = toneToSentiment(tone);
      const countryCode = fipsToIso(article.sourcecountry);
      const category = inferCategory(title, article.domain);
      const domain = article.domain || "";

      // Extract time info — GDELT seendate format: "20260310T232600Z"
      const seenDate = article.seendate || "";
      let timeStr = "agora";
      if (seenDate) {
        try {
          // Parse GDELT compact date format
          const match = seenDate.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
          let d: Date;
          if (match) {
            d = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
          } else {
            d = new Date(seenDate);
          }
          if (!isNaN(d.getTime())) {
            const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
            if (diffMin < 0 || diffMin < 5) timeStr = "agora";
            else if (diffMin < 60) timeStr = `há ${diffMin} min`;
            else if (diffMin < 1440) timeStr = `há ${Math.round(diffMin / 60)}h`;
            else timeStr = `há ${Math.round(diffMin / 1440)}d`;
          }
        } catch {
          timeStr = "recente";
        }
      }

      // Generate sparkline from tone variations
      const sparkData = Array.from({ length: 10 }, (_, i) => {
        const base = 40 + (tone ? Math.abs(tone) * 5 : 0);
        return Math.round(base + Math.random() * 30 + i * 3);
      });

      // Volume indicator
      const socialImage = article.socialimage;
      const volume = socialImage ? "Alto impacto" : "Monitorado";

      return {
        icon: sentimentEmoji(sentiment),
        platform: "GDELT",
        title: title.slice(0, 120) || "Artigo global",
        category,
        time: timeStr,
        volume,
        change: sentiment === "positivo" ? "+positivo" : sentiment === "negativo" ? "-negativo" : "neutro",
        changePositive: sentiment !== "negativo",
        sparkData,
        details: `Fonte: ${domain} | Sentimento: ${sentiment}${tone !== undefined ? ` (tom: ${tone.toFixed(1)})` : ""}`,
        sourceUrl: article.url || "",
        countryCode,
        thumbnail: socialImage || "",
        trustBadge: "international",
        sentiment,
        tone: tone !== undefined ? tone : null,
      };
    }).filter((t: any) => t.title && t.title.length > 10);

    // Update cache
    cache = { ts: Date.now(), data: trends };

    return new Response(JSON.stringify({ trends }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GDELT fetch error:", error);
    return new Response(JSON.stringify({ trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

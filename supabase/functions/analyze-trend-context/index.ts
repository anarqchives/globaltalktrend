import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

async function hashTitle(title: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(title.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const trends = body.trends || [body];
    const lang = body.lang || "pt";

    if (trends.length === 0) {
      return new Response(JSON.stringify({ contexts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check cache for all trends
    const hashes = await Promise.all(
      trends.slice(0, 20).map(async (t: any) => ({
        title: t.title,
        hash: await hashTitle(t.title),
        trend: t,
      }))
    );

    const { data: cachedRows } = await supabase
      .from('trend_context_cache')
      .select('trend_title_hash, generated_context')
      .in('trend_title_hash', hashes.map(h => h.hash))
      .eq('lang', lang)
      .gte('expires_at', new Date().toISOString());

    const cachedMap = new Map<string, string>();
    for (const row of cachedRows || []) {
      cachedMap.set(row.trend_title_hash, row.generated_context);
    }

    // 2. Separate cached vs uncached
    const cachedResults: { title: string; context: string }[] = [];
    const uncachedTrends: { index: number; title: string; trend: any; hash: string }[] = [];

    for (let i = 0; i < hashes.length; i++) {
      const h = hashes[i];
      const cached = cachedMap.get(h.hash);
      if (cached) {
        cachedResults.push({ title: h.title, context: cached });
      } else {
        uncachedTrends.push({ index: i, title: h.title, trend: h.trend, hash: h.hash });
      }
    }

    // 3. If all cached, return immediately
    if (uncachedTrends.length === 0) {
      return new Response(JSON.stringify({ contexts: cachedResults, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Monthly cost control: limit to 5000 generations/month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = await supabase
      .from('trend_context_cache')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    if ((monthlyCount || 0) > 5000) {
      console.warn('Monthly AI context generation limit reached');
      return new Response(JSON.stringify({ contexts: cachedResults, limited: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Build prompt for uncached trends only
    const trendLines = uncachedTrends.map((t, i) =>
      `${i + 1}. "${t.trend.title}" | Plataforma: ${t.trend.platform || "?"} | País: ${t.trend.countryCode || "GL"} | Volume: ${t.trend.volume || "?"} | Categoria: ${t.trend.category || "Geral"}`
    ).join("\n");

    const prompt = lang === "pt"
      ? `Para cada trend abaixo, gere UMA frase de contexto em português (máximo 200 caracteres) explicando:
- O que é este assunto
- Por que está em alta agora
- Onde está sendo mais discutido

${trendLines}

Responda APENAS com JSON válido: { "contexts": [{ "index": 0, "context": "frase" }, ...] }
NÃO repita o título na frase. Seja conciso e informativo.`
      : `For each trend below, generate ONE context sentence in ${lang} (max 200 chars) explaining:
- What this topic is about
- Why it's trending now
- Where it's being discussed most

${trendLines}

Respond ONLY with valid JSON: { "contexts": [{ "index": 0, "context": "sentence" }, ...] }
Do NOT repeat the title. Be concise and informative.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a trend context analyst. Always respond with valid JSON only, no markdown, no code blocks." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", contexts: cachedResults }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted", contexts: cachedResults }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ contexts: cachedResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const newResults: { title: string; context: string }[] = [];

    if (parsed?.contexts) {
      // 6. Store new contexts in cache (batch insert)
      const rowsToInsert: any[] = [];

      for (const c of parsed.contexts) {
        const uncached = uncachedTrends[c.index];
        if (uncached && c.context) {
          newResults.push({ title: uncached.title, context: c.context });
          rowsToInsert.push({
            trend_title_hash: uncached.hash,
            original_title: uncached.title,
            generated_context: c.context,
            model_used: 'google/gemini-2.5-flash-lite',
            lang,
          });
        }
      }

      if (rowsToInsert.length > 0) {
        await supabase
          .from('trend_context_cache')
          .upsert(rowsToInsert, { onConflict: 'trend_title_hash', ignoreDuplicates: true })
          .then(({ error }) => {
            if (error) console.error("Cache insert error:", error);
          });
      }
    }

    const allResults = [...cachedResults, ...newResults];

    return new Response(JSON.stringify({ contexts: allResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze context error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

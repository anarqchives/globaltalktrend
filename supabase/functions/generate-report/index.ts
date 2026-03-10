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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trends, filters, criticalMoments, crossPlatformClusters, sourcesStatus } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Prepare compact data summary for AI
    const top20 = (trends || []).slice(0, 20).map((t: any, i: number) => ({
      rank: i + 1,
      title: (t.title || "").slice(0, 80),
      platform: t.platform,
      volume: t.volume,
      change: t.change,
      category: t.category,
      country: t.countryCode,
    }));

    const criticalSummary = (criticalMoments || []).slice(0, 5).map((m: any) => ({
      title: (m.title || "").slice(0, 80),
      platform: m.platform,
      change: m.change,
      volume: m.volume,
    }));

    const clusterSummary = (crossPlatformClusters || []).slice(0, 5).map((c: any) => ({
      topic: (c.topic || "").slice(0, 80),
      platforms: c.platforms,
      platformCount: c.platformCount,
      totalVolume: c.totalVolume,
      propagationOrigin: c.propagationOrigin,
      sentimentByPlatform: c.sentimentByPlatform,
    }));

    // Category distribution
    const catCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    for (const t of (trends || [])) {
      const cat = t.category || "Geral";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      const cc = t.countryCode || "N/A";
      countryCounts[cc] = (countryCounts[cc] || 0) + 1;
      platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1;
    }

    const prompt = `Você é um analista sênior de tendências globais. Analise os dados abaixo e gere um relatório analítico completo em português brasileiro.

DADOS:
- Total de trends: ${(trends || []).length}
- Filtros: País=${filters?.country || "global"}, Categoria=${filters?.category || "Todas"}, Período=${filters?.period || "Hoje"}
- Top 20 trends: ${JSON.stringify(top20)}
- Momentos críticos: ${JSON.stringify(criticalSummary)}
- Clusters multiplataforma: ${JSON.stringify(clusterSummary)}
- Distribuição por categoria: ${JSON.stringify(catCounts)}
- Distribuição por país: ${JSON.stringify(countryCounts)}
- Distribuição por plataforma: ${JSON.stringify(platformCounts)}

Responda em JSON com a seguinte estrutura:
{
  "executiveSummary": "3 parágrafos com panorama geral, destaques principais e conclusão",
  "highlights": [
    {"label": "Tema mais discutido", "value": "título", "detail": "com X menções"},
    {"label": "Maior crescimento", "value": "título", "detail": "+X% em Y horas"},
    {"label": "Assunto emergente", "value": "título", "detail": "detectado nas últimas X horas"}
  ],
  "criticalAnalysis": [
    {"title": "título", "trigger": "explicação do gatilho", "sentiment": "positive|negative|neutral", "evolution": "descrição da evolução"}
  ],
  "patterns": [
    {"type": "propagation|sentiment|influencer", "description": "descrição do padrão detectado"}
  ],
  "predictions": [
    {"topic": "assunto", "prediction": "previsão", "confidence": "high|medium|low", "timeframe": "próximas X horas"}
  ],
  "sentimentByCategory": {
    "Política": {"positive": 10, "neutral": 52, "negative": 38},
    "Tecnologia": {"positive": 68, "neutral": 22, "negative": 10}
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a data analyst. Always respond with valid JSON only, no markdown code blocks." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
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

    if (!parsed) {
      parsed = {
        executiveSummary: content || "Não foi possível gerar o resumo executivo.",
        highlights: [],
        criticalAnalysis: [],
        patterns: [],
        predictions: [],
        sentimentByCategory: {},
      };
    }

    // Attach raw stats
    parsed.stats = {
      totalTrends: (trends || []).length,
      catCounts,
      countryCounts,
      platformCounts,
      criticalCount: (criticalMoments || []).length,
      crossPlatformCount: (crossPlatformClusters || []).length,
    };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generate report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trends, filters, criticalMoments, crossPlatformClusters, sourcesStatus, reportMode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const top20 = (trends || []).slice(0, 25).map((t: any, i: number) => ({
      rank: i + 1,
      title: (t.title || "").slice(0, 100),
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
    }));

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

    const isAcademic = reportMode === "academic";

    const prompt = isAcademic
      ? `Você é um pesquisador acadêmico sênior especializado em análise de tendências digitais e comunicação de massa. Produza um relatório acadêmico completo em português brasileiro com rigor metodológico.

DADOS:
- Total de trends: ${(trends || []).length}
- Filtros: País=${filters?.country || "global"}, Categoria=${filters?.category || "Todas"}, Período=${filters?.period || "Hoje"}
- Top 25 trends: ${JSON.stringify(top20)}
- Momentos críticos (>200% crescimento): ${JSON.stringify(criticalSummary)}
- Clusters multiplataforma: ${JSON.stringify(clusterSummary)}
- Distribuição por categoria: ${JSON.stringify(catCounts)}
- Distribuição por país: ${JSON.stringify(countryCounts)}
- Distribuição por plataforma: ${JSON.stringify(platformCounts)}

Responda em JSON com a seguinte estrutura:
{
  "executiveSummary": "Resumo acadêmico de 4-5 parágrafos com contextualização teórica, análise dos dados, discussão e conclusões. Cite frameworks teóricos como Agenda Setting (McCombs & Shaw, 1972), Spiral of Silence (Noelle-Neumann, 1974), ou Gatekeeping Theory quando aplicável.",
  "highlights": [
    {"label": "Descoberta principal", "value": "título", "detail": "com fundamentação em dados quantitativos"}
  ],
  "criticalAnalysis": [
    {"title": "título", "trigger": "análise causal detalhada", "sentiment": "positive|negative|neutral", "evolution": "trajetória com base em indicadores"}
  ],
  "patterns": [
    {"type": "propagation|sentiment|influencer|amplification|convergence", "description": "descrição detalhada do padrão com referência a teorias de comunicação"}
  ],
  "predictions": [
    {"topic": "assunto", "prediction": "previsão fundamentada em padrões históricos", "confidence": "high|medium|low", "timeframe": "próximas X horas/dias"}
  ],
  "sentimentByCategory": {
    "Política": {"positive": 10, "neutral": 52, "negative": 38}
  },
  "methodology": "Descrição detalhada da metodologia de coleta (fontes, APIs, frequência de amostragem), processamento (deduplicação, normalização, categorização por NLP) e análise (métricas de volume, crescimento percentual, dispersão geográfica, convergência multiplataforma). Inclua limitações como viés de seleção de fontes, atraso temporal e ausência de dados demográficos.",
  "bibliography": [
    {"author": "McCombs, M. & Shaw, D.", "year": "1972", "title": "The agenda-setting function of mass media", "source": "Public Opinion Quarterly, 36(2), 176-187", "doi": "10.1086/267990"},
    {"author": "Noelle-Neumann, E.", "year": "1974", "title": "The spiral of silence: A theory of public opinion", "source": "Journal of Communication, 24(2), 43-51", "doi": "10.1111/j.1460-2466.1974.tb00367.x"},
    {"author": "Castells, M.", "year": "2009", "title": "Communication Power", "source": "Oxford University Press", "doi": ""},
    {"author": "Benkler, Y.", "year": "2006", "title": "The Wealth of Networks", "source": "Yale University Press", "doi": ""},
    {"author": "Jenkins, H.", "year": "2006", "title": "Convergence Culture", "source": "NYU Press", "doi": ""}
  ],
  "theoreticalFramework": "Breve enquadramento teórico de 2-3 parágrafos conectando os dados observados a teorias de comunicação, sociologia digital e análise de redes. Referencie autores como Castells (2009) sobre comunicação em rede, Jenkins (2006) sobre cultura convergente, e Benkler (2006) sobre produção colaborativa."
}`
      : `Você é um analista sênior de tendências globais e inteligência de dados. Analise os dados abaixo e gere um relatório executivo completo e de alta qualidade em português brasileiro.

DADOS:
- Total de trends: ${(trends || []).length}
- Filtros: País=${filters?.country || "global"}, Categoria=${filters?.category || "Todas"}, Período=${filters?.period || "Hoje"}
- Top 25 trends: ${JSON.stringify(top20)}
- Momentos críticos (>200% crescimento): ${JSON.stringify(criticalSummary)}
- Clusters multiplataforma: ${JSON.stringify(clusterSummary)}
- Distribuição por categoria: ${JSON.stringify(catCounts)}
- Distribuição por país: ${JSON.stringify(countryCounts)}
- Distribuição por plataforma: ${JSON.stringify(platformCounts)}

Responda em JSON com a seguinte estrutura:
{
  "executiveSummary": "4 parágrafos: panorama geral com dados quantitativos, destaques principais com métricas, análise de padrões emergentes, conclusão com recomendações estratégicas",
  "highlights": [
    {"label": "Tema mais discutido", "value": "título", "detail": "com X menções em Y plataformas"},
    {"label": "Maior crescimento", "value": "título", "detail": "+X% em Y horas, originado em Z"},
    {"label": "Assunto emergente", "value": "título", "detail": "detectado nas últimas X horas com padrão de aceleração"},
    {"label": "Convergência multiplataforma", "value": "título", "detail": "presente em X plataformas simultaneamente"}
  ],
  "criticalAnalysis": [
    {"title": "título", "trigger": "explicação detalhada do gatilho com contexto", "sentiment": "positive|negative|neutral", "evolution": "trajetória de evolução com timeline"}
  ],
  "patterns": [
    {"type": "propagation|sentiment|influencer|amplification|convergence", "description": "descrição detalhada do padrão detectado com evidências quantitativas"}
  ],
  "predictions": [
    {"topic": "assunto", "prediction": "previsão fundamentada em padrões observados", "confidence": "high|medium|low", "timeframe": "próximas X horas/dias"}
  ],
  "sentimentByCategory": {
    "Política": {"positive": 10, "neutral": 52, "negative": 38},
    "Tecnologia": {"positive": 68, "neutral": 22, "negative": 10}
  },
  "methodology": "Breve descrição das fontes de dados utilizadas, método de coleta (agregação de APIs de tendências, redes sociais e imprensa), processamento (deduplicação, normalização, categorização) e limitações (viés de seleção, cobertura geográfica).",
  "bibliography": [
    {"author": "Global Talk Trend", "year": "${new Date().getFullYear()}", "title": "Agregação de dados de tendências digitais", "source": "Fontes: ${Object.keys(platformCounts).join(", ")}", "doi": ""},
    {"author": "Google Trends", "year": "${new Date().getFullYear()}", "title": "Dados de volume de buscas", "source": "trends.google.com", "doi": ""}
  ]
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
          { role: "system", content: "You are a senior data analyst and researcher. Always respond with valid JSON only, no markdown code blocks. Ensure all bibliographic references are real and verifiable." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        executiveSummary: content || "Não foi possível gerar o resumo.",
        highlights: [], criticalAnalysis: [], patterns: [], predictions: [],
        sentimentByCategory: {}, methodology: "", bibliography: [],
      };
    }

    // Ensure bibliography and methodology exist
    if (!parsed.bibliography) parsed.bibliography = [];
    if (!parsed.methodology) parsed.methodology = "";
    if (!parsed.theoreticalFramework) parsed.theoreticalFramework = "";

    parsed.stats = {
      totalTrends: (trends || []).length,
      catCounts, countryCounts, platformCounts,
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

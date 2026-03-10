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
    const { title, details, platform, volume, category, sources, description } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Analise esta tendência e forneça uma análise contextual completa.

Título: ${title}
Plataforma: ${platform}
Volume: ${volume}
Categoria: ${category || "Geral"}
Fontes: ${sources?.join(", ") || "Não disponível"}
Detalhes: ${details || description || "Não disponível"}

Responda APENAS com JSON válido no formato abaixo. Sem markdown, sem explicação, apenas o JSON:

{
  "trigger": {
    "type": "launch|politics|crisis|sports|statement|viral|science|business|culture|other",
    "emoji": "emoji adequado ao tipo",
    "label": "rótulo curto em português (ex: Lançamento, Crise, Eleição)",
    "confidence": 0.0-1.0
  },
  "contextSummary": "Frase curta explicando: Trend impulsionada por [gatilho] com participação de [fontes principais]",
  "sentimentWords": [
    {"word": "palavra1", "sentiment": "positive|negative|neutral", "weight": 1-10},
    {"word": "palavra2", "sentiment": "positive|negative|neutral", "weight": 1-10}
  ],
  "topSources": [
    {"name": "nome da fonte/veículo", "type": "press|social|official|tech", "relevance": 1-10}
  ],
  "keyInsight": "Uma frase de insight acionável sobre esta trend"
}

Regras:
- sentimentWords: extraia 10-20 palavras-chave relevantes do título e detalhes, classificando cada uma por sentimento
- topSources: liste 3-5 fontes/veículos prováveis baseados na plataforma e conteúdo
- trigger types: launch (filme/música/produto), politics (eleição/governo), crisis (acidente/desastre), sports (jogo/campeonato), statement (declaração/polêmica), viral (crescimento orgânico), science (descoberta/pesquisa), business (mercado/economia), culture (arte/evento cultural)
- Responda em português`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a trend context analyst. Always respond with valid JSON only, no markdown, no code blocks." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
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
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
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

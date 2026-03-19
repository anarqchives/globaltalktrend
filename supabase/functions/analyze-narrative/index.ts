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
    const { title, details, platform, volume, category, sources, description, thumbnail } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build narrative analysis prompt
    const narrativePrompt = `Você é um analista de mídia e narrativas. Analise esta tendência e forneça uma análise comparativa de narrativas.

Título: ${title}
Plataforma: ${platform}
Volume: ${volume}
Categoria: ${category || "Geral"}
Fontes conhecidas: ${sources?.join(", ") || "Não disponível"}
Detalhes: ${details || description || "Não disponível"}

Responda APENAS com JSON válido (sem markdown, sem code blocks):

{
  "narrativeSummary": "Resumo de 2-3 frases sobre como esta história está sendo contada por diferentes perspectivas",
  "sourceComparison": [
    {
      "sourceType": "mainstream_press",
      "label": "Imprensa Tradicional",
      "emoji": "📰",
      "narrative": "Como a imprensa tradicional cobre este assunto (2 frases)",
      "emphasis": ["palavra-chave1", "palavra-chave2"],
      "tone": "neutral|cautious|critical|supportive|alarmist",
      "toneLabel": "rótulo em português do tom"
    },
    {
      "sourceType": "social_media",
      "label": "Redes Sociais",
      "emoji": "💬",
      "narrative": "Como as redes sociais discutem este assunto (2 frases)",
      "emphasis": ["palavra-chave1", "palavra-chave2"],
      "tone": "neutral|passionate|polarized|humorous|outraged",
      "toneLabel": "rótulo em português do tom"
    },
    {
      "sourceType": "international",
      "label": "Mídia Internacional",
      "emoji": "🌍",
      "narrative": "Como a mídia internacional aborda este assunto (2 frases)",
      "emphasis": ["palavra-chave1", "palavra-chave2"],
      "tone": "neutral|distanced|comparative|analytical",
      "toneLabel": "rótulo em português do tom"
    }
  ],
  "dominantFrames": [
    {
      "frame": "Nome do enquadramento (ex: 'Ameaça à segurança', 'Oportunidade econômica')",
      "percentage": 40,
      "description": "Breve descrição deste enquadramento narrativo"
    }
  ],
  "propagationTimeline": [
    {
      "phase": "Origem",
      "emoji": "🌱",
      "description": "Onde e como a notícia provavelmente surgiu",
      "estimatedTime": "0-2h"
    },
    {
      "phase": "Amplificação",
      "emoji": "📢",
      "description": "Como se espalhou para outros canais",
      "estimatedTime": "2-6h"
    },
    {
      "phase": "Mainstream",
      "emoji": "📺",
      "description": "Quando atingiu a mídia mainstream",
      "estimatedTime": "6-12h"
    }
  ],
  "narrativeDivergences": [
    "Ponto onde as narrativas divergem significativamente entre fontes"
  ],
  "predictedEvolution": "Uma previsão de como esta narrativa provavelmente evoluirá nas próximas 12h",
  "visualSentiment": ${thumbnail ? '"Uma análise do contexto visual baseada no título e na temática da imagem associada (positivo/negativo/neutro e por quê)"' : 'null'}
}

Regras:
- Sempre responda em português
- dominantFrames: liste 2-4 enquadramentos com porcentagens que somem ~100%
- propagationTimeline: 3-4 fases da jornada desta notícia
- narrativeDivergences: 1-3 pontos de divergência narrativa
- Seja específico ao contexto da trend, não genérico`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert media narrative analyst. Always respond with valid JSON only, no markdown, no code blocks." },
          { role: "user", content: narrativePrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
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
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze narrative error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

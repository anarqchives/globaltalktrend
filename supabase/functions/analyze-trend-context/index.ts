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
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Support both single trend and batch modes
    const trends = body.trends || [body];
    const lang = body.lang || "pt";

    if (trends.length === 0) {
      return new Response(JSON.stringify({ contexts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build batch prompt
    const trendLines = trends.slice(0, 20).map((t: any, i: number) =>
      `${i + 1}. "${t.title}" | Plataforma: ${t.platform || "?"} | País: ${t.countryCode || "GL"} | Volume: ${t.volume || "?"} | Categoria: ${t.category || "Geral"}`
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

    if (!parsed?.contexts) {
      // Fallback: return empty contexts
      return new Response(JSON.stringify({ contexts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map back to titles
    const results = parsed.contexts.map((c: any) => ({
      title: trends[c.index]?.title || "",
      context: c.context || "",
    })).filter((c: any) => c.title && c.context);

    return new Response(JSON.stringify({ contexts: results }), {
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const langNames: Record<string, string> = {
  pt: "Portuguese",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  ru: "Russian",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set", translations: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items, targetLang } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0 || !targetLang) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langLabel = langNames[targetLang] || targetLang;

    // Build numbered list for translation
    const numbered = items
      .map((item: { title: string; details?: string }, i: number) => {
        const detailPart = item.details ? ` ||| ${item.details.slice(0, 150)}` : "";
        return `${i + 1}. ${item.title}${detailPart}`;
      })
      .join("\n");

    const systemPrompt = `You are a professional translator. Translate each numbered line to ${langLabel}. 
Keep the same numbering. If a line has " ||| " separator, translate both parts and keep the separator.
Return ONLY the numbered translations, nothing else. Do not add explanations.`;

    const userPrompt = numbered;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`AI translation failed [${aiRes.status}]:`, errText);
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse numbered lines back
    const lines = content.split("\n").filter((l: string) => l.trim());
    const translations: { title: string; details?: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      // Find line starting with "i+1."
      const prefix = `${i + 1}.`;
      const line = lines.find((l: string) => l.trim().startsWith(prefix));
      if (line) {
        const text = line.trim().slice(prefix.length).trim();
        if (text.includes(" ||| ")) {
          const [title, details] = text.split(" ||| ");
          translations.push({ title: title.trim(), details: details.trim() });
        } else {
          translations.push({ title: text });
        }
      } else {
        // Fallback: use original
        translations.push({ title: items[i].title, details: items[i].details });
      }
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(JSON.stringify({ error: "Translation failed", translations: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

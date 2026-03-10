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

const langNames: Record<string, string> = {
  pt: "Portuguese", en: "English", es: "Spanish", fr: "French",
  de: "German", it: "Italian", zh: "Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", hi: "Hindi", ru: "Russian",
};

const BATCH_SIZE = 12;

function extractJsonFromText(text: string): any {
  try { return JSON.parse(text); } catch {}
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.substring(start, end + 1)); } catch {}
  }
  return null;
}

async function translateBatch(
  batch: { title: string; details?: string }[],
  langLabel: string,
  apiKey: string
): Promise<{ title: string; details?: string }[]> {
  const numbered = batch
    .map((item, i) => {
      const d = item.details ? ` ||| ${item.details.slice(0, 120)}` : "";
      return `${i + 1}. ${item.title.slice(0, 200)}${d}`;
    })
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a fast translator. Translate each numbered line to ${langLabel}. Keep numbering. If " ||| " exists, translate both parts keeping separator. Return ONLY numbered translations, nothing else.`,
          },
          { role: "user", content: numbered },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiRes.ok) {
      console.error(`AI batch error [${aiRes.status}]`);
      return batch;
    }

    const rawText = await aiRes.text();
    const aiData = extractJsonFromText(rawText);
    if (!aiData) {
      console.error("Non-JSON AI response, len:", rawText.length);
      return batch;
    }

    const content: string = aiData?.choices?.[0]?.message?.content || "";
    if (!content) return batch;

    const lines = content.split("\n").filter((l: string) => l.trim());
    const results: { title: string; details?: string }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const prefix = `${i + 1}.`;
      const line = lines.find((l: string) => l.trim().startsWith(prefix));
      if (line) {
        const text = line.trim().slice(prefix.length).trim();
        if (text.includes(" ||| ")) {
          const [title, details] = text.split(" ||| ");
          results.push({ title: title.trim(), details: details?.trim() });
        } else {
          results.push({ title: text, details: batch[i].details });
        }
      } else {
        results.push(batch[i]);
      }
    }
    return results;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Batch translate error:", String(err));
    return batch;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return Response.json({ error: "API key missing", translations: [] }, {
        status: 500, headers: corsHeaders,
      });
    }

    const body = await req.json();
    const items: { title: string; details?: string }[] = body?.items;
    const targetLang: string = body?.targetLang;

    if (!items || !Array.isArray(items) || items.length === 0 || !targetLang) {
      return Response.json({ translations: [] }, { headers: corsHeaders });
    }

    // Skip translation if target is Portuguese (default language)
    if (targetLang === "pt") {
      return Response.json({ translations: items }, { headers: corsHeaders });
    }

    const langLabel = langNames[targetLang] || targetLang;

    // Split into batches
    const batches: { title: string; details?: string }[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    // Process up to 4 batches concurrently
    const CONCURRENCY = 4;
    const results: { title: string; details?: string }[][] = new Array(batches.length);
    let nextIdx = 0;

    async function worker() {
      while (true) {
        const idx = nextIdx++;
        if (idx >= batches.length) break;
        results[idx] = await translateBatch(batches[idx], langLabel, LOVABLE_API_KEY!);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker())
    );

    const allTranslations: { title: string; details?: string }[] = [];
    for (const batch of results) {
      if (batch) allTranslations.push(...batch);
    }

    while (allTranslations.length < items.length) {
      allTranslations.push(items[allTranslations.length]);
    }

    return Response.json({ translations: allTranslations }, { headers: corsHeaders });
  } catch (error) {
    console.error("Translation top-level error:", error);
    return Response.json({ error: "Translation failed", translations: [] }, {
      status: 500, headers: corsHeaders,
    });
  }
});

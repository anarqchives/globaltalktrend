import { checkRateLimit } from "../_shared/rate-limit.ts";

const ALLOWED_ORIGINS = [
  'https://gttmonitor.com',
  'https://www.gttmonitor.com',
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
const langNames: Record<string, string> = {
  pt: "Portuguese", en: "English", es: "Spanish", fr: "French",
  de: "German", it: "Italian", zh: "Simplified Chinese", ja: "Japanese",
  ko: "Korean", ar: "Arabic", hi: "Hindi", ru: "Russian",
};
const BATCH_SIZE = 10;
const TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

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
  apiKey: string,
  attempt = 0
): Promise<{ title: string; details?: string; ok: boolean }[]> {
  const numbered = batch
    .map((item, i) => {
      const d = item.details ? ` ||| ${item.details.slice(0, 120)}` : "";
      return `${i + 1}. ${item.title.slice(0, 200)}${d}`;
    })
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional translator and editor. Translate EVERY numbered line fully into ${langLabel}.

CRITICAL RULES:
1. ALL text MUST be in ${langLabel} — do NOT leave any word in its original language.
2. Use correct grammar, spelling, and natural phrasing for ${langLabel}. Ensure proper gender/number agreement, verb conjugation, and idiomatic expressions.
3. Keep the original numbering format (1. 2. 3. ...).
4. If " ||| " separator exists, translate BOTH parts and keep the separator.
5. Return ONLY the numbered translations, nothing else.
6. For technical terms or proper nouns widely known in their original form, keep them but translate the surrounding context.`,
          },
          { role: "user", content: numbered },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!aiRes.ok) {
      console.error(`AI batch error [${aiRes.status}], attempt ${attempt}`);
      return batch.map(b => ({ ...b, ok: false }));
    }

    const rawText = await aiRes.text();
    const aiData = extractJsonFromText(rawText);
    if (!aiData) {
      console.error("Non-JSON AI response, len:", rawText.length);
      return batch.map(b => ({ ...b, ok: false }));
    }

    const content: string = aiData?.choices?.[0]?.message?.content || "";
    if (!content) return batch.map(b => ({ ...b, ok: false }));

    const lines = content.split("\n").filter((l: string) => l.trim());
    const results: { title: string; details?: string; ok: boolean }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const prefix = `${i + 1}.`;
      const line = lines.find((l: string) => l.trim().startsWith(prefix));
      if (line) {
        const text = line.trim().slice(prefix.length).trim();
        if (text.includes(" ||| ")) {
          const [title, details] = text.split(" ||| ");
          results.push({ title: title.trim(), details: details?.trim(), ok: true });
        } else {
          results.push({ title: text, details: batch[i].details, ok: true });
        }
      } else {
        results.push({ ...batch[i], ok: false });
      }
    }
    return results;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Batch translate error:", String(err), "attempt:", attempt);
    return batch.map(b => ({ ...b, ok: false }));
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;
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
    const langLabel = langNames[targetLang] || targetLang;

    const batches: { title: string; details?: string }[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    const CONCURRENCY = 3;
    const results: { title: string; details?: string; ok: boolean }[][] = new Array(batches.length);
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
    const failedItems: { globalIdx: number; title: string; details?: string }[] = [];

    let globalIdx = 0;
    for (let b = 0; b < results.length; b++) {
      const batch = results[b] || batches[b].map(item => ({ ...item, ok: false }));
      for (let i = 0; i < batch.length; i++) {
        allTranslations.push({ title: batch[i].title, details: batch[i].details });
        if (!batch[i].ok) {
          failedItems.push({ globalIdx, title: items[globalIdx].title, details: items[globalIdx].details });
        }
        globalIdx++;
      }
    }

    if (failedItems.length > 0 && failedItems.length <= 20) {
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        const retryBatch = failedItems.filter(f => allTranslations[f.globalIdx].title === items[f.globalIdx].title);
        if (retryBatch.length === 0) break;

        const retryResult = await translateBatch(
          retryBatch.map(f => ({ title: f.title, details: f.details })),
          langLabel,
          LOVABLE_API_KEY!,
          retry + 1
        );

        for (let i = 0; i < retryBatch.length && i < retryResult.length; i++) {
          if (retryResult[i].ok) {
            allTranslations[retryBatch[i].globalIdx] = {
              title: retryResult[i].title,
              details: retryResult[i].details,
            };
          }
        }
      }
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

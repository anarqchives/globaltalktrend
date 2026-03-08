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

const BATCH_SIZE = 10;

async function translateBatch(
  batch: { title: string; details?: string }[],
  langLabel: string,
  apiKey: string
): Promise<{ title: string; details?: string }[]> {
  const numbered = batch
    .map((item, i) => {
      const detailPart = item.details ? ` ||| ${item.details.slice(0, 120)}` : "";
      return `${i + 1}. ${item.title.slice(0, 200)}${detailPart}`;
    })
    .join("\n");

  const systemPrompt = `You are a professional translator. Translate each numbered line to ${langLabel}. 
Keep the same numbering. If a line has " ||| " separator, translate both parts and keep the separator.
Return ONLY the numbered translations, nothing else.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
          { role: "system", content: systemPrompt },
          { role: "user", content: numbered },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`AI translation batch failed [${aiRes.status}]:`, errText);
      return batch; // Return originals on failure
    }

    const rawText = await aiRes.text();
    let aiData: any;
    try {
      aiData = JSON.parse(rawText);
    } catch {
      console.error("AI returned non-JSON response, length:", rawText.length);
      return batch;
    }

    const content = aiData.choices?.[0]?.message?.content || "";
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
          results.push({ title: text });
        }
      } else {
        results.push({ title: batch[i].title, details: batch[i].details });
      }
    }

    return results;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Batch translation error:", err);
    return batch; // Return originals on timeout/error
  }
}

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

    // Process in small batches to avoid timeouts
    const allTranslations: { title: string; details?: string }[] = [];
    const batches: { title: string; details?: string }[][] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    // Run batches concurrently (max 3 at a time)
    const concurrency = Math.min(batches.length, 3);
    const queue = [...batches];
    const results: { title: string; details?: string }[][] = new Array(batches.length);

    const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
      while (queue.length > 0) {
        const batchIdx = batches.length - queue.length;
        const batch = queue.shift();
        if (!batch) break;
        results[batchIdx] = await translateBatch(batch, langLabel, LOVABLE_API_KEY);
      }
    });

    await Promise.all(workers);

    for (const batch of results) {
      if (batch) allTranslations.push(...batch);
    }

    // If we somehow got fewer translations than items, pad with originals
    while (allTranslations.length < items.length) {
      const idx = allTranslations.length;
      allTranslations.push({ title: items[idx].title, details: items[idx].details });
    }

    return new Response(JSON.stringify({ translations: allTranslations }), {
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

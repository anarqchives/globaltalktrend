import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { title, platform } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ historicalData: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("trend_snapshots")
      .select("captured_at, volume_raw")
      .ilike("title", `%${title.slice(0, 30)}%`)
      .eq("platform", platform)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true })
      .limit(48);

    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ historicalData: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agrupa por hora
    const byHour: Record<string, number[]> = {};
    for (const row of data) {
      const h = new Date(row.captured_at).getHours().toString().padStart(2, "0") + ":00";
      byHour[h] = [...(byHour[h] ?? []), row.volume_raw];
    }

    const historicalData = Object.entries(byHour).map(([hour, vals]) => ({
      hour,
      value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));

    return new Response(JSON.stringify({ historicalData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-trend-history error:", e);
    return new Response(
      JSON.stringify({ error: String(e), historicalData: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

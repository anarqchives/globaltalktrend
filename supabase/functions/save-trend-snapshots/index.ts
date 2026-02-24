import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const trends = body.trends || [];

    if (!trends.length) {
      return new Response(JSON.stringify({ saved: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse volume string to raw number
    function parseVolume(vol: string): number {
      if (!vol) return 0;
      const clean = vol.replace(/[^0-9.KMkm]/g, "");
      const num = parseFloat(clean);
      if (isNaN(num)) return 0;
      if (/[Mm]/.test(vol)) return Math.round(num * 1_000_000);
      if (/[Kk]/.test(vol)) return Math.round(num * 1_000);
      return Math.round(num);
    }

    // Parse change string to percent number
    function parseChange(change: string): number {
      if (!change) return 0;
      const match = change.match(/[+-]?\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : 0;
    }

    const rows = trends.map((t: any) => ({
      title: (t.title || "").slice(0, 200),
      platform: t.platform || "Unknown",
      category: t.category || null,
      country_code: t.countryCode || null,
      volume_raw: parseVolume(t.volume),
      change_percent: parseChange(t.change),
      source_count: t.sources?.length || 1,
      metadata: {
        trustBadge: t.trustBadge || null,
        sourceUrl: t.sourceUrl || null,
      },
    }));

    const { error } = await supabase.from("trend_snapshots").insert(rows);

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cleanup old snapshots
    await supabase.rpc("cleanup_old_snapshots").catch(() => {});

    return new Response(JSON.stringify({ saved: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

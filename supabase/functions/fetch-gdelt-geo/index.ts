import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://globaltalktrend.lovable.app',
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

let cache: { ts: number; data: any } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const url = "https://api.gdeltproject.org/api/v2/geo/geo?query=&format=geojson&timespan=1h&maxpoints=200";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: { "User-Agent": "GTTMonitor/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.log("GDELT GEO error:", response.status);
      return new Response(JSON.stringify({ events: [], trends: [] }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const geojson = await response.json();
    const features = geojson?.features || [];

    const events = features.slice(0, 150).map((f: any) => {
      const coords = f.geometry?.coordinates || [0, 0];
      const props = f.properties || {};
      return {
        lat: coords[1] || 0,
        lng: coords[0] || 0,
        title: (props.name || props.html || "Evento").replace(/<[^>]*>/g, "").slice(0, 120),
        url: props.url || props.shareimage || "",
        tone: props.tone !== undefined ? parseFloat(props.tone) : 0,
        countryCode: (props.countrycode || "GL").slice(0, 2),
        domain: props.domain || "",
      };
    }).filter((e: any) => e.lat !== 0 || e.lng !== 0);

    const result = { events, trends: [] };
    cache = { ts: Date.now(), data: result };

    return new Response(JSON.stringify(result), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GDELT GEO error:", error);
    return new Response(JSON.stringify({ events: [], trends: [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

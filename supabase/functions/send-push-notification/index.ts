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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const rateLimitResponse = checkRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, title, body, url } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase.from('push_subscriptions').select('*');
    if (user_id) query = query.eq('user_id', user_id);
    const { data: subscriptions, error } = await query;

    if (error || !subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || 'https://gttmonitor.com',
      icon: '/icon-192.png',
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `vapid t=${buildJWT(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, sub.endpoint)},k=${VAPID_PUBLIC_KEY}`,
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
        });

        if (res.status === 201 || res.status === 200 || res.status === 202) {
          sent++;
        } else if (res.status === 410 || res.status === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          failed.push(sub.endpoint);
        }
      } catch {
        failed.push(sub.endpoint);
      }
    }

    return new Response(JSON.stringify({ sent, failed: failed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Push notification error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildJWT(publicKey: string, privateKey: string, endpoint: string): string {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud: audience, exp: now + 43200, sub: 'mailto:anapaulatbarth@gmail.com' };
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}`;
}

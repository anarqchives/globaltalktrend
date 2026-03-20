import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://gttmonitor.com', 'https://www.gttmonitor.com',
  'http://localhost:8080', 'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

interface TrendItem {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  details?: string;
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  trustBadge?: string;
  publishedAt?: string;
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
  likeRatio?: number;
  commentCount?: number;
}

function generateHistorical(baseValue: number, label: string) {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    data.push({ hour: hourStr, value: Math.round(baseValue * progress * noise) });
  }
  return { historicalData: data, metricLabel: label };
}

function sparkRandom() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (/politi|elect|govern|trump|biden|war|conflict/i.test(t)) return "Geopolítica";
  if (/tech|ai|artificial|robot|software|cyber|chip/i.test(t)) return "Tecnologia";
  if (/econom|market|stock|crypto|bitcoin|inflation/i.test(t)) return "Economia";
  if (/health|medic|virus|vaccine|disease/i.test(t)) return "Ciências";
  if (/sport|football|soccer|nba|nfl|olympic/i.test(t)) return "Esportes";
  if (/film|movie|music|game|series|netflix/i.test(t)) return "Entretenimento";
  return "Geral";
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Reddit OAuth ──
let redditToken: { token: string; expires: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const clientId = Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = Deno.env.get("REDDIT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  if (redditToken && Date.now() < redditToken.expires) return redditToken.token;

  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": Deno.env.get("REDDIT_USER_AGENT") || "GTTMonitor/1.0",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    redditToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return redditToken.token;
  } catch (e) {
    console.error("Reddit OAuth error:", e);
    return null;
  }
}

async function fetchReddit(): Promise<TrendItem[]> {
  const token = await getRedditToken();
  if (!token) {
    // Fallback: public JSON endpoint (no auth needed, lower rate limits)
    console.log("⚠️ Reddit OAuth not configured, using public endpoint");
    try {
      const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=12", {
        headers: { "User-Agent": "GTTMonitor/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { await res.text(); return []; }
      const data = await res.json();
      const posts = data?.data?.children || [];
      console.log(`🟠 Reddit (public) retornou: ${posts.length} posts`);
      return posts.slice(0, 12).map((p: any) => {
        const d = p.data;
        const score = d.score || 0;
        const hist = generateHistorical(Math.max(score / 10, 20), "Upvotes/h");
        return {
          icon: "🟠",
          platform: "Reddit",
          title: d.title || "Sem título",
          category: inferCategory(d.title || ""),
          time: d.created_utc ? new Date(d.created_utc * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
          volume: formatVolume(score),
          change: d.num_comments > 100 ? `+${formatVolume(d.num_comments)} 💬` : `${d.num_comments} 💬`,
          changePositive: score > 1000,
          sparkData: sparkRandom(),
          details: d.selftext?.substring(0, 200) || "",
          sourceUrl: `https://reddit.com${d.permalink}`,
          trustBadge: "community",
          publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
          likeRatio: d.upvote_ratio,
          commentCount: d.num_comments,
          countryCode: "GL",
          ...hist,
        };
      });
    } catch (e) {
      console.error("Reddit public fetch error:", e);
      return [];
    }
  }

  // Authenticated path
  try {
    const res = await fetch("https://oauth.reddit.com/r/all/hot?limit=15", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": Deno.env.get("REDDIT_USER_AGENT") || "GTTMonitor/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error(`Reddit API error: ${res.status}`); await res.text(); return []; }
    const data = await res.json();
    const posts = data?.data?.children || [];
    console.log(`🟠 Reddit (OAuth) retornou: ${posts.length} posts`);
    return posts.slice(0, 15).map((p: any) => {
      const d = p.data;
      const score = d.score || 0;
      const hist = generateHistorical(Math.max(score / 10, 20), "Upvotes/h");
      return {
        icon: "🟠",
        platform: "Reddit",
        title: d.title || "Sem título",
        category: inferCategory(d.title || ""),
        time: d.created_utc ? new Date(d.created_utc * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
        volume: formatVolume(score),
        change: d.num_comments > 100 ? `+${formatVolume(d.num_comments)} 💬` : `${d.num_comments} 💬`,
        changePositive: score > 1000,
        sparkData: sparkRandom(),
        details: d.selftext?.substring(0, 200) || "",
        sourceUrl: `https://reddit.com${d.permalink}`,
        trustBadge: "community",
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : new Date().toISOString(),
        likeRatio: d.upvote_ratio,
        commentCount: d.num_comments,
        countryCode: "GL",
        ...hist,
      };
    });
  } catch (e) {
    console.error("Reddit OAuth fetch error:", e);
    return [];
  }
}

// ── Bluesky / AT Protocol ──
let bskySession: { accessJwt: string; did: string; expires: number } | null = null;

async function getBskySession(): Promise<{ accessJwt: string; did: string } | null> {
  const identifier = Deno.env.get("BLUESKY_IDENTIFIER");
  const password = Deno.env.get("BLUESKY_APP_PASSWORD");
  if (!identifier || !password) return null;

  if (bskySession && Date.now() < bskySession.expires) {
    return { accessJwt: bskySession.accessJwt, did: bskySession.did };
  }

  try {
    const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    bskySession = { accessJwt: data.accessJwt, did: data.did, expires: Date.now() + 50 * 60 * 1000 };
    return { accessJwt: data.accessJwt, did: data.did };
  } catch (e) {
    console.error("Bluesky session error:", e);
    return null;
  }
}

async function fetchBluesky(): Promise<TrendItem[]> {
  // Try authenticated first, then fall back to public
  const session = await getBskySession();
  
  try {
    const headers: Record<string, string> = {};
    if (session) headers["Authorization"] = `Bearer ${session.accessJwt}`;
    
    // Use public API for trending/popular feeds
    const res = await fetch(
      "https://public.api.bsky.app/xrpc/app.bsky.feed.getPopularFeedGenerators?limit=15",
      { headers, signal: AbortSignal.timeout(8000) }
    );
    
    if (!res.ok) {
      console.error(`Bluesky API error: ${res.status}`);
      await res.text();
      return [];
    }
    
    const data = await res.json();
    const feeds = data.feeds || [];
    console.log(`🦋 Bluesky retornou: ${feeds.length} feeds`);
    
    return feeds.slice(0, 12).map((f: any) => {
      const likes = f.likeCount || 0;
      const hist = generateHistorical(Math.max(likes / 10, 10), "Likes/h");
      return {
        icon: "🦋",
        platform: "Bluesky",
        title: f.displayName || "Sem título",
        category: inferCategory(f.displayName || ""),
        time: f.indexedAt ? new Date(f.indexedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
        volume: formatVolume(likes),
        change: likes > 100 ? "+popular" : "novo",
        changePositive: likes > 100,
        sparkData: sparkRandom(),
        details: f.description?.substring(0, 200) || "",
        description: f.description?.substring(0, 200) || "",
        sourceUrl: `https://bsky.app/profile/${f.creator?.handle || "unknown"}`,
        trustBadge: "social",
        publishedAt: f.indexedAt || new Date().toISOString(),
        countryCode: "GL",
        ...hist,
      };
    });
  } catch (e) {
    console.error("Bluesky fetch error:", e);
    return [];
  }
}

// ── Mastodon API ──
async function fetchMastodon(): Promise<TrendItem[]> {
  const baseUrl = Deno.env.get("MASTODON_BASE_URL") || "https://mastodon.social";
  const accessToken = Deno.env.get("MASTODON_ACCESS_TOKEN");
  
  try {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    
    // Trending statuses (public endpoint, no auth needed on most instances)
    const res = await fetch(`${baseUrl}/api/v1/trends/statuses?limit=12`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) {
      console.error(`Mastodon API error: ${res.status}`);
      await res.text();
      return [];
    }
    
    const statuses = await res.json();
    console.log(`🐘 Mastodon retornou: ${statuses.length} statuses`);
    
    return (Array.isArray(statuses) ? statuses : []).slice(0, 12).map((s: any) => {
      const reblogs = s.reblogs_count || 0;
      const favs = s.favourites_count || 0;
      const engagement = reblogs + favs;
      const hist = generateHistorical(Math.max(engagement / 5, 10), "Engajamento/h");
      const plainText = (s.content || "").replace(/<[^>]*>/g, "").substring(0, 200);
      const title = plainText.length > 80 ? plainText.substring(0, 80) + "..." : plainText || "Post Mastodon";
      
      return {
        icon: "🐘",
        platform: "Mastodon",
        title,
        category: inferCategory(title),
        time: s.created_at ? new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora",
        volume: formatVolume(engagement),
        change: `↗ ${reblogs} 🔁 ${favs} ⭐`,
        changePositive: engagement > 50,
        sparkData: sparkRandom(),
        details: plainText,
        description: plainText,
        sourceUrl: s.url || s.uri || "",
        trustBadge: "social",
        publishedAt: s.created_at || new Date().toISOString(),
        countryCode: "GL",
        ...hist,
      };
    });
  } catch (e) {
    console.error("Mastodon fetch error:", e);
    return [];
  }
}

// ── Cache ──
let cachedResponse: { data: string; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
      return new Response(cachedResponse.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const [redditItems, blueskyItems, mastodonItems] = await Promise.all([
      fetchReddit(),
      fetchBluesky(),
      fetchMastodon(),
    ]);

    console.log(`fetch-reddit-bluesky-mastodon: ${redditItems.length} Reddit, ${blueskyItems.length} Bluesky, ${mastodonItems.length} Mastodon`);

    const trends = [...redditItems, ...blueskyItems, ...mastodonItems];
    const body = JSON.stringify({ trends });
    cachedResponse = { data: body, timestamp: Date.now() };

    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-reddit-bluesky-mastodon error:", e);
    return new Response(JSON.stringify({ error: "Failed", trends: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

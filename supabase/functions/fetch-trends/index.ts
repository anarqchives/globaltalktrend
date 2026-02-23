import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  limited?: boolean;
  details?: string;
}

async function fetchYouTubeTrends(): Promise<TrendItem[]> {
  const API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!API_KEY) {
    console.error("YOUTUBE_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=BR&maxResults=5&key=${API_KEY}`
    );
    if (!res.ok) {
      console.error("YouTube API error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();

    return (data.items || []).map((item: any) => {
      const views = parseInt(item.statistics?.viewCount || "0", 10);
      return {
        icon: "▶",
        platform: "YouTube",
        title: item.snippet?.title || "Sem título",
        category: item.snippet?.categoryId === "25" ? "Notícias" : "Entretenimento",
        time: "agora",
        volume: views >= 1_000_000
          ? `${(views / 1_000_000).toFixed(1)}M views`
          : `${(views / 1_000).toFixed(0)}K views`,
        change: "+trending",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: item.snippet?.description?.slice(0, 200) || "",
      };
    });
  } catch (e) {
    console.error("YouTube fetch error:", e);
    return [];
  }
}

async function fetchRedditTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch("https://old.reddit.com/r/all/hot.json?limit=5&raw_json=1", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrendSphere/1.0; +https://trendsphere.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      console.error("Reddit API error:", res.status, await res.text());
      return [];
    }
    const data = await res.json();

    return (data.data?.children || []).map((child: any) => {
      const post = child.data;
      const ups = post.ups || 0;
      return {
        icon: "💬",
        platform: "Reddit",
        title: post.title?.slice(0, 100) || "Sem título",
        category: `r/${post.subreddit}`,
        time: "agora",
        volume: ups >= 1000
          ? `${(ups / 1000).toFixed(1)}K upvotes`
          : `${ups} upvotes`,
        change: `+${post.upvote_ratio ? Math.round(post.upvote_ratio * 100) : 0}%`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10)),
        details: post.selftext?.slice(0, 200) || `${post.num_comments} comentários · ${post.subreddit_name_prefixed}`,
      };
    });
  } catch (e) {
    console.error("Reddit fetch error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [youtube, reddit] = await Promise.all([
      fetchYouTubeTrends(),
      fetchRedditTrends(),
    ]);

    const trends = [...youtube, ...reddit];

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch trends", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

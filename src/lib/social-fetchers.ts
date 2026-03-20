/**
 * Client-side social media fetchers — extracted from use-trends.ts
 */
import { TrendCardProps } from "@/components/TrendCard";

function generateHistorical(baseValue: number, label: string) {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

export { generateHistorical };

export async function fetchRedditClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=8", {
      headers: { "User-Agent": "TrendSphere/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child: { data: Record<string, unknown> }) => {
      const post = child.data;
      const ups = (post.ups as number) || 0;
      const comments = (post.num_comments as number) || 0;
      const { historicalData, metricLabel } = generateHistorical(ups / 24, "upvotes/hora");
      const rawThumb = post.thumbnail as string;
      const thumbnail = rawThumb && rawThumb.startsWith("http") ? rawThumb : "";
      return {
        icon: "💬", platform: "Reddit", title: ((post.title as string) || "Sem título").slice(0, 100),
        category: `r/${post.subreddit}`, time: "agora",
        volume: ups >= 1000 ? `${(ups / 1000).toFixed(1)}K` : `${ups}`,
        change: `+${post.upvote_ratio ? Math.round((post.upvote_ratio as number) * 100) : 0}%`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10)),
        details: ((post.selftext as string) || "").slice(0, 200) || `${comments} comentários`,
        description: ((post.selftext as string) || "").slice(0, 150) || "",
        commentCount: comments,
        sourceUrl: `https://www.reddit.com${post.permalink}`,
        thumbnail, publishedAt: post.created_utc ? new Date((post.created_utc as number) * 1000).toISOString() : "",
        historicalData, metricLabel,
      };
    });
  } catch { return []; }
}

export async function fetchBlueskyClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPopularFeedGenerators?limit=8");
    const mapFeeds = (data: { feeds?: Array<Record<string, unknown>> }) => {
      return (data.feeds || []).slice(0, 5).map((feed) => {
        const likes = (feed.likeCount as number) || 0;
        const { historicalData, metricLabel } = generateHistorical(likes / 24, "likes/hora");
        const creator = feed.creator as Record<string, unknown> | undefined;
        return {
          icon: "🦋", platform: "Bluesky", title: (feed.displayName as string) || "Feed popular",
          category: "Social", time: "agora",
          volume: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K likes` : `${likes} likes`,
          change: "+trending", changePositive: true,
          sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
          details: ((feed.description as string) || "").slice(0, 200) || "",
          sourceUrl: feed.uri ? `https://bsky.app/profile/${(creator?.handle as string) || ""}` : "",
          countryCode: "US", historicalData, metricLabel,
        };
      });
    };

    if (!res.ok) {
      const res2 = await fetch("https://public.api.bsky.app/xrpc/app.bsky.unspecced.getPopularFeedGenerators?limit=8");
      if (!res2.ok) return [];
      return mapFeeds(await res2.json());
    }
    return mapFeeds(await res.json());
  } catch { return []; }
}

export async function fetchMastodonClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://mastodon.social/api/v1/trends/statuses?limit=5");
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((status: Record<string, unknown>) => {
      const reblogs = (status.reblogs_count as number) || 0;
      const favs = (status.favourites_count as number) || 0;
      const { historicalData, metricLabel } = generateHistorical((reblogs + favs) / 24, "interações/hora");
      const content = ((status.content as string) || "").replace(/<[^>]*>/g, "").slice(0, 100);
      return {
        icon: "🐘", platform: "Mastodon", title: content || "Post em alta",
        category: "Fediverso", time: "agora",
        volume: `${reblogs + favs >= 1000 ? `${((reblogs + favs) / 1000).toFixed(1)}K` : reblogs + favs} interações`,
        change: `+${reblogs} boosts`, changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: content, sourceUrl: (status.url as string) || (status.uri as string) || "",
        countryCode: "US", historicalData, metricLabel,
      };
    });
  } catch { return []; }
}

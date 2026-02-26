import { useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";

export interface CrossPlatformCluster {
  topic: string;
  trends: TrendCardProps[];
  platforms: string[];
  platformCount: number;
  totalVolume: number;
  propagationOrigin: string;
  propagationPath: { from: string; to: string }[];
  sentimentByPlatform: Record<string, "neutral" | "positive" | "negative">;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size);
}

function inferSentiment(platform: string): "neutral" | "positive" | "negative" {
  // Heuristic: press tends neutral, social tends polarized
  const pressLike = ["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian", "BBC", "Reuters", "AP"];
  const socialLike = ["Reddit", "Bluesky", "Mastodon", "X (Twitter)"];
  if (pressLike.some(p => platform.includes(p))) return "neutral";
  if (socialLike.some(p => platform.includes(p))) return "positive"; // simplified
  return "neutral";
}

function getPlatformType(platform: string): string {
  const social = ["Reddit", "Bluesky", "Mastodon", "X (Twitter)", "YouTube"];
  const press = ["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian", "BBC", "Reuters", "AP", "NPR"];
  const search = ["Google Trends"];
  const science = ["OpenAlex", "arXiv"];
  const official = ["World Bank", "IBGE"];
  
  if (social.some(s => platform.includes(s))) return "social";
  if (press.some(p => platform.includes(p))) return "press";
  if (search.some(s => platform.includes(s))) return "search";
  if (science.some(s => platform.includes(s))) return "science";
  if (official.some(o => platform.includes(o))) return "official";
  return "other";
}

export function detectCrossPlatform(trends: TrendCardProps[]): CrossPlatformCluster[] {
  // Group trends by similar titles
  const clusters: { key: string; trends: TrendCardProps[] }[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < trends.length; i++) {
    if (assigned.has(i)) continue;
    const normI = normalizeTitle(trends[i].title);
    const cluster = [trends[i]];
    assigned.add(i);

    for (let j = i + 1; j < trends.length; j++) {
      if (assigned.has(j)) continue;
      const normJ = normalizeTitle(trends[j].title);
      if (similarity(normI, normJ) > 0.4) {
        cluster.push(trends[j]);
        assigned.add(j);
      }
    }

    if (cluster.length > 1) {
      const platformTypes = new Set(cluster.map(t => getPlatformType(t.platform)));
      if (platformTypes.size >= 2) {
        clusters.push({ key: normI, trends: cluster });
      }
    }
  }

  return clusters.map(c => {
    const platforms = [...new Set(c.trends.map(t => t.platform))];
    const platformTypes = [...new Set(c.trends.map(t => getPlatformType(t.platform)))];
    
    // Propagation path: sort by publishedAt or firstSeenAt
    const sorted = [...c.trends].sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.firstSeenAt || 0).getTime();
      const dateB = new Date(b.publishedAt || b.firstSeenAt || 0).getTime();
      return dateA - dateB;
    });

    const propagationPath: { from: string; to: string }[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevType = getPlatformType(sorted[i - 1].platform);
      const currType = getPlatformType(sorted[i].platform);
      if (prevType !== currType) {
        propagationPath.push({ from: prevType, to: currType });
      }
    }

    const sentimentByPlatform: Record<string, "neutral" | "positive" | "negative"> = {};
    for (const t of c.trends) {
      const type = getPlatformType(t.platform);
      if (!sentimentByPlatform[type]) {
        sentimentByPlatform[type] = inferSentiment(t.platform);
      }
    }

    const totalVolume = c.trends.reduce((sum, t) => {
      const num = parseInt((t.volume || "0").replace(/[^0-9]/g, "")) || 0;
      return sum + num;
    }, 0);

    return {
      topic: c.trends[0].title,
      trends: c.trends,
      platforms,
      platformCount: platformTypes.length,
      totalVolume,
      propagationOrigin: getPlatformType(sorted[0]?.platform || ""),
      propagationPath,
      sentimentByPlatform,
    };
  }).sort((a, b) => b.platformCount - a.platformCount || b.totalVolume - a.totalVolume).slice(0, 20);
}

/** Returns a Set of trend titles (lowercase, 50-char key) that are multiplatform */
export function getMultiplatformTitles(trends: TrendCardProps[]): Set<string> {
  const clusters = detectCrossPlatform(trends);
  const titles = new Set<string>();
  for (const c of clusters) {
    for (const t of c.trends) {
      titles.add(normalizeTitle(t.title));
    }
  }
  return titles;
}

export function useCrossPlatform(trends: TrendCardProps[]) {
  const clusters = useMemo(() => detectCrossPlatform(trends), [trends]);
  const multiplatformTitles = useMemo(() => {
    const titles = new Set<string>();
    for (const c of clusters) {
      for (const t of c.trends) {
        titles.add(normalizeTitle(t.title));
      }
    }
    return titles;
  }, [clusters]);

  return { clusters, multiplatformTitles };
}

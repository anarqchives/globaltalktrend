import { useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";

export interface CriticalMoment {
  trend: TrendCardProps;
  score: number;
  reasons: string[];
  changePercent: number;
  // Enriched data
  mediaTypes: string[];
  platformCount: number;
  countryCount: number;
  relatedTrends: TrendCardProps[];
  prediction: string;
  predictionEmoji: string;
  riskLevel: "extreme" | "high" | "moderate";
  summary: string;
}

function parseChangePercent(change: string): number {
  if (!change) return 0;
  const match = change.match(/[+-]?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function parseVolume(vol: string): number {
  if (!vol) return 0;
  const clean = vol.replace(/[^0-9kKmMbB.,]/g, "");
  const lower = clean.toLowerCase();
  if (lower.includes("b")) return parseFloat(lower) * 1_000_000_000;
  if (lower.includes("m")) return parseFloat(lower) * 1_000_000;
  if (lower.includes("k")) return parseFloat(lower) * 1_000;
  return parseFloat(clean) || 0;
}

function getMediaType(platform: string): string {
  const p = platform.toLowerCase();
  if (["reddit", "twitter", "x", "bluesky", "mastodon", "tiktok"].some(s => p.includes(s))) return "social";
  if (["newsapi", "newsdata", "gnews", "bing news", "guardian", "bbc", "reuters", "nyt", "ap", "npr"].some(s => p.includes(s))) return "press";
  if (["google trends", "serpapi", "google"].some(s => p.includes(s))) return "search";
  if (["youtube"].some(s => p.includes(s))) return "video";
  if (["wikipedia", "hacker news", "stack"].some(s => p.includes(s))) return "community";
  if (["gdelt", "webz"].some(s => p.includes(s))) return "data";
  return "other";
}

const mediaTypeLabels: Record<string, string> = {
  social: "Redes Sociais",
  press: "Imprensa",
  search: "Buscas",
  video: "Vídeo",
  community: "Comunidades",
  data: "Dados Abertos",
  other: "Outros",
};

const mediaTypeEmojis: Record<string, string> = {
  social: "💬",
  press: "📰",
  search: "🔍",
  video: "🎬",
  community: "👥",
  data: "📊",
  other: "📌",
};

function generatePrediction(
  changePercent: number,
  platformCount: number,
  countryCount: number,
  mediaTypes: string[],
  trend: TrendCardProps
): { text: string; emoji: string } {
  const hasPress = mediaTypes.includes("press");
  const hasSocial = mediaTypes.includes("social");
  const hasSearch = mediaTypes.includes("search");
  const hasVideo = mediaTypes.includes("video");

  if (changePercent > 300 && platformCount >= 3) {
    return { text: "Viral global iminente — pico previsto nas próximas 2-4h com cobertura massiva.", emoji: "🚀" };
  }
  if (hasPress && hasSocial && changePercent > 150) {
    return { text: "Convergência imprensa-social ativa — tema deve dominar o ciclo noticioso nas próximas 6h.", emoji: "⚡" };
  }
  if (countryCount >= 3 && changePercent > 100) {
    return { text: "Propagação internacional detectada — provável intensificação em novas regiões nas próximas 12h.", emoji: "🌍" };
  }
  if (hasSocial && hasSearch && changePercent > 80) {
    return { text: "Interesse público crescente — migração de busca para debate social em andamento.", emoji: "📈" };
  }
  if (hasVideo && changePercent > 60) {
    return { text: "Conteúdo visual em alta — potencial de viralização por vídeo nas próximas horas.", emoji: "🎥" };
  }
  if (platformCount >= 2 && changePercent > 50) {
    return { text: "Tendência multiplataforma estável — crescimento orgânico deve continuar por 6-12h.", emoji: "📊" };
  }
  return { text: "Sinal em monitoramento — pode ganhar tração dependendo de novos eventos.", emoji: "👁️" };
}

function generateSummary(
  trend: TrendCardProps,
  changePercent: number,
  mediaTypes: string[],
  platformCount: number,
  countryCount: number
): string {
  const parts: string[] = [];
  const title = trend.title.slice(0, 60);

  if (changePercent > 200) {
    parts.push(`"${title}" explodiu com +${Math.round(changePercent)}% de crescimento`);
  } else if (changePercent > 100) {
    parts.push(`"${title}" está em forte aceleração (+${Math.round(changePercent)}%)`);
  } else {
    parts.push(`"${title}" mostra atividade significativa (+${Math.round(changePercent)}%)`);
  }

  if (platformCount > 1) {
    const typeNames = mediaTypes.map(t => mediaTypeLabels[t] || t).slice(0, 3);
    parts.push(`sendo discutido em ${platformCount} plataformas (${typeNames.join(", ")})`);
  }

  if (countryCount > 1) {
    parts.push(`com alcance em ${countryCount} países`);
  }

  return parts.join(", ") + ".";
}

export function detectCriticalMoments(trends: TrendCardProps[]): CriticalMoment[] {
  const results: CriticalMoment[] = [];

  // Group by normalized title
  const titleMap = new Map<string, TrendCardProps[]>();
  for (const t of trends) {
    const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 40);
    if (!titleMap.has(key)) titleMap.set(key, []);
    titleMap.get(key)!.push(t);
  }

  const titleCountryMap = new Map<string, Set<string>>();
  for (const t of trends) {
    const key = t.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 40);
    if (!titleCountryMap.has(key)) titleCountryMap.set(key, new Set());
    if (t.countryCode) titleCountryMap.get(key)!.add(t.countryCode);
  }

  // Track already-processed keys to avoid duplicates
  const processedKeys = new Set<string>();

  for (const trend of trends) {
    const key = trend.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 40);
    if (processedKeys.has(key)) continue;

    const changePercent = parseChangePercent(trend.change);
    const reasons: string[] = [];
    const sameTitleTrends = titleMap.get(key) || [];
    const uniquePlatforms = new Set(sameTitleTrends.map(t => t.platform));
    const mediaTypes = [...new Set(sameTitleTrends.map(t => getMediaType(t.platform)))];
    const countries = titleCountryMap.get(key);
    const countryCount = countries?.size || (trend.countryCode ? 1 : 0);
    const platformCount = uniquePlatforms.size;
    const volume = parseVolume(trend.volume);

    // Factor 1: Volume spike > 150%
    if (changePercent > 150) reasons.push("volumeSpike");

    // Factor 2: High growth rate > 80%
    if (changePercent > 80) reasons.push("acceleration");

    // Factor 3: Multiple sources
    if (platformCount > 1) reasons.push("multiSource");

    // Factor 4: Media type diversity (press + social, etc.)
    if (mediaTypes.length >= 2) reasons.push("mediaDiversity");

    // Factor 5: Geographic spread
    if (countryCount > 2) reasons.push("geographicSpread");

    // Factor 6: Verified source with notable change
    if (trend.trustBadge && ["official", "international", "press"].includes(trend.trustBadge)) {
      if (changePercent > 30) reasons.push("verifiedSource");
    }

    // Factor 7: High absolute volume
    if (volume > 50000) reasons.push("highVolume");

    // Factor 8: Has description/context (richer data)
    if (trend.description && trend.description.length > 30) reasons.push("richContext");

    const score = reasons.length;
    if (score >= 2) {
      processedKeys.add(key);

      // Pick the best trend (highest change or volume) as representative
      const bestTrend = sameTitleTrends.reduce((best, t) => {
        const cp = parseChangePercent(t.change);
        const bcp = parseChangePercent(best.change);
        return cp > bcp ? t : best;
      }, trend);

      const prediction = generatePrediction(changePercent, platformCount, countryCount, mediaTypes, bestTrend);
      const summary = generateSummary(bestTrend, changePercent, mediaTypes, platformCount, countryCount);

      const riskLevel: "extreme" | "high" | "moderate" =
        score >= 5 ? "extreme" : score >= 3 ? "high" : "moderate";

      results.push({
        trend: bestTrend,
        score,
        reasons,
        changePercent,
        mediaTypes,
        platformCount,
        countryCount,
        relatedTrends: sameTitleTrends.filter(t => t !== bestTrend).slice(0, 4),
        prediction: prediction.text,
        predictionEmoji: prediction.emoji,
        riskLevel,
        summary,
      });
    }
  }

  results.sort((a, b) => b.score - a.score || b.changePercent - a.changePercent);
  return results.slice(0, 12);
}

export function useCriticalMoments(trends: TrendCardProps[]) {
  return useMemo(() => detectCriticalMoments(trends), [trends]);
}

export { mediaTypeLabels, mediaTypeEmojis, getMediaType };

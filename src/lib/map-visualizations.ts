import { TrendCardProps } from "@/components/TrendCard";

// ─── Jaccard similarity for trend title matching ───
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-záàâãéèêíïóôõúüç\w\s]/gi, "").split(/\s+/).filter(w => w.length > 2)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(t => { if (setB.has(t)) intersection++; });
  return intersection / (setA.size + setB.size - intersection);
}

// ─── Sentiment heuristic from trend data ───
export type Sentiment = "positive" | "negative" | "mixed" | "neutral";

const negativeCategoryKeywords = /polít|crisis|war|guerra|conflict|protest|scandal|escândalo|morte|death|ataque|attack/i;
const positiveCategoryKeywords = /launch|lançamento|innovation|inovação|award|prêmio|discover|descober|record|recorde|victory|vitória/i;

export function deriveSentiment(trend: TrendCardProps): Sentiment {
  const title = trend.title.toLowerCase();
  const change = parseFloat(String(trend.change).replace(/[^0-9.-]/g, "")) || 0;

  const hasNeg = negativeCategoryKeywords.test(title);
  const hasPos = positiveCategoryKeywords.test(title);

  if (hasNeg && hasPos) return "mixed";
  if (hasNeg) return "negative";
  if (hasPos) return "positive";
  if (trend.category === "Geopolítica" || trend.category === "Política") return change > 50 ? "mixed" : "neutral";
  if (trend.category === "Tecnologia" || trend.category === "Ciência") return "positive";
  if (change > 100) return "mixed";
  return "neutral";
}

export const sentimentColors: Record<Sentiment, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  mixed: "#f59e0b",
  neutral: "#94a3b8",
};

// ─── Flow Map: find cross-country trend propagation ───
export interface FlowArc {
  originId: string;
  originName: string;
  destId: string;
  destName: string;
  trendTitle: string;
  similarity: number;
  volume: number;
  sentiment: Sentiment;
  timeDelta: number; // hours estimate
}

interface CountryPoint { id: string; name: string; lat: number; lng: number; }

export function computeFlowArcs(
  trends: TrendCardProps[],
  countryPoints: CountryPoint[],
  minSimilarity = 0.55
): FlowArc[] {
  const byCountry = new Map<string, TrendCardProps[]>();
  trends.forEach(t => {
    if (!t.countryCode) return;
    const arr = byCountry.get(t.countryCode) || [];
    arr.push(t);
    byCountry.set(t.countryCode, arr);
  });

  const countryCodes = [...byCountry.keys()];
  const arcs: FlowArc[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < countryCodes.length; i++) {
    for (let j = i + 1; j < countryCodes.length; j++) {
      const a = countryCodes[i];
      const b = countryCodes[j];
      const trendsA = byCountry.get(a) || [];
      const trendsB = byCountry.get(b) || [];

      for (const tA of trendsA) {
        for (const tB of trendsB) {
          const sim = jaccardSimilarity(tA.title, tB.title);
          if (sim < minSimilarity) continue;
          const key = [a, b, tA.title.slice(0, 20)].sort().join("|");
          if (seen.has(key)) continue;
          seen.add(key);

          const volA = parseInt(String(tA.volume).replace(/[^0-9]/g, "")) || 0;
          const volB = parseInt(String(tB.volume).replace(/[^0-9]/g, "")) || 0;
          const origin = volA >= volB ? a : b;
          const dest = origin === a ? b : a;
          const originTrend = origin === a ? tA : tB;

          const cpOrigin = countryPoints.find(c => c.id === origin);
          const cpDest = countryPoints.find(c => c.id === dest);
          if (!cpOrigin || !cpDest) continue;

          // Estimate time delta from volume difference (heuristic)
          const ratio = Math.min(volA, volB) / Math.max(volA, volB, 1);
          const timeDelta = Math.round((1 - ratio) * 8 * 10) / 10; // 0-8 hours

          arcs.push({
            originId: origin,
            originName: cpOrigin.name,
            destId: dest,
            destName: cpDest.name,
            trendTitle: originTrend.title,
            similarity: sim,
            volume: Math.max(volA, volB),
            sentiment: deriveSentiment(originTrend),
            timeDelta,
          });
        }
      }
    }
  }

  // Sort by volume descending, limit to top 30 arcs for performance
  return arcs.sort((a, b) => b.volume - a.volume).slice(0, 30);
}

// ─── Sentiment Bubble Map: aggregate sentiment per country ───
export interface SentimentBubble {
  countryId: string;
  countryName: string;
  volume: number;
  growth: number; // avg change %
  sentiment: { positive: number; neutral: number; negative: number; mixed: number };
  dominantSentiment: Sentiment;
  topTrends: { title: string; sentiment: Sentiment }[];
  trendCount: number;
}

export function computeSentimentBubbles(
  trends: TrendCardProps[],
  countryPoints: CountryPoint[]
): SentimentBubble[] {
  const byCountry = new Map<string, TrendCardProps[]>();
  trends.forEach(t => {
    if (!t.countryCode) return;
    const arr = byCountry.get(t.countryCode) || [];
    arr.push(t);
    byCountry.set(t.countryCode, arr);
  });

  const bubbles: SentimentBubble[] = [];

  byCountry.forEach((countryTrends, countryId) => {
    const cp = countryPoints.find(c => c.id === countryId);
    if (!cp) return;

    let totalVol = 0;
    let totalChange = 0;
    const sentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };

    const trendSentiments: { title: string; sentiment: Sentiment }[] = [];

    countryTrends.forEach(t => {
      const vol = parseInt(String(t.volume).replace(/[^0-9]/g, "")) || 0;
      totalVol += vol;
      totalChange += parseFloat(String(t.change).replace(/[^0-9.-]/g, "")) || 0;
      const s = deriveSentiment(t);
      sentCounts[s]++;
      trendSentiments.push({ title: t.title, sentiment: s });
    });

    const total = countryTrends.length || 1;
    const sentRatios = {
      positive: sentCounts.positive / total,
      neutral: sentCounts.neutral / total,
      negative: sentCounts.negative / total,
      mixed: sentCounts.mixed / total,
    };

    // Dominant sentiment
    let dominant: Sentiment = "neutral";
    let maxRatio = 0;
    (Object.entries(sentRatios) as [Sentiment, number][]).forEach(([s, r]) => {
      if (r > maxRatio) { maxRatio = r; dominant = s; }
    });
    // If polarized (high pos AND neg), mark as mixed
    if (sentRatios.positive > 0.25 && sentRatios.negative > 0.25) dominant = "mixed";

    bubbles.push({
      countryId,
      countryName: cp.name,
      volume: totalVol,
      growth: total > 0 ? totalChange / total : 0,
      sentiment: sentRatios,
      dominantSentiment: dominant,
      topTrends: trendSentiments.slice(0, 3),
      trendCount: countryTrends.length,
    });
  });

  return bubbles;
}

// ─── Curve interpolation for flow arcs ───
export function computeCurvePoints(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  numPoints = 50
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset for curve
  const offset = dist * 0.2;
  const ctrlLat = midLat + (-dx / dist) * offset;
  const ctrlLng = midLng + (dy / dist) * offset;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    points.push({ lat, lng });
  }
  return points;
}

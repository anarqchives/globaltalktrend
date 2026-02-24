import { useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";

export interface CriticalMoment {
  trend: TrendCardProps;
  score: number;
  reasons: string[];
  changePercent: number;
}

function parseChangePercent(change: string): number {
  if (!change) return 0;
  const match = change.match(/[+-]?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export function detectCriticalMoments(trends: TrendCardProps[]): CriticalMoment[] {
  const results: CriticalMoment[] = [];

  // Count occurrences of similar titles across platforms
  const titleMap = new Map<string, TrendCardProps[]>();
  for (const t of trends) {
    const key = t.title.toLowerCase().slice(0, 40);
    if (!titleMap.has(key)) titleMap.set(key, []);
    titleMap.get(key)!.push(t);
  }

  // Count per country
  const titleCountryMap = new Map<string, Set<string>>();
  for (const t of trends) {
    const key = t.title.toLowerCase().slice(0, 40);
    if (!titleCountryMap.has(key)) titleCountryMap.set(key, new Set());
    if (t.countryCode) titleCountryMap.get(key)!.add(t.countryCode);
  }

  for (const trend of trends) {
    const key = trend.title.toLowerCase().slice(0, 40);
    const changePercent = parseChangePercent(trend.change);
    const reasons: string[] = [];

    // Factor 1: Volume spike > 200%
    if (changePercent > 200) reasons.push("volumeSpike");

    // Factor 2: High growth rate > 100%
    if (changePercent > 100) reasons.push("acceleration");

    // Factor 3: Multiple sources (same title on different platforms)
    const sameTitleTrends = titleMap.get(key) || [];
    const uniquePlatforms = new Set(sameTitleTrends.map(t => t.platform));
    if (uniquePlatforms.size > 2) reasons.push("multiSource");

    // Factor 4: Geographic spread
    const countries = titleCountryMap.get(key);
    if (countries && countries.size > 3) reasons.push("geographicSpread");

    // Factor 5: Has trust badge (verified/official source reporting = more weight)
    if (trend.trustBadge && ["official", "international", "press"].includes(trend.trustBadge)) {
      if (changePercent > 50) reasons.push("verifiedSource");
    }

    const score = reasons.length;
    if (score >= 2) {
      results.push({ trend, score, reasons, changePercent });
    }
  }

  // Sort by score desc, then by change percent desc
  results.sort((a, b) => b.score - a.score || b.changePercent - a.changePercent);

  return results.slice(0, 10);
}

export function useCriticalMoments(trends: TrendCardProps[]) {
  return useMemo(() => detectCriticalMoments(trends), [trends]);
}

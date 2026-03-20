/**
 * Watchlist feed enrichment — extracted from Index.tsx
 * Computes watchlist items enriched with current scores + deltas.
 */
import { useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";
import { PriorityResult } from "@/lib/priority-engine";
import { WatchlistItem } from "@/hooks/use-watchlist";

export interface WatchlistFeedItem extends WatchlistItem {
  currentScore?: number;
  currentVolume?: string;
  currentChange?: string;
  scoreDelta?: number;
  lifecycle?: PriorityResult["lifecycle"];
  isActive: boolean;
}

export function useWatchlistFeed(
  watchlist: WatchlistItem[],
  diversifiedTrends: Array<{ trend: TrendCardProps; priority: PriorityResult }>
): WatchlistFeedItem[] {
  return useMemo(() => {
    return watchlist.map(w => {
      const currentTrend = diversifiedTrends.find(
        s => s.trend.title === w.title || (s.trend.platform === w.platform && s.trend.title.includes(w.title.slice(0, 20)))
      );
      if (currentTrend) {
        const scoreDelta = w.lastScore !== undefined ? currentTrend.priority.score - w.lastScore : undefined;
        return {
          ...w,
          currentScore: currentTrend.priority.score,
          currentVolume: currentTrend.trend.volume,
          currentChange: currentTrend.trend.change,
          scoreDelta,
          lifecycle: currentTrend.priority.lifecycle,
          isActive: true,
        };
      }
      return { ...w, isActive: false, currentScore: undefined, scoreDelta: undefined, lifecycle: undefined };
    });
  }, [watchlist, diversifiedTrends]);
}

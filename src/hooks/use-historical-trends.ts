import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "@/components/TrendCard";
import { categorizeTrend } from "@/lib/categorize-trend";

interface SnapshotRow {
  title: string;
  platform: string;
  category: string | null;
  country_code: string | null;
  volume_raw: number | null;
  change_percent: number | null;
  snapshot_at: string;
  metadata: unknown;
}

/**
 * Compute a relevance score for a trend based on:
 * - Volume (normalized)
 * - Recency (how recent is the latest snapshot)
 * - Peak proximity (is it near its peak?)
 */
function computeRelevanceScore(
  volumeRaw: number,
  maxVolume: number,
  latestSnapshotAt: Date,
  peakSnapshotAt: Date,
  now: Date
): number {
  // Volume score (0-40)
  const volumeScore = maxVolume > 0 ? (volumeRaw / maxVolume) * 40 : 0;

  // Recency score (0-40) — exponential decay over 24h
  const ageMs = now.getTime() - latestSnapshotAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 40 * Math.exp(-ageHours / 6));

  // Peak proximity score (0-20) — how close to peak
  const peakAgeMs = now.getTime() - peakSnapshotAt.getTime();
  const peakAgeHours = peakAgeMs / (1000 * 60 * 60);
  const peakScore = Math.max(0, 20 * Math.exp(-peakAgeHours / 4));

  return volumeScore + recencyScore + peakScore;
}

/**
 * Fetches trends from the last 24h of snapshots and converts them to
 * TrendCardProps with temporal metadata (firstSeenAt, peakAt, relevanceScore).
 */
export function useHistoricalTrends() {
  const fetchHistorical = useCallback(async (): Promise<TrendCardProps[]> => {
    try {
      const { data, error } = await supabase
        .from("trend_snapshots")
        .select("title, platform, category, country_code, volume_raw, change_percent, snapshot_at, metadata")
        .gte("snapshot_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("snapshot_at", { ascending: false })
        .limit(1000);

      if (error || !data || data.length === 0) return [];

      const rows = data as unknown as SnapshotRow[];

      // Group by title+platform
      const grouped = new Map<string, SnapshotRow[]>();
      for (const row of rows) {
        const key = `${row.title}||${row.platform}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }

      // Find global max volume for normalization
      const allVolumes = rows.map((r) => r.volume_raw || 0);
      const maxVolume = Math.max(...allVolumes, 1);
      const now = new Date();

      const historicalTrends: TrendCardProps[] = [];

      for (const [, snapshots] of grouped) {
        // Sort by time ascending
        snapshots.sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime());

        const latest = snapshots[snapshots.length - 1];
        const earliest = snapshots[0];

        // Find peak snapshot
        let peakSnapshot = snapshots[0];
        for (const s of snapshots) {
          if ((s.volume_raw || 0) > (peakSnapshot.volume_raw || 0)) {
            peakSnapshot = s;
          }
        }

        const latestDate = new Date(latest.snapshot_at);
        const peakDate = new Date(peakSnapshot.snapshot_at);
        const firstDate = new Date(earliest.snapshot_at);

        const score = computeRelevanceScore(
          latest.volume_raw || 0,
          maxVolume,
          latestDate,
          peakDate,
          now
        );

        // Build historical data from snapshots
        const historicalData = snapshots.map((s) => ({
          hour: new Date(s.snapshot_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          value: s.volume_raw || 0,
        }));

        // Format volume
        const vol = latest.volume_raw || 0;
        const volumeStr = vol >= 1_000_000
          ? `${(vol / 1_000_000).toFixed(1)}M`
          : vol >= 1_000
            ? `${(vol / 1_000).toFixed(1)}K`
            : `${vol}`;

        const meta = (latest.metadata || {}) as Record<string, string>;

        // Re-categorize using the unified categorizer (snapshots may have raw categories)
        const normalizedCategory = categorizeTrend(latest.title, latest.platform, latest.category || undefined) || "Geral";
        const normalizedCountry = latest.country_code ? latest.country_code.toUpperCase().slice(0, 2) : undefined;

        historicalTrends.push({
          icon: getPlatformIcon(latest.platform),
          platform: latest.platform,
          title: latest.title,
          category: normalizedCategory,
          time: formatRelativeTime(latestDate, now),
          volume: volumeStr,
          change: latest.change_percent ? `${latest.change_percent > 0 ? "+" : ""}${latest.change_percent.toFixed(0)}%` : "+0%",
          changePositive: (latest.change_percent || 0) >= 0,
          sparkData: snapshots.slice(-10).map((s) => s.volume_raw || 0),
          details: "",
          countryCode: normalizedCountry,
          sourceUrl: meta.sourceUrl || undefined,
          trustBadge: meta.trustBadge || undefined,
          historicalData,
          metricLabel: "volume",
          firstSeenAt: firstDate.toISOString(),
          peakAt: peakDate.toISOString(),
          relevanceScore: Math.round(score * 10) / 10,
        });
      }

      // Sort by relevance score
      historicalTrends.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return historicalTrends;
    } catch (e) {
      console.error("Historical trends fetch error:", e);
      return [];
    }
  }, []);

  return { fetchHistorical };
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    YouTube: "▶",
    Reddit: "💬",
    "Google Trends": "🔍",
    Bluesky: "🦋",
    Mastodon: "🐘",
    "Hacker News": "🔶",
    Wikipedia: "📚",
    "Stack Overflow": "💻",
    GitHub: "🐙",
    "The Guardian": "🏛️",
    "World Bank": "🌐",
    IBGE: "🇧🇷",
    OpenAlex: "🔬",
  };
  return icons[platform] || "📰";
}

function formatRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

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

function computeRelevanceScore(
  volumeRaw: number,
  maxVolume: number,
  latestSnapshotAt: Date,
  peakSnapshotAt: Date,
  now: Date
): number {
  const volumeScore = maxVolume > 0 ? (volumeRaw / maxVolume) * 40 : 0;
  const ageMs = now.getTime() - latestSnapshotAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 40 * Math.exp(-ageHours / 6));
  const peakAgeMs = now.getTime() - peakSnapshotAt.getTime();
  const peakAgeHours = peakAgeMs / (1000 * 60 * 60);
  const peakScore = Math.max(0, 20 * Math.exp(-peakAgeHours / 4));
  return volumeScore + recencyScore + peakScore;
}

// ─── localStorage Historical Collector ──────────────────────────────
const HISTORICAL_STORAGE_KEY = "gtt_historical_24h";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredSnapshot {
  ts: number;
  trends: { title: string; platform: string; category: string; countryCode?: string; volume?: string; change?: string; details?: string; sourceUrl?: string; trustBadge?: string }[];
}

export function saveToHistoricalCollector(trends: TrendCardProps[]) {
  try {
    const stored = loadHistoricalCollector();
    const now = Date.now();
    
    // Add current batch
    stored.push({
      ts: now,
      trends: trends.slice(0, 80).map(t => ({
        title: t.title,
        platform: t.platform,
        category: t.category || "Geral",
        countryCode: t.countryCode,
        volume: t.volume,
        change: t.change,
        details: (t.details || "").slice(0, 150),
        sourceUrl: t.sourceUrl,
        trustBadge: t.trustBadge,
      })),
    });

    // Clean old data
    const filtered = stored.filter(s => now - s.ts < MAX_AGE_MS);

    // Keep max 20 snapshots
    const trimmed = filtered.slice(-20);
    localStorage.setItem(HISTORICAL_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

function loadHistoricalCollector(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORICAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredSnapshot[];
  } catch { return []; }
}

export function getFromHistoricalCollector(category?: string, country?: string): TrendCardProps[] {
  const stored = loadHistoricalCollector();
  const now = Date.now();
  
  // Flatten and deduplicate
  const seen = new Set<string>();
  const results: TrendCardProps[] = [];

  // Process newest first
  for (let i = stored.length - 1; i >= 0; i--) {
    const snapshot = stored[i];
    if (now - snapshot.ts > MAX_AGE_MS) continue;
    
    for (const t of snapshot.trends) {
      const key = `${t.title.toLowerCase().slice(0, 60)}||${t.platform}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Apply category filter
      const normalizedCat = t.category.toLowerCase().normalize("NFC").trim();
      if (category && category !== "Todas") {
        const filterCat = category.toLowerCase().normalize("NFC").trim();
        if (normalizedCat !== filterCat && !normalizedCat.startsWith(filterCat)) continue;
      }

      // Apply country filter
      if (country && country !== "global") {
        const tc = (t.countryCode || "GL").toUpperCase().slice(0, 2);
        if (tc !== "GL" && tc !== country.toUpperCase()) continue;
      }

      const ageMs = now - snapshot.ts;
      const ageMin = Math.floor(ageMs / 60000);
      const timeStr = ageMin < 60 ? `há ${ageMin}min` : `há ${Math.floor(ageMin / 60)}h`;

      results.push({
        icon: getPlatformIcon(t.platform),
        platform: t.platform,
        title: t.title,
        category: t.category,
        time: timeStr,
        volume: t.volume || "—",
        change: t.change || "+0%",
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
        details: `${t.details || ""}\n\n⏰ Dado do cache histórico local`,
        sourceUrl: t.sourceUrl,
        countryCode: t.countryCode,
        trustBadge: t.trustBadge,
        relevanceScore: Math.max(10, 50 - (ageMs / (60 * 60 * 1000)) * 3),
      });
    }
  }

  return results;
}

/**
 * Fetches trends from the last 24h of snapshots, optionally filtered by category.
 */
export function useHistoricalTrends() {
  const fetchHistorical = useCallback(async (filterCategory?: string): Promise<TrendCardProps[]> => {
    try {
      let query = supabase
        .from("trend_snapshots")
        .select("title, platform, category, country_code, volume_raw, change_percent, snapshot_at, metadata")
        .gte("snapshot_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("snapshot_at", { ascending: false })
        .limit(1000);

      // If filtering by category, also query by it for better DB-level results
      if (filterCategory && filterCategory !== "Todas") {
        query = query.eq("category", filterCategory);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) return [];

      const rows = data as unknown as SnapshotRow[];

      // Group by title+platform
      const grouped = new Map<string, SnapshotRow[]>();
      for (const row of rows) {
        const key = `${row.title}||${row.platform}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(row);
      }

      const allVolumes = rows.map((r) => r.volume_raw || 0);
      const maxVolume = Math.max(...allVolumes, 1);
      const now = new Date();

      const historicalTrends: TrendCardProps[] = [];

      for (const [, snapshots] of grouped) {
        snapshots.sort((a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime());

        const latest = snapshots[snapshots.length - 1];
        const earliest = snapshots[0];

        let peakSnapshot = snapshots[0];
        for (const s of snapshots) {
          if ((s.volume_raw || 0) > (peakSnapshot.volume_raw || 0)) peakSnapshot = s;
        }

        const latestDate = new Date(latest.snapshot_at);
        const peakDate = new Date(peakSnapshot.snapshot_at);
        const firstDate = new Date(earliest.snapshot_at);

        const score = computeRelevanceScore(latest.volume_raw || 0, maxVolume, latestDate, peakDate, now);

        const historicalData = snapshots.map((s) => ({
          hour: new Date(s.snapshot_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          value: s.volume_raw || 0,
        }));

        const vol = latest.volume_raw || 0;
        const volumeStr = vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `${(vol / 1_000).toFixed(1)}K` : `${vol}`;
        const meta = (latest.metadata || {}) as Record<string, string>;
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

      historicalTrends.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      return historicalTrends;
    } catch (e) {
      console.error("Historical trends fetch error:", e);
      return [];
    }
  }, []);

  /**
   * Fetch historical trends specifically for a category when live results are sparse.
   * This queries DB filtered by category for better targeted results.
   */
  const fetchCategoryFallback = useCallback(async (category: string, hoursBack: number = 24): Promise<TrendCardProps[]> => {
    try {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("trend_snapshots")
        .select("title, platform, category, country_code, volume_raw, change_percent, snapshot_at, metadata")
        .eq("category", category)
        .gte("snapshot_at", since)
        .order("volume_raw", { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) return [];

      const rows = data as unknown as SnapshotRow[];
      const now = new Date();
      const seen = new Set<string>();

      return rows
        .filter(r => {
          const key = r.title.toLowerCase().slice(0, 60);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(r => {
          const vol = r.volume_raw || 0;
          const volumeStr = vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `${(vol / 1_000).toFixed(1)}K` : `${vol}`;
          const meta = (r.metadata || {}) as Record<string, string>;
          return {
            icon: getPlatformIcon(r.platform),
            platform: r.platform,
            title: r.title,
            category: categorizeTrend(r.title, r.platform, r.category || undefined) || "Geral",
            time: formatRelativeTime(new Date(r.snapshot_at), now),
            volume: volumeStr,
            change: r.change_percent ? `${r.change_percent > 0 ? "+" : ""}${r.change_percent.toFixed(0)}%` : "+0%",
            changePositive: (r.change_percent || 0) >= 0,
            sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30)),
            details: `📂 Dado histórico (${formatRelativeTime(new Date(r.snapshot_at), now)})`,
            countryCode: r.country_code ? r.country_code.toUpperCase().slice(0, 2) : undefined,
            sourceUrl: meta.sourceUrl,
            trustBadge: meta.trustBadge,
            relevanceScore: 30 + Math.random() * 20,
          };
        });
    } catch (e) {
      console.error("Category fallback error:", e);
      return [];
    }
  }, []);

  return { fetchHistorical, fetchCategoryFallback };
}

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    YouTube: "▶", Reddit: "💬", "Google Trends": "🔍", Bluesky: "🦋",
    Mastodon: "🐘", "Hacker News": "🔶", Wikipedia: "📚", "Stack Overflow": "💻",
    GitHub: "🐙", "The Guardian": "🏛️", "World Bank": "🌐", IBGE: "🇧🇷", OpenAlex: "🔬",
    "New York Times": "🗽", NPR: "🎙️", "BBC News": "🇬🇧", "Deutsche Welle": "🇩🇪",
    "Le Monde": "🇫🇷", "El País": "🇪🇸", "Folha de S.Paulo": "🇧🇷",
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

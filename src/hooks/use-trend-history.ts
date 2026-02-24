import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SnapshotPoint {
  time: string;
  volume: number;
  change: number;
}

export interface SimilarTrend {
  title: string;
  platform: string;
  date: string;
  volume: number;
  change: number;
  similarity: number; // 0-100
}

export interface TrendHistoryData {
  evolution: SnapshotPoint[];
  similarTrends: SimilarTrend[];
  percentileRank: number; // 0-100 — how this trend ranks vs others in same category
  avgCategoryVolume: number;
  isAboveAverage: boolean;
  peakTime: string | null;
}

const CACHE_KEY = "gt_history_cache";
const CACHE_TTL = 1000 * 60 * 15; // 15 min

function getCached(key: string): TrendHistoryData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[key];
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCache(key: string, data: TrendHistoryData) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(cache);
    if (keys.length > 30) {
      keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, 10).forEach(k => delete cache[k]);
    }
    cache[key] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Simple word overlap similarity
function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
  return Math.round((overlap / Math.max(wordsA.size, wordsB.size)) * 100);
}

export function useTrendHistory() {
  const [historyData, setHistoryData] = useState<TrendHistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (title: string, platform: string, category?: string) => {
    const cacheKey = `${platform}::${title.slice(0, 50)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setHistoryData(cached);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch snapshots for this trend (evolution over time)
      const { data: snapshots } = await supabase
        .from("trend_snapshots")
        .select("snapshot_at, volume_raw, change_percent")
        .ilike("title", `%${title.slice(0, 40)}%`)
        .order("snapshot_at", { ascending: true })
        .limit(200);

      const evolution: SnapshotPoint[] = (snapshots || []).map(s => ({
        time: new Date(s.snapshot_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        volume: s.volume_raw || 0,
        change: Number(s.change_percent) || 0,
      }));

      // Find peak
      let peakTime: string | null = null;
      let peakVol = 0;
      evolution.forEach(e => { if (e.volume > peakVol) { peakVol = e.volume; peakTime = e.time; } });

      // 2. Fetch similar trends from same category (for comparison)
      const { data: categoryTrends } = await supabase
        .from("trend_snapshots")
        .select("title, platform, snapshot_at, volume_raw, change_percent")
        .eq("category", category || "Geral")
        .order("snapshot_at", { ascending: false })
        .limit(500);

      // Deduplicate by title and find similar
      const seenTitles = new Set<string>();
      const similarTrends: SimilarTrend[] = [];
      const allVolumes: number[] = [];

      for (const t of categoryTrends || []) {
        const vol = t.volume_raw || 0;
        allVolumes.push(vol);
        const tKey = t.title.toLowerCase().slice(0, 40);
        if (seenTitles.has(tKey)) continue;
        seenTitles.add(tKey);

        if (t.title.toLowerCase().slice(0, 40) === title.toLowerCase().slice(0, 40)) continue;

        const sim = titleSimilarity(title, t.title);
        if (sim >= 30) {
          similarTrends.push({
            title: t.title,
            platform: t.platform,
            date: new Date(t.snapshot_at).toLocaleDateString("pt-BR"),
            volume: vol,
            change: Number(t.change_percent) || 0,
            similarity: sim,
          });
        }
      }

      similarTrends.sort((a, b) => b.similarity - a.similarity);
      const topSimilar = similarTrends.slice(0, 5);

      // 3. Percentile rank
      const currentVol = evolution.length > 0 ? evolution[evolution.length - 1].volume : 0;
      const avgVol = allVolumes.length > 0 ? allVolumes.reduce((a, b) => a + b, 0) / allVolumes.length : 0;
      const belowCount = allVolumes.filter(v => v <= currentVol).length;
      const percentile = allVolumes.length > 0 ? Math.round((belowCount / allVolumes.length) * 100) : 50;

      const result: TrendHistoryData = {
        evolution,
        similarTrends: topSimilar,
        percentileRank: percentile,
        avgCategoryVolume: Math.round(avgVol),
        isAboveAverage: currentVol > avgVol,
        peakTime,
      };

      setCache(cacheKey, result);
      setHistoryData(result);
    } catch (err) {
      console.error("Trend history error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setHistoryData(null), []);

  return { historyData, loading, fetchHistory, reset };
}

import React, { useMemo } from "react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface RankingStripProps {
  trends: TrendCardProps[];
  onSelectTrend: (index: number) => void;
}

const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bbc": "imprensa", "reuters": "imprensa", "bloomberg": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "hacker news": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "fred": "dados_oficiais",
  "pubmed": "cientifico", "arxiv": "cientifico",
};

const RANK_BG: Record<string, string> = {
  imprensa: "#2557D6", redes_sociais: "#7C3AED", google_trends: "#D97706",
  dados_oficiais: "#059669", cientifico: "#0891B2",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) {
    if (p.includes(key)) return val;
  }
  return "imprensa";
}

const RankingStrip: React.FC<RankingStripProps> = ({ trends, onSelectTrend }) => {
  const { lang } = useLanguage();

  const topTrends = useMemo(() => {
    return trends
      .map((t, originalIndex) => {
        const volStr = (t.volume || "0").toLowerCase();
        let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
        if (volStr.includes("m")) vol *= 1_000_000;
        else if (volStr.includes("k")) vol *= 1_000;
        return { ...t, vol, originalIndex };
      })
      .filter(t => t.vol > 0)
      // Filter out generic YouTube
      .filter(t => !t.platform.toLowerCase().includes("youtube"))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 10);
  }, [trends]);

  if (topTrends.length === 0) return null;

  return (
    <div className="border-b border-border bg-card">
      <div className="px-3 pt-1.5 pb-0.5">
        <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {lang === "pt" ? "MAIS VISTOS AGORA" : "TRENDING NOW"}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2" style={{ scrollbarWidth: "none" }}>
        {topTrends.map((t, i) => {
          const srcType = getSourceType(t.platform);
          const rankBg = RANK_BG[srcType] || "#6B6560";
          return (
            <button key={i} onClick={() => onSelectTrend(t.originalIndex)}
              className="flex-shrink-0 flex items-center gap-2 bg-background border border-border rounded-xl px-2.5 py-1.5 min-w-[160px] max-w-[200px] hover:border-primary/30 hover:bg-card transition-all cursor-pointer group">
              <span className="text-[12px] font-extrabold tabular-nums min-w-[18px] text-white rounded-md px-1 py-0.5 text-center"
                style={{ backgroundColor: i < 3 ? rankBg : "hsl(var(--muted-foreground) / 0.2)" }}>
                {i + 1}
              </span>
              <div className="min-w-0 text-left">
                <div className="text-[9px] font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-foreground">
                  {t.title.slice(0, 35)}{t.title.length > 35 ? "…" : ""}
                </div>
                <div className="text-[8px] text-muted-foreground mt-0.5 truncate">
                  {t.platform} · {t.volume}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(RankingStrip);

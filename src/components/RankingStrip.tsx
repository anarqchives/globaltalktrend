import React, { useMemo } from "react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface RankingStripProps {
  trends: TrendCardProps[];
  onSelectTrend: (index: number) => void;
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
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 10);
  }, [trends]);

  if (topTrends.length === 0) return null;

  const rankColors = ["text-[#E03C31]", "text-muted-foreground", "text-[#D97706]"];

  return (
    <div className="border-b border-border bg-card">
      <div className="px-3 pt-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {lang === "pt" ? "MAIS VISTOS AGORA" : "TRENDING NOW"}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-2.5 scrollbar-none">
        {topTrends.map((t, i) => (
          <button key={i} onClick={() => onSelectTrend(t.originalIndex)}
            className="flex-shrink-0 flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 min-w-[180px] hover:border-[#2557D6]/40 hover:bg-card transition-all cursor-pointer group">
            <span className={`text-[18px] font-extrabold tabular-nums min-w-[24px] ${rankColors[i] || "text-border"}`}>
              {i + 1}
            </span>
            <div className="min-w-0 text-left">
              <div className="text-[12px] font-semibold text-foreground leading-tight line-clamp-1 group-hover:text-foreground">
                {t.title.slice(0, 40)}{t.title.length > 40 ? "…" : ""}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t.platform} · {t.volume}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(RankingStrip);

import React, { useMemo } from "react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";

interface RankingStripProps {
  trends: TrendCardProps[];
  onSelectTrend: (index: number) => void;
}

const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bbc": "imprensa", "reuters": "imprensa", "bloomberg": "imprensa", "nyt": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "hacker news": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "fred": "dados_oficiais",
  "pubmed": "cientifico", "arxiv": "cientifico",
};

const RANK_HEX: Record<string, string> = {
  imprensa: "#5580AA", redes_sociais: "#C08040", google_trends: "#C09020",
  dados_oficiais: "#558855", cientifico: "#7070AA",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) { if (p.includes(key)) return val; }
  return "imprensa";
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

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
      .filter(t => !t.platform.toLowerCase().includes("youtube"))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 12);
  }, [trends]);

  if (topTrends.length === 0) return null;

  return (
    <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
      <div className="px-3 pt-1.5 pb-0.5">
        <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
          {lang === "pt" ? "MAIS VISTOS AGORA" : "TRENDING NOW"}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2" style={{ scrollbarWidth: "none", scrollBehavior: "smooth" }}>
        {topTrends.map((t, i) => {
          const srcType = getSourceType(t.platform);
          const rankColor = RANK_HEX[srcType] || "#6B6560";
          const flag = countryCodeToFlag(t.countryCode);
          return (
            <button key={i} onClick={() => onSelectTrend(t.originalIndex)}
              className="flex-shrink-0 flex items-center gap-2 bg-background border border-border/30 rounded-md px-2.5 py-1.5 hover:border-border hover:bg-card transition-all cursor-pointer group"
              style={{ minWidth: 170, maxWidth: 220 }}
              title={`${t.platform} · ${t.volume} · ${t.title}`}>
              <span className="text-[10px] font-extrabold tabular-nums min-w-[18px] text-white rounded px-1 py-0.5 text-center"
                style={{ backgroundColor: i < 3 ? rankColor : "hsl(var(--muted-foreground) / 0.15)" }}>
                {i + 1}
              </span>
              <div className="min-w-0 text-left overflow-hidden">
                <div className="text-[10px] font-semibold text-foreground leading-tight truncate group-hover:text-foreground">
                  {flag && <span className="mr-1">{flag}</span>}
                  {t.title.slice(0, 45)}{t.title.length > 45 ? "…" : ""}
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

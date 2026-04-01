import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Bookmark, Bell, Share2, Flag } from "lucide-react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import AbbrTooltip from "./AbbrTooltip";
import SparklineArea from "./SparklineArea";
import { AnomalyAlert } from "@/hooks/use-anomaly-alerts";

interface EmergingTrendsSectionProps {
  trends: TrendCardProps[];
  anomalies?: AnomalyAlert[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onClose?: () => void;
}

interface EmergingTrend {
  trend: TrendCardProps;
  ageMinutes: number;
  growthRate: number;
  sourceCount: number;
  score: number;
  signalType: "spike" | "rapid" | "emerging";
}

function detectEmergingTrends(trends: TrendCardProps[]): EmergingTrend[] {
  const now = Date.now();
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const results: EmergingTrend[] = [];

  for (const trend of trends) {
    let ts: number | null = null;
    if (trend.firstSeenAt) ts = new Date(trend.firstSeenAt).getTime();
    else if (trend.publishedAt) ts = new Date(trend.publishedAt).getTime();
    if (!ts || isNaN(ts)) continue;

    const age = now - ts;
    if (age > TWO_HOURS || age < 0) continue;

    const changeStr = trend.change?.replace(/[^0-9.\-]/g, "") || "0";
    const growthRate = Math.abs(parseFloat(changeStr));
    if (growthRate < 30) continue;

    const sourceCount = trend.sources?.length || 1;
    const score = growthRate * (1 + 1 / Math.max(age / 60000, 1)) * (1 + sourceCount * 0.3);
    const signalType: "spike" | "rapid" | "emerging" = growthRate > 300 ? "spike" : growthRate > 150 ? "rapid" : "emerging";

    results.push({ trend, ageMinutes: Math.round(age / 60_000), growthRate, sourceCount, score, signalType });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 18);
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
};

const platformColors: Record<string, string> = {
  YouTube: "#FF0000",
  Reddit: "hsl(16, 100%, 50%)",
  "Google Trends": "#4285F4",
  NewsAPI: "hsl(142, 60%, 40%)",
  Bluesky: "hsl(200, 100%, 50%)",
  Mastodon: "#6364FF",
  "Hacker News": "#FF6600",
  GitHub: "#24292E",
  "The Guardian": "#0D6EFD",
  GNews: "hsl(160, 60%, 45%)",
  PubMed: "#007CBB",
  "X (Twitter)": "hsl(0, 0%, 15%)",
};

const TAB_CONFIG = [
  {
    type: "spike" as const,
    icon: "📈",
    title: "Pico Anômalo",
    titleEn: "Anomalous Spike",
    accent: "#FF4D4F",
  },
  {
    type: "rapid" as const,
    icon: "⚡",
    title: "Crescimento Alto",
    titleEn: "High Growth",
    accent: "#FA8C16",
  },
  {
    type: "emerging" as const,
    icon: "📡",
    title: "Sinal Emergente",
    titleEn: "Emerging Signal",
    accent: "#1677FF",
  },
];

export default function EmergingTrendsSection({ trends, anomalies = [], onSelectTrend }: EmergingTrendsSectionProps) {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"spike" | "rapid" | "emerging">("spike");
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  const anomalyItems: EmergingTrend[] = useMemo(() => {
    return anomalies.map(a => {
      const changeStr = a.trend.change?.replace(/[^0-9.\-]/g, "") || "0";
      const growthRate = Math.abs(parseFloat(changeStr));
      const signalType: "spike" | "rapid" | "emerging" = a.type === "spike" ? "spike" : a.type === "rapid_growth" ? "rapid" : growthRate > 300 ? "spike" : growthRate > 150 ? "rapid" : "emerging";
      return { trend: a.trend, ageMinutes: 0, growthRate, sourceCount: a.trend.sources?.length || 1, score: growthRate, signalType };
    });
  }, [anomalies]);

  const allItems = useMemo(() => {
    const combined = [...anomalyItems, ...emerging];
    const seen = new Set<string>();
    return combined.filter(e => {
      const key = e.trend.title.slice(0, 30).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [anomalyItems, emerging]);

  const columnData = useMemo(() => {
    const result: Record<string, EmergingTrend[]> = { spike: [], rapid: [], emerging: [] };
    for (const item of allItems) {
      result[item.signalType].push(item);
    }
    return result;
  }, [allItems]);

  // Prediction text
  const predictionText = useMemo(() => {
    if (anomalies.length === 0) return null;
    const platforms = new Set(anomalies.map(a => a.trend.platform));
    const avgChange = anomalies.reduce((s, a) => s + Math.abs(parseFloat(a.trend.change?.replace(/[^0-9.\-]/g, "") || "0")), 0) / anomalies.length;
    if (platforms.size >= 3 && avgChange > 200)
      return lang === "pt" ? "Convergência global detectada — múltiplas plataformas em aceleração simultânea." : "Global convergence detected — simultaneous acceleration across platforms.";
    if (avgChange > 150)
      return lang === "pt" ? "Crescimento acelerado anômalo — possível viralização nas próximas 2-6h." : "Anomalous accelerated growth — possible viralization in the next 2-6h.";
    return lang === "pt" ? "Monitorando padrões incomuns — sem convergência detectada ainda." : "Monitoring unusual patterns — no convergence detected yet.";
  }, [anomalies, lang]);

  if (allItems.length === 0) return null;

  const activeItems = columnData[activeTab] || [];
  const activeConfig = TAB_CONFIG.find(t => t.type === activeTab)!;

  return (
    <div className="flex flex-col h-full">
      {/* Prediction banner */}
      {predictionText && (
        <div className="mx-3 mt-2 mb-2 px-3 py-2 rounded-lg bg-destructive/5 border-l-3 border-destructive/30" style={{ borderLeft: "3px solid hsl(var(--destructive) / 0.4)" }}>
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">🔮</span>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-destructive">{lang === "pt" ? "PREVISÃO" : "PREDICTION"}</span>
              <p className="text-[10px] text-foreground/80 leading-relaxed mt-0.5">{predictionText}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab headers — folder tab style */}
      <div className="flex items-end gap-0.5 px-3 mt-1">
        {TAB_CONFIG.map(tab => {
          const count = columnData[tab.type].length;
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className={`relative px-3 py-1.5 text-[11px] font-bold transition-all duration-150 rounded-t-lg border border-b-0 ${
                isActive
                  ? "bg-card text-foreground border-border z-10 -mb-px"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
              }`}
              style={isActive ? { borderTop: `2px solid ${tab.accent}` } : {}}
            >
              <span className="flex items-center gap-1">
                <span className="text-xs">{tab.icon}</span>
                <span className="hidden sm:inline">{lang === "pt" ? tab.title : tab.titleEn}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: `${tab.accent}15`, color: tab.accent }}>{count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 mx-3 border border-border rounded-b-lg rounded-tr-lg bg-card overflow-y-auto scrollbar-thin" style={{ borderTop: `2px solid ${activeConfig.accent}` }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activeItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[10px] text-muted-foreground/50">
                {lang === "pt" ? "Nenhum sinal nesta categoria" : "No signals in this category"}
              </div>
            ) : (
              activeItems.map((e, idx) => {
                const pColor = platformColors[e.trend.platform] || "#666";
                const flag = countryCodeToFlag(e.trend.countryCode);
                const growth = Math.round(e.growthRate);
                const age = e.ageMinutes;
                const timeLabel = age < 1 ? (lang === "pt" ? "agora" : "now") : age < 60 ? `${age}min` : `${Math.round(age / 60)}h`;

                const sparkValues = e.trend.historicalData?.slice(-12).map(d => d.value) ||
                  (e.trend.sparkData && e.trend.sparkData.length > 2 ? e.trend.sparkData : null);

                return (
                  <div
                    key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}-${idx}`}
                    className="flex items-center gap-2.5 px-3 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-colors duration-100 cursor-pointer"
                    onClick={() => onSelectTrend?.(e.trend)}
                    style={{ minHeight: 48 }}
                  >
                    {/* Platform dot */}
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium" style={{ color: pColor }}>{e.trend.platform}</span>
                        {flag && <span className="text-[10px]">{flag}</span>}
                        <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">{timeLabel}</span>
                      </div>
                      <h4 className="text-[12px] font-bold text-foreground leading-tight line-clamp-1 mt-0.5">{decodeEntities(e.trend.title)}</h4>
                    </div>

                    {/* Growth badge */}
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: activeConfig.accent }}>
                      +{growth}%
                    </span>

                    {/* Sparkline */}
                    {sparkValues && (
                      <div className="flex-shrink-0" style={{ width: 56, height: 20 }}>
                        <SparklineArea data={sparkValues} color={activeConfig.accent} width={56} height={20} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

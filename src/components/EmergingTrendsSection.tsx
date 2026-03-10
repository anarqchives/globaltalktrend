import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Radio, ExternalLink, ArrowRight, Bookmark } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import AbbrTooltip from "./AbbrTooltip";

interface EmergingTrendsSectionProps {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
  onClose?: () => void;
}

interface EmergingTrend {
  trend: TrendCardProps;
  ageMinutes: number;
  growthRate: number;
  sourceCount: number;
  score: number;
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

    results.push({ trend, ageMinutes: Math.round(age / 60_000), growthRate, sourceCount, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 12);
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el) return text;
  el.innerHTML = text;
  return el.value;
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

function generateSignalBadge(e: EmergingTrend, lang: string) {
  const growth = Math.round(e.growthRate);
  const age = e.ageMinutes;
  const timeLabel = lang === "pt"
    ? (age < 30 ? "nos últimos 30 minutos" : age < 60 ? "na última hora" : `nas últimas ${Math.round(age / 60)}h`)
    : (age < 30 ? "in the last 30 minutes" : age < 60 ? "in the last hour" : `in the last ${Math.round(age / 60)}h`);

  if (growth > 300) {
    return {
      icon: "📈",
      type: lang === "pt" ? "Pico anômalo" : "Anomalous spike",
      detail: `+${growth}% ${lang === "pt" ? "de variação" : "variation"} ${timeLabel}`,
      bg: "bg-[#FFF1F0] dark:bg-red-900/20",
      text: "text-[#CF1322] dark:text-red-400",
      border: "border-[#FFCCC7] dark:border-red-800",
    };
  }
  if (growth > 150) {
    return {
      icon: "⚡",
      type: lang === "pt" ? "Crescimento rápido" : "Rapid growth",
      detail: `+${growth}% ${lang === "pt" ? "de variação" : "variation"} ${timeLabel}`,
      bg: "bg-[#FFF7E6] dark:bg-amber-900/20",
      text: "text-[#D46B08] dark:text-amber-400",
      border: "border-[#FFD591] dark:border-amber-800",
    };
  }
  return {
    icon: "📡",
    type: lang === "pt" ? "Sinal emergente" : "Emerging signal",
    detail: `+${growth}% ${lang === "pt" ? "de crescimento" : "growth"} ${timeLabel}`,
    bg: "bg-[#F0F5FF] dark:bg-blue-900/20",
    text: "text-[#1D39C4] dark:text-blue-400",
    border: "border-[#ADC6FF] dark:border-blue-800",
  };
}

export default function EmergingTrendsSection({ trends, onSelectTrend }: EmergingTrendsSectionProps) {
  const { lang } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  if (emerging.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {emerging.map((e, i) => {
            const sparkRaw = e.trend.historicalData?.slice(-12) || [];
            const sparkData = sparkRaw.length > 0 ? sparkRaw : e.trend.sparkData?.map(v => ({ value: v })) || [];
            const tviScore = Math.min(Math.round(e.growthRate * 0.3 + e.sourceCount * 10 + (120 - e.ageMinutes) * 0.3), 100);
            const signal = generateSignalBadge(e, lang);
            const pColor = platformColors[e.trend.platform] || "#666";
            const flag = countryCodeToFlag(e.trend.countryCode);

            const tviLabel = tviScore >= 91 ? "Viral" : tviScore >= 61 ? "High" : tviScore >= 31 ? "Medium" : "Low";
            const tviColor = tviScore >= 91 ? "text-red-500" : tviScore >= 61 ? "text-orange-500" : tviScore >= 31 ? "text-amber-500" : "text-muted-foreground";

            return (
              <motion.div
                key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}`}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="group relative overflow-hidden rounded-xl border border-border/40 dark:border-border/30 bg-card hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all duration-150 ease-out p-4 flex flex-col"
                style={{ borderLeftWidth: 3, borderLeftColor: "#4096FF" }}
              >
                {/* Top-right badge */}
                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {lang === "pt" ? "EMERGENTE" : "EMERGING"}
                </span>

                {/* ① SOURCE + TIME ROW */}
                <div className="flex items-center gap-1.5 h-5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
                  <span className="text-xs font-medium" style={{ color: pColor }}>{e.trend.platform}</span>
                  <span className="text-muted-foreground/40 text-[11px]">·</span>
                  {flag && <span className="text-[11px]">{flag}</span>}
                  {e.trend.countryCode && (
                    <AbbrTooltip text={e.trend.countryCode.toUpperCase()} className="text-[11px] text-muted-foreground uppercase" />
                  )}
                  <span className="text-muted-foreground/40 text-[11px]">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {e.ageMinutes < 1 ? (lang === "pt" ? "agora" : "now") : e.ageMinutes < 60 ? `há ${e.ageMinutes}min` : `há ${Math.round(e.ageMinutes / 60)}h`}
                  </span>
                  <Bookmark className="w-4 h-4 text-muted-foreground/30 ml-auto flex-shrink-0 hover:text-primary cursor-pointer transition-colors" />
                </div>

                {/* ② TITLE */}
                <h3 className="text-[15px] font-bold text-foreground leading-[1.4] line-clamp-2 mt-2">
                  {decodeEntities(e.trend.title)}
                </h3>

                {/* ③ CONTEXT LINE */}
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                  {e.trend.description || (lang === "pt" ? `Tendência detectada em ${e.trend.platform} com crescimento acelerado` : `Trend detected on ${e.trend.platform} with accelerating growth`)}
                </p>

                {/* ④ SIGNAL BADGE */}
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${signal.bg} ${signal.text} ${signal.border}`}>
                  <AbbrTooltip text={signal.type}>
                    <span>{signal.icon} {signal.type}: {signal.detail}</span>
                  </AbbrTooltip>
                </div>

                {/* ⑤ SOURCE DETAIL */}
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
                  <span>{e.trend.platform}</span>
                  {flag && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{flag}</span>
                      {e.trend.countryCode && <AbbrTooltip text={e.trend.countryCode.toUpperCase()} className="uppercase" />}
                    </>
                  )}
                </div>

                {/* ⑥ SPARKLINE */}
                {sparkData.length > 2 && (
                  <div className="mt-2 h-10 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs>
                          <linearGradient id={`emg-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4096FF" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#4096FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="hour" hide />
                        <Area type="monotone" dataKey="value" stroke="#4096FF" strokeWidth={1.5} fill={`url(#emg-grad-${i})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#4096FF] animate-pulse" />
                    <div className="flex justify-between text-[9px] text-muted-foreground/40 mt-0.5">
                      <span>{lang === "pt" ? "início" : "start"}</span>
                      <span>{lang === "pt" ? "agora" : "now"}</span>
                    </div>
                  </div>
                )}

                {/* ⑦ METRICS FOOTER */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <AbbrTooltip text="TVI" className="text-[9px] uppercase text-muted-foreground tracking-wide" />
                      <span className={`text-lg font-bold leading-none ${tviColor}`}>{tviScore}</span>
                      <span className={`text-[9px] ${tviColor}`}>{tviLabel}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {e.ageMinutes < 1 ? (lang === "pt" ? "agora" : "now") : `há ${e.ageMinutes}min`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {e.trend.sourceUrl && (
                      <a
                        href={e.trend.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium border border-border/60 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        {lang === "pt" ? "Fonte" : "Source"}
                      </a>
                    )}
                    <button
                      onClick={() => onSelectTrend?.(e.trend)}
                      className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium border border-border/60 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      📊 Timeline
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

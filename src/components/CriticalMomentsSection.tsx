import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ExternalLink, Clock, ChevronDown, ChevronUp, ArrowRight, Bookmark } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import AbbrTooltip from "./AbbrTooltip";

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
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

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend }: Props) {
  const { lang } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!moments.length) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          {lang === "pt"
            ? "Nenhum momento crítico detectado agora. O sistema monitora picos, convergência de mídias e propagação geográfica em tempo real."
            : "No critical moments detected right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {moments.slice(0, 12).map((m, i) => {
          const isExpanded = expandedIdx === i;
          const trend = m.trend;
          const sparkData = trend.sparkData?.map((v) => ({ value: v })) || [];
          const pColor = platformColors[trend.platform] || "#666";
          const flag = countryCodeToFlag(trend.countryCode);
          const changeNum = Math.round(m.changePercent);

          const tviScore = Math.min(Math.round(changeNum * 0.2 + m.platformCount * 10 + m.countryCount * 5 + m.mediaTypes.length * 8), 100);
          const tviLabel = tviScore >= 91 ? "Viral" : tviScore >= 61 ? "High" : tviScore >= 31 ? "Medium" : "Low";
          const tviColor = tviScore >= 91 ? "text-red-500" : tviScore >= 61 ? "text-orange-500" : tviScore >= 31 ? "text-amber-500" : "text-muted-foreground";

          const signalDetail = lang === "pt"
            ? `Pico anômalo: +${changeNum}% de variação em ${trend.platform}`
            : `Anomalous spike: +${changeNum}% variation on ${trend.platform}`;

          return (
            <motion.div
              key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className="group relative overflow-hidden rounded-xl border border-border/40 dark:border-border/30 bg-card hover:border-[#CF1322] dark:hover:border-red-500 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all duration-150 ease-out p-4 flex flex-col cursor-pointer"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: "#FF2D2D",
                background: "linear-gradient(135deg, hsl(0 100% 97% / 0.5) 0%, hsl(var(--card)) 40%)",
              }}
            >
              {/* Top-right badge */}
              <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                {lang === "pt" ? "CRÍTICO" : "CRITICAL"}
              </span>

              {/* ① SOURCE + TIME ROW */}
              <div className="flex items-center gap-1.5 h-5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
                <span className="text-xs font-medium" style={{ color: pColor }}>{trend.platform}</span>
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                {flag && <span className="text-[11px]">{flag}</span>}
                {trend.countryCode && (
                  <AbbrTooltip text={trend.countryCode.toUpperCase()} className="text-[11px] text-muted-foreground uppercase" />
                )}
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                <span className="text-[11px] text-muted-foreground">{trend.time || (lang === "pt" ? "agora" : "now")}</span>
                <Bookmark className="w-4 h-4 text-muted-foreground/30 ml-auto flex-shrink-0 hover:text-primary cursor-pointer transition-colors" />
              </div>

              {/* ② TITLE */}
              <h3 className={`text-[15px] font-bold text-foreground leading-[1.4] mt-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                {trend.title}
              </h3>

              {/* ③ CONTEXT LINE */}
              <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                {m.summary || trend.description || signalDetail}
              </p>

              {/* ④ SIGNAL BADGE */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-[#FFF1F0] dark:bg-red-900/20 text-[#CF1322] dark:text-red-400 border-[#FFCCC7] dark:border-red-800">
                <AbbrTooltip text="Pico anômalo">
                  <span>📈 {signalDetail}</span>
                </AbbrTooltip>
              </div>

              {/* ⑤ SOURCE DETAIL */}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
                <span>{trend.platform}</span>
                {flag && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{flag}</span>
                    {trend.countryCode && <AbbrTooltip text={trend.countryCode.toUpperCase()} className="uppercase" />}
                  </>
                )}
                {m.platformCount > 1 && <span className="text-muted-foreground/40">· {m.platformCount} plat.</span>}
              </div>

              {/* ⑥ SPARKLINE */}
              {sparkData.length > 3 && (
                <div className={`mt-2 w-full relative ${isExpanded ? 'h-12' : 'h-10'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`crit-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF2D2D" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#FF2D2D" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="hour" hide />
                      <Area type="monotone" dataKey="value" stroke="#FF2D2D" strokeWidth={1.5} fill={`url(#crit-grad-${i})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#FF2D2D] animate-pulse" />
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
                    {trend.time || (lang === "pt" ? "agora" : "now")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" onClick={ev => ev.stopPropagation()}>
                  {trend.sourceUrl && (
                    <a
                      href={trend.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium border border-border/60 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      {lang === "pt" ? "Fonte" : "Source"}
                    </a>
                  )}
                  <button
                    onClick={() => onSelectTrend?.(trend)}
                    className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium border border-border/60 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    📊 Timeline
                  </button>
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-border/30 pt-2 mt-2">
                      {m.prediction && (
                        <div className="rounded-md bg-primary/5 border border-primary/10 px-2 py-1.5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">
                            <AbbrTooltip text="PREVISÃO">{m.predictionEmoji} {lang === "pt" ? "Previsão" : "Prediction"}</AbbrTooltip>
                          </span>
                          <p className="text-[10px] text-foreground/80 leading-relaxed">{m.prediction}</p>
                        </div>
                      )}
                      {m.relatedTrends.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.relatedTrends.slice(0, 4).map((rt, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[8px] bg-secondary/60 rounded-md px-1.5 py-0.5 text-secondary-foreground">
                              {rt.platform} {countryCodeToFlag(rt.countryCode)} {rt.change && <span className="text-destructive font-medium">{rt.change}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

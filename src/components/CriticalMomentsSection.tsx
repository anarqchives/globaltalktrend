import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { TrendingUp, Globe, Radio, Shield, ExternalLink, Zap, Eye, BarChart3, Newspaper, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import { mediaTypeEmojis } from "@/hooks/use-critical-moments";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const riskColors: Record<string, string> = {
  extreme: "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
  high: "border-orange-500/25 bg-orange-500/5 hover:border-orange-500/40",
  moderate: "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35",
};

const riskBadge: Record<string, string> = {
  extreme: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  moderate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const riskLabels: Record<string, Record<string, string>> = {
  extreme: { pt: "EXTREMO", en: "EXTREME" },
  high: { pt: "ALTO", en: "HIGH" },
  moderate: { pt: "MODERADO", en: "MODERATE" },
};

const reasonIcons: Record<string, React.ReactNode> = {
  volumeSpike: <TrendingUp className="w-2.5 h-2.5" />,
  acceleration: <Zap className="w-2.5 h-2.5" />,
  multiSource: <Radio className="w-2.5 h-2.5" />,
  geographicSpread: <Globe className="w-2.5 h-2.5" />,
  verifiedSource: <Shield className="w-2.5 h-2.5" />,
  mediaDiversity: <Newspaper className="w-2.5 h-2.5" />,
  highVolume: <BarChart3 className="w-2.5 h-2.5" />,
  richContext: <Eye className="w-2.5 h-2.5" />,
};

const reasonLabels: Record<string, Record<string, string>> = {
  pt: {
    volumeSpike: "Pico de volume", acceleration: "Crescimento rápido", multiSource: "Multiplataforma",
    geographicSpread: "Vários países", verifiedSource: "Fonte verificada", mediaDiversity: "Mídias diversas",
    highVolume: "Volume alto", richContext: "Contexto rico",
  },
  en: {
    volumeSpike: "Volume spike", acceleration: "Fast growth", multiSource: "Multi-platform",
    geographicSpread: "Multiple countries", verifiedSource: "Verified source", mediaDiversity: "Diverse media",
    highVolume: "High volume", richContext: "Rich context",
  },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
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
  const l = reasonLabels[lang] || reasonLabels.pt;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-auto">
        {moments.slice(0, 12).map((m, i) => {
          const isExpanded = expandedIdx === i;
          const trend = m.trend;
          const sparkData = trend.sparkData?.map((v) => ({ value: v })) || [];
          const riskLabel = riskLabels[m.riskLevel]?.[lang] || riskLabels[m.riskLevel]?.pt || "ALTO";

          return (
            <motion.div
              key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2, layout: { duration: 0.25, type: "spring", stiffness: 300, damping: 30 } }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className={`group relative overflow-hidden rounded-lg border transition-all duration-200 text-left p-2.5 cursor-pointer ${riskColors[m.riskLevel]} ${
                isExpanded ? "col-span-2 row-span-2 shadow-lg ring-1 ring-destructive/20" : "hover:shadow-sm"
              }`}
            >
              {/* Risk badge + change */}
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${riskBadge[m.riskLevel]}`}>
                  {m.riskLevel === "extreme" ? "🔥" : m.riskLevel === "high" ? "⚠️" : "📊"} {riskLabel}
                </span>
                <span className="text-destructive font-black text-[10px] tabular-nums">
                  +{Math.round(m.changePercent)}%
                </span>
              </div>

              {/* Title */}
              <p className={`text-[11px] font-semibold text-foreground leading-tight mb-1.5 ${isExpanded ? "" : "line-clamp-2 min-h-[28px]"}`}>
                {trend.title}
              </p>

              {/* Summary */}
              {!isExpanded && (
                <p className="text-[9px] text-muted-foreground line-clamp-1 mb-1">{m.summary}</p>
              )}

              {/* Compact metrics */}
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1 flex-wrap">
                {m.mediaTypes.slice(0, 3).map(type => (
                  <span key={type} className="px-1 py-0 rounded bg-secondary text-[7px] font-medium text-secondary-foreground">
                    {mediaTypeEmojis[type] || "📌"} {type === "social" ? "Social" : type === "press" ? "Imprensa" : type === "search" ? "Busca" : type === "video" ? "Vídeo" : type}
                  </span>
                ))}
                {m.platformCount > 1 && (
                  <span className="inline-flex items-center gap-0.5"><Radio className="w-2 h-2" />{m.platformCount}</span>
                )}
                {m.countryCount > 1 && <span>🌍 {m.countryCount}</span>}
              </div>

              {/* Mini sparkline */}
              {!isExpanded && sparkData.length > 3 && (
                <div className="mt-1.5 h-3 w-full opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={1} fill="hsl(var(--destructive))" fillOpacity={0.15} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Expand indicator */}
              <div className="flex items-center justify-center mt-1">
                {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground/50" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />}
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
                    <div className="mt-2 space-y-2 border-t border-border/30 pt-2">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{m.summary}</p>

                      {/* Prediction */}
                      <div className="rounded-md bg-primary/5 border border-primary/10 px-2 py-1.5">
                        <div className="flex items-start gap-1.5">
                          <span className="text-sm flex-shrink-0">{m.predictionEmoji}</span>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">
                              {lang === "pt" ? "Previsão" : "Prediction"}
                            </span>
                            <p className="text-[10px] text-foreground/80 leading-relaxed">{m.prediction}</p>
                          </div>
                        </div>
                      </div>

                      {/* Sparkline large */}
                      {sparkData.length > 3 && (
                        <div className="h-8 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData}>
                              <defs>
                                <linearGradient id={`crit-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={1.5} fill={`url(#crit-grad-${i})`} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Signals */}
                      <div className="flex flex-wrap gap-1">
                        {m.reasons.map(r => (
                          <span key={r} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-medium bg-destructive/10 text-destructive">
                            {reasonIcons[r]} {l[r] || r}
                          </span>
                        ))}
                      </div>

                      {/* Related */}
                      {m.relatedTrends.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.relatedTrends.slice(0, 4).map((rt, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[8px] bg-secondary/60 rounded-md px-1.5 py-0.5 text-secondary-foreground">
                              {rt.platform} {countryCodeToFlag(rt.countryCode)} {rt.change && <span className="text-destructive font-medium">{rt.change}</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {trend.sourceUrl && (
                          <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[9px] font-semibold hover:bg-primary/90 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> {lang === "pt" ? "Ver fonte" : "Source"}
                          </a>
                        )}
                        <button onClick={() => onSelectTrend?.(trend)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[9px] font-medium hover:bg-secondary/80 transition-colors">
                          {lang === "pt" ? "Timeline" : "Timeline"} →
                        </button>
                      </div>
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

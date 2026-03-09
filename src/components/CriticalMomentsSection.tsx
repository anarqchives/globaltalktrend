import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { TrendingUp, Globe, Radio, Shield, ExternalLink, Zap, Eye, BarChart3, Newspaper, Clock, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceDot } from "recharts";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import { mediaTypeEmojis } from "@/hooks/use-critical-moments";

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

const countryNames: Record<string, Record<string, string>> = {
  pt: { US: "EUA", BR: "Brasil", GB: "Reino Unido", DE: "Alemanha", FR: "França", JP: "Japão", CA: "Canadá", IN: "Índia", AU: "Austrália", IT: "Itália", ES: "Espanha", PT: "Portugal", MX: "México", KR: "Coreia do Sul", AR: "Argentina" },
  en: { US: "USA", BR: "Brazil", GB: "UK", DE: "Germany", FR: "France", JP: "Japan", CA: "Canada", IN: "India", AU: "Australia", IT: "Italy", ES: "Spain", PT: "Portugal", MX: "Mexico", KR: "South Korea", AR: "Argentina" },
};

/** Generate a clear explanation of WHY this is flagged as critical */
function generateWhyExplanation(m: CriticalMoment, lang: string): string {
  const change = Math.round(m.changePercent);
  const parts: string[] = [];

  if (lang === "pt") {
    if (change > 0) parts.push(`+${change}% de crescimento`);
    if (m.platformCount > 1) parts.push(`em ${m.platformCount} plataformas`);
    if (m.countryCount > 1) parts.push(`${m.countryCount} países`);
    if (m.mediaTypes.length > 1) parts.push(`${m.mediaTypes.length} tipos de mídia`);
    return `Sinal crítico: ${parts.join(", ")}`;
  } else {
    if (change > 0) parts.push(`+${change}% growth`);
    if (m.platformCount > 1) parts.push(`across ${m.platformCount} platforms`);
    if (m.countryCount > 1) parts.push(`${m.countryCount} countries`);
    if (m.mediaTypes.length > 1) parts.push(`${m.mediaTypes.length} media types`);
    return `Critical signal: ${parts.join(", ")}`;
  }
}

/** Generate WHERE description */
function generateWhereDescription(m: CriticalMoment, lang: string): string {
  const l = lang === "pt" ? "pt" : "en";
  const parts: string[] = [];

  // Primary platform
  parts.push(m.trend.platform);

  // Related platforms from related trends
  const otherPlatforms = new Set<string>();
  m.relatedTrends.forEach(rt => {
    if (rt.platform !== m.trend.platform) otherPlatforms.add(rt.platform);
  });
  if (otherPlatforms.size > 0) {
    parts.push([...otherPlatforms].slice(0, 2).join(", "));
  }

  // Countries
  const countryCodes = new Set<string>();
  if (m.trend.countryCode) countryCodes.add(m.trend.countryCode.toUpperCase());
  m.relatedTrends.forEach(rt => {
    if (rt.countryCode) countryCodes.add(rt.countryCode.toUpperCase());
  });
  if (countryCodes.size > 0) {
    const names = [...countryCodes].slice(0, 3).map(c => {
      const flag = countryCodeToFlag(c);
      const name = countryNames[l]?.[c] || c;
      return `${flag || ""} ${name}`;
    });
    parts.push(names.join(", "));
  }

  return parts.join(" · ");
}

/** Generate context descriptor for the topic */
function generateContextDescriptor(trend: CriticalMoment["trend"], lang: string): string {
  const category = trend.category || "Geral";
  const categoryMap: Record<string, Record<string, string>> = {
    pt: { Tecnologia: "tópico de tecnologia", Entretenimento: "conteúdo de entretenimento", Notícias: "notícia em destaque", Política: "assunto político", Economia: "tema econômico", Ciência: "pesquisa científica", Esportes: "notícia esportiva", Geral: "tópico em alta" },
    en: { Tecnologia: "technology topic", Entretenimento: "entertainment", Notícias: "breaking news", Política: "political topic", Economia: "economic topic", Ciência: "scientific research", Esportes: "sports news", Geral: "trending topic" },
  };
  const l = lang === "pt" ? "pt" : "en";
  return categoryMap[l]?.[category] || categoryMap[l]?.Geral || "trending topic";
}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 auto-rows-auto">
        {moments.slice(0, 12).map((m, i) => {
          const isExpanded = expandedIdx === i;
          const trend = m.trend;
          const sparkData = trend.sparkData?.map((v) => ({ value: v })) || [];
          const riskLabel = riskLabels[m.riskLevel]?.[lang] || riskLabels[m.riskLevel]?.pt || "ALTO";
          const whyExplanation = generateWhyExplanation(m, lang);
          const whereDesc = generateWhereDescription(m, lang);
          const contextDesc = generateContextDescriptor(trend, lang);

          // Peak detection for chart
          let peakIdx = 0, peakVal = 0;
          sparkData.forEach((d, idx) => { if (d.value > peakVal) { peakVal = d.value; peakIdx = idx; } });

          return (
            <motion.div
              key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2, layout: { duration: 0.25, type: "spring", stiffness: 300, damping: 30 } }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-200 text-left p-3 cursor-pointer flex flex-col gap-1.5 ${riskColors[m.riskLevel]} ${
                isExpanded ? "col-span-1 sm:col-span-2 shadow-lg ring-1 ring-destructive/20" : "hover:shadow-sm"
              }`}
            >
              {/* ─── HEADER: Risk badge ─── */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${riskBadge[m.riskLevel]}`}>
                  {m.riskLevel === "extreme" ? "🔥" : m.riskLevel === "high" ? "⚠️" : "📊"} {riskLabel}
                </span>
                <span className="text-destructive font-black text-[10px] tabular-nums">
                  +{Math.round(m.changePercent)}%
                </span>
              </div>

              {/* ─── LAYER 1: WHAT — Title + Context ─── */}
              <div>
                <p className={`text-[11px] font-bold text-foreground leading-tight ${isExpanded ? "" : "line-clamp-2"}`}>
                  {trend.title}
                </p>
                <p className="text-[9px] text-muted-foreground/70 italic mt-0.5 capitalize">
                  {contextDesc}
                </p>
              </div>

              {/* ─── LAYER 2: WHY — Explanation ─── */}
              <div className="rounded-md bg-destructive/8 border border-destructive/15 px-2 py-1">
                <p className="text-[9px] text-destructive dark:text-red-300 leading-relaxed">
                  {whyExplanation}
                </p>
              </div>

              {/* ─── LAYER 3: WHERE — Platforms + Geography ─── */}
              <p className="text-[9px] text-muted-foreground flex items-center gap-1 flex-wrap">
                <Globe className="w-2.5 h-2.5 text-muted-foreground/60 flex-shrink-0" />
                {whereDesc}
              </p>

              {/* ─── LAYER 4: SIGNAL CHART ─── */}
              {sparkData.length > 3 && (
                <div className={`w-full ${isExpanded ? "h-10" : "h-5"} transition-all`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`crit-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={1.5} fill={`url(#crit-grad-${i})`} dot={false} />
                      {peakVal > 0 && (
                        <ReferenceDot x={peakIdx} y={peakVal} r={3} fill="hsl(var(--destructive))" stroke="hsl(var(--background))" strokeWidth={1.5} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ─── LAYER 5: ACTIONS ─── */}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/15">
                <div className="flex flex-wrap gap-1">
                  {m.reasons.slice(0, 3).map(r => (
                    <span key={r} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-medium bg-secondary text-secondary-foreground">
                      {reasonIcons[r]} {l[r] || r}
                    </span>
                  ))}
                </div>
                <div className="flex-shrink-0">
                  {isExpanded
                    ? <ChevronUp className="w-3 h-3 text-muted-foreground/50" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  }
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
                    <div className="space-y-2 border-t border-border/30 pt-2">
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

                      {/* Summary */}
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{m.summary}</p>

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

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5" onClick={ev => ev.stopPropagation()}>
                        {trend.sourceUrl && (
                          <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[9px] font-medium hover:bg-secondary/80 transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> {lang === "pt" ? "Ver fonte" : "Source"}
                          </a>
                        )}
                        <button onClick={() => onSelectTrend?.(trend)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[9px] font-semibold hover:bg-primary/90 transition-colors">
                          Timeline <ArrowRight className="w-2.5 h-2.5" />
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

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Globe, Radio, Shield, ExternalLink, BarChart3, Share2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useLanguage, type LangCode } from "@/contexts/LanguageContext";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const reasonLabelsByLang: Record<LangCode, Record<string, string>> = {
  pt: { volumeSpike: "Pico de volume", acceleration: "Crescimento rápido", multiSource: "Múltiplas fontes", geographicSpread: "Vários países", verifiedSource: "Fonte verificada" },
  en: { volumeSpike: "Volume spike", acceleration: "Fast growth", multiSource: "Multiple sources", geographicSpread: "Multiple countries", verifiedSource: "Verified source" },
  es: { volumeSpike: "Pico de volumen", acceleration: "Crecimiento rápido", multiSource: "Múltiples fuentes", geographicSpread: "Varios países", verifiedSource: "Fuente verificada" },
  fr: { volumeSpike: "Pic de volume", acceleration: "Croissance rapide", multiSource: "Sources multiples", geographicSpread: "Plusieurs pays", verifiedSource: "Source vérifiée" },
  de: { volumeSpike: "Volumenspitze", acceleration: "Schnelles Wachstum", multiSource: "Mehrere Quellen", geographicSpread: "Mehrere Länder", verifiedSource: "Verifizierte Quelle" },
  it: { volumeSpike: "Picco di volume", acceleration: "Crescita rapida", multiSource: "Fonti multiple", geographicSpread: "Più paesi", verifiedSource: "Fonte verificata" },
  zh: { volumeSpike: "流量峰值", acceleration: "快速增长", multiSource: "多来源", geographicSpread: "多国家", verifiedSource: "已验证来源" },
  ja: { volumeSpike: "急増", acceleration: "急成長", multiSource: "複数ソース", geographicSpread: "複数の国", verifiedSource: "検証済みソース" },
  ko: { volumeSpike: "볼륨 급증", acceleration: "빠른 증가", multiSource: "다중 소스", geographicSpread: "다수 국가", verifiedSource: "검증된 소스" },
  ar: { volumeSpike: "ارتفاع حاد", acceleration: "نمو سريع", multiSource: "مصادر متعددة", geographicSpread: "عدة دول", verifiedSource: "مصدر موثّق" },
  hi: { volumeSpike: "वॉल्यूम स्पाइक", acceleration: "तेज़ वृद्धि", multiSource: "कई स्रोत", geographicSpread: "कई देश", verifiedSource: "सत्यापित स्रोत" },
  ru: { volumeSpike: "Скачок объема", acceleration: "Быстрый рост", multiSource: "Несколько источников", geographicSpread: "Несколько стран", verifiedSource: "Проверенный источник" },
};

const reasonIcons: Record<string, React.ReactNode> = {
  volumeSpike: <TrendingUp className="w-2.5 h-2.5" />,
  acceleration: <TrendingUp className="w-2.5 h-2.5" />,
  multiSource: <Radio className="w-2.5 h-2.5" />,
  geographicSpread: <Globe className="w-2.5 h-2.5" />,
  verifiedSource: <Shield className="w-2.5 h-2.5" />,
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

function CriticalCard({ m, i, lang, isExpanded, onToggle }: {
  m: CriticalMoment; i: number; lang: LangCode; isExpanded: boolean; onToggle: () => void;
}) {
  const trend = m.trend;
  const sparkData = trend.historicalData?.slice(-24) || [];
  const sources = trend.sources || [];
  // Confidence = score / max_possible_score (rough heuristic)
  const confidence = Math.min(Math.round((m.score / 8) * 100), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className={`rounded-xl border overflow-hidden transition-all duration-150 cursor-pointer ${
        isExpanded
          ? "border-destructive shadow-md shadow-destructive/10 bg-destructive/5"
          : "border-destructive/25 bg-card hover:border-destructive/60 hover:shadow-sm"
      }`}
      onClick={onToggle}
    >
      <div className="p-3">
        {/* Status + Score + Confidence */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black bg-destructive/15 text-destructive uppercase tracking-wide">
            🔥 Critical
          </span>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[9px] font-medium text-muted-foreground cursor-help">
                  {confidence}% conf.
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">
                Signal confidence based on source diversity, growth velocity and geographic spread.
              </TooltipContent>
            </Tooltip>
            <span className="text-[11px] font-black text-destructive">
              +{Math.round(m.changePercent)}%
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[12px] font-semibold text-foreground leading-tight line-clamp-2 mb-1">
          {trend.title}
        </h3>

        {/* Brief description */}
        {trend.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5">{trend.description}</p>
        )}

        {/* Metrics row */}
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap mb-1.5">
          <span>{trend.platform}</span>
          {trend.countryCode && <span>{countryCodeToFlag(trend.countryCode)}</span>}
          <span>💬 {trend.volume || "—"}</span>
          {sources.length > 1 && (
            <span className="inline-flex items-center gap-0.5">
              <Radio className="w-2 h-2" />{sources.length}
            </span>
          )}
        </div>

        {/* Reason tags */}
        <div className="flex flex-wrap gap-0.5">
          {m.reasons.slice(0, 3).map((r) => {
            const label = reasonLabelsByLang[lang]?.[r] || reasonLabelsByLang.pt[r] || r;
            return (
              <span key={r} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium bg-destructive/10 text-destructive">
                {reasonIcons[r]} {label}
              </span>
            );
          })}
        </div>

        {/* Mini sparkline */}
        {sparkData.length > 2 && (
          <div className="mt-2 h-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <Area type="monotone" dataKey="value" stroke="hsl(0, 84%, 60%)" strokeWidth={1} fill="hsl(0, 84%, 60%)" fillOpacity={0.12} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-destructive/20">
              {/* Source breakdown */}
              {sources.length > 0 && (
                <div className="mt-2">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                    <BarChart3 className="w-2.5 h-2.5" /> Sources
                  </span>
                  <div className="space-y-1">
                    {sources.slice(0, 4).map((src, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground flex-shrink-0 w-16 truncate">{src}</span>
                        <Progress value={100 - idx * 20} className="h-1 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Propagation hint */}
              {sources.length >= 2 && (
                <div className="text-[9px] text-muted-foreground">
                  <span className="font-semibold">Propagation:</span>{" "}
                  {sources.slice(0, 4).join(" → ")}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                {trend.sourceUrl && (
                  <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-border text-[10px] font-medium hover:bg-secondary transition-colors">
                    <ExternalLink className="w-2.5 h-2.5" /> Source
                  </a>
                )}
                <button
                  onClick={() => trend.sourceUrl && navigator.clipboard.writeText(trend.sourceUrl)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card border border-border text-[10px] font-medium hover:bg-secondary transition-colors">
                  <Share2 className="w-2.5 h-2.5" /> Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend, onClose, horizontal }: Props) {
  const { lang } = useLanguage();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!moments.length) return null;

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {moments.slice(0, 6).map((m, i) => (
          <CriticalCard
            key={`${m.trend.platform}-${m.trend.title.slice(0, 20)}`}
            m={m}
            i={i}
            lang={lang}
            isExpanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, TrendingUp, X, Clock, Globe, ExternalLink } from "lucide-react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";

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

    // Must have meaningful growth (>30%) to qualify as emerging
    if (growthRate < 30) continue;

    results.push({
      trend,
      ageMinutes: Math.round(age / 60_000),
      growthRate,
      sourceCount: trend.sources?.length || 1,
    });
  }

  // Sort by growth rate * inverse age (newer + faster = higher)
  results.sort((a, b) => {
    const scoreA = a.growthRate * (1 + 1 / Math.max(a.ageMinutes, 1));
    const scoreB = b.growthRate * (1 + 1 / Math.max(b.ageMinutes, 1));
    return scoreB - scoreA;
  });

  return results.slice(0, 8);
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

export default function EmergingTrendsSection({ trends, onSelectTrend, onClose }: EmergingTrendsSectionProps) {
  const { t } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  if (emerging.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-border bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              <Sprout className="w-3.5 h-3.5" />
              🌱 Tendências Emergentes
              <span className="text-[10px] font-normal text-muted-foreground ml-1">({emerging.length})</span>
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {emerging.map((e, i) => (
              <motion.button
                key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}`}
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => onSelectTrend?.(e.trend)}
                className="flex-shrink-0 group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-card hover:border-emerald-500/40 transition-all duration-200 text-left p-3 min-w-[220px] max-w-[280px] hover:shadow-md"
              >
                {/* Growth indicator stripe */}
                <div
                  className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-300"
                  style={{ width: `${Math.min(e.growthRate, 100)}%` }}
                />

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    🌱 Emergente
                  </span>
                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5" />
                    {e.ageMinutes < 60 ? `${e.ageMinutes}min` : `${Math.round(e.ageMinutes / 60)}h`}
                  </span>
                </div>

                <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug mb-1.5">
                  {e.trend.title}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <TrendingUp className="w-2.5 h-2.5" />
                    +{Math.round(e.growthRate)}%
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{e.trend.platform}</span>
                  {e.trend.countryCode && (
                    <>
                      <span className="opacity-40">·</span>
                      <span>{countryCodeToFlag(e.trend.countryCode)}</span>
                    </>
                  )}
                  {e.sourceCount > 1 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" />
                        {e.sourceCount}
                      </span>
                    </>
                  )}
                </div>

                {e.trend.sourceUrl && (
                  <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-primary">
                      <ExternalLink className="w-2 h-2" /> Abrir fonte
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

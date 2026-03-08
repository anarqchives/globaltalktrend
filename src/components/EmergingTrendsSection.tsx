import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, TrendingUp, X, Clock, Globe, Radio } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
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
    // Composite score: growth * freshness * source diversity
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

export default function EmergingTrendsSection({ trends, onSelectTrend, onClose }: EmergingTrendsSectionProps) {
  const { t } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  if (emerging.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-border"
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <Sprout className="w-3 h-3" />
            Emerging Signals
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-[9px] font-bold">{emerging.length}</span>
          </span>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <AnimatePresence mode="popLayout">
            {emerging.map((e, i) => {
              const sparkData = e.trend.historicalData?.slice(-12) || [];
              const tviScore = Math.min(Math.round(e.growthRate * 0.3 + e.sourceCount * 10 + (120 - e.ageMinutes) * 0.3), 100);

              return (
                <motion.button
                  key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => onSelectTrend?.(e.trend)}
                  className="group relative overflow-hidden rounded-lg border border-emerald-500/20 bg-card hover:border-emerald-500/40 transition-all duration-150 text-left p-2.5 hover:shadow-sm"
                >
                  {/* Score + Status */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      🌱 Emerging
                    </span>
                    <span className={`text-[10px] font-black ${tviScore >= 70 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {tviScore}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight mb-1.5 min-h-[28px]">
                    {e.trend.title}
                  </p>

                  {/* Metrics row */}
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1.5 flex-wrap">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />+{Math.round(e.growthRate)}%
                    </span>
                    {e.trend.volume && e.trend.volume !== "0" && (
                      <span>💬 {e.trend.volume}</span>
                    )}
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="w-2 h-2" />
                      {e.ageMinutes < 60 ? `${e.ageMinutes}m` : `${Math.round(e.ageMinutes / 60)}h`}
                    </span>
                  </div>

                  {/* Source + Region */}
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <span>{e.trend.platform}</span>
                    {e.trend.countryCode && (
                      <span>{countryCodeToFlag(e.trend.countryCode)}</span>
                    )}
                    {e.sourceCount > 1 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Radio className="w-2 h-2" />{e.sourceCount}
                      </span>
                    )}
                  </div>

                  {/* Mini sparkline */}
                  {sparkData.length > 2 && (
                    <div className="mt-1.5 h-3 w-full opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                          <Area type="monotone" dataKey="value" stroke="hsl(142, 60%, 40%)" strokeWidth={1} fill="hsl(142, 60%, 40%)" fillOpacity={0.15} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

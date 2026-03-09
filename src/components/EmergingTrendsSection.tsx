import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Clock, Radio } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

// Signal type label for emerging trends
function getSignalLabel(platform: string): string {
  if (["Reddit", "Bluesky", "Mastodon"].includes(platform)) return "📱 Social Surge";
  if (["Google Trends"].includes(platform)) return "🔍 Search Spike";
  if (["NewsAPI", "GNews", "The Guardian", "Bing News", "NewsData"].includes(platform)) return "📰 News Break";
  if (["GitHub", "Hacker News", "Stack Overflow"].includes(platform)) return "💻 Dev Trend";
  return "📊 Signal";
}

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el) return text;
  el.innerHTML = text;
  return el.value;
};

export default function EmergingTrendsSection({ trends, onSelectTrend }: EmergingTrendsSectionProps) {
  const { t } = useLanguage();
  const emerging = useMemo(() => detectEmergingTrends(trends), [trends]);

  if (emerging.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        <AnimatePresence mode="popLayout">
          {emerging.map((e, i) => {
            const sparkData = e.trend.historicalData?.slice(-12) || [];
            const tviScore = Math.min(Math.round(e.growthRate * 0.3 + e.sourceCount * 10 + (120 - e.ageMinutes) * 0.3), 100);
            const signalLabel = getSignalLabel(e.trend.platform);

            return (
              <Tooltip key={`${e.trend.platform}-${e.trend.title.slice(0, 20)}`}>
                <TooltipTrigger asChild>
                  <motion.button
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                    onClick={() => onSelectTrend?.(e.trend)}
                    className="group relative overflow-hidden rounded-xl border border-border/30 bg-card hover:border-emerald-500/30 transition-colors duration-200 text-left p-3 flex flex-col"
                  >
                    {/* Score + Category */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-secondary text-muted-foreground">
                        {e.trend.category || "Geral"}
                      </span>
                      <span className={`text-sm font-black tabular-nums ${tviScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {tviScore}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug mb-2 min-h-[32px]">
                      {decodeEntities(e.trend.title)}
                    </p>

                    {/* Metrics row */}
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-1.5 flex-wrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" />+{Math.round(e.growthRate)}%
                      </span>
                      {e.trend.volume && e.trend.volume !== "0" && (
                        <span className="inline-flex items-center gap-0.5">💬 {e.trend.volume}</span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {e.ageMinutes < 1 ? "agora" : e.ageMinutes < 60 ? `há ${e.ageMinutes}min` : `há ${Math.round(e.ageMinutes / 60)}h`}
                      </span>
                    </div>

                    {/* Source + Region + Signal */}
                    <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground flex-wrap mt-auto">
                      <span>{e.trend.platform}</span>
                      {e.trend.countryCode && <span>{countryCodeToFlag(e.trend.countryCode)}</span>}
                      {e.sourceCount > 1 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Radio className="w-2 h-2" />{e.sourceCount}
                        </span>
                      )}
                      <span className="px-1 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[7px] font-semibold">{signalLabel}</span>
                    </div>

                    {/* Mini sparkline */}
                    {sparkData.length > 2 && (
                      <div className="mt-2 h-4 w-full opacity-50 group-hover:opacity-80 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparkData}>
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1} fill="hsl(var(--primary))" fillOpacity={0.1} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-[10px]">
                  <p className="font-semibold">{decodeEntities(e.trend.title)}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {e.trend.platform} · +{Math.round(e.growthRate)}% · {e.sourceCount} source{e.sourceCount > 1 ? "s" : ""} · {e.ageMinutes}min ago
                  </p>
                  {e.trend.description && <p className="text-muted-foreground mt-1 line-clamp-2">{e.trend.description}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

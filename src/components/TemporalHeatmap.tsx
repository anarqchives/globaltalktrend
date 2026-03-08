import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Info } from "lucide-react";
import { TrendCardProps } from "./TrendCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TemporalHeatmapProps {
  trends: TrendCardProps[];
}

const regionMap: Record<string, string> = {
  US: "Americas", BR: "Americas", CA: "Americas", MX: "Americas", AR: "Americas", CO: "Americas", CL: "Americas",
  GB: "Europe", FR: "Europe", DE: "Europe", IT: "Europe", ES: "Europe", PT: "Europe", NL: "Europe", PL: "Europe", SE: "Europe", NO: "Europe", CH: "Europe", AT: "Europe", BE: "Europe", IE: "Europe", FI: "Europe", DK: "Europe", CZ: "Europe", RO: "Europe", GR: "Europe", UA: "Europe", RU: "Europe",
  CN: "Asia", JP: "Asia", KR: "Asia", IN: "Asia", ID: "Asia", TH: "Asia", VN: "Asia", PH: "Asia", MY: "Asia", SG: "Asia", TW: "Asia", HK: "Asia", PK: "Asia", BD: "Asia",
  AU: "Oceania", NZ: "Oceania",
  ZA: "Africa", NG: "Africa", EG: "Africa", KE: "Africa", MA: "Africa", GH: "Africa", ET: "Africa", TZ: "Africa",
  SA: "Middle East", AE: "Middle East", IL: "Middle East", TR: "Middle East", IR: "Middle East", QA: "Middle East",
  GL: "Global",
};

const regions = ["Americas", "Europe", "Asia", "Middle East", "Africa", "Oceania", "Global"];

function getRegion(code?: string): string {
  if (!code || code.length !== 2) return "Global";
  return regionMap[code.toUpperCase()] || "Global";
}

const heatmapLegends: Record<string, string> = {
  pt: "Este heatmap mostra quando novas tendências foram detectadas em cada região nas últimas 24 horas. Cores mais quentes indicam maior concentração de sinais.",
  en: "This heatmap shows when new trends were detected across regions during the last 24 hours. Warmer colors indicate higher signal concentration.",
  es: "Este mapa muestra cuándo se detectaron nuevas tendencias en cada región durante las últimas 24 horas.",
};

export default function TemporalHeatmap({ trends }: TemporalHeatmapProps) {
  const { lang } = useLanguage();

  const { grid, maxVal, hours, totalSignals } = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const hrs: number[] = [];
    for (let i = 23; i >= 0; i--) {
      hrs.push((currentHour - i + 24) % 24);
    }

    const g: Record<string, number[]> = {};
    for (const r of regions) {
      g[r] = new Array(24).fill(0);
    }

    let total = 0;
    const ONE_HOUR = 3600_000;
    for (const trend of trends) {
      const ts = trend.publishedAt || trend.firstSeenAt;
      if (!ts) continue;
      const date = new Date(ts);
      if (isNaN(date.getTime())) continue;

      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 0 || diffMs > 24 * ONE_HOUR) continue;

      const hourIdx = 23 - Math.floor(diffMs / ONE_HOUR);
      if (hourIdx < 0 || hourIdx >= 24) continue;

      const region = getRegion(trend.countryCode);
      const changeVal = Math.abs(parseFloat(trend.change?.replace(/[^0-9.\-]/g, "") || "0"));
      const intensity = 1 + changeVal * 0.01;

      g[region][hourIdx] += intensity;
      total++;
    }

    let max = 0;
    for (const r of regions) {
      for (const v of g[r]) {
        if (v > max) max = v;
      }
    }

    return { grid: g, maxVal: max || 1, hours: hrs, totalSignals: total };
  }, [trends]);

  const getCellColor = (value: number): string => {
    if (value === 0) return "hsl(var(--secondary))";
    const ratio = value / maxVal;
    if (ratio > 0.8) return "hsl(0 84% 60%)";
    if (ratio > 0.6) return "hsl(25 100% 50%)";
    if (ratio > 0.4) return "hsl(40 100% 50%)";
    if (ratio > 0.2) return "hsl(142 60% 45%)";
    return "hsl(210 100% 40% / 0.3)";
  };

  const legendDesc = heatmapLegends[lang] || heatmapLegends.en;

  return (
    <div className="px-3 py-2.5 border-b border-border">
      <div className="flex items-center gap-1.5 mb-1">
        <Clock className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
          Temporal Heatmap
        </span>
        <span className="text-[9px] text-muted-foreground ml-1">24h × Region</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <Info className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[240px] text-[10px]">
            {legendDesc}
          </TooltipContent>
        </Tooltip>
        <span className="ml-auto text-[9px] text-muted-foreground">{totalSignals} signals</span>
      </div>

      {/* Legend description */}
      <p className="text-[9px] text-muted-foreground/70 mb-1.5 leading-relaxed">{legendDesc}</p>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex items-center ml-16 mb-0.5">
            {hours.map((h, i) => (
              <div key={i} className="flex-1 text-center text-[7px] text-muted-foreground">
                {i % 3 === 0 ? `${h}h` : ""}
              </div>
            ))}
          </div>

          {/* Rows */}
          {regions.map((region) => {
            const regionTotal = grid[region].reduce((a, b) => a + b, 0);
            return (
              <div key={region} className="flex items-center gap-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-16 text-[8px] font-semibold text-muted-foreground truncate flex-shrink-0 pr-1 text-right cursor-help">
                      {region}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-[10px]">
                    <span className="font-semibold">{region}</span>: {regionTotal.toFixed(0)} total intensity
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-1 gap-px">
                  {grid[region].map((val, hi) => (
                    <Tooltip key={hi}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: hi * 0.01 }}
                          className="flex-1 h-3.5 rounded-[2px] cursor-crosshair transition-all hover:scale-y-150 hover:z-10 hover:ring-1 hover:ring-foreground/20"
                          style={{ backgroundColor: getCellColor(val) }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] p-1.5">
                        <div className="font-semibold">{region} · {hours[hi]}:00</div>
                        <div className="text-muted-foreground">
                          {val === 0 ? "No signals detected" : `${val.toFixed(1)} signal intensity`}
                        </div>
                        {val > 0 && (
                          <div className="text-muted-foreground mt-0.5">
                            {Math.round(val)} trend{val >= 2 ? "s" : ""} detected in this window
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-1.5 ml-16">
            <span className="text-[8px] text-muted-foreground">Low</span>
            <div className="flex gap-px">
              {["hsl(210 100% 40% / 0.3)", "hsl(142 60% 45%)", "hsl(40 100% 50%)", "hsl(25 100% 50%)", "hsl(0 84% 60%)"].map((c, i) => (
                <div key={i} className="w-4 h-2 rounded-[1px]" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-[8px] text-muted-foreground">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

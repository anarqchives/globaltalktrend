import { useEffect, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, Clock, BarChart3, GitCompareArrows, Zap } from "lucide-react";
import { useTrendHistory } from "@/hooks/use-trend-history";
import type { SnapshotPoint } from "@/hooks/use-trend-history";

interface TrendHistoryTabProps {
  title: string;
  platform: string;
  category?: string;
  platformColor: string;
}

/** Simple linear regression on volume series, returns slope & intercept */
function linearRegression(points: SnapshotPoint[]) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.volume ?? 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += points[i].volume;
    sumXY += i * points[i].volume; sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function buildForecast(evolution: SnapshotPoint[], hoursAhead = 6): SnapshotPoint[] {
  if (evolution.length < 3) return [];
  const { slope, intercept } = linearRegression(evolution);
  const n = evolution.length;
  const forecast: SnapshotPoint[] = [];
  for (let h = 1; h <= hoursAhead; h++) {
    const vol = Math.max(0, Math.round(intercept + slope * (n - 1 + h)));
    forecast.push({ time: `+${h}h`, volume: vol, change: 0 });
  }
  return forecast;
}

const TrendHistoryTab = ({ title, platform, category, platformColor }: TrendHistoryTabProps) => {
  const { historyData, loading, fetchHistory } = useTrendHistory();

  useEffect(() => {
    fetchHistory(title, platform, category);
  }, [title, platform, category, fetchHistory]);

  const forecast = useMemo(() => {
    if (!historyData?.evolution?.length) return [];
    return buildForecast(historyData.evolution);
  }, [historyData]);

  const chartData = useMemo(() => {
    if (!historyData?.evolution) return [];
    const real = historyData.evolution.map(p => ({ ...p, forecast: null as number | null }));
    if (forecast.length > 0 && real.length > 0) {
      // Bridge: last real point also starts forecast line
      real[real.length - 1].forecast = real[real.length - 1].volume;
      for (const fp of forecast) {
        real.push({ time: fp.time, volume: null as any, change: 0, forecast: fp.volume });
      }
    }
    return real;
  }, [historyData, forecast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[11px] text-muted-foreground">Carregando histórico...</span>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <span className="text-[11px]">Sem dados históricos disponíveis</span>
      </div>
    );
  }

  const { evolution, similarTrends, percentileRank, avgCategoryVolume, isAboveAverage, peakTime } = historyData;
  const gradientId = `hist-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const forecastGradientId = `fc-${gradientId}`;

  const forecastTrend = forecast.length > 0
    ? (forecast[forecast.length - 1].volume > (evolution[evolution.length - 1]?.volume ?? 0) ? "up" : "down")
    : null;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Stats row */}
      <div className={`grid ${forecast.length > 0 ? "grid-cols-4" : "grid-cols-3"} gap-2`}>
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Percentil</span>
          <span className={`text-base font-bold ${percentileRank > 75 ? "text-green-500" : percentileRank > 50 ? "text-primary" : "text-muted-foreground"}`}>
            {percentileRank}%
          </span>
        </div>
        <div className="p-2 rounded-lg bg-accent/50 text-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Média cat.</span>
          <span className="text-[12px] font-semibold text-foreground">
            {avgCategoryVolume >= 1000 ? `${(avgCategoryVolume / 1000).toFixed(1)}K` : avgCategoryVolume}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-accent/50 text-center">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Status</span>
          <span className={`text-[11px] font-semibold ${isAboveAverage ? "text-green-500" : "text-muted-foreground"}`}>
            {isAboveAverage ? "↑ Acima" : "↓ Abaixo"}
          </span>
        </div>
        {forecast.length > 0 && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Previsão 6h</span>
            <span className={`text-[11px] font-bold ${forecastTrend === "up" ? "text-green-500" : "text-red-500"}`}>
              {forecastTrend === "up" ? "↑ Alta" : "↓ Queda"}
            </span>
          </div>
        )}
      </div>

      {/* Comparison insight */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
        <BarChart3 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-foreground leading-relaxed">
          {percentileRank >= 90
            ? `Crescimento maior que ${percentileRank}% das trends da categoria "${category || "Geral"}".`
            : percentileRank >= 50
            ? `Volume acima da média para a categoria "${category || "Geral"}".`
            : `Volume abaixo da média para a categoria "${category || "Geral"}".`}
          {peakTime && ` Pico registrado em ${peakTime}.`}
        </p>
      </div>

      {/* Evolution chart with forecast */}
      {chartData.length > 1 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <TrendingUp className="w-3 h-3" />
            Evolução do Volume
            {forecast.length > 0 && (
              <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-medium">
                <Zap className="w-2.5 h-2.5" /> Previsão
              </span>
            )}
          </span>
          <div className="h-32 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={platformColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={platformColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={forecastGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(Math.floor(chartData.length / 6), 1)}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                  formatter={(value: number, name: string) => {
                    const label = name === "forecast" ? "Previsão" : "Volume";
                    return [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, label];
                  }}
                />
                {forecast.length > 0 && (
                  <ReferenceLine
                    x={evolution[evolution.length - 1]?.time}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                )}
                <Area type="monotone" dataKey="volume" stroke={platformColor} strokeWidth={1.5} fill={`url(#${gradientId})`} connectNulls={false} />
                <Area type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" fill={`url(#${forecastGradientId})`} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Similar trends */}
      {similarTrends.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <GitCompareArrows className="w-3 h-3" />
            Trends Similares
          </span>
          <div className="space-y-1.5">
            {similarTrends.map((st, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-accent/30 text-[11px]">
                <span className="text-muted-foreground text-[9px] w-8 text-right flex-shrink-0">
                  {st.similarity}%
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{st.title}</p>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{st.platform}</span>
                    <span>{st.date}</span>
                    <span className={st.change > 0 ? "text-green-500" : "text-red-500"}>
                      {st.change > 0 ? "+" : ""}{st.change}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evolution.length === 0 && similarTrends.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-3">
          Dados históricos serão acumulados com o uso. Volte mais tarde para comparações.
        </p>
      )}
    </div>
  );
};

export default TrendHistoryTab;

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

// ── Sentiment Donut ──
interface DonutProps {
  positive: number;
  neutral: number;
  negative: number;
  size?: number;
  showLegend?: boolean;
}

export function SentimentDonut({ positive, neutral, negative, size = 80, showLegend = false }: DonutProps) {
  const total = positive + neutral + negative || 1;
  const pPct = positive / total;
  const nPct = neutral / total;
  const negPct = negative / total;
  const r = 32;
  const c = 2 * Math.PI * r;

  const segments = [
    { pct: pPct, color: "hsl(142, 60%, 45%)", label: "😊", name: "Positivo", value: Math.round(pPct * 100) },
    { pct: nPct, color: "hsl(var(--muted-foreground))", label: "😐", name: "Neutro", value: Math.round(nPct * 100) },
    { pct: negPct, color: "hsl(var(--destructive))", label: "😠", name: "Negativo", value: Math.round(negPct * 100) },
  ];

  let offset = 0;

  // Find dominant sentiment
  const dominant = segments.reduce((a, b) => a.value > b.value ? a : b);

  return (
    <div className={showLegend ? "flex items-center gap-3" : ""}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
            const dash = seg.pct * c;
            const gap = c - dash;
            const el = (
              <motion.circle
                key={i}
                cx="40" cy="40" r={r}
                fill="none"
                strokeWidth="8"
                stroke={seg.color}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${dash} ${gap}` }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-foreground">{dominant.value}%</span>
          <span className="text-[8px] text-muted-foreground">{dominant.label}</span>
        </div>
      </div>
      {showLegend && (
        <div className="flex flex-col gap-1 min-w-0">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-muted-foreground truncate">{seg.name}</span>
              <span className="font-semibold text-foreground ml-auto">{seg.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Emotion Bars ──
interface EmotionBarProps {
  emotions: { icon: string; label: string; percentage: number; color: string }[];
}

export function EmotionBars({ emotions }: EmotionBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {emotions.map((em, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <span className="w-5 text-center flex-shrink-0">{em.icon}</span>
          <div className="flex-1 h-4 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: em.color }}
              initial={{ width: 0 }}
              animate={{ width: `${em.percentage}%` }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
          <span className="text-muted-foreground font-medium w-8 text-right flex-shrink-0">{em.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Sentiment Wave Chart ──
interface WaveChartProps {
  data: { time: string; positive: number; neutral: number; negative: number }[];
}

export function SentimentWaveChart({ data }: WaveChartProps) {
  if (!data || data.length < 2) return null;
  return (
    <div className="h-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="wave-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(142, 60%, 45%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="wave-neu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(220, 10%, 60%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(220, 10%, 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="wave-neg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }}
          />
          <Area type="monotone" dataKey="positive" stroke="hsl(142, 60%, 45%)" strokeWidth={1.5} fill="url(#wave-pos)" stackId="1" />
          <Area type="monotone" dataKey="neutral" stroke="hsl(220, 10%, 60%)" strokeWidth={1} fill="url(#wave-neu)" stackId="1" />
          <Area type="monotone" dataKey="negative" stroke="hsl(0, 84%, 60%)" strokeWidth={1.5} fill="url(#wave-neg)" stackId="1" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Forecast Chart with Confidence Band ──
interface ForecastChartProps {
  historicalData: { time: string; value: number }[];
  forecastData: { time: string; value: number; upper: number; lower: number }[];
  platformColor: string;
}

export function ForecastChart({ historicalData, forecastData, platformColor }: ForecastChartProps) {
  const chartData = useMemo(() => {
    const real = historicalData.map(p => ({
      time: p.time,
      value: p.value,
      forecast: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
    }));
    if (forecastData.length > 0 && real.length > 0) {
      const last = real[real.length - 1];
      last.forecast = last.value;
      last.upper = last.value;
      last.lower = last.value;
      for (const fp of forecastData) {
        real.push({
          time: fp.time,
          value: null as any,
          forecast: fp.value,
          upper: fp.upper,
          lower: fp.lower,
        });
      }
    }
    return real;
  }, [historicalData, forecastData]);

  if (chartData.length < 2) return null;

  const gradId = `fc-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className="space-y-1">
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`${gradId}-real`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={platformColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={platformColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${gradId}-fc`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 10 }} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary) / 0.08)" connectNulls={false} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" connectNulls={false} />
            <Area type="monotone" dataKey="value" stroke={platformColor} strokeWidth={1.5} fill={`url(#${gradId}-real)`} connectNulls={false} />
            <Area type="monotone" dataKey="forecast" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 3" fill={`url(#${gradId}-fc)`} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: platformColor }} /> Histórico</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Previsão</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/20" /> Confiança</span>
      </div>
    </div>
  );
}

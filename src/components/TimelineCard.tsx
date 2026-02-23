import { useState } from "react";
import { Share2, ChevronDown, ChevronUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

const platformIcons: Record<string, { emoji: string; color: string }> = {
  YouTube: { emoji: "▶", color: "hsl(0, 72%, 51%)" },
  Reddit: { emoji: "◉", color: "hsl(16, 100%, 50%)" },
  "Google Trends": { emoji: "◎", color: "hsl(210, 100%, 40%)" },
  NewsAPI: { emoji: "◈", color: "hsl(142, 60%, 40%)" },
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
}

const TimelineCard = ({
  platform,
  title,
  category,
  time,
  volume,
  change,
  changePositive,
  details,
  historicalData,
  metricLabel,
  likeRatio,
  commentCount,
  region,
  countryCode,
  sources,
  onClick,
  onFilterPlatform,
}: TimelineCardProps) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const pf = platformIcons[platform] || platformIcons["Google Trends"];
  const isPeak = change && parseInt(change.replace(/[^0-9]/g, "")) > 100;
  const flag = countryCodeToFlag(countryCode);
  const gradientId = `tl-${title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 5)}`;

  const handlePlatformClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterPlatform?.(platform);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${title} — ${volume} (${platform})`);
    toast({ title: t("copied"), description: title.slice(0, 60) });
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="timeline-card group">
      <div className="flex items-start gap-3" onClick={onClick}>
        {/* Platform avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 cursor-pointer hover:scale-110 transition-transform"
          style={{ background: `${pf.color}15`, color: pf.color }}
          onClick={handlePlatformClick}
          title={`Filtrar por ${platform}`}
        >
          {pf.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Platform + time */}
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[11px] font-semibold cursor-pointer hover:underline"
              style={{ color: pf.color }}
              onClick={handlePlatformClick}
              title={`Filtrar por ${platform}`}
            >
              {platform}
            </span>
            {flag && <span className="text-xs" title={countryCode}>{flag}</span>}
            <span className="text-[11px] text-muted-foreground">{time}</span>
            {isPeak && <span className="peak-badge">🔥 {t("peak")}</span>}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1">
            {title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span className="text-muted-foreground">{category}</span>
            <span className="volume-badge text-[10px] py-0">{volume}</span>
            <span className={changePositive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
              {change}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleShare}
            className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <Share2 className="w-3 h-3" />
          </button>
          <button
            onClick={handleExpand}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
          {details && (
            <p className="text-xs text-muted-foreground mb-3">{details}</p>
          )}

          {/* Platform-specific metrics */}
          <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
            {platform === "YouTube" && likeRatio !== undefined && likeRatio > 0 && (
              <span className="source-tag text-[10px] py-0.5 px-2">👍 {likeRatio}% likes</span>
            )}
            {platform === "Reddit" && commentCount !== undefined && (
              <span className="source-tag text-[10px] py-0.5 px-2">💬 {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}K` : commentCount} comments</span>
            )}
            {platform === "Google Trends" && region && (
              <span className="source-tag text-[10px] py-0.5 px-2">📍 {region}</span>
            )}
            {platform === "NewsAPI" && sources && sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sources.slice(0, 3).map((s) => (
                  <span key={s} className="source-tag text-[10px] py-0.5 px-2">📰 {s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Historical chart */}
          {historicalData && historicalData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("evolution24h")}
                </span>
                <span className="text-[10px] text-muted-foreground">{metricLabel}</span>
              </div>
              <div className="h-28 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={pf.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={pf.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval={5}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 11,
                      }}
                      formatter={(value: number) => [
                        value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value,
                        metricLabel || "valor",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={pf.color}
                      strokeWidth={1.5}
                      fill={`url(#${gradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineCard;

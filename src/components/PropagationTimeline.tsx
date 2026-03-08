import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Radio } from "lucide-react";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";
import { useLanguage } from "@/contexts/LanguageContext";

interface PropagationTimelineProps {
  cluster: CrossPlatformCluster;
  compact?: boolean;
}

const platformColors: Record<string, string> = {
  YouTube: "hsl(0 72% 51%)",
  Reddit: "hsl(16 100% 50%)",
  "Google Trends": "hsl(210 100% 40%)",
  NewsAPI: "hsl(142 60% 40%)",
  Bluesky: "hsl(200 100% 50%)",
  Mastodon: "hsl(270 60% 55%)",
  "Hacker News": "hsl(25 100% 50%)",
  Wikipedia: "hsl(0 0% 40%)",
  GitHub: "hsl(0 0% 20%)",
  "X (Twitter)": "hsl(0 0% 15%)",
  "Stack Overflow": "hsl(25 90% 50%)",
  "The Guardian": "hsl(210 80% 35%)",
  GNews: "hsl(142 50% 45%)",
  "Bing News": "hsl(200 90% 45%)",
};

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

interface TimelineNode {
  platform: string;
  time: Date;
  countryCode?: string;
  volume: string;
  isOrigin: boolean;
}

export default function PropagationTimeline({ cluster, compact }: PropagationTimelineProps) {
  const { t } = useLanguage();

  const nodes = useMemo(() => {
    const result: TimelineNode[] = [];
    const seen = new Set<string>();

    // Sort trends by time to show propagation order
    const sorted = [...cluster.trends].sort((a, b) => {
      const ta = a.firstSeenAt || a.publishedAt || "";
      const tb = b.firstSeenAt || b.publishedAt || "";
      return new Date(ta).getTime() - new Date(tb).getTime();
    });

    for (const trend of sorted) {
      const key = trend.platform;
      if (seen.has(key)) continue;
      seen.add(key);

      const time = new Date(trend.firstSeenAt || trend.publishedAt || Date.now());
      result.push({
        platform: trend.platform,
        time,
        countryCode: trend.countryCode,
        volume: trend.volume,
        isOrigin: result.length === 0,
      });
    }

    return result;
  }, [cluster]);

  if (nodes.length < 2) return null;

  const origin = nodes[0];
  const timeSpan = nodes[nodes.length - 1].time.getTime() - origin.time.getTime();
  const formatDiff = (ms: number) => {
    const mins = Math.round(ms / 60_000);
    if (mins < 60) return `${mins}min`;
    return `${Math.round(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ""}`;
  };

  return (
    <div className={`${compact ? "py-2" : "py-3"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Radio className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
          Propagação
        </span>
        {timeSpan > 0 && (
          <span className="text-[9px] text-muted-foreground ml-1">
            ({formatDiff(timeSpan)} de spread)
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-0">
        {/* Connection line */}
        <div className="absolute top-1/2 left-4 right-4 h-px bg-border -translate-y-1/2 z-0" />

        {nodes.map((node, i) => {
          const color = platformColors[node.platform] || "hsl(var(--muted-foreground))";
          const diff = node.time.getTime() - origin.time.getTime();

          return (
            <motion.div
              key={node.platform}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="relative z-10 flex flex-col items-center flex-1 min-w-0"
            >
              {/* Node circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 bg-card shadow-sm ${node.isOrigin ? "ring-2 ring-primary/30" : ""}`}
                style={{ borderColor: color, color }}
                title={node.platform}
              >
                {node.isOrigin ? "①" : `${i + 1}`}
              </div>

              {/* Platform label */}
              <span className="text-[8px] font-semibold mt-1 truncate max-w-full text-center" style={{ color }}>
                {node.platform.length > 10 ? node.platform.slice(0, 8) + "…" : node.platform}
              </span>

              {/* Time diff */}
              <span className="text-[8px] text-muted-foreground">
                {node.isOrigin ? "Origem" : `+${formatDiff(diff)}`}
              </span>

              {/* Country flag */}
              {node.countryCode && (
                <span className="text-[10px]">{countryCodeToFlag(node.countryCode)}</span>
              )}

              {/* Arrow between nodes */}
              {i < nodes.length - 1 && (
                <ArrowRight
                  className="absolute -right-1 top-[10px] w-2.5 h-2.5 text-muted-foreground/40 z-20"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Globe className="w-2.5 h-2.5" />
          {cluster.platformCount} plataformas
        </span>
        <span className="opacity-40">·</span>
        <span>Origem: {origin.platform}</span>
        {cluster.trends.length > 0 && (
          <>
            <span className="opacity-40">·</span>
            <span>
              {[...new Set(cluster.trends.map(t => t.countryCode).filter(Boolean))].length} países
            </span>
          </>
        )}
      </div>
    </div>
  );
}

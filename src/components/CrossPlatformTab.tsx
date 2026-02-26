import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { CrossPlatformCluster } from "@/hooks/use-cross-platform";

interface CrossPlatformTabProps {
  cluster: CrossPlatformCluster | null;
}

const platformTypeLabels: Record<string, { label: string; emoji: string; color: string }> = {
  press: { label: "Imprensa", emoji: "📰", color: "hsl(142, 60%, 45%)" },
  social: { label: "Redes Sociais", emoji: "💬", color: "hsl(210, 100%, 50%)" },
  search: { label: "Buscas", emoji: "🔍", color: "hsl(40, 90%, 50%)" },
  science: { label: "Ciência", emoji: "🔬", color: "hsl(270, 60%, 55%)" },
  official: { label: "Dados Oficiais", emoji: "🏛️", color: "hsl(200, 60%, 45%)" },
  other: { label: "Outros", emoji: "📊", color: "hsl(0, 0%, 50%)" },
};

const sentimentLabels: Record<string, { label: string; emoji: string; className: string }> = {
  positive: { label: "Positivo", emoji: "😊", className: "text-green-600" },
  negative: { label: "Negativo", emoji: "😟", className: "text-red-500" },
  neutral: { label: "Neutro", emoji: "😐", className: "text-muted-foreground" },
};

const CrossPlatformTab = ({ cluster }: CrossPlatformTabProps) => {
  const { t } = useLanguage();

  // Volume by platform type
  const volumeByType = useMemo(() => {
    if (!cluster) return [];
    const map: Record<string, number> = {};
    for (const trend of cluster.trends) {
      const vol = parseInt((trend.volume || "0").replace(/[^0-9]/g, "")) || 0;
      const type = getPlatformTypeFromPlatform(trend.platform);
      map[type] = (map[type] || 0) + vol;
    }
    return Object.entries(map).map(([type, volume]) => ({
      type,
      label: platformTypeLabels[type]?.label || type,
      emoji: platformTypeLabels[type]?.emoji || "📊",
      volume,
      color: platformTypeLabels[type]?.color || "hsl(0,0%,50%)",
    })).sort((a, b) => b.volume - a.volume);
  }, [cluster]);

  if (!cluster) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <span className="text-2xl">📊</span>
        <p className="text-xs text-muted-foreground">
          Este assunto não foi detectado em múltiplas plataformas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
          🔥 Visão Cruzada
        </span>
        <span className="text-[10px] text-muted-foreground">
          {cluster.platformCount} tipos de mídia
        </span>
      </div>

      {/* Volume by platform chart */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Volume por plataforma
        </p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeByType} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                formatter={(value: number) => [value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value, "Volume"]}
              />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {volumeByType.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment comparison */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Sentimento por mídia
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(cluster.sentimentByPlatform).map(([type, sentiment]) => {
            const typeInfo = platformTypeLabels[type];
            const sentInfo = sentimentLabels[sentiment];
            return (
              <div key={type} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs">{typeInfo?.emoji}</span>
                <span className="text-[10px] font-medium text-foreground">{typeInfo?.label}</span>
                <span className={`text-xs ${sentInfo?.className}`}>{sentInfo?.emoji}</span>
                <span className={`text-[10px] ${sentInfo?.className}`}>{sentInfo?.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Propagation timeline */}
      {cluster.propagationPath.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Caminho de propagação
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/20">
              {platformTypeLabels[cluster.propagationOrigin]?.emoji} {platformTypeLabels[cluster.propagationOrigin]?.label || cluster.propagationOrigin}
            </span>
            {cluster.propagationPath.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">→</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-muted text-foreground border border-border">
                  {platformTypeLabels[step.to]?.emoji} {platformTypeLabels[step.to]?.label || step.to}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform list */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Plataformas detectadas ({cluster.platforms.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {cluster.platforms.map((p) => (
            <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground border border-border">
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

function getPlatformTypeFromPlatform(platform: string): string {
  const social = ["Reddit", "Bluesky", "Mastodon", "X (Twitter)", "YouTube"];
  const press = ["NewsAPI", "NewsData", "GNews", "Bing News", "The Guardian", "BBC", "Reuters", "AP", "NPR"];
  const search = ["Google Trends"];
  const science = ["OpenAlex", "arXiv"];
  const official = ["World Bank", "IBGE"];

  if (social.some(s => platform.includes(s))) return "social";
  if (press.some(p => platform.includes(p))) return "press";
  if (search.some(s => platform.includes(s))) return "search";
  if (science.some(s => platform.includes(s))) return "science";
  if (official.some(o => platform.includes(o))) return "official";
  return "other";
}

export default CrossPlatformTab;

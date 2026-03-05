import { useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";
import { TrendingUp, Globe, Zap, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface KPICardsProps {
  trends: TrendCardProps[];
  countriesCount: number;
  loading: boolean;
}

function parseChange(change: string): number {
  const n = parseFloat(change.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseVolume(vol: string): number {
  const clean = vol.replace(/[^0-9kKmM.]/g, "");
  const lower = clean.toLowerCase();
  if (lower.includes("m")) return parseFloat(lower) * 1_000_000 || 0;
  if (lower.includes("k")) return parseFloat(lower) * 1_000 || 0;
  return parseFloat(clean) || 0;
}

export default function KPICards({ trends, countriesCount, loading }: KPICardsProps) {
  const { t } = useLanguage();

  const kpis = useMemo(() => {
    if (!trends.length) return null;

    // 1. Total active trends
    const total = trends.length;

    // 2. Fastest growing trend (last 2h implied by current data)
    let fastestTrend = trends[0];
    let fastestChange = 0;
    for (const tr of trends) {
      const ch = parseChange(tr.change);
      if (ch > fastestChange) {
        fastestChange = ch;
        fastestTrend = tr;
      }
    }

    // 3. Most active country
    const countryMap: Record<string, number> = {};
    for (const tr of trends) {
      const cc = tr.countryCode?.slice(0, 2).toUpperCase();
      if (cc && cc !== "GL") {
        countryMap[cc] = (countryMap[cc] || 0) + 1;
      }
    }
    const topCountryEntry = Object.entries(countryMap).sort((a, b) => b[1] - a[1])[0];
    const topCountryCode = topCountryEntry?.[0] || "US";
    const topCountryCount = topCountryEntry?.[1] || 0;

    // Country code to flag
    const flag = topCountryCode
      .split("")
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join("");

    // 4. Average growth
    let totalChange = 0;
    let counted = 0;
    for (const tr of trends) {
      const ch = parseChange(tr.change);
      if (ch !== 0) {
        totalChange += ch;
        counted++;
      }
    }
    const avgGrowth = counted > 0 ? Math.round(totalChange / counted) : 0;

    return { total, fastestTrend, fastestChange, topCountryCode, topCountryCount, flag, avgGrowth };
  }, [trends]);

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-2 py-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Tendências ativas",
      value: kpis.total.toString(),
      sub: `${countriesCount} ${t("countries") || "países"}`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Maior crescimento",
      value: `+${Math.round(kpis.fastestChange)}%`,
      sub: kpis.fastestTrend.title.slice(0, 30) + (kpis.fastestTrend.title.length > 30 ? "…" : ""),
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: <Globe className="w-4 h-4" />,
      label: "País mais ativo",
      value: `${kpis.flag} ${kpis.topCountryCode}`,
      sub: `${kpis.topCountryCount} tendências`,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Crescimento médio",
      value: `${kpis.avgGrowth > 0 ? "+" : ""}${kpis.avgGrowth}%`,
      sub: "vs. média geral",
      color: kpis.avgGrowth >= 0 ? "text-green-500" : "text-red-500",
      bg: kpis.avgGrowth >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-2 py-1.5">
      {cards.map((card, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-xl border bg-card p-3 transition-all hover:shadow-sm"
        >
          <div className={`${card.bg} ${card.color} rounded-lg p-2 shrink-0`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
              {card.label}
            </p>
            <p className={`text-base font-bold ${card.color} leading-tight`}>
              {card.value}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

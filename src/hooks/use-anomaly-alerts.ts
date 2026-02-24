import { useState, useEffect, useMemo } from "react";
import { TrendCardProps } from "@/components/TrendCard";
import { toast } from "@/hooks/use-toast";

export interface AnomalyAlert {
  trend: TrendCardProps;
  type: "spike" | "viral" | "multi_platform" | "rapid_growth";
  severity: "high" | "medium";
  message: string;
}

function parseChange(change: string): number {
  const match = (change || "").match(/[+-]?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export function useAnomalyAlerts(trends: TrendCardProps[]) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem("gtt_dismissed_anomalies");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [notified, setNotified] = useState<Set<string>>(new Set());

  const anomalies = useMemo(() => {
    const results: AnomalyAlert[] = [];
    const titleMap = new Map<string, TrendCardProps[]>();

    for (const t of trends) {
      const key = t.title.toLowerCase().slice(0, 40);
      if (!titleMap.has(key)) titleMap.set(key, []);
      titleMap.get(key)!.push(t);
    }

    for (const t of trends) {
      const key = t.title.toLowerCase().slice(0, 40);
      const change = parseChange(t.change);
      const platforms = new Set((titleMap.get(key) || []).map(x => x.platform));

      // Spike: > 300% growth
      if (change > 300) {
        results.push({
          trend: t,
          type: "spike",
          severity: "high",
          message: `📊 "${t.title.slice(0, 50)}" disparou ${change}% — padrão anômalo detectado`,
        });
        continue;
      }

      // Multi-platform convergence
      if (platforms.size >= 3 && change > 100) {
        results.push({
          trend: t,
          type: "multi_platform",
          severity: "high",
          message: `🌐 "${t.title.slice(0, 50)}" em ${platforms.size} plataformas simultâneas`,
        });
        continue;
      }

      // Rapid growth
      if (change > 200) {
        results.push({
          trend: t,
          type: "rapid_growth",
          severity: "medium",
          message: `⚡ "${t.title.slice(0, 50)}" crescendo rapidamente (+${change}%)`,
        });
      }
    }

    // Dedupe by title key
    const seen = new Set<string>();
    return results.filter(a => {
      const k = a.trend.title.toLowerCase().slice(0, 40);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 10);
  }, [trends]);

  const activeAnomalies = useMemo(
    () => anomalies.filter(a => !dismissed.has(a.trend.title.toLowerCase().slice(0, 40))),
    [anomalies, dismissed]
  );

  // Show toast for new anomalies (once per session)
  useEffect(() => {
    for (const a of activeAnomalies) {
      const key = a.trend.title.toLowerCase().slice(0, 40);
      if (!notified.has(key) && a.severity === "high") {
        toast({ title: "🚨 Anomalia detectada", description: a.message.slice(0, 100) });
        setNotified(prev => new Set(prev).add(key));
      }
    }
  }, [activeAnomalies]);

  const dismiss = (title: string) => {
    const key = title.toLowerCase().slice(0, 40);
    setDismissed(prev => {
      const next = new Set(prev).add(key);
      sessionStorage.setItem("gtt_dismissed_anomalies", JSON.stringify([...next]));
      return next;
    });
  };

  return { anomalies: activeAnomalies, totalCount: activeAnomalies.length, dismiss };
}

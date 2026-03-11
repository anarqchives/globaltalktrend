import { useState, useEffect, useMemo, useCallback } from "react";
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

// Platform-specific thresholds to prevent tech platforms from dominating signals
const PLATFORM_THRESHOLDS: Record<string, number> = {
  GitHub: 500,
  "Hacker News": 400,
  "Stack Overflow": 400,
  "Google Trends": 150,
  "The Guardian": 80,
  NPR: 80,
  Reddit: 200,
  YouTube: 150,
  FRED: 50,
  "World Bank": 50,
  IBGE: 50,
  OpenAlex: 200,
  PubMed: 100,
  Wikipedia: 150,
};
const MAX_PER_PLATFORM = 3;

/** Request notification permission and return status */
async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Send a local push notification via the service worker */
async function sendPushNotification(title: string, body: string) {
  try {
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      reg.showNotification(title, {
        body: body.slice(0, 120),
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: "anomaly-alert",
      } as NotificationOptions);
    }
  } catch {}
}

export function useAnomalyAlerts(trends: TrendCardProps[]) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem("gtt_dismissed_anomalies");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const [pushEnabled, setPushEnabled] = useState(false);

  // Request permission on mount
  useEffect(() => {
    requestPushPermission().then(setPushEnabled);
  }, []);

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

      if (change > 300) {
        results.push({
          trend: t,
          type: "spike",
          severity: "high",
          message: `📊 "${t.title.slice(0, 50)}" disparou ${change}% — padrão anômalo detectado`,
        });
        continue;
      }

      if (platforms.size >= 3 && change > 100) {
        results.push({
          trend: t,
          type: "multi_platform",
          severity: "high",
          message: `🌐 "${t.title.slice(0, 50)}" em ${platforms.size} plataformas simultâneas`,
        });
        continue;
      }

      if (change > 200) {
        results.push({
          trend: t,
          type: "rapid_growth",
          severity: "medium",
          message: `⚡ "${t.title.slice(0, 50)}" crescendo rapidamente (+${change}%)`,
        });
      }
    }

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

  // Anomaly notifications are now exclusively shown inside the Trend Radar Critical Alerts tab.
  // No toasts or push notifications are fired from here.

  const dismiss = useCallback((title: string) => {
    const key = title.toLowerCase().slice(0, 40);
    setDismissed(prev => {
      const next = new Set(prev).add(key);
      sessionStorage.setItem("gtt_dismissed_anomalies", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const enablePush = useCallback(async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    return granted;
  }, []);

  return { anomalies: activeAnomalies, totalCount: activeAnomalies.length, dismiss, pushEnabled, enablePush };
}

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CACHE_KEY = "gtt_offline_trends";

export function saveOfflineCache(trends: any[]) {
  try {
    const payload = { trends: trends.slice(0, 30), savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export function getOfflineCache(): { trends: any[]; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const OfflineFallback = () => {
  const { lang } = useLanguage();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cache, setCache] = useState(getOfflineCache());

  useEffect(() => {
    const goOff = () => setIsOffline(true);
    const goOn = () => setIsOffline(false);
    window.addEventListener("offline", goOff);
    window.addEventListener("online", goOn);
    return () => {
      window.removeEventListener("offline", goOff);
      window.removeEventListener("online", goOn);
    };
  }, []);

  if (!isOffline) return null;

  const cachedData = cache || getOfflineCache();
  const timeAgo = cachedData ? Math.round((Date.now() - cachedData.savedAt) / 60000) : 0;

  if (!cachedData || cachedData.trends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3" role="alert">
        <WifiOff className="w-8 h-8 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">
          {lang === "pt" ? "Sem conexão" : "You're offline"}
        </p>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          {lang === "pt"
            ? "Nenhum dado em cache disponível. Conecte-se à internet para ver as tendências."
            : "No cached data available. Connect to the internet to see trends."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          aria-label={lang === "pt" ? "Tentar novamente" : "Retry"}
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          {lang === "pt" ? "Tentar novamente" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 mb-3">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] text-muted-foreground">
          {lang === "pt"
            ? `Modo offline · Dados de ${timeAgo} min atrás`
            : `Offline mode · Data from ${timeAgo} min ago`}
        </span>
      </div>
      <div className="space-y-2">
        {cachedData.trends.map((t: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border border-border/50 bg-card">
            <p className="text-xs font-medium text-foreground line-clamp-2">{t.title}</p>
            <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
              <span className="uppercase font-semibold">{t.platform}</span>
              {t.volume && <span>{t.volume}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfflineFallback;

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Globe, Activity, Clock, Server, Wifi, WifiOff, Zap, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAggregatorDiagnostics, type AggregatorSourceStatus } from "@/services/aggregatorService";

interface SourceHealth {
  name: string;
  ok: boolean;
  count: number;
  lastUpdate: Date | null;
  avgResponseTime: number | null;
  countries: string[];
  errorRate: number;
}

interface CountryCoverage {
  code: string;
  name: string;
  trendCount: number;
  sources: string[];
  lastSeen: Date | null;
}

interface LiveAPIStatus {
  name: string;
  functionName: string;
  status: "online" | "degraded" | "offline" | "checking";
  responseTime: number | null;
  trendCount: number;
  lastCheck: Date | null;
  error?: string;
}

const KNOWN_SOURCES = [
  "Google Trends", "YouTube", "Reddit", "Bluesky", "Mastodon",
  "Hacker News", "NewsAPI", "GNews", "Bing News", "NewsData",
  "The Guardian", "OpenAlex", "Stack Overflow", "Wikipedia", "GitHub",
  "Currents", "Mediastack"
];

const API_ENDPOINTS: { name: string; functionName: string; group: string }[] = [
  { name: "Google Trends / YouTube", functionName: "fetch-trends", group: "Core" },
  { name: "News Extra (NPR/RSS/NYT)", functionName: "fetch-news-extra", group: "Imprensa" },
  { name: "Extra Sources (Guardian/WB)", functionName: "fetch-extra-sources", group: "Imprensa" },
  { name: "Social Trends (HN/Wiki/GH)", functionName: "fetch-social-trends", group: "Social" },
  { name: "Open Data (Wiki/arXiv/PubMed)", functionName: "fetch-open-data", group: "Dados" },
  { name: "GDELT DOC", functionName: "fetch-gdelt-trends", group: "Conflitos" },
  { name: "Crossref", functionName: "fetch-crossref", group: "Ciência" },
  { name: "Semantic Scholar", functionName: "fetch-semantic-scholar", group: "Ciência" },
  { name: "OMS (WHO)", functionName: "fetch-who-data", group: "Saúde" },
  { name: "FMI (IMF)", functionName: "fetch-imf-data", group: "Economia" },
  { name: "Tech/Science Extra", functionName: "fetch-tech-science-extra", group: "Tech" },
  { name: "FRED Economics", functionName: "fetch-fred", group: "Economia" },
  { name: "The News API", functionName: "fetch-thenewsapi", group: "Imprensa" },
  { name: "Currents / Mediastack", functionName: "fetch-currents-mediastack", group: "Imprensa" },
  { name: "Reddit / Bluesky / Mastodon", functionName: "fetch-reddit-bluesky-mastodon", group: "Social" },
];

const countryNames: Record<string, string> = {
  BR: "Brasil", US: "EUA", GB: "Reino Unido", FR: "França", DE: "Alemanha",
  ES: "Espanha", IT: "Itália", PT: "Portugal", JP: "Japão", KR: "Coreia do Sul",
  IN: "Índia", CN: "China", RU: "Rússia", AU: "Austrália", CA: "Canadá",
  MX: "México", AR: "Argentina", CO: "Colômbia", CL: "Chile", ZA: "África do Sul",
  NG: "Nigéria", EG: "Egito", TR: "Turquia", SA: "Arábia Saudita", AE: "Emirados",
  PL: "Polônia", NL: "Holanda", SE: "Suécia", NO: "Noruega", UA: "Ucrânia",
  ID: "Indonésia", TH: "Tailândia", VN: "Vietnã", PH: "Filipinas",
  PK: "Paquistão", IR: "Irã", IQ: "Iraque", KE: "Quênia",
};

export default function Admin() {
  const navigate = useNavigate();
  const [sourceHealth, setSourceHealth] = useState<SourceHealth[]>([]);
  const [countryCoverage, setCountryCoverage] = useState<CountryCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDiagnostic, setLastDiagnostic] = useState<Date | null>(null);
  const [liveStatuses, setLiveStatuses] = useState<LiveAPIStatus[]>(
    API_ENDPOINTS.map(e => ({ name: e.name, functionName: e.functionName, status: "checking" as const, responseTime: null, trendCount: 0, lastCheck: null }))
  );
  const [liveChecking, setLiveChecking] = useState(false);

  // ─── Live API Health Check ─────────────────────────────────────
  const checkLiveAPIs = useCallback(async () => {
    setLiveChecking(true);
    const newStatuses: LiveAPIStatus[] = [];

    const checks = API_ENDPOINTS.map(async (endpoint) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          supabase.functions.invoke(endpoint.functionName, { body: { lang: "pt" } }),
          new Promise<{ data: null; error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout 15s")), 15000)
          ),
        ]) as any;

        const elapsed = Date.now() - start;
        const trends = result?.data?.trends || [];
        const count = trends.length;

        let status: "online" | "degraded" | "offline" = "offline";
        if (count > 0) status = elapsed > 8000 ? "degraded" : "online";
        else if (!result?.error) status = "degraded";

        return {
          name: endpoint.name,
          functionName: endpoint.functionName,
          status,
          responseTime: elapsed,
          trendCount: count,
          lastCheck: new Date(),
          error: result?.error?.message,
        } satisfies LiveAPIStatus;
      } catch (e) {
        return {
          name: endpoint.name,
          functionName: endpoint.functionName,
          status: "offline" as const,
          responseTime: Date.now() - start,
          trendCount: 0,
          lastCheck: new Date(),
          error: String(e),
        } satisfies LiveAPIStatus;
      }
    });

    const results = await Promise.allSettled(checks);
    for (const r of results) {
      if (r.status === "fulfilled") newStatuses.push(r.value);
    }
    setLiveStatuses(newStatuses);
    setLiveChecking(false);
  }, []);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: snapshots } = await supabase
        .from("trend_snapshots")
        .select("*")
        .gte("snapshot_at", since)
        .order("snapshot_at", { ascending: false })
        .limit(1000);

      if (!snapshots) { setLoading(false); return; }

      const sourceMap = new Map<string, { count: number; countries: Set<string>; lastAt: Date | null }>();
      KNOWN_SOURCES.forEach(s => sourceMap.set(s, { count: 0, countries: new Set(), lastAt: null }));

      snapshots.forEach(snap => {
        const platform = snap.platform || "Unknown";
        if (!sourceMap.has(platform)) {
          sourceMap.set(platform, { count: 0, countries: new Set(), lastAt: null });
        }
        const entry = sourceMap.get(platform)!;
        entry.count++;
        if (snap.country_code) entry.countries.add(snap.country_code);
        const snapDate = new Date(snap.snapshot_at);
        if (!entry.lastAt || snapDate > entry.lastAt) entry.lastAt = snapDate;
      });

      const healthArr: SourceHealth[] = [];
      sourceMap.forEach((val, name) => {
        healthArr.push({
          name, ok: val.count > 0, count: val.count, lastUpdate: val.lastAt,
          avgResponseTime: null, countries: [...val.countries], errorRate: val.count === 0 ? 100 : 0,
        });
      });
      healthArr.sort((a, b) => b.count - a.count);
      setSourceHealth(healthArr);

      const countryMap = new Map<string, { count: number; sources: Set<string>; lastAt: Date | null }>();
      snapshots.forEach(snap => {
        const cc = snap.country_code || "GL";
        if (!countryMap.has(cc)) countryMap.set(cc, { count: 0, sources: new Set(), lastAt: null });
        const entry = countryMap.get(cc)!;
        entry.count++;
        if (snap.platform) entry.sources.add(snap.platform);
        const d = new Date(snap.snapshot_at);
        if (!entry.lastAt || d > entry.lastAt) entry.lastAt = d;
      });

      const coverageArr: CountryCoverage[] = [];
      countryMap.forEach((val, code) => {
        coverageArr.push({ code, name: countryNames[code] || code, trendCount: val.count, sources: [...val.sources], lastSeen: val.lastAt });
      });
      coverageArr.sort((a, b) => b.trendCount - a.trendCount);
      setCountryCoverage(coverageArr);
      setLastDiagnostic(new Date());
    } catch (err) {
      console.error("Diagnostic error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
    checkLiveAPIs();
  }, []);

  const stats = useMemo(() => {
    const active = sourceHealth.filter(s => s.ok).length;
    const total = sourceHealth.length;
    const totalTrends = sourceHealth.reduce((a, s) => a + s.count, 0);
    const countriesWithData = countryCoverage.filter(c => c.trendCount > 0).length;
    const liveOnline = liveStatuses.filter(s => s.status === "online").length;
    const liveDegraded = liveStatuses.filter(s => s.status === "degraded").length;
    const liveOffline = liveStatuses.filter(s => s.status === "offline").length;
    const liveTrends = liveStatuses.reduce((a, s) => a + s.trendCount, 0);
    return { active, total, totalTrends, countriesWithData, liveOnline, liveDegraded, liveOffline, liveTrends };
  }, [sourceHealth, countryCoverage, liveStatuses]);

  const formatTime = (d: Date | null) => {
    if (!d) return "—";
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.round(diff / 60000)}min atrás`;
    return `${Math.round(diff / 3600000)}h atrás`;
  };

  const statusColor = (s: string) => {
    if (s === "online") return "bg-emerald-500";
    if (s === "degraded") return "bg-amber-500";
    return "bg-red-500";
  };
  const statusIcon = (s: string) => {
    if (s === "online") return <Wifi className="w-3.5 h-3.5 text-emerald-500" />;
    if (s === "degraded") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    if (s === "checking") return <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />;
    return <WifiOff className="w-3.5 h-3.5 text-red-500" />;
  };
  const statusLabel = (s: string) => {
    if (s === "online") return "Online";
    if (s === "degraded") return "Degradado";
    if (s === "checking") return "Verificando...";
    return "Offline";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Painel de Diagnóstico</h1>
              <p className="text-xs text-muted-foreground">
                Saúde das fontes e cobertura por país
                {lastDiagnostic && ` · Atualizado ${formatTime(lastDiagnostic)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={checkLiveAPIs} disabled={liveChecking} size="sm" variant="outline">
              <Zap className={`w-3.5 h-3.5 mr-1.5 ${liveChecking ? "animate-pulse" : ""}`} />
              {liveChecking ? "Testando..." : "Testar APIs"}
            </Button>
            <Button onClick={runDiagnostic} disabled={loading} size="sm" variant="outline">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analisando..." : "Atualizar"}
            </Button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "APIs Online", value: `${stats.liveOnline}/${API_ENDPOINTS.length}`, icon: Wifi, color: stats.liveOnline > API_ENDPOINTS.length * 0.7 ? "text-emerald-500" : stats.liveOnline > API_ENDPOINTS.length * 0.4 ? "text-amber-500" : "text-red-500" },
            { label: "Trends ao Vivo", value: stats.liveTrends.toLocaleString(), icon: Zap, color: "text-blue-500" },
            { label: "Países com Dados", value: stats.countriesWithData.toString(), icon: Globe, color: "text-purple-500" },
            { label: "Snapshots (24h)", value: stats.totalTrends.toLocaleString(), icon: Activity, color: "text-muted-foreground" },
          ].map(s => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── LIVE API STATUS ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4" /> Status em Tempo Real das APIs
              <div className="flex gap-1.5 ml-auto">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online ({stats.liveOnline})
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Degradado ({stats.liveDegraded})
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Offline ({stats.liveOffline})
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {liveStatuses.map(api => (
              <div key={api.functionName} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor(api.status)} ${api.status === "checking" ? "animate-pulse" : ""}`} />
                <div className="flex-shrink-0">{statusIcon(api.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{api.name}</span>
                    <Badge
                      variant={api.status === "online" ? "default" : api.status === "degraded" ? "secondary" : "destructive"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {statusLabel(api.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{api.trendCount} trends</span>
                    {api.responseTime !== null && <span>{api.responseTime}ms</span>}
                    {api.error && <span className="text-red-400 truncate max-w-[200px]">{api.error}</span>}
                  </div>
                </div>
                <div className="w-20 text-right">
                  {api.responseTime !== null && (
                    <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          api.responseTime < 3000 ? "bg-emerald-500" :
                          api.responseTime < 8000 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((api.responseTime / 15000) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Source health from snapshots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4" /> Saúde das Fontes (Snapshots 24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sourceHealth.map(source => (
              <div key={source.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                <div className="flex-shrink-0">
                  {source.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{source.name}</span>
                    <Badge variant={source.ok ? "default" : "destructive"} className="text-[9px] px-1.5 py-0">
                      {source.ok ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{source.count} snapshots</span>
                    <span>{source.countries.length} países</span>
                    <span>{formatTime(source.lastUpdate)}</span>
                  </div>
                </div>
                <div className="w-24">
                  <Progress value={Math.min((source.count / Math.max(...sourceHealth.map(s => s.count), 1)) * 100, 100)} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Country coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Cobertura por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {countryCoverage.slice(0, 30).map(c => {
                  const flag = c.code.length === 2
                    ? String.fromCodePoint(...[...c.code.toUpperCase()].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65))
                    : "🌍";
                  return (
                    <div key={c.code} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                      <span className="text-lg">{flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.trendCount} trends · {c.sources.length} fontes
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

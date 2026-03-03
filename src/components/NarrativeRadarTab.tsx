import { useState, useMemo } from "react";
import { Sparkles, Eye, GitBranch, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SourceComparison {
  sourceType: string;
  label: string;
  emoji: string;
  narrative: string;
  emphasis: string[];
  tone: string;
  toneLabel: string;
}

interface DominantFrame {
  frame: string;
  percentage: number;
  description: string;
}

interface PropagationPhase {
  phase: string;
  emoji: string;
  description: string;
  estimatedTime: string;
}

export interface NarrativeData {
  narrativeSummary: string;
  sourceComparison: SourceComparison[];
  dominantFrames: DominantFrame[];
  propagationTimeline: PropagationPhase[];
  narrativeDivergences: string[];
  predictedEvolution: string;
  visualSentiment: string | null;
}

interface NarrativeRadarTabProps {
  title: string;
  details?: string;
  description?: string;
  platform: string;
  volume: string;
  category?: string;
  sources?: string[];
  thumbnail?: string;
}

const CACHE_KEY = "gt_narrative_cache";
const CACHE_TTL = 1000 * 60 * 60;

function getCached(key: string): NarrativeData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, { data: NarrativeData; ts: number }>;
    const entry = cache[key];
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCache(key: string, data: NarrativeData) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(cache);
    if (keys.length > 30) {
      const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, keys.length - 20);
      oldest.forEach(k => delete cache[k]);
    }
    cache[key] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

const toneColors: Record<string, string> = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cautious: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  critical: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  supportive: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  alarmist: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  passionate: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  polarized: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  humorous: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  outraged: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  distanced: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  comparative: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  analytical: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const frameColors = [
  "bg-primary/70",
  "bg-blue-500/70",
  "bg-amber-500/70",
  "bg-emerald-500/70",
];

const NarrativeRadarTab = ({ title, details, description, platform, volume, category, sources, thumbnail }: NarrativeRadarTabProps) => {
  const cacheKey = `narrative::${platform}::${title.slice(0, 60)}`;
  const cached = useMemo(() => getCached(cacheKey), [cacheKey]);
  const [data, setData] = useState<NarrativeData | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleAnalyze = async () => {
    if (data || loading) return;
    setLoading(true);
    setError(false);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("analyze-narrative", {
        body: { title, details, platform, volume, category, sources, description, thumbnail },
      });
      if (fnError) throw fnError;
      setData(result);
      if (result) setCache(cacheKey, result);
    } catch (err: any) {
      console.error("Narrative analysis error:", err);
      setError(true);
      toast({ title: "Erro na análise de narrativas", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <button
          onClick={handleAnalyze}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          📡 Analisar Narrativas com IA
        </button>
        <p className="text-[10px] text-muted-foreground text-center max-w-[200px]">
          Compare como diferentes fontes cobrem esta tendência
        </p>
        {error && <span className="text-[10px] text-destructive">Falha na análise. Tente novamente.</span>}
        <span className="text-[9px] text-muted-foreground/60 italic">⚗️ Análise experimental</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[11px] text-muted-foreground">Analisando narrativas...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Experimental badge */}
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 italic">
        <span>⚗️ Análise experimental</span>
        <span>•</span>
        <a href="#" className="underline hover:text-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast({ title: "Feedback registrado!", description: "Obrigado por ajudar a melhorar." }); }}>
          Dar feedback
        </a>
      </div>

      {/* Summary */}
      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Radar de Narrativas</span>
        </div>
        <p className="text-[11px] text-foreground leading-relaxed">{data.narrativeSummary}</p>
      </div>

      {/* Source Comparison */}
      <div>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
          <GitBranch className="w-3 h-3" />
          Comparação por Fonte
        </span>
        <div className="space-y-2">
          {data.sourceComparison?.map((src, i) => (
            <div key={i} className="p-2 rounded-lg border border-border bg-card/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <span>{src.emoji}</span> {src.label}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${toneColors[src.tone] || toneColors.neutral}`}>
                  {src.toneLabel}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">{src.narrative}</p>
              <div className="flex gap-1 flex-wrap">
                {src.emphasis?.map((kw, j) => (
                  <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dominant Frames Bar */}
      {data.dominantFrames && data.dominantFrames.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Enquadramentos Dominantes
          </span>
          <div className="flex rounded-full overflow-hidden h-4 mb-1.5">
            {data.dominantFrames.map((f, i) => (
              <div
                key={i}
                className={`${frameColors[i % frameColors.length]} flex items-center justify-center`}
                style={{ width: `${f.percentage}%` }}
                title={`${f.frame}: ${f.percentage}%`}
              >
                {f.percentage > 15 && (
                  <span className="text-[8px] text-white font-bold truncate px-1">{f.percentage}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {data.dominantFrames.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px]">
                <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${frameColors[i % frameColors.length]}`} />
                <div>
                  <span className="font-semibold text-foreground">{f.frame}</span>
                  <span className="text-muted-foreground ml-1">— {f.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Propagation Timeline */}
      {data.propagationTimeline && data.propagationTimeline.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
            <Clock className="w-3 h-3" />
            Jornada da Notícia
          </span>
          <div className="relative pl-4 space-y-2">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
            {data.propagationTimeline.map((phase, i) => (
              <div key={i} className="relative flex items-start gap-2">
                <span className="absolute -left-4 w-4 h-4 rounded-full bg-card border-2 border-primary flex items-center justify-center text-[10px] z-10">
                  {phase.emoji}
                </span>
                <div className="ml-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">{phase.phase}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{phase.estimatedTime}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative Divergences */}
      {data.narrativeDivergences && data.narrativeDivergences.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <AlertTriangle className="w-3 h-3" />
            Pontos de Divergência
          </span>
          <div className="space-y-1">
            {data.narrativeDivergences.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] p-1.5 rounded bg-amber-500/5 border border-amber-500/10">
                <span className="text-amber-500 mt-0.5">⚡</span>
                <span className="text-foreground leading-relaxed">{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predicted Evolution */}
      {data.predictedEvolution && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/50">
          <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Previsão (próximas 12h)</span>
            <p className="text-[11px] text-foreground leading-relaxed">{data.predictedEvolution}</p>
          </div>
        </div>
      )}

      {/* Visual Sentiment (basic) */}
      {data.visualSentiment && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <span className="text-sm mt-0.5">🖼️</span>
          <div>
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Contexto Visual</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{data.visualSentiment}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NarrativeRadarTab;

import { useState, useMemo } from "react";
import { Sparkles, Users, MessageSquare, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SentimentWord {
  word: string;
  sentiment: "positive" | "negative" | "neutral";
  weight: number;
}

interface TopSource {
  name: string;
  type: "press" | "social" | "official" | "tech";
  relevance: number;
}

interface TriggerInfo {
  type: string;
  emoji: string;
  label: string;
  confidence: number;
}

export interface TrendContextData {
  trigger: TriggerInfo;
  contextSummary: string;
  sentimentWords: SentimentWord[];
  topSources: TopSource[];
  keyInsight: string;
}

interface TrendContextTabProps {
  title: string;
  details?: string;
  description?: string;
  platform: string;
  volume: string;
  category?: string;
  sources?: string[];
}

const sentimentColors: Record<string, string> = {
  positive: "text-green-600 dark:text-green-400",
  negative: "text-red-500 dark:text-red-400",
  neutral: "text-muted-foreground",
};

const sentimentBgColors: Record<string, string> = {
  positive: "bg-green-500/10 border-green-500/20",
  negative: "bg-red-500/10 border-red-500/20",
  neutral: "bg-muted/50 border-border",
};

const sourceTypeLabels: Record<string, { label: string; emoji: string }> = {
  press: { label: "Imprensa", emoji: "📰" },
  social: { label: "Redes Sociais", emoji: "💬" },
  official: { label: "Oficial", emoji: "🏛️" },
  tech: { label: "Tech", emoji: "💻" },
};

const WordCloud = ({ words }: { words: SentimentWord[] }) => {
  const sortedWords = useMemo(() => 
    [...words].sort((a, b) => b.weight - a.weight).slice(0, 20),
    [words]
  );

  const maxWeight = Math.max(...sortedWords.map(w => w.weight), 1);

  return (
    <div className="flex flex-wrap gap-1.5 justify-center py-3">
      {sortedWords.map((w, i) => {
        const scale = 0.6 + (w.weight / maxWeight) * 0.6;
        const fontSize = Math.round(10 + (w.weight / maxWeight) * 10);
        return (
          <span
            key={`${w.word}-${i}`}
            className={`inline-block px-2 py-0.5 rounded-full border transition-transform hover:scale-110 cursor-default ${sentimentBgColors[w.sentiment]} ${sentimentColors[w.sentiment]}`}
            style={{ fontSize: `${fontSize}px`, fontWeight: w.weight > maxWeight * 0.6 ? 600 : 400, opacity: 0.7 + scale * 0.3 }}
            title={`${w.word}: ${w.sentiment === "positive" ? "Positivo" : w.sentiment === "negative" ? "Negativo" : "Neutro"} (peso: ${w.weight})`}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};

const CACHE_KEY = "gt_context_cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCachedContext(key: string): TrendContextData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, { data: TrendContextData; ts: number }>;
    const entry = cache[key];
    if (!entry || Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCachedContext(key: string, data: TrendContextData) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    // Keep max 50 entries
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts).slice(0, keys.length - 40);
      oldest.forEach(k => delete cache[k]);
    }
    cache[key] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded, ignore */ }
}

const TrendContextTab = ({ title, details, description, platform, volume, category, sources }: TrendContextTabProps) => {
  const cacheKey = `${platform}::${title.slice(0, 60)}`;
  const cached = useMemo(() => getCachedContext(cacheKey), [cacheKey]);
  const [contextData, setContextData] = useState<TrendContextData | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleAnalyze = async () => {
    if (contextData || loading) return;
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-trend-context", {
        body: { title, details, platform, volume, category, sources, description },
      });
      if (fnError) throw fnError;
      setContextData(data);
      if (data) setCachedContext(cacheKey, data);
    } catch (err: any) {
      console.error("Context analysis error:", err);
      setError(true);
      toast({ title: "Erro na análise", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!contextData && !loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          🔍 Analisar Contexto com IA
        </button>
        {error && <span className="text-[10px] text-destructive">Falha na análise. Tente novamente.</span>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[11px] text-muted-foreground">Analisando contexto...</span>
      </div>
    );
  }

  if (!contextData) return null;

  const sentimentCounts = contextData.sentimentWords.reduce(
    (acc, w) => {
      acc[w.sentiment] = (acc[w.sentiment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalWords = contextData.sentimentWords.length || 1;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Trigger + Summary */}
      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{contextData.trigger.emoji}</span>
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
            {contextData.trigger.label}
          </span>
          <span className="text-[9px] text-muted-foreground ml-auto">
            Confiança: {Math.round(contextData.trigger.confidence * 100)}%
          </span>
        </div>
        <p className="text-[11px] text-foreground leading-relaxed">{contextData.contextSummary}</p>
      </div>

      {/* Key Insight */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/50">
        <TrendingUp className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-foreground leading-relaxed">{contextData.keyInsight}</p>
      </div>

      {/* Sentiment Word Cloud */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Sentimento por Palavra
          </span>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {Math.round((sentimentCounts.positive || 0) / totalWords * 100)}%
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {Math.round((sentimentCounts.negative || 0) / totalWords * 100)}%
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {Math.round((sentimentCounts.neutral || 0) / totalWords * 100)}%
            </span>
          </div>
        </div>
        <WordCloud words={contextData.sentimentWords} />
      </div>

      {/* Top Sources / Influencers */}
      {contextData.topSources && contextData.topSources.length > 0 && (
        <div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Users className="w-3 h-3" />
            Principais Fontes / Influenciadores
          </span>
          <div className="space-y-1">
            {contextData.topSources.map((s, i) => {
              const st = sourceTypeLabels[s.type] || sourceTypeLabels.social;
              const barWidth = Math.round((s.relevance / 10) * 100);
              return (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-center">{st.emoji}</span>
                  <span className="flex-1 font-medium text-foreground truncate">{s.name}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground w-10 text-right">{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendContextTab;

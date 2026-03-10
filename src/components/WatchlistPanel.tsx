import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Plus, X, Bell, TrendingUp, Search, Radar } from "lucide-react";
import { TrendCardProps } from "./TrendCard";
import { toast } from "@/hooks/use-toast";

const WATCHLIST_KEY = "gtt_watchlist";
const MAX_FREE_ITEMS = 10;

export interface WatchlistItem {
  keyword: string;
  addedAt: string;
}

function loadWatchlist(): WatchlistItem[] {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"); }
  catch { return []; }
}

function saveWatchlist(items: WatchlistItem[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
}

interface WatchlistPanelProps {
  trends: TrendCardProps[];
  onSelectTrend?: (trend: TrendCardProps) => void;
}

export default function WatchlistPanel({ trends, onSelectTrend }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist);
  const [inputValue, setInputValue] = useState("");
  const [expanded, setExpanded] = useState(true);

  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);

  const addItem = useCallback(() => {
    const kw = inputValue.trim().toLowerCase();
    if (!kw) return;
    if (watchlist.length >= MAX_FREE_ITEMS) {
      toast({ title: "Limite atingido", description: `Máximo de ${MAX_FREE_ITEMS} itens.`, variant: "destructive" });
      return;
    }
    if (watchlist.some(w => w.keyword === kw)) {
      toast({ title: "Já existe", description: `"${kw}" já está na watchlist.` });
      return;
    }
    setWatchlist(prev => [...prev, { keyword: kw, addedAt: new Date().toISOString() }]);
    setInputValue("");
    toast({ title: "✅ Adicionado", description: kw });
  }, [inputValue, watchlist]);

  const removeItem = useCallback((kw: string) => {
    setWatchlist(prev => prev.filter(w => w.keyword !== kw));
  }, []);

  const matches = useMemo(() => {
    if (watchlist.length === 0) return new Map<string, TrendCardProps[]>();
    const result = new Map<string, TrendCardProps[]>();
    for (const item of watchlist) {
      const kw = item.keyword.toLowerCase();
      const matched = trends.filter(t => {
        const title = t.title.toLowerCase();
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category || "").toLowerCase();
        return title.includes(kw) || desc.includes(kw) || cat.includes(kw);
      });
      if (matched.length > 0) result.set(item.keyword, matched.slice(0, 5));
    }
    return result;
  }, [watchlist, trends]);

  const totalMatches = useMemo(() => {
    let count = 0;
    matches.forEach(v => count += v.length);
    return count;
  }, [matches]);

  if (watchlist.length === 0 && !expanded) return null;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-caption font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary/30 transition-colors min-h-[44px]"
      >
        <Eye className="w-3.5 h-3.5" />
        Watchlist
        {totalMatches > 0 && (
          <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-positive/15 text-positive text-micro font-bold">
            <Bell className="w-2.5 h-2.5" />
            {totalMatches}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-sp-2">
              <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                {watchlist.map(item => {
                  const itemMatches = matches.get(item.keyword) || [];
                  const hasMatches = itemMatches.length > 0;
                  return (
                    <div key={item.keyword} className="border-b border-border/50 last:border-b-0">
                      <div className="flex items-center gap-2 px-2 py-1.5 min-h-[44px]">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasMatches ? "bg-positive live-pulse-dot" : "bg-muted-foreground/30"}`} />
                        <span className="text-caption font-medium text-foreground flex-1 truncate">{item.keyword}</span>
                        {hasMatches && (
                          <span className="text-micro font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {itemMatches.length}
                          </span>
                        )}
                        <button onClick={() => removeItem(item.keyword)} className="p-1 hover:text-destructive transition-colors text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {hasMatches && (
                        <div className="px-2 pb-2 space-y-0.5">
                          {itemMatches.slice(0, 3).map((trend, i) => (
                            <button
                              key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
                              onClick={() => onSelectTrend?.(trend)}
                              className="w-full flex items-center gap-1.5 p-1.5 hover:bg-secondary/50 transition-colors text-left min-h-[44px]"
                            >
                              <TrendingUp className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                              <span className="text-micro text-foreground line-clamp-1 flex-1">{trend.title}</span>
                              <span className="text-micro text-muted-foreground flex-shrink-0">{trend.platform}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ═══ EMPTY STATE ═══ */}
                {watchlist.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    {/* Animated radar icon */}
                    <div className="relative w-12 h-12 mb-4">
                      <Radar className="w-12 h-12 text-muted-foreground/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-positive/30 rounded-full radar-sweep" style={{ borderTopColor: 'hsl(162, 100%, 39%)' }} />
                      </div>
                    </div>
                    <p className="text-title font-semibold text-foreground mb-1">
                      Monitore o que importa
                    </p>
                    <p className="text-body text-muted-foreground mb-6 max-w-[220px]">
                      Adicione palavras-chave e receba alertas em tempo real
                    </p>
                  </div>
                )}
              </div>

              {/* ═══ ADD INPUT ═══ */}
              <div className="flex gap-sp-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    placeholder="Monitorar keyword..."
                    className="w-full pl-10 pr-3 h-11 rounded-xl border border-border bg-background text-body focus:outline-none focus:ring-2 focus:ring-positive/30 focus:border-positive/50 placeholder:text-muted-foreground/50 min-h-[44px]"
                    maxLength={40}
                    autoFocus={watchlist.length === 0}
                  />
                </div>
                <button
                  onClick={addItem}
                  className="w-11 h-11 rounded-xl bg-positive text-white flex items-center justify-center hover:brightness-110 transition-all min-w-[44px] min-h-[44px]"
                  style={{ background: 'hsl(162, 100%, 39%)' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

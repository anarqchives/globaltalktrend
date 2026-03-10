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
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch { return []; }
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

  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  const addItem = useCallback(() => {
    const kw = inputValue.trim().toLowerCase();
    if (!kw) return;
    if (watchlist.length >= MAX_FREE_ITEMS) {
      toast({ title: "Limite atingido", description: `Máximo de ${MAX_FREE_ITEMS} itens na watchlist.`, variant: "destructive" });
      return;
    }
    if (watchlist.some(w => w.keyword === kw)) {
      toast({ title: "Já existe", description: `"${kw}" já está na sua watchlist.` });
      return;
    }
    setWatchlist(prev => [...prev, { keyword: kw, addedAt: new Date().toISOString() }]);
    setInputValue("");
    toast({ title: "✅ Adicionado à watchlist", description: kw });
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
      if (matched.length > 0) {
        result.set(item.keyword, matched.slice(0, 5));
      }
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
    <div className="border-b border-border/50">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-secondary/30 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        Watchlist
        {totalMatches > 0 && (
          <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold animate-pulse">
            <Bell className="w-2.5 h-2.5" />
            {totalMatches} match{totalMatches > 1 ? "es" : ""}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Watchlist items */}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
                {watchlist.map(item => {
                  const itemMatches = matches.get(item.keyword) || [];
                  const hasMatches = itemMatches.length > 0;
                  return (
                    <div key={item.keyword} className="rounded-lg border border-border/50 bg-secondary/20 overflow-hidden">
                      <div className="flex items-center gap-2 px-2.5 py-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasMatches ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                        <span className="text-[11px] font-medium text-foreground flex-1 truncate">{item.keyword}</span>
                        {hasMatches && (
                          <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {itemMatches.length} trend{itemMatches.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <button onClick={() => removeItem(item.keyword)} className="p-0.5 hover:text-destructive transition-colors text-muted-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {hasMatches && (
                        <div className="px-2.5 pb-2 space-y-1">
                          {itemMatches.slice(0, 3).map((trend, i) => (
                            <button
                              key={`${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
                              onClick={() => onSelectTrend?.(trend)}
                              className="w-full flex items-center gap-1.5 p-1.5 rounded-md hover:bg-secondary/50 transition-colors text-left"
                            >
                              <TrendingUp className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                              <span className="text-[10px] text-foreground line-clamp-1 flex-1">{trend.title}</span>
                              <span className="text-[9px] text-muted-foreground flex-shrink-0">{trend.platform}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty state — centered, inviting */}
                {watchlist.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <Radar className="w-8 h-8 text-muted-foreground/30 mb-3 watchlist-empty-icon" />
                    <p className="text-[12px] font-medium text-foreground mb-1">
                      Monitore tendências
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-4 max-w-[200px]">
                      Adicione keywords para rastrear automaticamente o que importa para você
                    </p>
                  </div>
                )}
              </div>

              {/* Add input — always visible, centered focus */}
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    placeholder="Monitorar keyword..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    maxLength={40}
                  />
                </div>
                <button
                  onClick={addItem}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
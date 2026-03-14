import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Bookmark, Trash2, ExternalLink, Globe, Search, X, Grid3X3, List, LayoutGrid
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSavedCards, SavedCard } from "@/hooks/use-saved-cards";
import { countryCodeToFlag } from "@/lib/shared-utils";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const platformAccent: Record<string, string> = {
  "The Guardian": "210 70% 35%",
  "Reddit": "16 100% 50%",
  "Google Trends": "217 91% 60%",
  "YouTube": "0 72% 51%",
  "Bluesky": "210 100% 56%",
  "Mastodon": "270 60% 50%",
  "NewsAPI": "152 69% 31%",
  "Hacker News": "25 95% 53%",
  "Wikipedia": "0 0% 30%",
};

const Collections = () => {
  const { lang } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);

  const { cards, loading, removeCard } = useSavedCards(userId);

  const categories = useMemo(() => {
    const cats = new Set(cards.map(c => c.category).filter(Boolean));
    return ["all", ...Array.from(cats)] as string[];
  }, [cards]);

  const filtered = useMemo(() => {
    let result = cards;
    if (filterCategory !== "all") {
      result = result.filter(c => c.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, filterCategory, searchQuery]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", {
      day: "numeric", month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <AppHeader />

      <main className="flex-1 px-4 md:px-8 lg:px-12 py-8 md:py-12 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-[1.1] text-foreground">
              {lang === "en" ? "Collections" : "Coleções"}
            </h1>
            <p className="text-muted-foreground text-[14px] leading-relaxed max-w-lg">
              {lang === "en"
                ? "Your saved insights and trend signals, organized for quick reference."
                : "Seus insights e sinais salvos, organizados para consulta rápida."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative w-48 md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "en" ? "Search…" : "Buscar…"}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/60 border border-border/50 text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 mb-6 overflow-x-auto scrollbar-none pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0",
                  filterCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {cat === "all" ? (lang === "en" ? "All" : "Todas") : cat}
              </button>
            ))}
          </div>
        )}

        {/* Not logged in */}
        {!userId && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bookmark className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {lang === "en" ? "Sign in to view collections" : "Faça login para ver coleções"}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-2"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn(
                "rounded-xl bg-secondary/30 animate-pulse",
                viewMode === "grid" ? "h-[180px]" : "h-[56px]"
              )} />
            ))}
          </div>
        )}

        {/* Empty */}
        {userId && !loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Bookmark className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {lang === "en" ? "No saved insights" : "Nenhum insight salvo"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {lang === "en"
                ? "Save trends from the Dashboard or Explore page to build your collection."
                : "Salve tendências do Dashboard ou Explorar para montar sua coleção."}
            </p>
            <Link
              to="/"
              className="mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              {lang === "en" ? "Explore" : "Explorar"}
            </Link>
          </div>
        )}

        {/* Grid view */}
        {userId && !loading && filtered.length > 0 && viewMode === "grid" && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {filtered.map((card, i) => {
              const accent = platformAccent[card.platform] || "220 15% 40%";
              const flag = card.country_code ? countryCodeToFlag(card.country_code) : null;
              return (
                <motion.article
                  key={card.id}
                  custom={i}
                  variants={fadeUp}
                  className="group relative rounded-xl border border-border/60 bg-card overflow-hidden hover:border-border hover:shadow-[var(--shadow-md)] transition-all duration-200"
                >
                  {/* Top accent */}
                  <div className="h-1 w-full" style={{ background: `hsl(${accent})` }} />

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: `hsl(${accent})` }}
                      >
                        {card.platform}
                      </span>
                      <div className="flex items-center gap-1">
                        {flag && <span className="text-xs">{flag}</span>}
                        <span className="text-[10px] text-muted-foreground">{formatDate(card.created_at)}</span>
                      </div>
                    </div>

                    <Link
                      to={`/topic?title=${encodeURIComponent(card.title)}&platform=${encodeURIComponent(card.platform)}`}
                      className="block"
                    >
                      <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {card.title}
                      </h3>
                    </Link>

                    {card.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>
                    )}

                    {card.category && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/60 text-[9px] font-medium text-muted-foreground">
                        {card.category}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    {card.source_url ? (
                      <a
                        href={card.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lang === "en" ? "Source" : "Fonte"}
                      </a>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => removeCard(card.id)}
                      className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {/* List view */}
        {userId && !loading && filtered.length > 0 && viewMode === "list" && (
          <motion.div
            className="space-y-1.5"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {filtered.map((card, i) => {
              const accent = platformAccent[card.platform] || "220 15% 40%";
              return (
                <motion.div
                  key={card.id}
                  custom={i}
                  variants={fadeUp}
                  className="group flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/40 bg-card hover:border-border hover:bg-secondary/20 transition-all"
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ background: `hsl(${accent})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/topic?title=${encodeURIComponent(card.title)}&platform=${encodeURIComponent(card.platform)}`}
                      className="text-[12px] font-semibold text-foreground truncate block hover:text-primary transition-colors"
                    >
                      {card.title}
                    </Link>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span style={{ color: `hsl(${accent})` }}>{card.platform}</span>
                      {card.category && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-border" />
                          <span>{card.category}</span>
                        </>
                      )}
                      <span className="w-0.5 h-0.5 rounded-full bg-border" />
                      <span>{formatDate(card.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCard(card.id)}
                    className="p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Stats */}
        {userId && !loading && cards.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-8 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>{cards.length} {lang === "en" ? "saved" : "salvos"}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-border" />
            <span>{new Set(cards.map(c => c.platform)).size} {lang === "en" ? "platforms" : "plataformas"}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-border" />
            <span>{new Set(cards.map(c => c.category).filter(Boolean)).size} {lang === "en" ? "categories" : "categorias"}</span>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 px-4 md:px-8 lg:px-12 py-6 max-w-[1400px] mx-auto w-full">
        <p className="text-[11px] text-muted-foreground text-center">
          © {new Date().getFullYear()} Global Talk Trend
        </p>
      </footer>
    </div>
  );
};

export default Collections;

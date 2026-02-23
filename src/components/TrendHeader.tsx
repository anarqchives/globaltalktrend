import { useState, useEffect } from "react";
import { Info, Sun, Moon, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TrendHeaderProps {
  totalTrends?: number;
  countriesCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const TrendHeader = ({ totalTrends = 0, countriesCount = 0, onRefresh, refreshing }: TrendHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <>
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2 h-12 flex items-center">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-light tracking-tight whitespace-nowrap select-none flex items-center gap-2">
              <span className="font-semibold text-foreground">Global-Talk-Trending</span>
              <span className="text-muted-foreground hidden sm:inline">: real time monitor</span>
            </h1>
            {totalTrends > 0 && (
              <motion.span
                key={totalTrends}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums flex-shrink-0"
              >
                {totalTrends} {t("trends")} · {countriesCount} {t("country")}
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                title={t("updated")}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}

            <div className="flex gap-0.5 overflow-x-auto scrollbar-thin">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                    lang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  title={l.name}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setDark(!dark)}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dark ? "moon" : "sun"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="block"
                >
                  {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </motion.span>
              </AnimatePresence>
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => setAboutOpen(true)}
              className="px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {t("about")}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {aboutOpen && (
          <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden" asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="p-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {t("aboutTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {t("aboutDesc")}
                  </DialogDescription>
                </DialogHeader>
                <motion.div
                  className="mt-4 space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { name: "YouTube", color: "hsl(0, 72%, 51%)" },
                      { name: "Reddit", color: "hsl(16, 100%, 50%)" },
                      { name: "Google Trends", color: "hsl(210, 100%, 40%)" },
                      { name: "NewsAPI", color: "hsl(142, 60%, 40%)" },
                      { name: "Bluesky", color: "hsl(200, 100%, 50%)" },
                      { name: "Mastodon", color: "hsl(270, 60%, 55%)" },
                    ].map((src, i) => (
                      <motion.div
                        key={src.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: src.color }} />
                        <span className="font-medium text-foreground">{src.name}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    ✨ Resumos com IA · Sentimento · Multi-fonte
                  </div>

                  <motion.a
                    href="https://buymeacoffee.com/globaltalktrending"
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold tracking-tight transition-colors duration-200 shadow-lg"
                  >
                    ☕ Apoie este projeto com doação
                  </motion.a>
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default TrendHeader;

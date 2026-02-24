import { useState, useEffect } from "react";
import { Info, Sun, Moon, RefreshCw, LogIn, LogOut, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TrendHeaderProps {
  totalTrends?: number;
  countriesCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const TrendHeader = ({ totalTrends = 0, countriesCount = 0, onRefresh, refreshing }: TrendHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

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

            {/* Auth button */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full hover:bg-secondary transition-colors">
                    <Avatar className="w-6 h-6">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-medium text-foreground hidden sm:inline max-w-[80px] truncate">
                      {userName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleLogout} className="text-xs gap-2">
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {t("aboutTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t("aboutDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { name: "YouTube", color: "hsl(0, 72%, 51%)" },
                { name: "Reddit", color: "hsl(16, 100%, 50%)" },
                { name: "Google Trends", color: "hsl(210, 100%, 40%)" },
                { name: "NewsAPI", color: "hsl(142, 60%, 40%)" },
                { name: "Bluesky", color: "hsl(200, 100%, 50%)" },
                { name: "Mastodon", color: "hsl(270, 60%, 55%)" },
                { name: "NewsData", color: "hsl(35, 90%, 50%)" },
                { name: "GNews", color: "hsl(160, 60%, 45%)" },
                { name: "The Guardian", color: "hsl(210, 70%, 35%)" },
                { name: "World Bank", color: "hsl(200, 80%, 45%)" },
                { name: "IBGE", color: "hsl(130, 60%, 35%)" },
                { name: "OpenAlex", color: "hsl(270, 60%, 50%)" },
              ].map((src) => (
                <div
                  key={src.name}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: src.color }} />
                  <span className="font-medium text-foreground text-[10px]">{src.name}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>✨ Resumos com IA · Sentimento · Multi-fonte</span>
              <Link to="/metodologia" onClick={() => setAboutOpen(false)} className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                <BookOpen className="w-3 h-3" /> Metodologia
              </Link>
            </div>

            <a
              href="https://buymeacoffee.com/globaltalktrending"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold tracking-tight transition-colors duration-200 shadow-lg"
            >
              ☕ Apoie este projeto com doação
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrendHeader;

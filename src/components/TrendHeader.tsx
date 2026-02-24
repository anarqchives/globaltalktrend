import { useState, useEffect } from "react";
import { Info, Sun, Moon, RefreshCw, LogOut, LogIn, BookOpen, Star, Bell, Clock, ChevronDown, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { useAlerts } from "@/hooks/use-alerts";
import { useGamification } from "@/hooks/use-gamification";
import AchievementsPanel from "@/components/AchievementsPanel";
import type { FilterState } from "@/components/FilterBar";

interface TrendHeaderProps {
  totalTrends?: number;
  countriesCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  filters?: FilterState;
  onApplyFilter?: (filters: FilterState) => void;
}

const TrendHeader = ({ totalTrends = 0, countriesCount = 0, onRefresh, refreshing, filters, onApplyFilter }: TrendHeaderProps) => {
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
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

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

  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters(user?.id ?? null);
  const { alerts } = useAlerts(user?.id ?? null);
  const { totalPoints, achievements, unlocked } = useGamification(user?.id ?? null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const handleLoginGoogle = async () => {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  };

  const handleLoginApple = async () => {
    await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim() || !filters) return;
    saveFilter(saveFilterName.trim(), filters);
    setSaveFilterName("");
    setShowSaveInput(false);
  };

  const handleApplySavedFilter = (sf: any) => {
    if (!onApplyFilter) return;
    onApplyFilter({
      country: sf.country || "global",
      period: sf.period || "Hoje",
      category: sf.category || "Todas",
      type: sf.media_type || "Todas mídias",
    });
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
              <span className="font-semibold text-foreground">GLOBAL TALK TRENDS</span>
              <span className="text-muted-foreground hidden sm:inline">REAL TIME MONITOR</span>
            </h1>
            {totalTrends > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums flex-shrink-0">
                {totalTrends} {t("trends")} · {countriesCount} {t("country")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
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
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => setAboutOpen(true)}
              className="px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {t("about")}
            </button>

            {/* Auth + user menu */}
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
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Saved Filters section */}
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Meus Filtros</span>
                  </div>
                  {savedFilters.length > 0 ? (
                    savedFilters.slice(0, 5).map((sf) => (
                      <DropdownMenuItem
                        key={sf.id}
                        className="text-xs gap-2 justify-between"
                        onClick={() => handleApplySavedFilter(sf)}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {sf.name}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFilter(sf.id); }}
                          className="text-muted-foreground hover:text-red-500 p-0.5"
                        >
                          ×
                        </button>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-[11px] text-muted-foreground/60">Nenhum filtro salvo</div>
                  )}
                  {filters && (
                    <>
                      {showSaveInput ? (
                        <div className="px-2 py-1.5 flex gap-1">
                          <input
                            type="text"
                            value={saveFilterName}
                            onChange={(e) => setSaveFilterName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                            placeholder="Nome do filtro..."
                            className="flex-1 px-2 py-1 rounded-md bg-secondary text-xs border border-border focus:outline-none focus:ring-1 focus:ring-primary/30"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveFilter}
                            className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium"
                          >
                            Salvar
                          </button>
                        </div>
                      ) : (
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowSaveInput(true)}>
                          <Star className="w-3 h-3" />
                          Salvar filtros atuais
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  <DropdownMenuSeparator />

                  {/* Achievements */}
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setAchievementsOpen(true)}>
                    <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                    Conquistas
                    <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold tabular-nums">
                      {totalPoints} pts
                    </span>
                  </DropdownMenuItem>

                  {/* Alerts */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <span className="flex items-center gap-2 cursor-default">
                      <Bell className="w-3.5 h-3.5" />
                      Meus Alertas
                      {alerts.length > 0 && (
                        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          {alerts.length}
                        </span>
                      )}
                    </span>
                  </DropdownMenuItem>

                  {/* History */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <Link to="/historico" className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Meu Histórico
                    </Link>
                  </DropdownMenuItem>

                  {/* Methodology */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <Link to="/metodologia" className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      Metodologia
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="text-xs gap-2 text-red-500 focus:text-red-500">
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Entrar
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={handleLoginGoogle} className="text-xs gap-2 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Entrar com Google
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLoginApple} className="text-xs gap-2 cursor-pointer">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Entrar com Apple
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <AchievementsPanel
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        totalPoints={totalPoints}
        achievements={achievements}
        unlocked={unlocked}
      />

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

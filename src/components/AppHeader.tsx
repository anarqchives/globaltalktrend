import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun, Moon, LogOut, LogIn, ChevronRight, User, FileText,
  Loader2, Menu, X, BarChart3, BookOpen, RefreshCw,
  Bell, Bookmark, Globe, Calendar, LayoutGrid, Layers, Filter
} from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterState, countries } from "@/components/FilterBar";
import { ScrollArea } from "@/components/ui/scroll-area";

const defaultFilters: FilterState = {
  country: "global", period: "Hoje", category: "Todas", type: "Todas mídias", query: "",
};

interface AppHeaderProps {
  minimal?: boolean;
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  onForceReset?: () => void;
  onSaveFilter?: () => void;
  onOpenSavedCollections?: () => void;
  isLoggedIn?: boolean;
}

const CATEGORIES = [
  { value: "Todas", label: { pt: "Todas", en: "All" } },
  { value: "Geopolítica", label: { pt: "Geopolítica", en: "Geopolitics" } },
  { value: "Economia", label: { pt: "Economia", en: "Economy" } },
  { value: "Tecnologia", label: { pt: "Tecnologia", en: "Technology" } },
  { value: "Ciência", label: { pt: "Ciência", en: "Science" } },
  { value: "Saúde", label: { pt: "Saúde", en: "Health" } },
  { value: "Entretenimento", label: { pt: "Entretenimento", en: "Entertainment" } },
  { value: "Esportes", label: { pt: "Esportes", en: "Sports" } },
  { value: "Cultura", label: { pt: "Cultura", en: "Culture" } },
  { value: "Meio Ambiente", label: { pt: "Meio Ambiente", en: "Environment" } },
  { value: "Educação", label: { pt: "Educação", en: "Education" } },
];

const SOURCE_TYPES = [
  { v: "Todas mídias", l: { pt: "Todas", en: "All" } },
  { v: "Imprensa", l: { pt: "Imprensa", en: "Press" } },
  { v: "Redes sociais", l: { pt: "Social", en: "Social" } },
  { v: "Buscas (Google)", l: { pt: "Buscas", en: "Searches" } },
  { v: "Dados oficiais", l: { pt: "Dados Oficiais", en: "Official" } },
  { v: "Ciência", l: { pt: "Acadêmico", en: "Academic" } },
  { v: "Multiplataforma", l: { pt: "Multi", en: "Multi" } },
];

const PERIODS = [
  { v: "Última hora", l: { pt: "Última hora", en: "Last hour" } },
  { v: "Hoje", l: { pt: "Hoje", en: "Today" } },
  { v: "Últimas 24h", l: { pt: "24h", en: "24h" } },
  { v: "Esta semana", l: { pt: "Semana", en: "Week" } },
  { v: "Última semana", l: { pt: "7 dias", en: "7 days" } },
  { v: "Este mês", l: { pt: "Mês", en: "Month" } },
];

const AppHeader = ({ minimal = false, filters, onFilterChange, onForceReset, onSaveFilter, onOpenSavedCollections, isLoggedIn }: AppHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth/callback` });
      if (result?.error) { toast({ title: "Falha no login", variant: "destructive" }); setLoginLoading(null); }
    } catch { toast({ title: "Erro inesperado", variant: "destructive" }); setLoginLoading(null); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const update = (key: keyof FilterState, value: string) => {
    if (filters && onFilterChange) onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters && (
    filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type
  );

  // Build active filter pills for display
  const activeFilterPills: { key: keyof FilterState; label: string; defaultValue: string }[] = [];
  if (filters) {
    if (filters.country !== "global") {
      const allC = countries.flatMap(g => g.items);
      const found = allC.find(c => c.value === filters.country);
      activeFilterPills.push({ key: "country", label: found?.label || filters.country, defaultValue: "global" });
    }
    if (filters.category !== "Todas") {
      activeFilterPills.push({ key: "category", label: filters.category, defaultValue: "Todas" });
    }
    if (filters.type !== "Todas mídias") {
      activeFilterPills.push({ key: "type", label: filters.type, defaultValue: "Todas mídias" });
    }
    if (filters.period !== "Hoje") {
      activeFilterPills.push({ key: "period", label: filters.period, defaultValue: "Hoje" });
    }
  }

  const filteredCountries = countries.map(group => ({
    ...group,
    items: group.items.filter(c =>
      !countrySearch || c.label.toLowerCase().includes(countrySearch.toLowerCase()) || c.value.toLowerCase().includes(countrySearch.toLowerCase())
    ),
  })).filter(g => g.items.length > 0);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/92 backdrop-blur-md border-b border-border/40" role="banner">
        <div className="h-11 flex items-center px-3 md:px-5">
          <div className="w-full max-w-[1440px] mx-auto flex items-center">
            {/* Logo */}
            <Link to="/welcome" className="flex items-center gap-1.5 shrink-0" aria-label="GTT Monitor">
              <span className="text-[12px] font-bold tracking-tight text-foreground">GTTMonitor</span>
            </Link>

            {/* Active filter pills */}
            {activeFilterPills.length > 0 && (
              <div className="flex items-center gap-1 ml-3 overflow-x-auto scrollbar-none">
                {activeFilterPills.map(pill => (
                  <span key={pill.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foreground/8 text-foreground border border-border/40 flex-shrink-0">
                    {pill.label}
                    <button onClick={() => update(pill.key, pill.defaultValue)}
                      className="hover:text-destructive transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Filter button — opens drawer */}
              {filters && onFilterChange && (
                <button onClick={() => setDrawerOpen(true)}
                  className={`compact-btn flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                    hasActiveFilters ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">{lang === "pt" ? "Filtros" : "Filters"}</span>
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-background/60" />}
                </button>
              )}

              <a href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex apoie-pill compact-link">{t("support")}</a>

              {user ? (
                <button onClick={() => navigate("/perfil")}
                  className="compact-btn flex items-center justify-center w-7 h-7 rounded-full hover:ring-2 hover:ring-ring/20 transition-all">
                  <Avatar className="w-5 h-5">
                    {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                    <AvatarFallback className="text-[8px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <button onClick={() => setLoginOpen(true)}
                  className="compact-btn flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-foreground text-background">
                  <span className="hidden sm:inline">{t("enter")}</span>
                  <LogIn className="w-3 h-3 sm:hidden" />
                </button>
              )}

              <button onClick={() => setDrawerOpen(true)}
                className="compact-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter & Navigation Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[360px] p-0">
          <SheetHeader className="p-4 pb-3 border-b border-border/30">
            <SheetTitle className="text-[14px] font-bold">
              {lang === "pt" ? "Filtros & Navegação" : "Filters & Navigation"}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-5">
              {/* FILTERS SECTION */}
              {filters && onFilterChange && (
                <>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "pt" ? "País / Região" : "Country / Region"}
                    </h4>
                    <input type="text" placeholder={lang === "pt" ? "Buscar país..." : "Search country..."}
                      value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full h-8 px-3 rounded-md border border-border bg-card text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 mb-2" />
                    <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
                      {filteredCountries.map(group => (
                        <div key={group.group}>
                          <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider px-1 py-1">{group.group}</div>
                          <div className="grid grid-cols-2 gap-0.5">
                            {group.items.map(c => (
                              <button key={c.value} onClick={() => { update("country", c.value); }}
                                className={`text-left px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                                  filters.country === c.value ? "bg-foreground text-background font-semibold" : "hover:bg-muted text-foreground"
                                }`}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "pt" ? "Categoria" : "Category"}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.map(c => (
                        <button key={c.value} onClick={() => update("category", c.value)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                            filters.category === c.value ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}>
                          {c.label[lang as "pt" | "en"] || c.label.pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "pt" ? "Período" : "Period"}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {PERIODS.map(p => (
                        <button key={p.v} onClick={() => update("period", p.v)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                            filters.period === p.v ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}>
                          {p.l[lang as "pt" | "en"] || p.l.pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "pt" ? "Tipo de Fonte" : "Source Type"}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {SOURCE_TYPES.map(s => (
                        <button key={s.v} onClick={() => update("type", s.v)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                            filters.type === s.v ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}>
                          {s.l[lang as "pt" | "en"] || s.l.pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button onClick={() => { onFilterChange(defaultFilters); onForceReset?.(); }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-destructive/30 text-destructive text-[11px] font-medium hover:bg-destructive/5 transition-colors">
                      <X className="w-3 h-3" />
                      {lang === "pt" ? "Limpar todos os filtros" : "Clear all filters"}
                    </button>
                  )}
                </>
              )}

              {/* SETTINGS */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "pt" ? "Configurações" : "Settings"}
                </h4>
                <div className="space-y-1">
                  <button onClick={() => setDark(!dark)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors">
                    <span className="flex items-center gap-2 text-[11px] font-medium">
                      {dark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                      {dark ? (lang === "pt" ? "Modo escuro" : "Dark mode") : (lang === "pt" ? "Modo claro" : "Light mode")}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{dark ? "ON" : "OFF"}</span>
                  </button>
                  <div className="px-3 py-2">
                    <span className="text-[10px] font-medium text-muted-foreground mb-1 block">{lang === "pt" ? "Idioma" : "Language"}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {languages.slice(0, 6).map(l => (
                        <button key={l.code} onClick={() => { setLang(l.code); window.dispatchEvent(new Event("trend-refresh")); }}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                            lang === l.code ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* NAVIGATION */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {lang === "pt" ? "Conta" : "Account"}
                </h4>
                <div className="space-y-0.5">
                  <Link to="/dashboard" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </Link>
                  <button onClick={() => { onSaveFilter?.(); setDrawerOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><Bell className="w-3.5 h-3.5" /> {lang === "pt" ? "Alertas" : "Alerts"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => { onOpenSavedCollections?.(); setDrawerOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><Bookmark className="w-3.5 h-3.5" /> {lang === "pt" ? "Salvos" : "Saved"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <Link to="/metodologia" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> {lang === "pt" ? "Metodologia" : "Methodology"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </Link>
                  <Link to="/reports" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> {lang === "pt" ? "Relatórios" : "Reports"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </Link>
                  {user ? (
                    <>
                      <Link to="/perfil" onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                        <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {lang === "pt" ? "Perfil" : "Profile"}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </Link>
                      <button onClick={() => { handleLogout(); setDrawerOpen(false); }}
                        className="w-full flex items-center px-3 py-2 rounded-md hover:bg-destructive/5 transition-colors text-[11px] font-medium text-destructive">
                        <LogOut className="w-3.5 h-3.5 mr-2" /> {lang === "pt" ? "Sair" : "Sign out"}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setLoginOpen(true); setDrawerOpen(false); }}
                      className="w-full flex items-center px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                      <LogIn className="w-3.5 h-3.5 mr-2" /> {lang === "pt" ? "Entrar" : "Sign in"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm w-[92vw] border-border shadow-lg rounded-xl overflow-hidden p-0">
          <div className="p-6">
            <DialogHeader className="text-center space-y-1.5 pb-5">
              <DialogTitle className="text-[18px] font-semibold tracking-tight">
                {lang === "en" ? "Sign in to GTT Monitor" : "Entrar no GTT Monitor"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                {lang === "en" ? "Save trends, create alerts and track your history" : "Salve trends, crie alertas e acompanhe seu histórico"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <button onClick={() => handleOAuthLogin("google")} disabled={loginLoading !== null}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]">
                {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                {lang === "en" ? "Continue with Google" : "Continuar com Google"}
              </button>
              <button onClick={() => handleOAuthLogin("apple")} disabled={loginLoading !== null}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]">
                {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                {lang === "en" ? "Continue with Apple" : "Continuar com Apple"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(AppHeader);

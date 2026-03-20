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
  { value: "Todas", label: { pt: "Todas", en: "All", es: "Todas" } },
  { value: "Geopolítica", label: { pt: "Geopolítica", en: "Geopolitics", es: "Geopolítica" } },
  { value: "Economia", label: { pt: "Economia", en: "Economy", es: "Economía" } },
  { value: "Tecnologia", label: { pt: "Tecnologia", en: "Technology", es: "Tecnología" } },
  { value: "Ciência", label: { pt: "Ciência", en: "Science", es: "Ciencia" } },
  { value: "Saúde", label: { pt: "Saúde", en: "Health", es: "Salud" } },
  { value: "Entretenimento", label: { pt: "Entretenimento", en: "Entertainment", es: "Entretenimiento" } },
  { value: "Esportes", label: { pt: "Esportes", en: "Sports", es: "Deportes" } },
  { value: "Cultura", label: { pt: "Cultura", en: "Culture", es: "Cultura" } },
  { value: "Meio Ambiente", label: { pt: "Meio Ambiente", en: "Environment", es: "Medio Ambiente" } },
  { value: "Educação", label: { pt: "Educação", en: "Education", es: "Educación" } },
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

  const QUICK_COUNTRIES = [
    { value: "global", emoji: "🌐", label: "Global" },
    { value: "BR", emoji: "🇧🇷", label: "Brasil" },
    { value: "US", emoji: "🇺🇸", label: "EUA" },
    { value: "GB", emoji: "🇬🇧", label: "UK" },
    { value: "FR", emoji: "🇫🇷", label: "França" },
    { value: "DE", emoji: "🇩🇪", label: "Alemanha" },
  ];

  const QUICK_CATEGORIES = [
    { value: "Todas", label: { pt: "Todas", en: "All", es: "Todas" } },
    { value: "Geopolítica", label: { pt: "Geopolítica", en: "Geopolitics", es: "Geopolítica" } },
    { value: "Economia", label: { pt: "Economia", en: "Economy", es: "Economía" } },
    { value: "Tecnologia", label: { pt: "Tech", en: "Tech", es: "Tech" } },
    { value: "Saúde", label: { pt: "Saúde", en: "Health", es: "Salud" } },
    { value: "Esportes", label: { pt: "Esportes", en: "Sports", es: "Deportes" } },
  ];

  const [showMoreCountries, setShowMoreCountries] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/92 backdrop-blur-md border-b border-border/40" role="banner">
        {/* Row 1: Logo + inline filter pills + controls */}
        <div className="h-10 flex items-center px-3 md:px-5">
          <div className="w-full max-w-[1440px] mx-auto flex items-center gap-2 min-w-0">
            {/* Logo */}
            <Link to="/welcome" className="flex items-center gap-1 shrink-0" aria-label="GTT Monitor">
              <span className="text-[13px] font-bold tracking-tight text-foreground">GTT</span>
              <span className="text-[13px] font-medium tracking-tight text-muted-foreground">Monitor</span>
            </Link>

            {/* Separator */}
            <div className="w-px h-4 bg-border/50 shrink-0 hidden sm:block" />

            {/* Country pills */}
            {filters && onFilterChange && (
              <div className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-none shrink-0">
                {QUICK_COUNTRIES.map(c => (
                  <button key={c.value} onClick={() => update("country", c.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      filters.country === c.value
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}>
                    <span className="text-[11px]">{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
                <button onClick={() => setShowMoreCountries(!showMoreCountries)}
                  className="px-1.5 py-1 rounded-full text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap">
                  +{countries.flatMap(g => g.items).length - QUICK_COUNTRIES.length}
                </button>
              </div>
            )}

            {/* Separator */}
            <div className="w-px h-4 bg-border/50 shrink-0 hidden lg:block" />

            {/* Category pills */}
            {filters && onFilterChange && (
              <div className="hidden lg:flex items-center gap-0.5 overflow-x-auto scrollbar-none shrink-0">
                {QUICK_CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => update("category", c.value)}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      filters.category === c.value
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}>
                    {c.label[lang as keyof typeof c.label] || c.label.pt}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 min-w-0" />

            {/* Right controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Theme toggle - compact */}
              <button onClick={() => setDark(!dark)}
                className="compact-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {dark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>

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
                  className="compact-btn flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors">
                  <span className="hidden sm:inline">{t("enter")}</span>
                  <LogIn className="w-3 h-3 sm:hidden" />
                </button>
              )}

              {/* Menu drawer button */}
              <button onClick={() => setDrawerOpen(true)}
                className="compact-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
                <Menu className="w-4 h-4" />
                {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2 (mobile only): country + category pills */}
        {filters && onFilterChange && (
          <div className="md:hidden flex items-center gap-1 px-3 pb-1.5 overflow-x-auto scrollbar-none">
            {QUICK_COUNTRIES.slice(0, 4).map(c => (
              <button key={c.value} onClick={() => update("country", c.value)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.country === c.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}>
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
            <div className="w-px h-3 bg-border/40 shrink-0" />
            {QUICK_CATEGORIES.slice(0, 4).map(c => (
              <button key={c.value} onClick={() => update("category", c.value)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.category === c.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}>
                {c.label[lang as keyof typeof c.label] || c.label.pt}
              </button>
            ))}
            <button onClick={() => setDrawerOpen(true)}
              className="px-1.5 py-0.5 rounded-full text-[9px] text-muted-foreground hover:bg-muted/60 shrink-0">
              <Filter className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Expanded country picker (desktop "+N more" click) */}
        {showMoreCountries && filters && onFilterChange && (
          <div className="hidden md:block border-t border-border/30 px-5 py-2 bg-background/95 backdrop-blur-sm">
            <div className="max-w-[1440px] mx-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <input type="text" placeholder={lang === "pt" ? "Buscar país..." : "Search country..."}
                  value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                  className="h-7 px-2.5 rounded-md border border-border bg-card text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 w-48" />
                <button onClick={() => setShowMoreCountries(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-0.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                {filteredCountries.flatMap(g => g.items).map(c => (
                  <button key={c.value} onClick={() => { update("country", c.value); setShowMoreCountries(false); }}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      filters.country === c.value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Unified Navigation Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[360px] p-0">
          <SheetHeader className="p-4 pb-3 border-b border-border/30">
            <SheetTitle className="text-[14px] font-bold">
              {lang === "pt" ? "Filtros & Navegação" : lang === "es" ? "Filtros y Navegación" : "Filters & Navigation"}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-60px)]">
            <div className="p-4 space-y-5">
              {/* FILTERS SECTION */}
              {filters && onFilterChange && (
                <>
                  {/* Country / Region */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {lang === "pt" ? "País / Região" : lang === "es" ? "País / Región" : "Country / Region"}
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

                  {/* Categories */}
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
                          {c.label[lang as keyof typeof c.label] || c.label.pt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Period */}
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

                  {/* Source Type */}
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
                    <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> Dashboard</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <Link to="/historico" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Histórico" : "History"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <button onClick={() => { setDrawerOpen(false); onOpenSavedCollections?.(); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium text-left">
                    <span className="flex items-center gap-2"><Bookmark className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Salvos" : "Saved"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </button>
                  <Link to="/reports" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Relatórios" : "Reports"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                  <Link to="/metodologia" onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-[11px] font-medium">
                    <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-muted-foreground" /> {lang === "pt" ? "Sobre / Metodologia" : "About / Methodology"}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </Link>
                </div>
              </div>

              {/* AUTH */}
              <div className="border-t border-border/30 pt-4">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Avatar className="w-6 h-6">
                        {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                        <AvatarFallback className="text-[8px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{userName}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                    <button onClick={() => { handleLogout(); setDrawerOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-destructive hover:bg-destructive/5 transition-colors text-[11px] font-medium">
                      <LogOut className="w-3.5 h-3.5" /> {lang === "pt" ? "Sair" : "Log out"}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setDrawerOpen(false); setLoginOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-foreground text-background text-[11px] font-semibold hover:bg-foreground/90 transition-colors">
                    <LogIn className="w-3.5 h-3.5" /> {lang === "pt" ? "Entrar" : "Sign in"}
                  </button>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-[360px] p-6 rounded-2xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-center text-[16px] font-bold">{lang === "pt" ? "Entrar" : "Sign in"}</DialogTitle>
            <DialogDescription className="text-center text-[11px] text-muted-foreground">
              {lang === "pt" ? "Acesse para salvar, alertar e personalizar." : "Sign in to save, alert and personalize."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-3">
            <button onClick={() => handleOAuthLogin("google")} disabled={!!loginLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border text-[12px] font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              )}
              Google
            </button>
            <button onClick={() => handleOAuthLogin("apple")} disabled={!!loginLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50">
              {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.3-3.74 4.25z" /></svg>
              )}
              Apple
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppHeader;

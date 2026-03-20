import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, LogOut, LogIn, ChevronDown, User, FileText,
  Loader2, Menu, X, BarChart3, BookOpen, RefreshCw,
  Search, Bell, Bookmark, RotateCcw, Calendar, Layers
} from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FilterState } from "@/components/FilterBar";

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

const COUNTRY_PILLS = [
  { value: "global", label: "Global", flag: "🌐" },
  { value: "BR", label: "Brasil", flag: "🇧🇷" },
  { value: "US", label: "EUA", flag: "🇺🇸" },
  { value: "DE", label: "Alemanha", flag: "🇩🇪" },
  { value: "GB", label: "Reino Unido", flag: "🇬🇧" },
  { value: "FR", label: "França", flag: "🇫🇷" },
  { value: "JP", label: "Japão", flag: "🇯🇵" },
  { value: "CN", label: "China", flag: "🇨🇳" },
  { value: "IN", label: "Índia", flag: "🇮🇳" },
  { value: "KR", label: "Coreia", flag: "🇰🇷" },
];

const MORE_COUNTRIES = [
  { value: "MX", label: "México", flag: "🇲🇽" },
  { value: "AR", label: "Argentina", flag: "🇦🇷" },
  { value: "IT", label: "Itália", flag: "🇮🇹" },
  { value: "ES", label: "Espanha", flag: "🇪🇸" },
  { value: "PT", label: "Portugal", flag: "🇵🇹" },
  { value: "AU", label: "Austrália", flag: "🇦🇺" },
  { value: "ZA", label: "África do Sul", flag: "🇿🇦" },
  { value: "RU", label: "Rússia", flag: "🇷🇺" },
  { value: "CA", label: "Canadá", flag: "🇨🇦" },
  { value: "TR", label: "Turquia", flag: "🇹🇷" },
  { value: "PL", label: "Polônia", flag: "🇵🇱" },
  { value: "NL", label: "Holanda", flag: "🇳🇱" },
  { value: "SE", label: "Suécia", flag: "🇸🇪" },
  { value: "UA", label: "Ucrânia", flag: "🇺🇦" },
  { value: "CO", label: "Colômbia", flag: "🇨🇴" },
  { value: "CL", label: "Chile", flag: "🇨🇱" },
  { value: "EG", label: "Egito", flag: "🇪🇬" },
  { value: "NG", label: "Nigéria", flag: "🇳🇬" },
  { value: "SA", label: "Arábia Saudita", flag: "🇸🇦" },
  { value: "ID", label: "Indonésia", flag: "🇮🇩" },
  { value: "PH", label: "Filipinas", flag: "🇵🇭" },
  { value: "TH", label: "Tailândia", flag: "🇹🇭" },
  { value: "VN", label: "Vietnã", flag: "🇻🇳" },
  { value: "PK", label: "Paquistão", flag: "🇵🇰" },
  { value: "PS", label: "Palestina", flag: "🇵🇸" },
  { value: "IR", label: "Irã", flag: "🇮🇷" },
  { value: "IQ", label: "Iraque", flag: "🇮🇶" },
  { value: "NZ", label: "Nova Zelândia", flag: "🇳🇿" },
  { value: "NO", label: "Noruega", flag: "🇳🇴" },
  { value: "PE", label: "Peru", flag: "🇵🇪" },
];

const CATEGORY_PILLS = [
  { value: "Todas", label: { pt: "Todas", en: "All" } },
  { value: "Economia", label: { pt: "Economia", en: "Economy" } },
  { value: "Política", label: { pt: "Geopolítica", en: "Geopolitics" } },
  { value: "Saúde", label: { pt: "Saúde", en: "Health" } },
  { value: "Tecnologia", label: { pt: "Tech", en: "Tech" } },
  { value: "Esportes", label: { pt: "Esportes", en: "Sports" } },
  { value: "Ciência", label: { pt: "Ciência", en: "Science" } },
  { value: "Cultura", label: { pt: "Cultura", en: "Culture" } },
  { value: "Conflitos", label: { pt: "Conflitos", en: "Conflicts" } },
  { value: "Entretenimento", label: { pt: "Entretenimento", en: "Entertainment" } },
  { value: "Negócios", label: { pt: "Negócios", en: "Business" } },
];

const SOURCE_TYPE_FILTERS = [
  { v: "Todas mídias", l: { pt: "Todas", en: "All" } },
  { v: "Imprensa", l: { pt: "Imprensa", en: "Press" } },
  { v: "Redes sociais", l: { pt: "Social", en: "Social" } },
  { v: "Buscas (Google)", l: { pt: "Buscas", en: "Searches" } },
  { v: "Dados oficiais", l: { pt: "Dados Oficiais", en: "Official" } },
  { v: "Multiplataforma", l: { pt: "Multi", en: "Multi" } },
  { v: "Ciência", l: { pt: "Acadêmico", en: "Academic" } },
];

const PERIOD_OPTIONS = [
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
  const [moreCountriesOpen, setMoreCountriesOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!moreCountriesOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreCountriesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreCountriesOpen]);

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
    filters.type !== defaultFilters.type ||
    filters.query
  );

  return (
    <>
      <header className="sticky top-0 z-50 flex flex-col bg-background/92 backdrop-blur-md border-b border-border/50" role="banner">
        {/* Row 1: Logo + Search + Controls */}
        <div className="h-10 flex items-center px-2 md:px-4">
          <div className="w-full max-w-[1440px] mx-auto flex items-center gap-2">
            <Link to="/welcome" className="flex items-center gap-1.5 shrink-0 mr-1" aria-label="GTT Monitor">
              <span className="text-[11px] font-bold tracking-tight text-foreground">GTTMonitor</span>
            </Link>

            {filters && onFilterChange && (
              <div className="relative hidden sm:flex items-center h-7 w-[160px] lg:w-[200px] flex-shrink-0">
                <Search className="absolute left-2 text-muted-foreground w-3 h-3" />
                <input type="text" placeholder={lang === "pt" ? "Buscar tendência..." : "Search trend..."}
                  value={filters.query || ""} onChange={(e) => update("query", e.target.value)}
                  className="w-full h-full pl-6 pr-2 rounded-full border border-border bg-card text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 transition-all" />
                {filters.query && (
                  <button onClick={() => update("query", "")} className="absolute right-1.5 text-muted-foreground hover:text-foreground compact-btn">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <button onClick={() => setDark(!dark)}
                className="compact-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                aria-label={dark ? "Light mode" : "Dark mode"}>
                {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="compact-btn inline-flex items-center gap-0.5 px-1.5 h-7 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    {lang.toUpperCase()} <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px] max-h-[340px] overflow-y-auto">
                  {languages.map((l) =>
                    <DropdownMenuItem key={l.code} className={`gap-2 text-[12px] ${lang === l.code ? "font-semibold" : ""}`} onClick={() => setLang(l.code)}>
                      <span className="font-medium">{l.label}</span>
                      <span className="text-muted-foreground text-[10px]">{l.name}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-[10px] text-muted-foreground" onClick={() => {
                    window.dispatchEvent(new Event("trend-refresh"));
                    toast({ title: lang === "en" ? "Refreshing translations..." : "Atualizando traduções..." });
                  }}>
                    <RefreshCw className="w-3 h-3" /> {lang === "en" ? "Force re-translate" : "Forçar retradução"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <a href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex apoie-pill compact-link">{t("support")}</a>

              <div className="hidden sm:block w-px h-4 bg-border/40" />

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="compact-btn flex items-center justify-center w-7 h-7 rounded-full hover:ring-2 hover:ring-ring/20 transition-all">
                      <Avatar className="w-5 h-5">
                        {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                        <AvatarFallback className="text-[8px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2 border-b border-border/30">
                      <p className="text-[11px] font-semibold truncate">{userName}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuItem className="gap-2 text-[12px]" asChild><Link to="/dashboard"><BarChart3 className="w-3 h-3" /> Dashboard</Link></DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-[12px]" asChild><Link to="/reports"><FileText className="w-3 h-3" /> {lang === "en" ? "Reports" : "Relatórios"}</Link></DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-[12px]" asChild><Link to="/perfil"><User className="w-3 h-3" /> {lang === "en" ? "Profile" : "Perfil"}</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-[12px] text-destructive focus:text-destructive">
                      <LogOut className="w-3 h-3" /> {lang === "en" ? "Sign out" : "Sair"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button onClick={() => setLoginOpen(true)}
                  className="compact-btn flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold bg-foreground text-background">
                  <span className="hidden sm:inline">{t("enter")}</span>
                  <LogIn className="w-3 h-3 sm:hidden" />
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="compact-btn flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                    <Menu className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2 text-[12px]" asChild><Link to="/dashboard"><BarChart3 className="w-3 h-3" /> Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[12px]" onClick={onSaveFilter}><Bell className="w-3 h-3" /> {lang === "pt" ? "Alertas" : "Alerts"}</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[12px]" onClick={onOpenSavedCollections}><Bookmark className="w-3 h-3" /> {lang === "pt" ? "Salvos" : "Saved"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-[12px]" asChild><Link to="/metodologia"><BookOpen className="w-3 h-3" /> {lang === "pt" ? "Metodologia" : "Methodology"}</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Row 2: Country pills + Category + Source type + Period */}
        {filters && onFilterChange && (
          <div className="flex items-center px-2 md:px-4 border-t border-border/30 overflow-hidden" style={{ height: 32 }}>
            <div className="w-full max-w-[1440px] mx-auto flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {/* Countries */}
              {COUNTRY_PILLS.map(c => (
                <button key={c.value} onClick={() => update("country", c.value)}
                  className={`compact-btn flex-shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[9px] font-semibold transition-all ${
                    filters.country === c.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  <span className="text-[10px]">{c.flag}</span><span>{c.label}</span>
                </button>
              ))}

              <div className="relative flex-shrink-0" ref={moreRef}>
                <button onClick={() => setMoreCountriesOpen(!moreCountriesOpen)}
                  className={`compact-btn inline-flex items-center gap-0.5 px-2 h-6 rounded-full text-[9px] font-semibold transition-all ${
                    MORE_COUNTRIES.some(mc => mc.value === filters.country) ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  +{MORE_COUNTRIES.length} <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {moreCountriesOpen && (
                  <div className="absolute top-full left-0 mt-1 z-[9999] bg-popover border border-border rounded-lg p-1 shadow-lg min-w-[180px] max-h-[320px] overflow-y-auto grid grid-cols-2 gap-0.5">
                    {MORE_COUNTRIES.map(c => (
                      <button key={c.value} onClick={() => { update("country", c.value); setMoreCountriesOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-1 text-[10px] transition-colors ${
                          filters.country === c.value ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                        }`}>
                        <span>{c.flag}</span> {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-border/30 flex-shrink-0 mx-0.5" />

              {/* Categories */}
              {CATEGORY_PILLS.map(c => (
                <button key={c.value} onClick={() => update("category", c.value)}
                  className={`compact-btn flex-shrink-0 inline-flex items-center px-2 h-6 rounded-full text-[9px] font-semibold transition-all ${
                    filters.category === c.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}>
                  {c.label[lang as "pt" | "en"] || c.label.pt}
                </button>
              ))}

              <div className="w-px h-4 bg-border/30 flex-shrink-0 mx-0.5 hidden md:block" />

              {/* Source type pills — desktop */}
              <div className="hidden md:flex items-center gap-0.5">
                {SOURCE_TYPE_FILTERS.map(o => (
                  <button key={o.v} onClick={() => update("type", o.v)}
                    className={`compact-btn flex-shrink-0 inline-flex items-center px-2 h-6 rounded-full text-[9px] font-semibold transition-all ${
                      filters.type === o.v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    {o.l[lang as "pt" | "en"] || o.l.pt}
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-border/30 flex-shrink-0 mx-0.5 hidden lg:block" />

              {/* Period dropdown — desktop */}
              <div className="hidden lg:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`compact-btn inline-flex items-center gap-0.5 px-2 h-6 rounded-full text-[9px] font-semibold transition-all ${
                      filters.period !== defaultFilters.period ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    }`}>
                      <Calendar className="w-3 h-3" />
                      {PERIOD_OPTIONS.find(p => p.v === filters.period)?.l[lang as "pt" | "en"] || filters.period}
                      <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[140px]">
                    {PERIOD_OPTIONS.map(o => (
                      <DropdownMenuItem key={o.v} onClick={() => update("period", o.v)}
                        className={`text-[11px] ${filters.period === o.v ? "font-semibold text-primary" : ""}`}>
                        {o.l[lang as "pt" | "en"] || o.l.pt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={() => { onFilterChange(defaultFilters); onForceReset?.(); }}
                  className="compact-btn flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all ml-1"
                  title={lang === "pt" ? "Limpar filtros" : "Clear filters"}>
                  <RotateCcw size={10} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

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

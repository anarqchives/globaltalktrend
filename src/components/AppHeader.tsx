import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, LogOut, LogIn, Info, ChevronDown, User, FileText,
  Loader2, Menu, X, BarChart3, BookOpen, RefreshCw, Heart,
  Globe, Calendar, LayoutGrid, Layers, Search, Bell, Bookmark, RotateCcw
} from "lucide-react";
import { useLanguage, languages, LangCode } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { FilterState, countries } from "@/components/FilterBar";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
  query: "",
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

/* ─── Chip Dropdown (portal-rendered) ─── */
function ChipDropdown({
  chipLabel, value, options, isActive, icon, onChange, onClear, isGrouped, groups
}: {
  chipLabel: string; value: string; options: { value: string; label: string }[];
  isActive: boolean; icon: React.ReactNode; onChange: (v: string) => void;
  onClear: () => void; isGrouped?: boolean; groups?: typeof countries;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = isGrouped && groups
    ? groups.flatMap(g => g.items).find(c => c.value === value)?.label
    : options.find(o => o.value === value)?.label;
  const displayText = isActive && selectedLabel
    ? selectedLabel.replace(/^[^\w\s]*\s*/, '').slice(0, 12)
    : chipLabel;

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(!open)}
        className={`inline-flex items-center h-7 px-2 rounded-[10px] text-[11px] font-semibold gap-1 border transition-all duration-150 flex-shrink-0 ${
          isActive
            ? "border-foreground bg-foreground text-background"
            : "border-border bg-card text-foreground/70 hover:border-foreground/20 hover:text-foreground"
        }`}>
        <span className="flex-shrink-0 flex items-center">{icon}</span>
        <span className="truncate max-w-[72px]">{displayText}</span>
        {isActive ? (
          <span onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }} className="flex-shrink-0 cursor-pointer hover:opacity-70 ml-0.5 flex items-center">
            <X size={9} />
          </span>
        ) : <ChevronDown size={9} className="flex-shrink-0 opacity-40 ml-0.5" />}
      </button>
      {open && pos && createPortal(
        <AnimatePresence>
          <motion.div ref={dropRef} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[9999] bg-popover border border-border rounded-xl p-1 shadow-xl"
            style={{ top: pos.top, left: pos.left, minWidth: 200, maxHeight: 360, overflowY: "auto" }}>
            {isGrouped && groups ? (
              groups.map(group => (
                <div key={group.group}>
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">{group.group}</div>
                  {group.items.map(item => (
                    <button key={item.value} onClick={() => { onChange(item.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-lg transition-colors text-[12px] ${
                        value === item.value ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                      }`}>
                      <span>{item.label}</span>
                      {value === item.value && <span className="text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              options.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-lg transition-colors text-[12px] ${
                    value === opt.value ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                  }`}>
                  <span>{opt.label}</span>
                  {value === opt.value && <span className="text-primary text-xs">✓</span>}
                </button>
              ))
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const AppHeader = ({ minimal = false, filters, onFilterChange, onForceReset, onSaveFilter, onOpenSavedCollections, isLoggedIn }: AppHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const redirectUri = `${window.location.origin}/auth/callback`;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
      if (result?.error) {
        toast({ title: "Falha no login", description: "Não foi possível concluir o login.", variant: "destructive" });
        setLoginLoading(null);
      }
    } catch {
      toast({ title: "Erro inesperado", description: "Houve um problema ao iniciar o login.", variant: "destructive" });
      setLoginLoading(null);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const update = (key: keyof FilterState, value: string) => {
    if (filters && onFilterChange) onFilterChange({ ...filters, [key]: value });
  };

  const isFiltered = filters && (
    filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type ||
    filters.query !== defaultFilters.query
  );

  const healthLabel: Record<string, string> = { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit" };
  const periodOptions = [
    { value: "Última hora", label: t("lastHour") },
    { value: "Hoje", label: t("today") },
    { value: "Esta semana", label: t("thisWeek") },
    { value: "Este mês", label: t("thisMonth") }
  ];
  const categoryOptions = [
    { value: "Todas", label: t("all") },
    { value: "Política", label: t("politics") },
    { value: "Economia", label: t("business") },
    { value: "Tecnologia", label: t("technology") },
    { value: "Ciência", label: t("science") },
    { value: "Saúde", label: healthLabel[lang] || "Saúde" },
    { value: "Esportes", label: t("sports") },
    { value: "Entretenimento", label: t("entertainment") },
    { value: "Cultura", label: t("culture") }
  ];
  const typeOptions = [
    { value: "Todas mídias", label: t("allMedia") },
    { value: "Multiplataforma", label: "Multiplataforma" },
    { value: "Redes sociais", label: t("socialMedia") },
    { value: "Imprensa", label: t("press") },
    { value: "Buscas (Google)", label: t("searches") },
    { value: "Dados oficiais", label: "Dados Oficiais" }
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="sticky top-0 z-50 h-[52px] flex items-center px-2 md:px-4 bg-background/90 backdrop-blur-md border-b border-border"
        role="banner"
      >
        <div className="w-full max-w-[1440px] mx-auto flex items-center gap-1.5 md:gap-2">

          {/* Logo */}
          <Link to="/welcome" className="flex items-center gap-1.5 shrink-0 mr-1" aria-label="GTT Monitor">
            <img src="/logo-icon.png" alt="GTT" className="h-5 w-auto dark:invert"
              onError={(e) => { e.currentTarget.style.display = 'none'; const n = e.currentTarget.nextElementSibling; if (n) n.classList.remove('hidden'); }}
            />
            <span className="hidden text-[13px] font-bold tracking-tight text-foreground">GTT</span>
          </Link>

          {/* Filters — only when filters prop is provided */}
          {filters && onFilterChange && (
            <>
              {/* Search */}
              <div className="relative hidden sm:flex items-center h-7 w-[140px] lg:w-[160px] flex-shrink-0">
                <Search className="absolute left-2 text-muted-foreground w-3 h-3" />
                <input
                  type="text"
                  placeholder={lang === "pt" ? "Buscar..." : "Search..."}
                  value={filters.query || ""}
                  onChange={(e) => update("query", e.target.value)}
                  className="w-full h-full pl-6 pr-2 rounded-[10px] border border-border bg-card text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                {filters.query && (
                  <button onClick={() => update("query", "")} className="absolute right-1.5 text-muted-foreground hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              <ChipDropdown chipLabel="Global" value={filters.country} options={[]}
                isActive={filters.country !== defaultFilters.country}
                icon={<Globe size={12} />}
                onChange={(v) => update("country", v)}
                onClear={() => update("country", defaultFilters.country)}
                isGrouped groups={countries} />
              <ChipDropdown chipLabel={lang === "pt" ? "Hoje" : "Today"} value={filters.period} options={periodOptions}
                isActive={filters.period !== defaultFilters.period}
                icon={<Calendar size={12} />}
                onChange={(v) => update("period", v)}
                onClear={() => update("period", defaultFilters.period)} />
              <div className="hidden md:contents">
                <ChipDropdown chipLabel={lang === "pt" ? "Categoria" : "Category"} value={filters.category} options={categoryOptions}
                  isActive={filters.category !== defaultFilters.category}
                  icon={<LayoutGrid size={12} />}
                  onChange={(v) => update("category", v)}
                  onClear={() => update("category", defaultFilters.category)} />
                <ChipDropdown chipLabel={lang === "pt" ? "Mídia" : "Media"} value={filters.type} options={typeOptions}
                  isActive={filters.type !== defaultFilters.type}
                  icon={<Layers size={12} />}
                  onChange={(v) => update("type", v)}
                  onClear={() => update("type", defaultFilters.type)} />
              </div>

              {isFiltered && (
                <button onClick={() => { onFilterChange(defaultFilters); onForceReset?.(); }}
                  className="flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-[10px] border border-border bg-card text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                  title={lang === "pt" ? "Limpar filtros" : "Clear filters"}>
                  <RotateCcw size={11} />
                </button>
              )}

              <div className="w-px h-4 bg-border/60 hidden sm:block mx-0.5" />

              {/* Alert + Bookmark */}
              <button onClick={onSaveFilter}
                className="flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title={lang === "pt" ? "Criar alerta" : "Create alert"}>
                <Bell size={14} />
              </button>
              <button onClick={onOpenSavedCollections}
                className="flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-[10px] text-muted-foreground hover:text-foreground transition-colors"
                title={lang === "pt" ? "Coleções" : "Collections"}>
                <Bookmark size={14} />
              </button>

              <div className="w-px h-4 bg-border/60 hidden sm:block mx-0.5" />
            </>
          )}

          {/* Spacer */}
          <div className="flex-1 min-w-2" />

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Language */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 px-1.5 h-7 rounded-[10px] text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span className="text-[10px]">🌐</span>
                  <span>{lang.toUpperCase()}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] max-h-[340px] overflow-y-auto rounded-2xl">
                {languages.map((l) =>
                  <DropdownMenuItem key={l.code} className={`gap-2 text-[13px] ${lang === l.code ? "font-semibold" : ""}`}
                    onClick={() => setLang(l.code)}>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-muted-foreground text-[11px]">{l.name}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-[11px] text-muted-foreground" onClick={() => {
                  window.dispatchEvent(new Event("trend-refresh"));
                  toast({ title: lang === "en" ? "Refreshing translations..." : "Atualizando traduções..." });
                }}>
                  <RefreshCw className="w-3 h-3" />
                  {lang === "en" ? "Force re-translate" : "Forçar retradução"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode */}
            <button onClick={() => setDark(!dark)}
              className="flex items-center justify-center w-7 h-7 rounded-[10px] text-muted-foreground hover:text-foreground transition-colors"
              aria-label={dark ? "Light mode" : "Dark mode"}>
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* About */}
            <button onClick={() => navigate("/metodologia")}
              className="hidden sm:flex items-center justify-center w-7 h-7 rounded-[10px] text-muted-foreground hover:text-foreground transition-colors"
              aria-label={lang === "en" ? "About" : "Sobre"}>
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="hidden sm:block w-px h-4 bg-border/60" />

            {/* Support — sole red accent */}
            <a href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center h-7 px-3 rounded-full bg-[hsl(var(--destructive))] text-white text-[11px] font-semibold transition-all hover:brightness-110 hover:shadow-md">
              {t("support")}
            </a>

            <div className="hidden sm:block w-px h-4 bg-border/60" />

            {/* Auth */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-7 h-7 rounded-full hover:ring-2 hover:ring-ring/20 transition-all">
                    <Avatar className="w-6 h-6">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="text-[9px] font-bold bg-foreground text-background">{userInitial}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl">
                  <div className="px-3 py-2.5 border-b border-border/30">
                    <p className="text-[12px] font-semibold truncate">{userName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild><Link to="/dashboard"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild><Link to="/reports"><FileText className="w-3.5 h-3.5" /> {lang === "en" ? "Reports" : "Relatórios"}</Link></DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild><Link to="/perfil"><User className="w-3.5 h-3.5" /> {lang === "en" ? "Profile" : "Perfil"}</Link></DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-[13px]" asChild><Link to="/metodologia"><BookOpen className="w-3.5 h-3.5" /> {lang === "en" ? "Methodology" : "Metodologia"}</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-[13px] text-destructive focus:text-destructive">
                    <LogOut className="w-3.5 h-3.5" /> {lang === "en" ? "Sign out" : "Sair"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <motion.button onClick={() => setLoginOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-semibold bg-foreground text-background">
                <span className="hidden sm:inline">{t("enter")}</span>
                <LogIn className="w-3 h-3 sm:hidden" />
              </motion.button>
            )}

            {/* Mobile hamburger */}
            {!minimal && (
              <button onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden flex items-center justify-center w-7 h-7 rounded-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {!minimal && mobileNavOpen && (
          <motion.nav initial={{ opacity: 0, y: "-100%" }} animate={{ opacity: 1, y: "0%" }} exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="md:hidden fixed top-[52px] inset-x-0 z-40 bg-background/98 backdrop-blur-xl border-b border-border px-4 py-4 flex flex-col gap-1">

            {/* Mobile filters */}
            {filters && onFilterChange && (
              <div className="flex flex-wrap gap-1.5 pb-3 mb-2 border-b border-border">
                <div className="relative flex items-center h-7 w-full mb-1">
                  <Search className="absolute left-2 text-muted-foreground w-3 h-3" />
                  <input type="text" placeholder={lang === "pt" ? "Buscar..." : "Search..."}
                    value={filters.query || ""} onChange={(e) => update("query", e.target.value)}
                    className="w-full h-full pl-6 pr-2 rounded-[10px] border border-border bg-card text-[11px] text-foreground placeholder:text-muted-foreground outline-none" />
                </div>
                <ChipDropdown chipLabel="Global" value={filters.country} options={[]}
                  isActive={filters.country !== defaultFilters.country} icon={<Globe size={12} />}
                  onChange={(v) => update("country", v)} onClear={() => update("country", defaultFilters.country)}
                  isGrouped groups={countries} />
                <ChipDropdown chipLabel={lang === "pt" ? "Hoje" : "Today"} value={filters.period} options={periodOptions}
                  isActive={filters.period !== defaultFilters.period} icon={<Calendar size={12} />}
                  onChange={(v) => update("period", v)} onClear={() => update("period", defaultFilters.period)} />
                <ChipDropdown chipLabel={lang === "pt" ? "Categoria" : "Category"} value={filters.category} options={categoryOptions}
                  isActive={filters.category !== defaultFilters.category} icon={<LayoutGrid size={12} />}
                  onChange={(v) => update("category", v)} onClear={() => update("category", defaultFilters.category)} />
                <ChipDropdown chipLabel={lang === "pt" ? "Mídia" : "Media"} value={filters.type} options={typeOptions}
                  isActive={filters.type !== defaultFilters.type} icon={<Layers size={12} />}
                  onChange={(v) => update("type", v)} onClear={() => update("type", defaultFilters.type)} />
              </div>
            )}

            {[
              { path: "/", labelPt: "Explorar", labelEn: "Explore" },
              { path: "/dashboard", labelPt: "Dashboard", labelEn: "Dashboard" },
              { path: "/reports", labelPt: "Relatórios", labelEn: "Reports" },
              { path: "/metodologia", labelPt: "Sobre", labelEn: "About" },
              { path: "/perfil", labelPt: "Perfil", labelEn: "Profile" },
            ].map((item, i) => (
              <motion.div key={item.path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={item.path} onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all">
                  {lang === "en" ? item.labelEn : item.labelPt}
                </Link>
              </motion.div>
            ))}
            <motion.a initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00" target="_blank" rel="noopener noreferrer"
              className="sm:hidden flex items-center justify-center gap-2 mx-4 mt-2 h-11 rounded-full bg-[hsl(var(--destructive))] text-white text-[13px] font-semibold">
              {t("support")}
            </motion.a>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm w-[92vw] border-border shadow-lg rounded-3xl overflow-hidden p-0">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="p-6">
            <DialogHeader className="text-center space-y-1.5 pb-5">
              <DialogTitle className="text-[18px] font-semibold tracking-tight">
                {lang === "en" ? "Sign in to GTT Monitor" : "Entrar no GTT Monitor"}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                {lang === "en" ? "Save trends, create alerts and track your history" : "Salve trends, crie alertas e acompanhe seu histórico"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <motion.button onClick={() => handleOAuthLogin("google")} disabled={loginLoading !== null} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-border bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]">
                {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                {lang === "en" ? "Continue with Google" : "Continuar com Google"}
              </motion.button>
              <motion.button onClick={() => handleOAuthLogin("apple")} disabled={loginLoading !== null} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-border bg-card hover:bg-secondary/30 transition-colors text-[13px] font-medium disabled:opacity-60 min-h-[48px]">
                {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                {lang === "en" ? "Continue with Apple" : "Continuar com Apple"}
              </motion.button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(AppHeader);

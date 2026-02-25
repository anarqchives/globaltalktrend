import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Sun, Moon, RefreshCw, LogOut, LogIn, BookOpen, Star, Bell, Clock, ChevronDown, User, AlertTriangle, X, FileText, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { useAlerts } from "@/hooks/use-alerts";
// useGamification removed from header
// AchievementsPanel removed
import { useUserMode, userModes } from "@/contexts/UserModeContext";
import type { AnomalyAlert } from "@/hooks/use-anomaly-alerts";
import type { FilterState } from "@/components/FilterBar";

interface TrendHeaderProps {
  totalTrends?: number;
  countriesCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  filters?: FilterState;
  onApplyFilter?: (filters: FilterState) => void;
  anomalyCount?: number;
  anomalies?: AnomalyAlert[];
  onDismissAnomaly?: (title: string) => void;
  onOpenTransparency?: () => void;
}

const TrendHeader = ({ totalTrends = 0, countriesCount = 0, onRefresh, refreshing, filters, onApplyFilter, anomalyCount = 0, anomalies = [], onDismissAnomaly, onOpenTransparency }: TrendHeaderProps) => {
  const { lang, setLang, t } = useLanguage();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState<"google" | "apple" | null>(null);
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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

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
  // Gamification removed from header menu
  const [anomalyPanelOpen, setAnomalyPanelOpen] = useState(false);
  const { mode, setMode } = useUserMode();



  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const redirectUri = `${window.location.origin}/auth/callback`;
      console.info("[Auth] OAuth start", { provider, redirectUri, hostname: window.location.hostname });

      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectUri,
      });

      if (result?.error) {
        console.error("[Auth] OAuth failed", { provider, error: result.error });
        toast({ title: "Falha no login", description: "Não foi possível concluir o login. Tente novamente.", variant: "destructive" });
        setLoginLoading(null);
        return;
      }

      console.info("[Auth] OAuth request accepted", { provider, redirected: !!result?.redirected });

      if (!result?.redirected) {
        setLoginOpen(false);
        setLoginLoading(null);
      }
    } catch (error) {
      console.error("[Auth] Unexpected login error", { provider, error });
      toast({ title: "Erro inesperado", description: "Houve um problema ao iniciar o login.", variant: "destructive" });
      setLoginLoading(null);
    }
  };

  const handleLoginGoogle = async () => {
    await handleOAuthLogin("google");
  };

  const handleLoginApple = async () => {
    await handleOAuthLogin("apple");
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
      type: sf.media_type || "Todas mídias"
    });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = contactName.trim();
    const email = contactEmail.trim();
    const message = contactMessage.trim();

    if (name.length < 2 || name.length > 80) {
      toast({ title: "Nome inválido", description: "Use um nome entre 2 e 80 caracteres.", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      toast({ title: "Email inválido", description: "Informe um email válido.", variant: "destructive" });
      return;
    }

    if (message.length < 10 || message.length > 2000) {
      toast({ title: "Mensagem inválida", description: "A mensagem deve ter entre 10 e 2000 caracteres.", variant: "destructive" });
      return;
    }

    const subject = encodeURIComponent(`[Contato Global Talk] ${name}`);
    const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`);

    window.location.href = `mailto:talk@globaltalktrend.com?subject=${subject}&body=${body}`;
    toast({ title: "Abrindo seu email", description: "Revise e envie sua mensagem no app de email." });
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
              <span className="font-semibold text-foreground hidden sm:inline">Global Talk Trends</span>
              <span className="font-semibold text-foreground sm:hidden">GTT</span>
              <span className="text-muted-foreground hidden md:inline">Monitor Imparcial em Tempo Real</span>
            </h1>
            {totalTrends > 1 && countriesCount > 0 ?
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums flex-shrink-0 hidden sm:inline-flex">
                {totalTrends} {t("trends")} · {countriesCount} {countriesCount > 1 ? t("countries") : t("country")}
              </span> :

            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium flex-shrink-0 hidden sm:inline-flex animate-pulse">
                Carregando tendências…
              </span>
            }
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onRefresh &&
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              title={t("updated")}>

                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            }

            {/* Language selector: dropdown on mobile, inline on desktop */}
            <div className="hidden md:flex gap-0.5 overflow-x-auto scrollbar-thin">
              {languages.map((l) =>
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                lang === l.code ?
                "bg-primary text-primary-foreground" :
                "text-muted-foreground hover:bg-secondary"}`
                }
                title={l.name}>

                  {l.label}
                </button>
              )}
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-[11px] font-medium text-foreground min-h-[36px] min-w-[44px] justify-center">
                    {languages.find((l) => l.code === lang)?.label || "PT"}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px] max-h-[300px] overflow-y-auto">
                  {languages.map((l) =>
                  <DropdownMenuItem
                    key={l.code}
                    className={`text-[13px] gap-2 ${lang === l.code ? "bg-primary/10 text-primary font-semibold" : ""}`}
                    onClick={() => setLang(l.code)}>

                      <span className="font-medium">{l.label}</span>
                      <span className="text-muted-foreground text-[11px]">{l.name}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              onClick={() => setDark(!dark)}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors"
              title={dark ? "Modo claro" : "Modo escuro"}>

              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Anomaly alerts badge */}
            {anomalyCount > 0 &&
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center font-bold">
                      {anomalyCount}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-64 overflow-y-auto">
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">🚨 Anomalias detectadas</span>
                  </div>
                  {anomalies.map((a, i) =>
                <DropdownMenuItem key={i} className="text-xs gap-2 justify-between" onSelect={(e) => e.preventDefault()}>
                      <span className="truncate flex-1">{a.message.slice(0, 80)}</span>
                      <button
                    onClick={(e) => {e.stopPropagation();onDismissAnomaly?.(a.trend.title);}}
                    className="text-muted-foreground hover:text-foreground p-0.5 shrink-0">

                        <X className="w-3 h-3" />
                      </button>
                    </DropdownMenuItem>
                )}
                </DropdownMenuContent>
              </DropdownMenu>
            }

            {/* User Mode selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1 min-h-[36px]">
                  {userModes.find((m) => m.key === mode)?.emoji} <span className="hidden sm:inline">{userModes.find((m) => m.key === mode)?.label}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {userModes.map((m) =>
                <DropdownMenuItem
                  key={m.key}
                  className={`text-xs gap-2 ${mode === m.key ? "bg-primary/10 text-primary" : ""}`}
                  onClick={() => setMode(m.key)}>

                    <span>{m.emoji}</span>
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-[10px] text-muted-foreground">{m.description}</div>
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>


            <button
              onClick={() => setAboutOpen(true)}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1 min-h-[36px]">

              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">{t("about")}</span>
            </button>

            {/* Auth + user menu */}
            {user ?
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full hover:bg-secondary transition-colors min-h-[40px] min-w-[44px]">
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
                  {savedFilters.length > 0 ?
                savedFilters.slice(0, 5).map((sf) =>
                <DropdownMenuItem
                  key={sf.id}
                  className="text-xs gap-2 justify-between"
                  onClick={() => handleApplySavedFilter(sf)}>

                        <span className="flex items-center gap-1.5 truncate">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {sf.name}
                        </span>
                        <button
                    onClick={(e) => {e.stopPropagation();deleteFilter(sf.id);}}
                    className="text-muted-foreground hover:text-red-500 p-0.5">

                          ×
                        </button>
                      </DropdownMenuItem>
                ) :

                <div className="px-2 py-1 text-[11px] text-muted-foreground/60">Nenhum filtro salvo</div>
                }
                  {filters &&
                <>
                      {showSaveInput ?
                  <div className="px-2 py-1.5 flex gap-1">
                          <input
                      type="text"
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                      placeholder="Nome do filtro..."
                      className="flex-1 px-2 py-1 rounded-md bg-secondary text-xs border border-border focus:outline-none focus:ring-1 focus:ring-primary/30"
                      autoFocus />

                          <button
                      onClick={handleSaveFilter}
                      className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium">

                            Salvar
                          </button>
                        </div> :

                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowSaveInput(true)}>
                          <Star className="w-3 h-3" />
                          Salvar filtros atuais
                        </DropdownMenuItem>
                  }
                    </>
                }

                  <DropdownMenuSeparator />

                  {/* Reports */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <Link to="/perfil?tab=reports" className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Gerar Relatório
                    </Link>
                  </DropdownMenuItem>

                  {/* Alerts */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <span className="flex items-center gap-2 cursor-default">
                      <Bell className="w-3.5 h-3.5" />
                      Meus Alertas
                      {alerts.length > 0 &&
                    <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                          {alerts.length}
                        </span>
                    }
                    </span>
                  </DropdownMenuItem>

                  {/* Profile */}
                  <DropdownMenuItem className="text-xs gap-2" asChild>
                    <Link to="/perfil" className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Meu Perfil
                    </Link>
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
              </DropdownMenu> :

            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1 rounded-full text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm min-h-[26px] min-w-[40px] mx-px px-[14px] py-[1px]">

                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("enter")}</span>
              </button>
            }
          </div>
        </div>
      </header>

      {/* AchievementsPanel removed */}

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg w-[92vw] bg-background dark:bg-card border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[85vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-y-auto max-h-[85vh] scrollbar-thin">

            <div className="px-6 pt-6 pb-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground text-center">
                  Sobre o Global Talk Trending
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground text-center">
                  Monitoramento global de trends em tempo real
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* Seção 1: O que é */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  O que é
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Plataforma gratuita e transparente que monitora trends em redes sociais, imprensa e buscas em mais de 26 países. Reunimos dados de fontes públicas para oferecer uma visão em tempo real do que está sendo discutido no mundo.
                </p>
              </section>

              {/* Seção 2: Nossas fontes */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Nossas fontes
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                  { name: "YouTube", detail: "API oficial", icon: "🎬", color: "hsl(0, 72%, 51%)" },
                  { name: "Reddit", detail: "API pública", icon: "💬", color: "hsl(16, 100%, 50%)" },
                  { name: "Google Trends", detail: "RSS", icon: "📈", color: "hsl(210, 100%, 40%)" },
                  { name: "NewsAPI / Guardian / GNews", detail: "Notícias", icon: "📰", color: "hsl(142, 60%, 40%)" },
                  { name: "Twitter/X", detail: "API gratuita", icon: "🐦", color: "hsl(200, 85%, 55%)" },
                  { name: "TikTok", detail: "via Apify", icon: "🎵", color: "hsl(340, 80%, 55%)" },
                  { name: "IBGE / ONU / World Bank", detail: "Gov & dados", icon: "🏛️", color: "hsl(200, 80%, 45%)" },
                  { name: "OpenAlex", detail: "Científico", icon: "🔬", color: "hsl(270, 60%, 50%)" }].
                  map((src) =>
                  <div
                    key={src.name}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors">

                      <span className="text-sm shrink-0">{src.icon}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium text-foreground block truncate">{src.name}</span>
                        <span className="text-[9px] text-muted-foreground">{src.detail}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Seção 3: Transparência */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Transparência
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Todas as fontes são públicas e citadas. Dados de plataformas com acesso restrito (Instagram, Facebook) são estimativas baseadas em amostras públicas. Nosso compromisso é com a transparência: mostramos sempre a origem da informação.
                </p>
              </section>

              {/* Seção 4: Quem mantém */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Quem mantém
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ferramenta independente, mantida com apoio de doações de usuários. Código e metodologia abertos.
                </p>
              </section>

              {/* Seção 5: Apoie - removido, agora é floating button no mapa */}

              {/* Metodologia link */}
              <div className="flex items-center justify-center">
                <Link
                  to="/metodologia"
                  onClick={() => setAboutOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">

                  <BookOpen className="w-3.5 h-3.5" /> Ver metodologia completa
                </Link>
              </div>

              {/* Rodapé */}
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] text-muted-foreground">
                  <span className="whitespace-nowrap">✉ talk@globaltalktrend.com</span>
                  <span>v2.02</span>
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Nome"
                      maxLength={80}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Email"
                      maxLength={255}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Mensagem"
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Enviar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-[400px] w-[90vw] bg-white dark:bg-card border-none shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] rounded-2xl p-0 overflow-hidden outline-none ring-0 focus:outline-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}>

            <div className="px-6 pt-6 pb-2">
              <DialogHeader className="space-y-1.5">
                <DialogTitle className="text-xl font-semibold text-foreground tracking-tight text-center">
                  {t("loginTitle")}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground text-center">
                  {t("loginSubtitle")}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 py-5 space-y-3">
               <button
                onClick={handleLoginGoogle}
                disabled={!!loginLoading}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-full border border-border/60 bg-white dark:bg-secondary hover:bg-muted dark:hover:bg-muted transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed">

                {loginLoading === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span className="text-[15px] font-medium text-foreground">
                  {loginLoading === "google" ? t("connecting") : t("continueWithGoogle")}
                </span>
              </button>

              <button
                onClick={handleLoginApple}
                disabled={!!loginLoading}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-full border border-border/60 bg-white dark:bg-secondary hover:bg-muted dark:hover:bg-muted transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed">

                {loginLoading === "apple" ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                <span className="text-[15px] font-medium text-foreground">
                  {loginLoading === "apple" ? t("connecting") : t("continueWithApple")}
                </span>
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
                {t("termsIntro")}{" "}
                <a href="#" className="text-primary hover:underline">{t("termsOfUse")}</a>
                {" "}&{" "}
                <a href="#" className="text-primary hover:underline">{t("privacyPolicy")}</a>
              </p>

              <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
                <span>❤️</span>
                <span>{t("allFeaturesFree")}</span>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>);

};

export default TrendHeader;
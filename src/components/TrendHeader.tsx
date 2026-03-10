import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Sun, Moon, LogOut, LogIn, BookOpen, Star, ChevronDown, User, FileText, Users, Loader2, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { useAlerts } from "@/hooks/use-alerts";
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
  onAnomalyClick?: (trendId: string) => void;
}

const TrendHeader = ({ totalTrends = 0, countriesCount = 0, onRefresh, refreshing, filters, onApplyFilter, anomalyCount = 0, anomalies = [], onDismissAnomaly, onOpenTransparency, onAnomalyClick }: TrendHeaderProps) => {
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

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setLoginLoading(provider);
      const redirectUri = `${window.location.origin}/auth/callback`;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
      if (result?.error) {
        toast({ title: "Falha no login", description: "Não foi possível concluir o login. Tente novamente.", variant: "destructive" });
        setLoginLoading(null);
        return;
      }
      if (!result?.redirected) { setLoginOpen(false); setLoginLoading(null); }
    } catch (error) {
      toast({ title: "Erro inesperado", description: "Houve um problema ao iniciar o login.", variant: "destructive" });
      setLoginLoading(null);
    }
  };

  const handleLoginGoogle = async () => { await handleOAuthLogin("google"); };
  const handleLoginApple = async () => { await handleOAuthLogin("apple"); };
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = contactName.trim();
    const email = contactEmail.trim();
    const message = contactMessage.trim();
    if (name.length < 2 || name.length > 80) { toast({ title: "Nome inválido", description: "Use um nome entre 2 e 80 caracteres.", variant: "destructive" }); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) { toast({ title: "Email inválido", description: "Informe um email válido.", variant: "destructive" }); return; }
    if (message.length < 10 || message.length > 2000) { toast({ title: "Mensagem inválida", description: "A mensagem deve ter entre 10 e 2000 caracteres.", variant: "destructive" }); return; }
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
      {/* ═══ HEADER: 52px, 3 strict zones ═══ */}
      <header className="glass-header sticky top-0 z-50 h-[52px] flex items-center px-4 md:px-6">
        <div className="w-full grid grid-cols-3 items-center">

          {/* ─── LEFT: Logo ─── */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-title font-bold tracking-tight whitespace-nowrap select-none">
              <span className="hidden sm:inline">Global Talk Trend</span>
              <span className="sm:hidden">GTT</span>
            </h1>
          </div>

          {/* ─── CENTER: Live status badge (emotional hero) ─── */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1.5 text-xs">
              {/* Pulsing green dot — 6px */}
              <span className="relative flex items-center justify-center w-1.5 h-1.5 flex-shrink-0">
                <span className="absolute w-full h-full rounded-full live-pulse-dot bg-positive" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-positive" />
              </span>
              <span className="font-medium whitespace-nowrap" style={{ color: 'hsl(162, 100%, 39%)' }}>
                {t("live")}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <OnlineUsersCount />
              <span className="text-muted-foreground/40">·</span>
              <CountdownTimer />
            </div>
          </div>

          {/* ─── RIGHT: Utilities ─── */}
          <div className="flex items-center gap-1.5 justify-end flex-shrink-0">
            {/* Language selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2.5 h-8 rounded-full bg-secondary dark:bg-black/5 text-caption font-medium hover:bg-muted transition-colors min-w-[44px] min-h-[44px] justify-center">
                  🌐 {lang.toUpperCase()}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px] max-h-[300px] overflow-y-auto">
                {languages.map((l) =>
                  <DropdownMenuItem
                    key={l.code}
                    className={`text-body gap-2 ${lang === l.code ? "bg-primary/10 text-primary font-semibold" : ""}`}
                    onClick={() => setLang(l.code)}>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-muted-foreground text-caption">{l.name}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={dark ? "Modo claro" : "Modo escuro"}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Apoie — compact gradient pill */}
            <a
              href="https://buy.stripe.com/fZu7sMgw6cHLeTnbWVdIA00"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center rounded-full text-white text-xs font-semibold hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FF2D2D)', height: '30px', padding: '0 12px', fontSize: '12px' }}
            >
              Apoie
            </a>

            {/* Auth + user menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 p-1 rounded-full hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] justify-center">
                    <Avatar className="w-7 h-7">
                      {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                      <AvatarFallback className="text-micro bg-primary/10 text-primary font-bold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=dashboard" className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=reports" className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Gerar Relatório
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/perfil?tab=stats" className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" /> Estatísticas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-body gap-2" asChild>
                    <Link to="/metodologia" className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> Metodologia
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAboutOpen(true)} className="text-body gap-2">
                    <Info className="w-3.5 h-3.5" /> {t("about")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-body gap-2 text-destructive focus:text-destructive">
                    <LogOut className="w-3.5 h-3.5" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <button
                  onClick={() => setAboutOpen(true)}
                  className="p-2 rounded-full text-muted-foreground hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title={t("about")}>
                  <Info className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="flex items-center gap-1 rounded-full font-semibold text-white hover:brightness-110 transition-all"
                  style={{ background: '#2563EB', height: '30px', padding: '0 12px', fontSize: '12px' }}>
                  <span className="hidden sm:inline">{t("enter")}</span>
                  <span className="text-xs">→</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══ ABOUT DIALOG ═══ */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg w-[92vw] bg-background dark:bg-card border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[85vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
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
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> O que é
                </h3>
                <p className="text-body text-muted-foreground leading-relaxed">
                  Plataforma gratuita e transparente que monitora trends em redes sociais, imprensa e buscas em mais de 26 países.
                </p>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Nossas fontes
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "YouTube", detail: "API oficial", icon: "🎬" },
                    { name: "Reddit", detail: "API pública", icon: "💬" },
                    { name: "Google Trends", detail: "RSS", icon: "📈" },
                    { name: "NewsAPI / Guardian", detail: "Notícias", icon: "📰" },
                    { name: "Twitter/X", detail: "API gratuita", icon: "🐦" },
                    { name: "TikTok", detail: "via Apify", icon: "🎵" },
                    { name: "IBGE / ONU", detail: "Gov & dados", icon: "🏛️" },
                    { name: "OpenAlex", detail: "Científico", icon: "🔬" },
                  ].map((src) => (
                    <div key={src.name} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors">
                      <span className="text-sm shrink-0">{src.icon}</span>
                      <div className="min-w-0">
                        <p className="text-caption font-semibold text-foreground truncate">{src.name}</p>
                        <p className="text-micro text-muted-foreground">{src.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Contato
                </h3>
                <form className="space-y-2" onSubmit={handleContactSubmit}>
                  <input type="text" placeholder="Seu nome" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-body border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input type="email" placeholder="Seu email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-body border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <textarea placeholder="Sua mensagem..." value={contactMessage} onChange={e => setContactMessage(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground text-body border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-y" />
                  <button type="submit" className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-body font-semibold hover:bg-primary/90 transition-colors">
                    Enviar mensagem
                  </button>
                </form>
              </section>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* ═══ LOGIN DIALOG ═══ */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm w-[92vw] bg-background dark:bg-card border-border/50 shadow-2xl rounded-2xl overflow-hidden">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}>
            <DialogHeader className="text-center space-y-1 pb-4">
              <DialogTitle className="text-lg font-semibold">Entrar no Global Talk Trend</DialogTitle>
              <DialogDescription className="text-body text-muted-foreground">Salve trends, crie alertas e acompanhe seu histórico</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <button onClick={handleLoginGoogle} disabled={loginLoading !== null} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-60 min-h-[44px]">
                {loginLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                Continuar com Google
              </button>
              <button onClick={handleLoginApple} disabled={loginLoading !== null} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-60 min-h-[44px]">
                {loginLoading === "apple" ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>}
                Continuar com Apple
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── LIVE STATUS SUB-COMPONENTS ─── */
const OnlineUsersCount = () => {
  const [count, setCount] = useState(() => Math.floor(80 + Math.random() * 60));
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(20, prev + delta);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="flex items-center gap-1 text-xs tabular-nums">
      <span className="font-semibold text-foreground">{count}</span>
      <span className="text-muted-foreground font-medium">online</span>
    </span>
  );
};

const REFRESH_INTERVAL_SECONDS = 10 * 60;

const CountdownTimer = () => {
  const [seconds, setSeconds] = useState(() => {
    const now = Date.now();
    const interval = REFRESH_INTERVAL_SECONDS * 1000;
    const remaining = interval - now % interval;
    return Math.floor(remaining / 1000);
  });
  const [fading, setFading] = useState(false);

  const onRefresh = () => { window.dispatchEvent(new Event("trend-refresh")); };

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setFading(true);
          setTimeout(() => { setFading(false); onRefresh(); }, 300);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span className={`text-xs font-mono tabular-nums text-muted-foreground transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
};

export default TrendHeader;

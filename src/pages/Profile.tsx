import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, Bell, Clock, BarChart3, Settings, Trash2, Edit2,
  Play, BellOff, BellRing, Plus, Sun, Moon, Monitor, Mail, AlertTriangle, Globe, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSavedFilters, type SavedFilter } from "@/hooks/use-saved-filters";
import { useAlerts, type Alert, type CreateAlertInput } from "@/hooks/use-alerts";
import { useHistory } from "@/hooks/use-history";
import { useGamification } from "@/hooks/use-gamification";
import { useLanguage, languages, type LangCode } from "@/contexts/LanguageContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { countries } from "@/components/FilterBar";
import ReportsTab from "@/components/ReportsTab";

const tabs = [
  { key: "filters", label: "Meus Filtros", icon: Star },
  { key: "reports", label: "Relatórios", icon: FileText },
  { key: "alerts", label: "Meus Alertas", icon: Bell },
  { key: "history", label: "Histórico", icon: Clock },
  { key: "stats", label: "Estatísticas", icon: BarChart3 },
  { key: "settings", label: "Configurações", icon: Settings },
] as const;

type TabKey = typeof tabs[number]["key"];

const Profile = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("filters");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/");
      else setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) navigate("/");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const userId = user?.id ?? null;
  const { savedFilters, deleteFilter, loading: filtersLoading } = useSavedFilters(userId);
  const { alerts, toggleAlert, deleteAlert, createAlert, loading: alertsLoading } = useAlerts(userId);
  const { history, clearHistory, deleteItem, loading: historyLoading } = useHistory(userId);
  const { totalPoints, achievements, unlocked, loading: gamLoading } = useGamification(userId);

  if (!user) return null;

  const avatar = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const initial = name.charAt(0).toUpperCase();
  const createdAt = user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "";

  const handleApplyFilter = (sf: SavedFilter) => {
    const params = new URLSearchParams();
    if (sf.country) params.set("country", sf.country);
    if (sf.period) params.set("period", sf.period);
    if (sf.category) params.set("category", sf.category);
    if (sf.media_type) params.set("type", sf.media_type);
    navigate(`/?${params.toString()}`);
  };

  const countryLabel = (code: string) => {
    for (const g of countries) {
      const c = g.items.find(i => i.value === code);
      if (c) return c.label;
    }
    return code;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2 h-12 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <span className="text-sm font-semibold text-foreground">Meu Perfil</span>
        <div className="w-20" />
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/50 p-5 flex items-center gap-4"
        >
          <Avatar className="w-16 h-16">
            {avatar && <AvatarImage src={avatar} alt={name} />}
            <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-foreground truncate">{name}</h2>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">Desde {createdAt}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                {totalPoints >= 100 ? "Curador" : "Usuário"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium">
                {totalPoints} pts
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {activeTab === "filters" && <FiltersTab filters={savedFilters} loading={filtersLoading} onDelete={deleteFilter} onApply={handleApplyFilter} countryLabel={countryLabel} />}
            {activeTab === "reports" && <ReportsTab userId={user.id} />}
            {activeTab === "alerts" && <AlertsTab alerts={alerts} loading={alertsLoading} onToggle={toggleAlert} onDelete={deleteAlert} onCreate={createAlert} countryLabel={countryLabel} />}
            {activeTab === "history" && <HistoryTab history={history} loading={historyLoading} onClear={clearHistory} onDelete={deleteItem} onNavigate={(id) => navigate("/")} />}
            {activeTab === "stats" && <StatsTab history={history} totalPoints={totalPoints} achievements={achievements} unlocked={unlocked} loading={gamLoading} countryLabel={countryLabel} />}
            {activeTab === "settings" && <SettingsTab lang={lang} setLang={setLang} dark={dark} setDark={setDark} user={user} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Filters Tab ─── */
function FiltersTab({ filters, loading, onDelete, onApply, countryLabel }: {
  filters: SavedFilter[]; loading: boolean; onDelete: (id: string) => void; onApply: (f: SavedFilter) => void; countryLabel: (c: string) => string;
}) {
  if (loading) return <CardSkeleton />;
  if (!filters.length) return <EmptyState icon={Star} text="Nenhum filtro salvo. Salve filtros no dashboard para acessá-los aqui." />;
  return (
    <div className="space-y-2">
      {filters.map((f) => (
        <div key={f.id} className="bg-card rounded-xl border border-border/50 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-foreground">{f.name}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {f.country && <Chip>{countryLabel(f.country)}</Chip>}
              {f.category && <Chip>{f.category}</Chip>}
              {f.period && <Chip>{f.period}</Chip>}
              {f.media_type && <Chip>{f.media_type}</Chip>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <SmallBtn onClick={() => onApply(f)} title="Aplicar"><Play className="w-3 h-3" /></SmallBtn>
            <SmallBtn onClick={() => onDelete(f.id)} title="Excluir" variant="danger"><Trash2 className="w-3 h-3" /></SmallBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Alerts Tab ─── */
function AlertsTab({ alerts, loading, onToggle, onDelete, onCreate, countryLabel }: {
  alerts: Alert[]; loading: boolean; onToggle: (id: string, active: boolean) => void; onDelete: (id: string) => void; onCreate: (i: CreateAlertInput) => void; countryLabel: (c: string) => string;
}) {
  const [showNew, setShowNew] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [threshold, setThreshold] = useState(50);
  const [frequency, setFrequency] = useState("daily");

  const handleCreate = () => {
    if (!keyword.trim()) return;
    onCreate({ keyword: keyword.trim(), threshold, frequency, notification_method: "in_app" });
    setKeyword("");
    setShowNew(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-3 h-3" /> Novo alerta
        </button>
      </div>

      {showNew && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Palavra-chave..." className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/30" />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium">Crescimento mínimo</label>
              <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg bg-secondary text-xs border border-border">
                {[10, 25, 50, 100, 200, 500].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium">Frequência</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full mt-1 px-2 py-1.5 rounded-lg bg-secondary text-xs border border-border">
                <option value="immediate">Imediato</option>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Criar alerta</button>
        </div>
      )}

      {loading ? <CardSkeleton /> : alerts.length === 0 ? (
        <EmptyState icon={Bell} text="Nenhum alerta configurado. Crie alertas para ser notificado sobre trends." />
      ) : (
        alerts.map((a) => (
          <div key={a.id} className="bg-card rounded-xl border border-border/50 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {a.is_active ? <BellRing className="w-3.5 h-3.5 text-primary shrink-0" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <span className="text-sm font-medium text-foreground truncate">{a.keyword || "Sem palavra-chave"}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                <Chip>≥{a.threshold}%</Chip>
                <Chip>{a.frequency === "immediate" ? "Imediato" : a.frequency === "daily" ? "Diário" : "Semanal"}</Chip>
                {a.category && <Chip>{a.category}</Chip>}
                {a.country && <Chip>{countryLabel(a.country)}</Chip>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={a.is_active} onCheckedChange={() => onToggle(a.id, a.is_active)} />
              <SmallBtn onClick={() => onDelete(a.id)} title="Excluir" variant="danger"><Trash2 className="w-3 h-3" /></SmallBtn>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── History Tab ─── */
function HistoryTab({ history, loading, onClear, onDelete, onNavigate }: {
  history: any[]; loading: boolean; onClear: () => void; onDelete: (id: string) => void; onNavigate: (id: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(20);

  return (
    <div className="space-y-3">
      {history.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => { if (confirm("Limpar todo o histórico?")) onClear(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Limpar histórico
          </button>
        </div>
      )}

      {loading ? <CardSkeleton /> : history.length === 0 ? (
        <EmptyState icon={Clock} text="Nenhuma trend visualizada ainda. Explore o dashboard para começar." />
      ) : (
        <>
          {history.slice(0, visibleCount).map((h) => (
            <div key={h.id} className="bg-card rounded-xl border border-border/50 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground truncate block">{h.trend_title}</span>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{format(new Date(h.viewed_at), "dd/MM HH:mm")}</span>
                  <Chip>{h.platform}</Chip>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <SmallBtn onClick={() => onNavigate(h.trend_id)} title="Ver novamente"><Play className="w-3 h-3" /></SmallBtn>
                <SmallBtn onClick={() => onDelete(h.id)} title="Remover" variant="danger"><Trash2 className="w-3 h-3" /></SmallBtn>
              </div>
            </div>
          ))}
          {visibleCount < history.length && (
            <button onClick={() => setVisibleCount(v => v + 20)} className="w-full py-2 text-xs text-primary font-medium hover:underline">
              Carregar mais ({history.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Stats Tab ─── */
function StatsTab({ history, totalPoints, achievements, unlocked, loading, countryLabel }: {
  history: any[]; totalPoints: number; achievements: any[]; unlocked: any[]; loading: boolean; countryLabel: (c: string) => string;
}) {
  if (loading) return <CardSkeleton />;

  const countryCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  history.forEach(h => {
    const meta = h.metadata || {};
    if (meta.countryCode) countryCounts[meta.countryCode] = (countryCounts[meta.countryCode] || 0) + 1;
    if (meta.category) categoryCounts[meta.category] = (categoryCounts[meta.category] || 0) + 1;
  });
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const level = totalPoints >= 500 ? "Lenda" : totalPoints >= 300 ? "Mestre" : totalPoints >= 150 ? "Especialista" : totalPoints >= 80 ? "Analista" : totalPoints >= 30 ? "Explorador" : "Iniciante";

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Trends vistas" value={history.length} />
        <StatCard label="Pontos" value={totalPoints} />
        <StatCard label="Nível" value={level} />
        <StatCard label="Conquistas" value={`${unlocked.length}/${achievements.length}`} />
      </div>

      {/* Top countries */}
      {topCountries.length > 0 && (
        <SectionCard title="Países mais explorados">
          {topCountries.map(([code, count]) => (
            <div key={code} className="flex justify-between items-center text-xs py-1">
              <span className="text-foreground">{countryLabel(code)}</span>
              <span className="text-muted-foreground">{count}×</span>
            </div>
          ))}
        </SectionCard>
      )}

      {/* Top categories */}
      {topCategories.length > 0 && (
        <SectionCard title="Categorias favoritas">
          {topCategories.map(([cat, count]) => (
            <div key={cat} className="flex justify-between items-center text-xs py-1">
              <span className="text-foreground">{cat}</span>
              <span className="text-muted-foreground">{count}×</span>
            </div>
          ))}
        </SectionCard>
      )}

      {/* Achievements */}
      <SectionCard title="Conquistas">
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => {
            const isUnlocked = unlocked.some(u => u.achievement_id === a.id);
            return (
              <div key={a.id} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isUnlocked ? "bg-primary/10" : "bg-secondary/50 opacity-50"}`}>
                <span className="text-lg">{a.icon}</span>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-foreground block truncate">{a.name}</span>
                  <span className="text-[9px] text-muted-foreground">{a.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Settings Tab ─── */
function SettingsTab({ lang, setLang, dark, setDark, user }: {
  lang: LangCode; setLang: (l: LangCode) => void; dark: boolean; setDark: (d: boolean) => void; user: any;
}) {
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem("theme");
    if (!saved) return "system";
    return saved as "light" | "dark";
  });

  const applyTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    if (mode === "system") {
      localStorage.removeItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
      setDark(prefersDark);
    } else {
      localStorage.setItem("theme", mode);
      document.documentElement.classList.toggle("dark", mode === "dark");
      setDark(mode === "dark");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível.")) return;
    toast({ title: "⚠️ Exclusão de conta", description: "Entre em contato com o suporte para exclusão completa: talk@globaltalktrend.com" });
  };

  return (
    <div className="space-y-4">
      {/* Language */}
      <SectionCard title="Idioma preferido">
        <div className="flex flex-wrap gap-1.5">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                lang === l.code ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {l.label} {l.name}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Theme */}
      <SectionCard title="Tema">
        <div className="flex gap-2">
          {([
            { key: "light" as const, icon: Sun, label: "Claro" },
            { key: "dark" as const, icon: Moon, label: "Escuro" },
            { key: "system" as const, icon: Monitor, label: "Sistema" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => applyTheme(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                themeMode === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Notifications placeholder */}
      <SectionCard title="Notificações por email">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Receber alertas de trends por email</span>
          <Switch disabled />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Em breve</p>
      </SectionCard>

      {/* Delete account */}
      <SectionCard title="Zona de perigo">
        <button onClick={handleDeleteAccount} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
          <AlertTriangle className="w-3.5 h-3.5" /> Excluir minha conta
        </button>
      </SectionCard>
    </div>
  );
}

/* ─── Shared UI ─── */
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] text-muted-foreground font-medium">{children}</span>;
}

function SmallBtn({ children, onClick, title, variant }: { children: React.ReactNode; onClick: () => void; title: string; variant?: "danger" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        variant === "danger"
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card rounded-xl border border-border/50 p-4 animate-pulse">
          <div className="h-3 bg-secondary rounded w-1/3 mb-2" />
          <div className="h-2 bg-secondary rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default Profile;

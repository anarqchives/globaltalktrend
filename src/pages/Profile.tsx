import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, Bell, Clock, BarChart3, Settings, Trash2, Edit2,
  Play, BellOff, BellRing, Plus, Sun, Moon, Monitor, AlertTriangle, 
  LayoutGrid, Share2, UserPlus, Users, Check, X, Eye, EyeOff, Globe,
  Lock, Shield, Copy, QrCode, Mail, AtSign, Pencil
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSavedFilters, type SavedFilter } from "@/hooks/use-saved-filters";
import { useAlerts, type Alert, type CreateAlertInput } from "@/hooks/use-alerts";
import { useHistory } from "@/hooks/use-history";
import { useGamification } from "@/hooks/use-gamification";
import { useSavedCards } from "@/hooks/use-saved-cards";
import { useProfile, type Profile as ProfileType, type PrivacySettings } from "@/hooks/use-profile";
import { useFollows, type FollowWithProfile } from "@/hooks/use-follows";
import { useLanguage, languages, type LangCode } from "@/contexts/LanguageContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { countries } from "@/components/FilterBar";
import ReportsTab from "@/components/ReportsTab";
import BentoDashboard from "@/components/BentoDashboard";

const tabs = [
  { key: "dashboard", label: "Visão Geral", icon: LayoutGrid },
  { key: "filters", label: "Filtros", icon: Star },
  { key: "reports", label: "Relatórios", icon: Star },
  { key: "alerts", label: "Alertas", icon: Bell },
  { key: "history", label: "Histórico", icon: Clock },
  { key: "stats", label: "Estatísticas", icon: BarChart3 },
  { key: "privacy", label: "Privacidade", icon: Shield },
  { key: "settings", label: "Configurações", icon: Settings },
] as const;

type TabKey = typeof tabs[number]["key"];

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, setLang, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const tab = searchParams.get("tab");
    if (tab && tabs.some(t => t.key === tab)) return tab as TabKey;
    return "dashboard";
  });
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [showFollowers, setShowFollowers] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) navigate("/");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) navigate("/");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const userId = user?.id ?? null;
  const { profile, loading: profileLoading, updating: profileUpdating, updateProfile, checkUsernameAvailable, refetch: refetchProfile } = useProfile(userId);
  const { followers, following, loading: followsLoading, follow, unfollow, isFollowing } = useFollows(userId);
  const { savedFilters, deleteFilter, loading: filtersLoading } = useSavedFilters(userId);
  const { alerts, toggleAlert, deleteAlert, createAlert, loading: alertsLoading } = useAlerts(userId);
  const { history, clearHistory, deleteItem, loading: historyLoading } = useHistory(userId);
  const { totalPoints, achievements, unlocked, loading: gamLoading } = useGamification(userId);
  const { cards: savedCards, loading: cardsLoading, removeCard } = useSavedCards(userId);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando perfil…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "";
  const avatar = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();
  const createdAt = user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy") : "";
  const username = profile?.username;

  const countryLabel = (code: string) => {
    for (const g of countries) {
      const c = g.items.find(i => i.value === code);
      if (c) return c.label;
    }
    return code;
  };

  const handleApplyFilter = (sf: SavedFilter) => {
    const params = new URLSearchParams();
    if (sf.country) params.set("country", sf.country);
    if (sf.period) params.set("period", sf.period);
    if (sf.category) params.set("category", sf.category);
    if (sf.media_type) params.set("type", sf.media_type);
    navigate(`/?${params.toString()}`);
  };

  const copyProfileLink = () => {
    const link = username 
      ? `${window.location.origin}/@${username}`
      : `${window.location.origin}/perfil`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "O link do seu perfil foi copiado." });
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

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ─── Editorial Profile Header ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 items-start"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-24 h-24 ring-2 ring-border">
              {avatar && <AvatarImage src={avatar} alt={displayName} />}
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">{initial}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{displayName}</h1>
              {username ? (
                <span className="text-base text-primary font-medium">@{username}</span>
              ) : (
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <AtSign className="w-3.5 h-3.5" /> Definir username
                </button>
              )}
              {profile?.is_public === false && (
                <Tooltip>
                  <TooltipTrigger><Lock className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>Perfil privado</TooltipContent>
                </Tooltip>
              )}
            </div>

            {profile?.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{profile.bio}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Desde {createdAt}</span>
              {username && (
                <span className="text-primary/70">globaltalktrend.com/@{username}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0 self-start">
            <Button size="sm" variant="outline" onClick={() => setShowEditProfile(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowShareProfile(true)}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Compartilhar
            </Button>
          </div>
        </motion.section>

        {/* ─── Stats Row ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-8 pb-6"
          style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
        >
          {[
            { value: profile?.followers_count || 0, label: "seguidores", click: () => setShowFollowers("followers") },
            { value: profile?.following_count || 0, label: "seguindo", click: () => setShowFollowers("following") },
            { value: profile?.boards_count || 0, label: "boards", click: undefined },
            { value: savedCards.length, label: "projetos", click: undefined },
          ].map((s) => (
            <button
              key={s.label}
              onClick={s.click}
              className="text-center hover:bg-secondary/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {totalPoints >= 100 ? "Curador" : "Usuário"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
              {totalPoints} pts
            </span>
          </div>
        </motion.div>

        {/* Badges */}
        {profile?.badges && profile.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/50 rounded-full text-xs font-medium text-foreground"
              >
                {badge.icon} {badge.name}
              </span>
            ))}
          </div>
        )}

        {/* ─── Tab Navigation ─── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
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
            {activeTab === "dashboard" && <BentoDashboard cards={savedCards} loading={cardsLoading} onRemove={removeCard} onReorder={() => {}} />}
            {activeTab === "filters" && <FiltersTab filters={savedFilters} loading={filtersLoading} onDelete={deleteFilter} onApply={handleApplyFilter} countryLabel={countryLabel} />}
            {activeTab === "reports" && <ReportsTab userId={user.id} />}
            {activeTab === "alerts" && <AlertsTab alerts={alerts} loading={alertsLoading} onToggle={toggleAlert} onDelete={deleteAlert} onCreate={createAlert} countryLabel={countryLabel} />}
            {activeTab === "history" && <HistoryTab history={history} loading={historyLoading} onClear={clearHistory} onDelete={deleteItem} onNavigate={(id) => navigate("/")} />}
            {activeTab === "stats" && <StatsTab history={history} totalPoints={totalPoints} achievements={achievements} unlocked={unlocked} loading={gamLoading} countryLabel={countryLabel} />}
            {activeTab === "privacy" && <PrivacyTab profile={profile} onUpdate={updateProfile} updating={profileUpdating} />}
            {activeTab === "settings" && <SettingsTab lang={lang} setLang={setLang} dark={dark} setDark={setDark} user={user} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal 
        open={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
        profile={profile}
        onUpdate={updateProfile}
        updating={profileUpdating}
        checkUsername={checkUsernameAvailable}
      />

      {/* Share Profile Modal */}
      <ShareProfileModal 
        open={showShareProfile} 
        onClose={() => setShowShareProfile(false)}
        profile={profile}
        displayName={displayName}
        copyLink={copyProfileLink}
      />

      {/* Followers/Following Modal */}
      <FollowersModal
        open={!!showFollowers}
        onClose={() => setShowFollowers(null)}
        type={showFollowers}
        followers={followers}
        following={following}
        loading={followsLoading}
        onFollow={follow}
        onUnfollow={unfollow}
        isFollowing={isFollowing}
      />
    </div>
  );
};

/* ─── Edit Profile Modal ─── */
function EditProfileModal({ 
  open, onClose, profile, onUpdate, updating, checkUsername 
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileType | null;
  onUpdate: (input: any) => Promise<boolean>;
  updating: boolean;
  checkUsername: (username: string) => Promise<boolean>;
}) {
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!username || username.length < 3 || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      const available = await checkUsername(username);
      setUsernameAvailable(available);
      setChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, checkUsername, profile?.username]);

  const handleSave = async () => {
    const success = await onUpdate({
      username: username || undefined,
      display_name: displayName || undefined,
      bio: bio || undefined,
    });
    if (success) onClose();
  };

  const usernameValid = /^[a-z0-9_]{3,30}$/.test(username.toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>Personalize seu perfil público</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              Username
              {checking && <span className="text-xs text-muted-foreground">(verificando...)</span>}
              {usernameAvailable === true && <Check className="w-4 h-4 text-green-500" />}
              {usernameAvailable === false && <X className="w-4 h-4 text-destructive" />}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="seu_username"
                className="pl-8"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3-30 caracteres. Apenas letras, números e underscore.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={updating || (username && !usernameValid) || usernameAvailable === false}
          >
            {updating ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Share Profile Modal ─── */
function ShareProfileModal({ 
  open, onClose, profile, displayName, copyLink 
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileType | null;
  displayName: string;
  copyLink: () => void;
}) {
  const profileLink = profile?.username 
    ? `${window.location.origin}/@${profile.username}`
    : `${window.location.origin}/perfil`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Perfil</DialogTitle>
          <DialogDescription>Compartilhe seu perfil com outras pessoas</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
            <Avatar className="w-12 h-12">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              {profile?.username && (
                <p className="text-sm text-primary">@{profile.username}</p>
              )}
              {profile?.bio && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Link do perfil</Label>
            <div className="flex gap-2">
              <Input value={profileLink} readOnly className="bg-secondary" />
              <Button variant="outline" onClick={copyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!profile?.username && (
            <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
              💡 Defina um username para ter um link personalizado!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Followers Modal ─── */
function FollowersModal({
  open, onClose, type, followers, following, loading, onFollow, onUnfollow, isFollowing
}: {
  open: boolean;
  onClose: () => void;
  type: "followers" | "following" | null;
  followers: FollowWithProfile[];
  following: FollowWithProfile[];
  loading: boolean;
  onFollow: (userId: string) => Promise<boolean>;
  onUnfollow: (userId: string) => Promise<boolean>;
  isFollowing: (userId: string) => boolean;
}) {
  const list = type === "followers" ? followers : following;
  const title = type === "followers" ? "Seguidores" : "Seguindo";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[70vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{list.length} {type === "followers" ? "seguidores" : "pessoas que você segue"}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-80 space-y-2 py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {type === "followers" ? "Nenhum seguidor ainda" : "Você ainda não segue ninguém"}
            </div>
          ) : (
            list.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                <Avatar className="w-10 h-10">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {(user.display_name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{user.display_name}</p>
                  {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
                </div>
                {type === "followers" && !isFollowing(user.user_id) && (
                  <Button size="sm" variant="outline" onClick={() => onFollow(user.user_id)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Seguir
                  </Button>
                )}
                {isFollowing(user.user_id) && (
                  <Button size="sm" variant="secondary" onClick={() => onUnfollow(user.user_id)}>
                    Seguindo
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Privacy Tab ─── */
function PrivacyTab({ profile, onUpdate, updating }: {
  profile: ProfileType | null;
  onUpdate: (input: any) => Promise<boolean>;
  updating: boolean;
}) {
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [isSearchable, setIsSearchable] = useState(profile?.is_searchable ?? true);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    profile?.privacy_settings || {
      timeline: "public",
      boards: "public",
      comments: "public",
      reports: "followers",
    }
  );

  const handleSave = async () => {
    await onUpdate({
      is_public: isPublic,
      is_searchable: isSearchable,
      privacy_settings: privacySettings,
    });
  };

  const updateSectionPrivacy = (section: keyof PrivacySettings, value: string) => {
    setPrivacySettings(prev => ({
      ...prev,
      [section]: value as "public" | "followers" | "private",
    }));
  };

  const visibilityOptions = [
    { value: "public", label: "Todos", icon: Globe },
    { value: "followers", label: "Apenas seguidores", icon: Users },
    { value: "private", label: "Apenas eu", icon: Lock },
  ];

  return (
    <div className="space-y-4">
      {/* Global Privacy */}
      <SectionCard title="Visibilidade do perfil">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Perfil público</p>
              <p className="text-xs text-muted-foreground">Permite que qualquer pessoa veja seu perfil</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Aparecer em buscas</p>
              <p className="text-xs text-muted-foreground">Permite ser encontrado por outros usuários</p>
            </div>
            <Switch checked={isSearchable} onCheckedChange={setIsSearchable} />
          </div>
        </div>
      </SectionCard>

      {/* Granular Privacy */}
      <SectionCard title="Visibilidade por seção">
        <div className="space-y-4">
          {([
            { key: "timeline" as const, label: "Timeline pessoal", desc: "Quem pode ver sua timeline de atividades" },
            { key: "boards" as const, label: "Boards", desc: "Quem pode ver seus boards públicos" },
            { key: "comments" as const, label: "Comentários", desc: "Quem pode ver seus comentários" },
            { key: "reports" as const, label: "Relatórios", desc: "Quem pode ver seus relatórios gerados" },
          ]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Select 
                value={privacySettings[key]} 
                onValueChange={(v) => updateSectionPrivacy(key, v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Save button */}
      <Button onClick={handleSave} disabled={updating} className="w-full">
        {updating ? "Salvando..." : "Salvar configurações de privacidade"}
      </Button>
    </div>
  );
}

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

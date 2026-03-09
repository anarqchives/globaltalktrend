import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, UserCheck, Share2, MoreHorizontal, LayoutGrid, FolderOpen,
  FileText, Users, ArrowLeft, Globe, MessageSquare, BookOpen, Clock,
  TrendingUp, ExternalLink
} from "lucide-react";
import BoardComments from "@/components/BoardComments";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useFollows } from "@/hooks/use-follows";
import { format } from "date-fns";

type PublicTab = "overview" | "boards" | "reports" | "activity";

const tabConfig = [
  { key: "overview" as const, label: "Visão Geral", icon: LayoutGrid },
  { key: "boards" as const, label: "Boards", icon: FolderOpen },
  { key: "reports" as const, label: "Relatórios", icon: FileText },
  { key: "activity" as const, label: "Atividade", icon: Clock },
];

interface PublicProfileData {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  boards_count: number;
  badges: any[];
  created_at: string;
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<PublicTab>("overview");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const { follow, unfollow, isFollowing, loading: followLoading } = useFollows(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const parsed: PublicProfileData = {
        ...data,
        badges: Array.isArray(data.badges) ? data.badges : [],
        followers_count: data.followers_count ?? 0,
        following_count: data.following_count ?? 0,
        boards_count: data.boards_count ?? 0,
      };
      setProfile(parsed);

      // Fetch public saved cards & reports
      const [cardsRes, reportsRes] = await Promise.all([
        supabase.from("saved_cards").select("*").eq("user_id", data.user_id).order("created_at", { ascending: false }).limit(6),
        supabase.from("report_history").select("id, title, created_at, snapshot_count, stats").eq("user_id", data.user_id).order("created_at", { ascending: false }).limit(6),
      ]);
      setSavedCards(cardsRes.data || []);
      setReports(reportsRes.data || []);
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/@${profile?.username}`;
    if (navigator.share) {
      navigator.share({ title: `@${profile?.username} — Global Talk Trend`, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
    toast({ title: "Link copiado!", description: shareUrl });
  };

  const handleFollow = async () => {
    if (!currentUserId || !profile) {
      toast({ title: "Faça login", description: "Você precisa estar logado para seguir.", variant: "destructive" });
      return;
    }
    if (isFollowing(profile.user_id)) {
      await unfollow(profile.user_id);
    } else {
      await follow(profile.user_id);
    }
  };

  const isOwnProfile = currentUserId === profile?.user_id;
  const following = profile ? isFollowing(profile.user_id) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">👤</div>
        <h1 className="text-xl font-semibold text-foreground">Perfil não encontrado</h1>
        <p className="text-sm text-muted-foreground">O usuário @{username} não existe ou tem perfil privado.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  const initial = (profile.display_name || "U").charAt(0).toUpperCase();
  const memberSince = profile.created_at ? format(new Date(profile.created_at), "MMM yyyy") : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation header with back to main site */}
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2 h-12 flex items-center justify-between">
        <a href="/" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Global Talk Trend</span>
          <span className="sm:hidden">GTT</span>
        </a>
        <span className="text-sm font-semibold text-foreground">@{profile.username}</span>
        <div className="w-16" />
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ─── Editorial Header ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-6 items-start"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-24 h-24 ring-2 ring-border">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name || ""} />}
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">{initial}</AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile.display_name}</h1>
              <span className="text-base text-primary font-medium">@{profile.username}</span>
            </div>

            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{profile.bio}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Membro desde {memberSince}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0 self-start">
            {!isOwnProfile && (
              <Button
                size="sm"
                variant={following ? "secondary" : "default"}
                onClick={handleFollow}
                disabled={followLoading}
                className="gap-1.5"
              >
                {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {following ? "Seguindo" : "Seguir"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            {isOwnProfile && (
              <Button size="sm" variant="outline" onClick={() => navigate("/perfil")}>
                Editar perfil
              </Button>
            )}
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
            { value: profile.followers_count, label: "seguidores" },
            { value: profile.following_count, label: "seguindo" },
            { value: profile.boards_count, label: "boards" },
            { value: savedCards.length, label: "projetos" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-thin">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <OverviewTab savedCards={savedCards} reports={reports} profile={profile} />
            )}
            {activeTab === "boards" && (
              <BoardsTab cards={savedCards} />
            )}
            {activeTab === "reports" && (
              <ReportsListTab reports={reports} />
            )}
            {activeTab === "activity" && (
              <ActivityTab userId={profile.user_id} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ─── Overview Tab: Bento Grid ─── */
function OverviewTab({ savedCards, reports, profile }: { savedCards: any[]; reports: any[]; profile: PublicProfileData }) {
  const bentoItems = [
    // Featured board (large)
    ...(savedCards.length > 0 ? [{
      type: "board",
      size: "large" as const,
      title: savedCards[0].title,
      subtitle: `${savedCards[0].platform} · ${savedCards[0].category || "Geral"}`,
      meta: `Salvo em ${format(new Date(savedCards[0].created_at), "dd/MM/yyyy")}`,
      icon: <FolderOpen className="w-4 h-4" />,
      label: "Board em Destaque",
    }] : []),
    // Reports
    ...reports.slice(0, 2).map(r => ({
      type: "report",
      size: "normal" as const,
      title: r.title,
      subtitle: `${r.snapshot_count} snapshots`,
      meta: format(new Date(r.created_at), "dd/MM/yyyy"),
      icon: <FileText className="w-4 h-4" />,
      label: "Relatório",
    })),
    // More cards
    ...savedCards.slice(1, 4).map(c => ({
      type: "card",
      size: "normal" as const,
      title: c.title,
      subtitle: c.platform,
      meta: c.category || "Geral",
      icon: <TrendingUp className="w-4 h-4" />,
      label: "Projeto",
    })),
  ];

  // Badges section
  const badges = profile.badges || [];

  return (
    <div className="space-y-8">
      {/* Bento Grid */}
      {bentoItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bentoItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default ${
                item.size === "large" ? "sm:col-span-2 sm:row-span-2" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <h3 className={`font-semibold text-foreground leading-snug mb-2 ${item.size === "large" ? "text-lg" : "text-sm"}`}>
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-2">{item.meta}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
          <LayoutGrid className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum conteúdo público disponível ainda.</p>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conquistas</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge: any, idx: number) => (
              <Tooltip key={idx}>
                <TooltipTrigger>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/50 rounded-full text-xs font-medium text-foreground">
                    {badge.icon} {badge.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{badge.unlockedAt ? `Desbloqueado em ${format(new Date(badge.unlockedAt), "dd/MM/yyyy")}` : "Conquista"}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Boards Tab ─── */
function BoardsTab({ cards, currentUserId }: { cards: any[]; currentUserId: string | null }) {
  if (!cards.length) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
        <FolderOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum board público.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-2 text-muted-foreground">
            <FolderOpen className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">{card.platform}</span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{card.title}</h3>
          {card.description && <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
          <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground/70">
            {card.category && <span className="px-2 py-0.5 bg-secondary rounded-md">{card.category}</span>}
            <span>{format(new Date(card.created_at), "dd/MM/yyyy")}</span>
          </div>
          {/* Comments section */}
          <BoardComments cardId={card.id} currentUserId={currentUserId} />
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Reports List Tab ─── */
function ReportsListTab({ reports }: { reports: any[] }) {
  if (!reports.length) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum relatório público.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">{r.title}</h4>
            <p className="text-xs text-muted-foreground">{r.snapshot_count} snapshots · {format(new Date(r.created_at), "dd/MM/yyyy")}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Activity Tab ─── */
function ActivityTab({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("history")
        .select("*")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(20);
      setActivities(data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-4 animate-pulse">
            <div className="h-3 bg-secondary rounded w-1/2 mb-2" />
            <div className="h-2 bg-secondary rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/30">
      {activities.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-start gap-3 px-5 py-4"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              Visualizou <strong className="font-medium">{a.trend_title}</strong>
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              <span className="px-1.5 py-0.5 bg-secondary rounded">{a.platform}</span>
              <span>{format(new Date(a.viewed_at), "dd/MM HH:mm")}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default PublicProfile;

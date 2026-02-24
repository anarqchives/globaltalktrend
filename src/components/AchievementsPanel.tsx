import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Achievement, UserAchievement } from "@/hooks/use-gamification";
import { Progress } from "@/components/ui/progress";

interface AchievementsPanelProps {
  open: boolean;
  onClose: () => void;
  totalPoints: number;
  achievements: Achievement[];
  unlocked: UserAchievement[];
}

const levelThresholds = [0, 50, 150, 350, 700, 1200];
const levelNames = ["Iniciante", "Explorador", "Analista", "Especialista", "Mestre", "Lenda"];

function getLevel(points: number) {
  let level = 0;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (points >= levelThresholds[i]) { level = i; break; }
  }
  const next = level < levelThresholds.length - 1 ? levelThresholds[level + 1] : null;
  const current = levelThresholds[level];
  const progress = next ? ((points - current) / (next - current)) * 100 : 100;
  return { level, name: levelNames[level], progress, nextThreshold: next, currentThreshold: current };
}

const AchievementsPanel = ({ open, onClose, totalPoints, achievements, unlocked }: AchievementsPanelProps) => {
  const unlockedIds = new Set(unlocked.map(u => u.achievement_id));
  const lvl = getLevel(totalPoints);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            🏆 Minhas Conquistas
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Acompanhe seu progresso e desbloqueie conquistas.
          </DialogDescription>
        </DialogHeader>

        {/* Level + Points */}
        <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {lvl.level === 0 ? "🌱" : lvl.level === 1 ? "🌍" : lvl.level === 2 ? "📊" : lvl.level === 3 ? "⭐" : lvl.level === 4 ? "👑" : "💎"}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{lvl.name}</p>
                <p className="text-[10px] text-muted-foreground">Nível {lvl.level + 1}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary tabular-nums">{totalPoints}</p>
              <p className="text-[10px] text-muted-foreground">pontos</p>
            </div>
          </div>
          {lvl.nextThreshold && (
            <div>
              <Progress value={lvl.progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {lvl.nextThreshold - totalPoints} pts para {levelNames[lvl.level + 1]}
              </p>
            </div>
          )}
        </div>

        {/* Achievements grid */}
        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {achievements.map(ach => {
            const isUnlocked = unlockedIds.has(ach.id);
            const ua = unlocked.find(u => u.achievement_id === ach.id);
            return (
              <div
                key={ach.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  isUnlocked
                    ? "bg-primary/5 border-primary/20"
                    : "bg-secondary/30 border-border/50 opacity-60"
                }`}
              >
                <span className={`text-2xl flex-shrink-0 ${!isUnlocked ? "grayscale" : ""}`}>
                  {ach.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{ach.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{ach.description}</p>
                  {isUnlocked && ua && (
                    <p className="text-[9px] text-primary mt-0.5">
                      ✓ Desbloqueado em {new Date(ua.unlocked_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${isUnlocked ? "text-primary" : "text-muted-foreground"}`}>
                  +{ach.points_reward}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span>{unlocked.length}/{achievements.length} conquistas</span>
          <span>·</span>
          <span>{totalPoints} pontos totais</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementsPanel;

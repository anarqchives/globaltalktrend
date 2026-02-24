import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  points_reward: number;
  criteria: Record<string, any>;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
}

export function useGamification(userId: string | null) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setTotalPoints(0);
      setAchievements([]);
      setUnlocked([]);
      return;
    }
    setLoading(true);

    const [pointsRes, achievementsRes, unlockedRes] = await Promise.all([
      supabase.from("user_points").select("points").eq("user_id", userId),
      supabase.from("achievements").select("*").order("points_reward", { ascending: true }),
      supabase.from("user_achievements").select("*").eq("user_id", userId),
    ]);

    if (pointsRes.data) {
      setTotalPoints(pointsRes.data.reduce((sum, r) => sum + (r as any).points, 0));
    }
    if (achievementsRes.data) setAchievements(achievementsRes.data as Achievement[]);
    if (unlockedRes.data) setUnlocked(unlockedRes.data as UserAchievement[]);

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trackAction = useCallback(async (action: string, points: number, metadata?: Record<string, any>) => {
    if (!userId) return;
    await supabase.from("user_points").insert({
      user_id: userId,
      action,
      points,
      metadata: metadata || {},
    });
    setTotalPoints(prev => prev + points);
    checkAchievements(action, metadata);
  }, [userId]);

  const checkAchievements = useCallback(async (action: string, metadata?: Record<string, any>) => {
    if (!userId) return;

    // Get current action counts
    const { data: pointRows } = await supabase
      .from("user_points")
      .select("action, metadata")
      .eq("user_id", userId);

    if (!pointRows) return;

    const actionCounts: Record<string, number> = {};
    const countriesSeen = new Set<string>();
    const categoriesSeen = new Set<string>();

    for (const row of pointRows as any[]) {
      actionCounts[row.action] = (actionCounts[row.action] || 0) + 1;
      if (row.metadata?.countryCode) countriesSeen.add(row.metadata.countryCode);
      if (row.metadata?.category) categoriesSeen.add(row.metadata.category);
    }

    // Check each achievement
    for (const ach of achievements) {
      if (unlocked.some(u => u.achievement_id === ach.id)) continue;

      const criteria = ach.criteria as any;
      let earned = false;

      switch (criteria.type) {
        case "trends_viewed":
          earned = (actionCounts["view"] || 0) >= (criteria.count || 1);
          break;
        case "cards_expanded":
          earned = (actionCounts["expand"] || 0) >= (criteria.count || 1);
          break;
        case "shares":
          earned = (actionCounts["share"] || 0) >= (criteria.count || 1);
          break;
        case "alerts_created":
          earned = (actionCounts["alert"] || 0) >= (criteria.count || 1);
          break;
        case "countries_viewed":
          earned = countriesSeen.size >= (criteria.count || 10);
          break;
        case "all_categories_used":
          earned = categoriesSeen.size >= 7;
          break;
        case "night_access":
          earned = action === "night_access";
          break;
      }

      if (earned) {
        const { error } = await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: ach.id,
        });
        if (!error) {
          setUnlocked(prev => [...prev, { id: crypto.randomUUID(), achievement_id: ach.id, unlocked_at: new Date().toISOString() }]);
          toast({
            title: `${ach.icon} Conquista desbloqueada!`,
            description: `${ach.name}: ${ach.description} (+${ach.points_reward} pts)`,
          });
          // Award bonus points
          await supabase.from("user_points").insert({
            user_id: userId,
            action: "achievement_bonus",
            points: ach.points_reward,
            metadata: { achievement: ach.key },
          });
          setTotalPoints(prev => prev + ach.points_reward);
        }
      }
    }
  }, [userId, achievements, unlocked]);

  // Track night access on mount
  useEffect(() => {
    if (!userId) return;
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      trackAction("night_access", 2, { hour });
    }
  }, [userId]);

  return { totalPoints, achievements, unlocked, loading, trackAction, refetch: fetchData };
}

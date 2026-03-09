import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowWithProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

export function useFollows(userId: string | null) {
  const [followers, setFollowers] = useState<FollowWithProfile[]>([]);
  const [following, setFollowing] = useState<FollowWithProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFollows = useCallback(async () => {
    if (!userId) {
      setFollowers([]);
      setFollowing([]);
      setFollowingIds(new Set());
      setLoading(false);
      return;
    }

    try {
      // Fetch followers (people who follow the user)
      const { data: followersData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      // Fetch following (people the user follows)
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followerIds = followersData?.map(f => f.follower_id) || [];
      const followingIdsList = followingData?.map(f => f.following_id) || [];

      // Fetch profiles for followers
      if (followerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, username, display_name, avatar_url, bio, followers_count, following_count")
          .in("user_id", followerIds);

        setFollowers(followerProfiles as FollowWithProfile[] || []);
      } else {
        setFollowers([]);
      }

      // Fetch profiles for following
      if (followingIdsList.length > 0) {
        const { data: followingProfiles } = await supabase
          .from("profiles")
          .select("id, user_id, username, display_name, avatar_url, bio, followers_count, following_count")
          .in("user_id", followingIdsList);

        setFollowing(followingProfiles as FollowWithProfile[] || []);
      } else {
        setFollowing([]);
      }

      setFollowingIds(new Set(followingIdsList));
    } catch (err) {
      console.error("Follows fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  const follow = async (targetUserId: string): Promise<boolean> => {
    if (!userId || userId === targetUserId) return false;

    try {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: userId,
          following_id: targetUserId,
        });

      if (error) {
        if (error.code === "23505") {
          // Already following
          return true;
        }
        toast({
          title: "Erro ao seguir",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      setFollowingIds(prev => new Set([...prev, targetUserId]));
      await fetchFollows();
      toast({
        title: "Seguindo!",
        description: "Você agora está seguindo este usuário.",
      });
      return true;
    } catch (err) {
      console.error("Follow error:", err);
      return false;
    }
  };

  const unfollow = async (targetUserId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetUserId);

      if (error) {
        toast({
          title: "Erro ao deixar de seguir",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      setFollowingIds(prev => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      await fetchFollows();
      return true;
    } catch (err) {
      console.error("Unfollow error:", err);
      return false;
    }
  };

  const isFollowing = (targetUserId: string): boolean => {
    return followingIds.has(targetUserId);
  };

  return {
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    loading,
    follow,
    unfollow,
    isFollowing,
    refetch: fetchFollows,
  };
}

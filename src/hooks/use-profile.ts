import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PrivacySettings {
  timeline: "public" | "followers" | "private";
  boards: "public" | "followers" | "private";
  comments: "public" | "followers" | "private";
  reports: "public" | "followers" | "private";
}

export interface Badge {
  key: string;
  name: string;
  icon: string;
  unlockedAt?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  is_searchable: boolean;
  privacy_settings: PrivacySettings;
  badges: Badge[];
  followers_count: number;
  following_count: number;
  boards_count: number;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_public?: boolean;
  is_searchable?: boolean;
  privacy_settings?: PrivacySettings;
}

function parseProfile(data: unknown): Profile {
  const raw = data as Record<string, unknown>;
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    username: raw.username as string | null,
    display_name: raw.display_name as string | null,
    bio: raw.bio as string | null,
    avatar_url: raw.avatar_url as string | null,
    is_public: raw.is_public as boolean,
    is_searchable: raw.is_searchable as boolean,
    privacy_settings: (raw.privacy_settings || {
      timeline: "public",
      boards: "public",
      comments: "public",
      reports: "followers",
    }) as PrivacySettings,
    badges: (raw.badges || []) as Badge[],
    followers_count: raw.followers_count as number,
    following_count: raw.following_count as number,
    boards_count: raw.boards_count as number,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Profile doesn't exist, create one
        if (error.code === "PGRST116") {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                user_id: userId,
                display_name: userData.user.user_metadata?.full_name || userData.user.email?.split("@")[0],
                avatar_url: userData.user.user_metadata?.avatar_url,
              })
              .select()
              .single();

            if (!insertError && newProfile) {
              setProfile(parseProfile(newProfile));
            }
          }
        } else {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(parseProfile(data));
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (input: UpdateProfileInput): Promise<boolean> => {
    if (!userId || !profile) return false;

    setUpdating(true);
    try {
      // Validate username uniqueness if changing
      if (input.username && input.username !== profile.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", input.username.toLowerCase())
          .single();

        if (existing) {
          toast({
            title: "Username indisponível",
            description: "Este username já está em uso. Escolha outro.",
            variant: "destructive",
          });
          return false;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          ...input,
          username: input.username?.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Erro ao atualizar perfil",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      await fetchProfile();
      toast({
        title: "Perfil atualizado",
        description: "Suas alterações foram salvas com sucesso.",
      });
      return true;
    } catch (err) {
      console.error("Update profile error:", err);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;
    
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .neq("user_id", userId || "")
      .single();

    return !data;
  };

  return {
    profile,
    loading,
    updating,
    updateProfile,
    checkUsernameAvailable,
    refetch: fetchProfile,
  };
}

export function usePublicProfile(username: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchPublicProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username.toLowerCase())
          .eq("is_public", true)
          .single();

        if (error) {
          setProfile(null);
        } else {
          setProfile(data as Profile);
        }
      } catch (err) {
        console.error("Public profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);

  return { profile, loading };
}

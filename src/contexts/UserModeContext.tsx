import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserMode = "cidadao" | "jornalista" | "investidor" | "marketing";

export const userModes: { key: UserMode; label: string; emoji: string; description: string }[] = [
  { key: "cidadao", label: "Cidadão", emoji: "🌍", description: "Visão geral e acessível" },
  { key: "jornalista", label: "Jornalista", emoji: "📰", description: "Fontes, credibilidade e alcance" },
  { key: "investidor", label: "Investidor", emoji: "📈", description: "Impacto financeiro e mercado" },
  { key: "marketing", label: "Marketing", emoji: "📊", description: "Engajamento e viralização" },
];

export interface ModeConfig {
  priorityCategories: string[];
  extraBadge: { emoji: string; label: string } | null;
  metricEmphasis: "volume" | "growth" | "engagement" | "sources";
  sortWeight: (trend: any) => number;
}

const modeConfigs: Record<UserMode, ModeConfig> = {
  cidadao: {
    priorityCategories: [],
    extraBadge: null,
    metricEmphasis: "volume",
    sortWeight: () => 0,
  },
  jornalista: {
    priorityCategories: ["Política", "Economia", "Ciência"],
    extraBadge: { emoji: "📰", label: "Relevância editorial" },
    metricEmphasis: "sources",
    sortWeight: (t) => {
      let w = 0;
      if (t.trustBadge && ["official", "verified", "press", "international"].includes(t.trustBadge)) w += 50;
      if (t.sources?.length > 2) w += 30;
      const cat = (t.category || "").toLowerCase();
      if (["política", "economia", "ciência"].some(c => cat.includes(c))) w += 20;
      return w;
    },
  },
  investidor: {
    priorityCategories: ["Negócios/Finanças", "Tecnologia", "Economia"],
    extraBadge: { emoji: "💹", label: "Impacto de mercado" },
    metricEmphasis: "growth",
    sortWeight: (t) => {
      let w = 0;
      const cat = (t.category || "").toLowerCase();
      if (["negócios", "finanças", "economia", "tecnologia", "business"].some(c => cat.includes(c))) w += 40;
      const change = parseInt((t.change || "").replace(/[^0-9]/g, "")) || 0;
      if (change > 200) w += 30;
      if (t.trustBadge === "official") w += 20;
      return w;
    },
  },
  marketing: {
    priorityCategories: ["Entretenimento", "Cultura", "Esportes"],
    extraBadge: { emoji: "🔥", label: "Potencial viral" },
    metricEmphasis: "engagement",
    sortWeight: (t) => {
      let w = 0;
      if (t.commentCount && t.commentCount > 100) w += 30;
      if (t.likeRatio && t.likeRatio > 0.9) w += 20;
      const change = parseInt((t.change || "").replace(/[^0-9]/g, "")) || 0;
      if (change > 100) w += 25;
      if (["Reddit", "Mastodon", "Bluesky", "YouTube"].includes(t.platform)) w += 15;
      return w;
    },
  },
};

interface UserModeContextType {
  mode: UserMode;
  setMode: (m: UserMode) => void;
  config: ModeConfig;
}

const UserModeContext = createContext<UserModeContextType>({
  mode: "cidadao",
  setMode: () => {},
  config: modeConfigs.cidadao,
});

export function UserModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UserMode>(() => {
    const saved = localStorage.getItem("gtt_user_mode");
    return (saved as UserMode) || "cidadao";
  });

  const setMode = (m: UserMode) => {
    setModeState(m);
    localStorage.setItem("gtt_user_mode", m);
  };

  return (
    <UserModeContext.Provider value={{ mode, setMode, config: modeConfigs[mode] }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}

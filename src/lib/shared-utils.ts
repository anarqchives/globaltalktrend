/**
 * Shared utility functions — deduplicated from multiple components
 */

/**
 * Converte código de país ISO 3166-1 alpha-2 para emoji de bandeira
 */
export const countryCodeToFlag = (code?: string | null): string | null => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
};

/**
 * Retorna emoji do ícone da plataforma
 */
export const platformIcons: Record<string, string> = {
  YouTube: "▶", Reddit: "💬", "Google Trends": "🔍", Bluesky: "🦋",
  Mastodon: "🐘", "Hacker News": "🔶", Wikipedia: "📚", "Stack Overflow": "💻",
  GitHub: "🐙", "The Guardian": "🏛️", "World Bank": "🌐", IBGE: "🇧🇷",
  OpenAlex: "🔬", "New York Times": "🗽", NPR: "🎙️", "BBC News": "🇬🇧",
  "Deutsche Welle": "🇩🇪", "Le Monde": "🇫🇷", "El País": "🇪🇸",
  "Folha de S.Paulo": "🇧🇷", NewsAPI: "📰", PubMed: "🏥", arXiv: "📄",
};

export function getPlatformIcon(platform: string): string {
  return platformIcons[platform] || "📰";
}

/**
 * Normaliza título para comparação/deduplicação
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .slice(0, 50);
}

/**
 * Formata tempo relativo
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

/**
 * Gera dados históricos simulados para gráficos
 */
export function generateHistoricalData(baseValue: number, label: string) {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600000);
    const hourStr = `${h.getHours().toString().padStart(2, "0")}:00`;
    const progress = (24 - i) / 24;
    const noise = 0.7 + Math.random() * 0.6;
    const value = Math.round(baseValue * progress * noise);
    data.push({ hour: hourStr, value });
  }
  return { historicalData: data, metricLabel: label };
}

/**
 * Formata volume numérico para string legível (1.5M, 320K, etc)
 */
export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return `${vol}`;
}

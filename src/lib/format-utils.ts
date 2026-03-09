/**
 * Global formatting utilities for the platform.
 * Handles time formatting, source mapping, and metric tooltips.
 */

// ── Time Formatting ─────────────────────────────────────────────────────
const timeFormats: Record<string, { now: string; seconds: string; min: string; mins: string; h: string; hs: string; d: string; ds: string }> = {
  pt: { now: "agora", seconds: "há instantes", min: "há 1 min", mins: "há {n} min", h: "há 1h", hs: "há {n}h", d: "há 1 dia", ds: "há {n} dias" },
  en: { now: "now", seconds: "just now", min: "1 min ago", mins: "{n} min ago", h: "1h ago", hs: "{n}h ago", d: "1 day ago", ds: "{n} days ago" },
  es: { now: "ahora", seconds: "hace instantes", min: "hace 1 min", mins: "hace {n} min", h: "hace 1h", hs: "hace {n}h", d: "hace 1 día", ds: "hace {n} días" },
  fr: { now: "maintenant", seconds: "à l'instant", min: "il y a 1 min", mins: "il y a {n} min", h: "il y a 1h", hs: "il y a {n}h", d: "il y a 1 jour", ds: "il y a {n} jours" },
  de: { now: "jetzt", seconds: "gerade eben", min: "vor 1 Min", mins: "vor {n} Min", h: "vor 1 Std", hs: "vor {n} Std", d: "vor 1 Tag", ds: "vor {n} Tagen" },
  it: { now: "adesso", seconds: "poco fa", min: "1 min fa", mins: "{n} min fa", h: "1h fa", hs: "{n}h fa", d: "1 giorno fa", ds: "{n} giorni fa" },
  zh: { now: "刚刚", seconds: "刚才", min: "1分钟前", mins: "{n}分钟前", h: "1小时前", hs: "{n}小时前", d: "1天前", ds: "{n}天前" },
  ja: { now: "たった今", seconds: "たった今", min: "1分前", mins: "{n}分前", h: "1時間前", hs: "{n}時間前", d: "1日前", ds: "{n}日前" },
  ko: { now: "방금", seconds: "방금", min: "1분 전", mins: "{n}분 전", h: "1시간 전", hs: "{n}시간 전", d: "1일 전", ds: "{n}일 전" },
  ar: { now: "الآن", seconds: "منذ لحظات", min: "منذ دقيقة", mins: "منذ {n} دقائق", h: "منذ ساعة", hs: "منذ {n} ساعات", d: "منذ يوم", ds: "منذ {n} أيام" },
  hi: { now: "अभी", seconds: "अभी", min: "1 मिनट पहले", mins: "{n} मिनट पहले", h: "1 घंटे पहले", hs: "{n} घंटे पहले", d: "1 दिन पहले", ds: "{n} दिन पहले" },
  ru: { now: "сейчас", seconds: "только что", min: "1 мин назад", mins: "{n} мин назад", h: "1ч назад", hs: "{n}ч назад", d: "1 день назад", ds: "{n} дн назад" },
};

/**
 * Format a timestamp or relative time string into natural language.
 * NEVER returns "0m", "0h" etc. Always uses human-readable text.
 */
export function formatTimeAgo(input: string | Date | number | undefined | null, lang: string = "pt"): string {
  if (!input) return timeFormats[lang]?.now || "agora";
  
  const fmt = timeFormats[lang] || timeFormats.pt;
  let diffMs: number;
  
  if (input instanceof Date) {
    diffMs = Date.now() - input.getTime();
  } else if (typeof input === "number") {
    diffMs = Date.now() - input;
  } else {
    // Try parsing as date string first
    const d = new Date(input);
    if (!isNaN(d.getTime()) && input.includes("-")) {
      diffMs = Date.now() - d.getTime();
    } else {
      // Parse relative time strings like "0m", "5m", "2h", "3d", "agora", "now"
      const lower = input.toLowerCase().trim();
      if (lower === "agora" || lower === "now" || lower === "0m" || lower === "0min") return fmt.now;
      
      const match = lower.match(/(?:há\s*)?(\d+)\s*(s|seg|sec|min|m|h|hora|hour|d|dia|day)/i);
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (val === 0) return fmt.now;
        if (unit === "s" || unit === "seg" || unit === "sec") return val < 30 ? fmt.now : fmt.seconds;
        if (unit === "min" || unit === "m") {
          if (val === 1) return fmt.min;
          return fmt.mins.replace("{n}", String(val));
        }
        if (unit.startsWith("h")) {
          if (val === 1) return fmt.h;
          return fmt.hs.replace("{n}", String(val));
        }
        if (val === 1) return fmt.d;
        return fmt.ds.replace("{n}", String(val));
      }
      
      // Fallback: return input as is if we can't parse it
      return input === "0m" ? fmt.now : input;
    }
  }
  
  if (diffMs < 0) return fmt.now;
  
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return fmt.now;
  if (diffMin === 1) return fmt.min;
  if (diffMin < 60) return fmt.mins.replace("{n}", String(diffMin));
  
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return fmt.h;
  if (diffH < 24) return fmt.hs.replace("{n}", String(diffH));
  
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return fmt.d;
  if (diffD < 7) return fmt.ds.replace("{n}", String(diffD));
  
  // Beyond 7 days, show date
  const date = new Date(typeof input === "number" ? input : typeof input === "string" ? new Date(input).getTime() : input.getTime());
  return date.toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", { day: "2-digit", month: "short" });
}

// ── Source Mapping ──────────────────────────────────────────────────────
export interface SourceInfo {
  label: string;
  emoji: string;
  color: string;
}

const sourceMap: Record<string, SourceInfo> = {
  github: { label: "GitHub", emoji: "🐙", color: "#24292e" },
  "hacker news": { label: "Hacker News", emoji: "🔶", color: "#ff6600" },
  hackernews: { label: "Hacker News", emoji: "🔶", color: "#ff6600" },
  reddit: { label: "Reddit", emoji: "💬", color: "#ff4500" },
  youtube: { label: "YouTube", emoji: "▶", color: "#ff0000" },
  "google trends": { label: "Google Trends", emoji: "📈", color: "#4285f4" },
  twitter: { label: "X/Twitter", emoji: "𝕏", color: "#000000" },
  "x (twitter)": { label: "X/Twitter", emoji: "𝕏", color: "#000000" },
  bluesky: { label: "Bluesky", emoji: "🦋", color: "#0085ff" },
  mastodon: { label: "Mastodon", emoji: "🐘", color: "#6364ff" },
  wikipedia: { label: "Wikipedia", emoji: "📖", color: "#636466" },
  "stack overflow": { label: "Stack Overflow", emoji: "💻", color: "#f48024" },
  newsapi: { label: "NewsAPI", emoji: "📰", color: "#26a69a" },
  gnews: { label: "GNews", emoji: "📰", color: "#2e7d32" },
  "the guardian": { label: "The Guardian", emoji: "📰", color: "#052962" },
  "world bank": { label: "World Bank", emoji: "🏛️", color: "#009fda" },
  ibge: { label: "IBGE", emoji: "🏛️", color: "#006633" },
  openAlex: { label: "OpenAlex", emoji: "🔬", color: "#7c4dff" },
  arxiv: { label: "arXiv", emoji: "📄", color: "#b31b1b" },
  pubmed: { label: "PubMed", emoji: "🧬", color: "#326599" },
  crossref: { label: "Crossref", emoji: "📚", color: "#f36f21" },
};

/**
 * Resolve a source/platform name. Never returns "other" or "community".
 */
export function resolveSource(platform: string): SourceInfo {
  if (!platform) return { label: "Web", emoji: "🌐", color: "#666666" };
  
  const lower = platform.toLowerCase().trim();
  
  // Direct match
  if (sourceMap[lower]) return sourceMap[lower];
  
  // Partial match
  for (const [key, info] of Object.entries(sourceMap)) {
    if (lower.includes(key) || key.includes(lower)) return info;
  }
  
  // Never show "other" or "community"
  if (lower === "other" || lower === "community" || lower === "social") {
    return { label: "Web", emoji: "🌐", color: "#666666" };
  }
  
  // Return the platform name capitalized as fallback
  return { label: platform.charAt(0).toUpperCase() + platform.slice(1), emoji: "📊", color: "#666666" };
}

// ── Metric Tooltips ─────────────────────────────────────────────────────
export const metricTooltips: Record<string, Record<string, string>> = {
  pt: {
    tvi: "Relevância de 0 a 100 — calculada por volume + velocidade de crescimento + diversidade de fontes",
    stars: "Estrelas no GitHub — indica a popularidade do repositório",
    pts: "Pontos de karma na plataforma de origem (Reddit, Hacker News)",
    comments: "Total de comentários na publicação original",
    snapshots7d: "Capturas de dados realizadas nos últimos 7 dias",
    growth: "Crescimento percentual nas últimas 2 horas em relação ao período anterior",
    riskHigh: "Crescimento acima de +500% — velocidade de propagação extrema",
    riskModerate: "Crescimento de +150% a +499% — propagação acelerada",
    searches: "Volume estimado de pesquisas nas últimas 24h nesta região",
    live: "Dados atualizados a cada 5 minutos automaticamente",
    onlineUsers: "Usuários acessando a plataforma agora",
    emerging: "Tendência em aceleração — detectada por crescimento anômalo nas últimas 2h",
    momentum: "Variação do volume entre a 1ª e 2ª metade da semana",
    activityRate: "Volume desta semana comparado com a média histórica",
    category: "Categoria temática da tendência",
    signalType: "Tipo de sinal detectado com base na plataforma e velocidade",
    trustVerified: "Fonte verificada — alta confiabilidade",
    trustOfficial: "Fonte oficial — dados governamentais ou institucionais",
    trustScientific: "Fonte científica — dados revisados por pares",
    trustPress: "Imprensa verificada — veículo de mídia reconhecido",
    trustInternational: "Fonte internacional — cobertura global",
    trigger: "Gatilho contextual detectado no título da tendência",
    volume: "Volume total de menções, buscas ou engajamento",
    sources: "Número de fontes independentes que reportaram esta tendência",
    confidence: "Nível de confiança baseado na diversidade de fontes e consistência dos dados",
    propagation: "Caminho de propagação — ordem em que a tendência apareceu em diferentes plataformas",
    sentiment: "Análise de sentimento — distribuição de reações positivas, neutras e negativas",
    evolution24h: "Evolução do volume nas últimas 24 horas",
    severity: "ALTO = crescimento acima de +500% | MODERADO = +150% a +499%",
  },
  en: {
    tvi: "Relevance score 0-100 — calculated from volume + growth speed + source diversity",
    stars: "GitHub stars — indicates repository popularity",
    pts: "Karma points on the source platform (Reddit, Hacker News)",
    comments: "Total comments on the original post",
    snapshots7d: "Data captures taken in the last 7 days",
    growth: "Percentage growth in the last 2 hours vs. previous period",
    riskHigh: "Growth above +500% — extreme propagation speed",
    riskModerate: "Growth of +150% to +499% — accelerated propagation",
    searches: "Estimated search volume in the last 24h for this region",
    live: "Data refreshed every 5 minutes automatically",
    onlineUsers: "Users accessing the platform right now",
    emerging: "Accelerating trend — detected by anomalous growth in last 2h",
    momentum: "Volume variation between the 1st and 2nd half of the week",
    activityRate: "This week's volume compared to the historical average",
    category: "Thematic category of the trend",
    signalType: "Signal type based on platform and growth speed",
    trustVerified: "Verified source — high reliability",
    trustOfficial: "Official source — government or institutional data",
    trustScientific: "Scientific source — peer-reviewed data",
    trustPress: "Verified press — recognized media outlet",
    trustInternational: "International source — global coverage",
    trigger: "Contextual trigger detected in trend title",
    volume: "Total volume of mentions, searches or engagement",
    sources: "Number of independent sources reporting this trend",
    confidence: "Confidence level based on source diversity and data consistency",
    propagation: "Propagation path — order in which the trend appeared across platforms",
    sentiment: "Sentiment analysis — distribution of positive, neutral and negative reactions",
    evolution24h: "Volume evolution over the last 24 hours",
    severity: "HIGH = growth above +500% | MODERATE = +150% to +499%",
  },
  es: {
    tvi: "Relevancia de 0 a 100 — calculada por volumen + velocidad de crecimiento + diversidad de fuentes",
    stars: "Estrellas en GitHub — indica la popularidad del repositorio",
    pts: "Puntos de karma en la plataforma de origen (Reddit, Hacker News)",
    comments: "Total de comentarios en la publicación original",
    snapshots7d: "Capturas de datos realizadas en los últimos 7 días",
    growth: "Crecimiento porcentual en las últimas 2 horas",
    momentum: "Variación del volumen entre la 1ª y 2ª mitad de la semana",
    activityRate: "Volumen de esta semana comparado con el promedio histórico",
    category: "Categoría temática de la tendencia",
    signalType: "Tipo de señal detectada",
    volume: "Volumen total de menciones o engagement",
    sources: "Número de fuentes independientes",
    severity: "ALTO = crecimiento superior a +500% | MODERADO = +150% a +499%",
  },
};

export function getTooltip(key: string, lang: string = "pt"): string {
  return metricTooltips[lang]?.[key] || metricTooltips.pt[key] || metricTooltips.en[key] || "";
}

// ── Momentum Calculation ────────────────────────────────────────────────
export interface MomentumResult {
  value: number;
  display: string;
  color: string;
  arrow: string;
  isReliable: boolean;
  subtitle: string;
}

export function calculateMomentum(
  dailyVolumes: Record<string, number>,
  orderedDays: string[],
  currentDayIndex: number,
  lang: string = "pt"
): MomentumResult {
  // Split available days into first and second halves
  const availableDays = orderedDays.slice(0, currentDayIndex + 1);
  
  if (availableDays.length < 2) {
    return {
      value: 0,
      display: "—",
      color: "text-muted-foreground",
      arrow: "⏳",
      isReliable: false,
      subtitle: lang === "pt" ? "Dados insuficientes" : lang === "es" ? "Datos insuficientes" : "Insufficient data",
    };
  }
  
  const mid = Math.ceil(availableDays.length / 2);
  const firstHalf = availableDays.slice(0, mid);
  const secondHalf = availableDays.slice(mid);
  
  if (secondHalf.length === 0) {
    return {
      value: 0,
      display: "—",
      color: "text-muted-foreground",
      arrow: "⏳",
      isReliable: false,
      subtitle: lang === "pt" ? "Semana em curso" : lang === "es" ? "Semana en curso" : "Week in progress",
    };
  }
  
  const firstVol = firstHalf.reduce((s, d) => s + (dailyVolumes[d] || 0), 0);
  const secondVol = secondHalf.reduce((s, d) => s + (dailyVolumes[d] || 0), 0);
  
  // Guard: division by zero
  if (firstVol === 0 && secondVol === 0) {
    return {
      value: 0,
      display: "—",
      color: "text-muted-foreground",
      arrow: "⏳",
      isReliable: false,
      subtitle: lang === "pt" ? "Sem dados suficientes" : lang === "es" ? "Sin datos suficientes" : "No data available",
    };
  }
  
  if (firstVol === 0) {
    return {
      value: 100,
      display: "+100%",
      color: "text-green-600 dark:text-green-400",
      arrow: "↑",
      isReliable: secondVol > 10,
      subtitle: lang === "pt" ? "vs. início da semana" : lang === "es" ? "vs. inicio de semana" : "vs. start of week",
    };
  }
  
  const momentum = Math.round(((secondVol - firstVol) / firstVol) * 100);
  
  // Guard: mathematically suspicious values
  if (momentum < -99 || momentum > 999) {
    return {
      value: momentum,
      display: "⚠️",
      color: "text-amber-500",
      arrow: "⚠️",
      isReliable: false,
      subtitle: lang === "pt" ? "Dado em verificação" : lang === "es" ? "Dato en verificación" : "Data under review",
    };
  }
  
  const inProgress = availableDays.length < orderedDays.length;
  
  return {
    value: momentum,
    display: `${momentum > 0 ? "+" : ""}${momentum}%`,
    color: momentum > 5 ? "text-green-600 dark:text-green-400" : momentum < -5 ? "text-destructive" : "text-muted-foreground",
    arrow: momentum > 5 ? "↑" : momentum < -5 ? "↓" : "→",
    isReliable: true,
    subtitle: inProgress
      ? (lang === "pt" ? "semana em curso" : lang === "es" ? "semana en curso" : "week in progress")
      : (lang === "pt" ? "vs. 1ª metade da semana" : lang === "es" ? "vs. 1ª mitad" : "vs. first half"),
  };
}

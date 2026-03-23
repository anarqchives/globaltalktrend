/**
 * Priority Engine v2.0 — GTT Card Spec
 * Three independent scores: Priority, Confidence, Stage
 */

import { TrendCardProps } from "@/components/TrendCard";

export interface PriorityResult {
  score: number;           // 0–12+ raw additive score
  tier: "high" | "medium" | "low";
  reason: string;          // 1-line microcopy — WHY this matters
  lifecycle: "emerging" | "accelerating" | "peak" | "stable" | "declining";
  normalizedVolume: number;
  confidence: "high" | "medium" | "low";
  confidenceScore: number; // 0–1 for display
  sourceNature: string;
  sourceCount: number;
  countriesDetected: number;
  hasVerifiedSource: boolean;
  hasOfficialData: boolean;
}

/* ─── Source classification ─── */
const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bing news": "imprensa", "newsdata": "imprensa", "thenewsapi": "imprensa", "the news api": "imprensa",
  "bbc": "imprensa", "reuters": "imprensa", "france 24": "imprensa",
  "ap news": "imprensa", "bloomberg": "imprensa", "nyt": "imprensa", "guardian": "imprensa",
  "folha": "imprensa", "estadão": "imprensa", "o globo": "imprensa", "el país": "imprensa",
  "le monde": "imprensa", "der spiegel": "imprensa", "al jazeera": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "ibge": "dados_oficiais", "imf": "dados_oficiais", "who": "dados_oficiais", "noaa": "dados_oficiais",
  "alpha vantage": "dados_oficiais", "fixer": "dados_oficiais",
  "pubmed": "cientifico", "arxiv": "cientifico", "crossref": "cientifico", "semantic scholar": "cientifico",
  "wikipedia": "enciclopedico",
};

const VERIFIED_DOMAINS = new Set([
  "reuters", "bbc", "ap news", "bloomberg", "nyt", "guardian", "the guardian",
  "france 24", "al jazeera", "folha", "estadão", "o globo", "el país", "le monde", "der spiegel",
]);

export function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) {
    if (p.includes(key)) return val;
  }
  return "imprensa";
}

function isVerifiedSource(platform: string): boolean {
  const p = platform.toLowerCase();
  for (const d of VERIFIED_DOMAINS) { if (p.includes(d)) return true; }
  return false;
}

/* ─── Source nature labels ─── */
const SOURCE_NATURE_LABELS: Record<string, Record<string, string>> = {
  imprensa: { pt: "Imprensa", en: "Press" },
  dados_oficiais: { pt: "Dados Oficiais", en: "Official Data" },
  cientifico: { pt: "Acadêmico", en: "Academic" },
  enciclopedico: { pt: "Enciclopédico", en: "Encyclopedic" },
  redes_sociais: { pt: "Social", en: "Social" },
  google_trends: { pt: "Buscas", en: "Search" },
};

const SOURCE_NATURE_COLORS: Record<string, string> = {
  imprensa: "hsl(var(--source-press))",
  dados_oficiais: "hsl(var(--source-official))",
  cientifico: "hsl(var(--source-science))",
  enciclopedico: "hsl(var(--source-encyclopedia))",
  redes_sociais: "hsl(var(--source-social))",
  google_trends: "hsl(var(--source-google))",
};

function parseVolume(volume: string): number {
  const v = (volume || "0").toLowerCase();
  let num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  if (v.includes("m")) num *= 1_000_000;
  else if (v.includes("k")) num *= 1_000;
  return num;
}

function parseChange(change: string): number {
  return Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
}

function getAgeHours(trend: TrendCardProps): number {
  const now = Date.now();
  if (trend.publishedAt) {
    const d = new Date(trend.publishedAt).getTime();
    if (!isNaN(d)) return (now - d) / 3600000;
  }
  if (trend.firstSeenAt) {
    const d = new Date(trend.firstSeenAt).getTime();
    if (!isNaN(d)) return (now - d) / 3600000;
  }
  return 12;
}

/* ─── v2.0 PRIORITY FORMULA ─── */
function computePriorityScore(
  sourceCount: number,
  changePercent: number,
  hasVerified: boolean,
  hasOfficial: boolean,
  ageH: number,
  countriesCount: number,
): { score: number; tier: PriorityResult["tier"]; dominantFactor: string } {
  let score = 0;
  let dominantFactor = "default";
  let maxContribution = 0;

  // Sources (0-3)
  const srcScore = sourceCount >= 3 ? 3 : sourceCount === 2 ? 2 : 0;
  score += srcScore;
  if (srcScore > maxContribution) { maxContribution = srcScore; dominantFactor = "sources"; }

  // Growth (0-3)
  const growthScore = changePercent > 100 ? 3 : changePercent > 50 ? 2 : changePercent > 20 ? 1 : 0;
  score += growthScore;
  if (growthScore > maxContribution) { maxContribution = growthScore; dominantFactor = "growth"; }

  // Source type (0-2)
  const typeScore = (hasVerified ? 1 : 0) + (hasOfficial ? 1 : 0);
  score += typeScore;
  if (typeScore > maxContribution) { maxContribution = typeScore; dominantFactor = "sourceType"; }

  // Recency (0-2)
  const recencyScore = ageH < 1 ? 2 : ageH < 24 ? 1 : 0;
  score += recencyScore;
  if (recencyScore > maxContribution) { maxContribution = recencyScore; dominantFactor = "recency"; }

  // Geo dispersion (0-2)
  const geoScore = countriesCount >= 3 ? 2 : countriesCount === 2 ? 1 : 0;
  score += geoScore;
  if (geoScore > maxContribution) { maxContribution = geoScore; dominantFactor = "geo"; }

  const tier: PriorityResult["tier"] = score >= 8 ? "high" : score >= 4 ? "medium" : "low";
  return { score, tier, dominantFactor };
}

/* ─── v2.0 CONFIDENCE (separate from priority) ─── */
function computeConfidence(
  sourceCount: number,
  hasVerified: boolean,
  _sourcesConsistent: boolean, // future: check if sources say same thing
): { level: "high" | "medium" | "low"; score: number } {
  let level: "high" | "medium" | "low" = "low";

  if (sourceCount >= 3) level = "high";
  else if (sourceCount >= 2) level = "medium";

  // Consistency bonus (assume true if multiple sources)
  if (sourceCount >= 2 && _sourcesConsistent) {
    if (level === "low") level = "medium";
    else if (level === "medium") level = "high";
  }

  // Verified source bonus
  if (hasVerified) {
    if (level === "low") level = "medium";
    else if (level === "medium") level = "high";
  }

  // RULE: never "high" with only 1 source
  if (sourceCount <= 1 && level === "high") level = "medium";

  const score = level === "high" ? 0.9 : level === "medium" ? 0.6 : 0.25;
  return { level, score };
}

/* ─── v2.0 STAGE (lifecycle) ─── */
function computeStage(
  ageH: number,
  changePercent: number,
  sparkData: number[] | undefined,
): PriorityResult["lifecycle"] {
  // Didn't exist 24h ago
  if (ageH < 24 && ageH < 3) return "emerging";

  if (changePercent > 50) return "accelerating";

  if (changePercent >= -10 && changePercent <= 10) return "stable";

  // Check if at historical max
  if (sparkData && sparkData.length >= 3) {
    const last = sparkData[sparkData.length - 1];
    const max = Math.max(...sparkData.slice(0, -1));
    if (last >= max * 0.95 && changePercent > 10) return "peak";
  }

  if (changePercent < -20) return "declining";

  // Fallback
  if (ageH < 6 && changePercent > 10) return "emerging";
  if (changePercent > 10) return "accelerating";
  return "stable";
}

/* ─── Reason generator v2.0 ─── */
function generateReason(
  lang: string,
  dominantFactor: string,
  sourceCount: number,
  changePercent: number,
  countriesCount: number,
  ageH: number,
  lifecycle: PriorityResult["lifecycle"],
  hasVerified: boolean,
): string {
  const pt = lang === "pt";

  // Templates based on dominant factor
  if (dominantFactor === "geo" && countriesCount >= 3) {
    return pt ? `Acelerando em ${countriesCount} países` : `Accelerating in ${countriesCount} countries`;
  }
  if (dominantFactor === "sources" && sourceCount >= 3) {
    return pt ? `Confirmado por ${sourceCount} fontes` : `Confirmed by ${sourceCount} sources`;
  }
  if (dominantFactor === "growth" && changePercent > 100) {
    return pt ? `Volume +${Math.round(changePercent)}% em 24h` : `Volume +${Math.round(changePercent)}% in 24h`;
  }
  if (dominantFactor === "growth" && changePercent > 50) {
    return pt ? `Crescimento de +${Math.round(changePercent)}% em 24h` : `+${Math.round(changePercent)}% growth in 24h`;
  }
  if (dominantFactor === "sourceType" && hasVerified) {
    return pt ? "Alta cobertura editorial" : "High editorial coverage";
  }
  if (dominantFactor === "recency" && ageH < 1) {
    return pt ? "Pico de buscas agora" : "Peak searches now";
  }

  // Lifecycle fallbacks
  if (lifecycle === "emerging" && ageH < 6) {
    const timeStr = ageH < 1
      ? (pt ? "minutos" : "minutes")
      : (pt ? `${Math.round(ageH)}h` : `${Math.round(ageH)}h`);
    return pt ? `Novo — detectado há ${timeStr}` : `New — detected ${timeStr} ago`;
  }
  if (lifecycle === "accelerating") {
    return pt ? "Acelerando rapidamente" : "Accelerating rapidly";
  }
  if (changePercent > 200) {
    return pt ? "Anomalia detectada" : "Anomaly detected";
  }
  if (sourceCount >= 2) {
    return pt ? `Confirmado por ${sourceCount} fontes` : `Confirmed by ${sourceCount} sources`;
  }

  return pt ? "Relevância moderada" : "Moderate relevance";
}

/* ─── Main scoring function ─── */
export function computePriority(
  trend: TrendCardProps,
  opts: { multiplatformTitles: Set<string>; maxVolumeInFeed: number; lang: string }
): PriorityResult {
  const vol = parseVolume(trend.volume);
  const changeNum = parseChange(trend.change);
  const ageH = getAgeHours(trend);
  const sourceType = getSourceType(trend.platform);
  const sourceCount = trend.sources?.length || 1;
  const sparkData = trend.historicalData?.map(d => d.value) || trend.sparkData;
  const hasVerified = isVerifiedSource(trend.platform) || (trend.trustBadge === "high");
  const hasOfficial = sourceType === "dados_oficiais";
  const normalizedVolume = opts.maxVolumeInFeed > 0 ? Math.min(vol / opts.maxVolumeInFeed, 1) : 0;

  // Estimate countries (from sources or just 1)
  const countriesDetected = trend.sources
    ? new Set(trend.sources.map(s => typeof s === "string" ? "" : (s as any).country).filter(Boolean)).size || 1
    : 1;

  // Multiplatform check
  const normKey = trend.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
  const isMulti = opts.multiplatformTitles.has(normKey);
  const effectiveSourceCount = isMulti ? Math.max(sourceCount, 3) : sourceCount;
  const effectiveCountries = isMulti ? Math.max(countriesDetected, 2) : countriesDetected;

  const { score, tier, dominantFactor } = computePriorityScore(
    effectiveSourceCount, changeNum, hasVerified, hasOfficial, ageH, effectiveCountries
  );

  const { level: confidence, score: confidenceScore } = computeConfidence(
    effectiveSourceCount, hasVerified, effectiveSourceCount >= 2
  );

  const lifecycle = computeStage(ageH, changeNum, sparkData);

  const sourceNature = SOURCE_NATURE_LABELS[sourceType]?.[opts.lang] || SOURCE_NATURE_LABELS[sourceType]?.en || "";

  const reason = generateReason(
    opts.lang, dominantFactor, effectiveSourceCount, changeNum, effectiveCountries, ageH, lifecycle, hasVerified
  );

  return {
    score, tier, reason, lifecycle,
    normalizedVolume, confidence, confidenceScore,
    sourceNature, sourceCount: effectiveSourceCount,
    countriesDetected: effectiveCountries,
    hasVerifiedSource: hasVerified, hasOfficialData: hasOfficial,
  };
}

/* ─── Lifecycle labels ─── */
export const LIFECYCLE_LABELS: Record<PriorityResult["lifecycle"], { pt: string; en: string; icon: string; color: string; desc: { pt: string; en: string } }> = {
  emerging:     { pt: "Emergindo",     en: "Emerging",      icon: "🟢", color: "hsl(142 71% 45%)",  desc: { pt: "Detectado recentemente, volume crescente", en: "Recently detected, growing volume" } },
  accelerating: { pt: "Acelerando",    en: "Accelerating",  icon: "🔵", color: "hsl(217 91% 60%)",  desc: { pt: "Crescimento rápido e consistente", en: "Fast and consistent growth" } },
  peak:         { pt: "Pico",          en: "Peak",          icon: "🟡", color: "hsl(48 96% 53%)",   desc: { pt: "Volume máximo atingido", en: "Maximum volume reached" } },
  stable:       { pt: "Estável",       en: "Stable",        icon: "⚪", color: "hsl(var(--muted-foreground))", desc: { pt: "Sem mudança significativa", en: "No significant change" } },
  declining:    { pt: "Desacelerando", en: "Declining",     icon: "🔻", color: "hsl(0 84% 60%)",    desc: { pt: "Volume em queda", en: "Volume decreasing" } },
};

/* ─── Tier visual config ─── */
export const TIER_CONFIG: Record<PriorityResult["tier"], { borderColor: string; label: { pt: string; en: string } }> = {
  high:   { borderColor: "hsl(14 100% 57%)",  label: { pt: "Alta Prioridade", en: "High Priority" } },
  medium: { borderColor: "hsl(45 93% 47%)",   label: { pt: "Média Prioridade", en: "Medium Priority" } },
  low:    { borderColor: "hsl(217 33% 60%)",   label: { pt: "Baixa Prioridade", en: "Low Priority" } },
};

/* ─── Confidence visual config ─── */
export const CONFIDENCE_CONFIG: Record<PriorityResult["confidence"], { icon: string; label: { pt: string; en: string }; className: string }> = {
  high:   { icon: "✓✓", label: { pt: "Alta",     en: "High" },     className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  medium: { icon: "✓",  label: { pt: "Média",    en: "Medium" },   className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  low:    { icon: "⚠",  label: { pt: "Verificar", en: "Verify" },  className: "bg-muted text-muted-foreground border-border/50" },
};

export const SOURCE_NATURE_COLOR_MAP = SOURCE_NATURE_COLORS;
export const SOURCE_NATURE_LABEL_MAP = SOURCE_NATURE_LABELS;

/* ─── Tier labels (compat) ─── */
export const TIER_LABELS: Record<PriorityResult["tier"], { pt: string; en: string }> = {
  high: { pt: "Alta Prioridade", en: "High Priority" },
  medium: { pt: "Prioridade Média", en: "Medium Priority" },
  low: { pt: "Baixa Prioridade", en: "Low Priority" },
};

/* ─── Confidence labels (compat) ─── */
export const CONFIDENCE_LABELS = {
  high: { pt: "Alta confiança", en: "High confidence", threshold: 0.7 },
  medium: { pt: "Confiança moderada", en: "Moderate confidence", threshold: 0.4 },
  low: { pt: "Baixa confiança", en: "Low confidence", threshold: 0 },
} as const;

export function getConfidenceLabel(confidence: number, lang: string): string {
  if (confidence >= 0.7) return lang === "pt" ? CONFIDENCE_LABELS.high.pt : CONFIDENCE_LABELS.high.en;
  if (confidence >= 0.4) return lang === "pt" ? CONFIDENCE_LABELS.medium.pt : CONFIDENCE_LABELS.medium.en;
  return lang === "pt" ? CONFIDENCE_LABELS.low.pt : CONFIDENCE_LABELS.low.en;
}

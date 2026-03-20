/**
 * Priority Engine — deterministic scoring for cross-source trend normalization.
 * Computes a 0–100 priority score + human-readable reason for each trend.
 */

import { TrendCardProps } from "@/components/TrendCard";

export interface PriorityResult {
  score: number;           // 0–100
  tier: "critical" | "high" | "medium" | "low";
  reason: string;          // short microcopy in pt/en
  lifecycle: "emerging" | "accelerating" | "peak" | "declining" | "stable";
  normalizedVolume: number; // 0–1 cross-source comparable
  confidence: number;       // 0–1
}

/* ─── Source weight map: how much we trust each source type ─── */
const SOURCE_TRUST: Record<string, number> = {
  imprensa: 0.9,
  dados_oficiais: 0.95,
  cientifico: 0.92,
  enciclopedico: 0.7,
  redes_sociais: 0.5,
  google_trends: 0.6,
};

const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bing news": "imprensa", "newsdata": "imprensa", "thenewsapi": "imprensa", "the news api": "imprensa",
  "bbc": "imprensa", "reuters": "imprensa", "france 24": "imprensa",
  "ap news": "imprensa", "bloomberg": "imprensa", "nyt": "imprensa", "guardian": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "imf": "dados_oficiais", "who": "dados_oficiais", "noaa": "dados_oficiais",
  "pubmed": "cientifico", "arxiv": "cientifico", "crossref": "cientifico", "semantic scholar": "cientifico",
  "wikipedia": "enciclopedico",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) {
    if (p.includes(key)) return val;
  }
  return "imprensa";
}

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

/* ─── Lifecycle detection from sparkData ─── */
function detectLifecycle(sparkData: number[] | undefined, changeNum: number, ageH: number): PriorityResult["lifecycle"] {
  if (!sparkData || sparkData.length < 3) {
    if (ageH < 2) return "emerging";
    return "stable";
  }
  const last3 = sparkData.slice(-3);
  const first3 = sparkData.slice(0, 3);
  const avgLast = last3.reduce((a, b) => a + b, 0) / last3.length;
  const avgFirst = first3.reduce((a, b) => a + b, 0) / first3.length;
  const ratio = avgFirst > 0 ? avgLast / avgFirst : 1;

  if (ageH < 3 && changeNum > 30) return "emerging";
  if (ratio > 1.5 && changeNum > 50) return "accelerating";
  if (ratio < 0.6) return "declining";
  // Peak: high volume but flattening
  const lastTwo = sparkData.slice(-2);
  if (lastTwo.length === 2 && Math.abs(lastTwo[1] - lastTwo[0]) / (lastTwo[0] || 1) < 0.1 && avgLast > avgFirst) return "peak";
  return "stable";
}

/* ─── Reason generator ─── */
interface ReasonCtx {
  lang: string;
  lifecycle: PriorityResult["lifecycle"];
  changeNum: number;
  changePositive: boolean;
  sourceCount: number;
  isMulti: boolean;
  confidence: number;
  sourceType: string;
  ageH: number;
}

function generateReason(ctx: ReasonCtx): string {
  const pt = ctx.lang === "pt";
  const reasons: string[] = [];

  if (ctx.lifecycle === "emerging" && ctx.ageH < 3) {
    reasons.push(pt ? "sinal emergente nas últimas horas" : "emerging signal in the last hours");
  }
  if (ctx.lifecycle === "accelerating") {
    reasons.push(pt ? "acelerando rapidamente" : "accelerating rapidly");
  }
  if (ctx.changeNum > 200) {
    reasons.push(pt ? `crescimento de ${ctx.changeNum.toFixed(0)}% acima do padrão` : `${ctx.changeNum.toFixed(0)}% growth above baseline`);
  } else if (ctx.changeNum > 80) {
    reasons.push(pt ? "crescimento recente significativo" : "significant recent growth");
  }
  if (ctx.isMulti) {
    reasons.push(pt ? "confirmado em múltiplas plataformas" : "confirmed across multiple platforms");
  }
  if (ctx.sourceCount > 3) {
    reasons.push(pt ? `${ctx.sourceCount} fontes cobrindo` : `${ctx.sourceCount} sources covering`);
  }
  if (ctx.confidence > 0.85) {
    reasons.push(pt ? "alta confiança editorial" : "high editorial confidence");
  } else if (ctx.confidence < 0.5) {
    reasons.push(pt ? "confiança baixa — verificar" : "low confidence — verify");
  }
  if (ctx.lifecycle === "declining") {
    reasons.push(pt ? "desacelerando" : "decelerating");
  }
  if (ctx.lifecycle === "peak") {
    reasons.push(pt ? "no pico de atenção" : "at peak attention");
  }

  if (reasons.length === 0) {
    reasons.push(pt ? "relevância moderada" : "moderate relevance");
  }

  // Capitalize first letter and join
  const text = reasons.slice(0, 2).join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const sourceTrust = SOURCE_TRUST[sourceType] || 0.5;
  const sourceCount = trend.sources?.length || 1;
  const sparkData = trend.historicalData?.map(d => d.value) || trend.sparkData;

  // Normalized volume (0-1 relative to max in feed)
  const normalizedVolume = opts.maxVolumeInFeed > 0 ? Math.min(vol / opts.maxVolumeInFeed, 1) : 0;

  // Confidence: based on source trust + multi-source coverage
  const multiSourceBonus = Math.min(sourceCount / 5, 0.3);
  const confidence = Math.min(sourceTrust + multiSourceBonus, 1);

  // Lifecycle
  const lifecycle = detectLifecycle(sparkData, changeNum, ageH);

  // Is multiplatform?
  const normKey = trend.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9\s]/g, "").trim().slice(0, 50);
  const isMulti = opts.multiplatformTitles.has(normKey);

  // ─── SCORE COMPUTATION ───
  // Volume component (0-25)
  const volScore = normalizedVolume * 25;
  
  // Growth component (0-25)
  const growthScore = Math.min(changeNum / 200, 1) * 25;
  
  // Confidence component (0-20)
  const confScore = confidence * 20;
  
  // Freshness component (0-15) — newer = higher
  const freshnessScore = Math.max(0, 15 - (ageH * 0.8));
  
  // Lifecycle bonus (0-15)
  const lifecycleBonus = lifecycle === "accelerating" ? 15
    : lifecycle === "emerging" ? 12
    : lifecycle === "peak" ? 8
    : lifecycle === "declining" ? 2
    : 5;

  // Multiplatform bonus
  const multiBonus = isMulti ? 10 : 0;

  const raw = volScore + growthScore + confScore + freshnessScore + lifecycleBonus + multiBonus;
  const score = Math.min(Math.round(raw), 100);

  // Tier
  const tier: PriorityResult["tier"] = score >= 75 ? "critical"
    : score >= 50 ? "high"
    : score >= 30 ? "medium"
    : "low";

  const reason = generateReason({
    lang: opts.lang,
    lifecycle,
    changeNum,
    changePositive: trend.changePositive,
    sourceCount,
    isMulti,
    confidence,
    sourceType,
    ageH,
  });

  return { score, tier, reason, lifecycle, normalizedVolume, confidence };
}

/* ─── Lifecycle labels ─── */
export const LIFECYCLE_LABELS: Record<PriorityResult["lifecycle"], { pt: string; en: string; icon: string }> = {
  emerging: { pt: "Emergente", en: "Emerging", icon: "🌱" },
  accelerating: { pt: "Acelerando", en: "Accelerating", icon: "🚀" },
  peak: { pt: "Pico", en: "Peak", icon: "📈" },
  declining: { pt: "Declínio", en: "Declining", icon: "📉" },
  stable: { pt: "Estável", en: "Stable", icon: "➡️" },
};

/* ─── Tier labels ─── */
export const TIER_LABELS: Record<PriorityResult["tier"], { pt: string; en: string }> = {
  critical: { pt: "Prioridade Crítica", en: "Critical Priority" },
  high: { pt: "Alta Prioridade", en: "High Priority" },
  medium: { pt: "Prioridade Média", en: "Medium Priority" },
  low: { pt: "Baixa Prioridade", en: "Low Priority" },
};

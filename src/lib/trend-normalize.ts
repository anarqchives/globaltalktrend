/**
 * Trend normalization utilities — extracted from use-trends.ts
 */
import { TrendCardProps } from "@/components/TrendCard";
import { categorizeTrend, detectCountryFromContent } from "@/lib/categorize-trend";
import { getSourceInfo, matchesFilterType } from "@/lib/source-map";

const STANDARD_CATEGORIES = new Set([
  "Geopolítica", "Economia", "Tecnologia", "Ciência", "Saúde",
  "Entretenimento", "Esportes", "Cultura", "Meio Ambiente", "Educação", "Geral",
]);

export const SOURCE_COUNTRY_MAP: Record<string, string> = {
  "IBGE": "BR", "Folha de S.Paulo": "BR", "O Globo": "BR", "Estadão": "BR",
  "El País Brasil": "BR", "DW Brasil": "BR", "BBC Brasil": "BR",
  "Google Trends Brasil": "BR", "Google Trends Brazil": "BR",
  "Google Trends Portugal": "PT", "Google Trends EUA": "US", "Google Trends USA": "US",
  "Google Trends UK": "GB", "Google Trends France": "FR", "Google Trends Deutschland": "DE",
  "Google Trends India": "IN", "Google Trends Japan": "JP", "Google Trends España": "ES",
  "Google Trends Italia": "IT", "Google Trends México": "MX", "Google Trends Argentina": "AR",
  "Google Trends Colombia": "CO", "Google Trends Chile": "CL",
  "BBC": "GB", "BBC News": "GB", "BBC Sports": "GB", "BBC Tech": "GB", "BBC Science": "GB",
  "The Guardian": "GB", "Sky Sports": "GB", "The Telegraph": "GB", "The Independent": "GB",
  "NPR": "US", "TechCrunch": "US", "The Verge": "US", "Wired": "US", "Ars Technica": "US",
  "New York Times": "US", "Washington Post": "US", "CNN": "US", "Forbes": "US",
  "Business Insider": "US", "ESPN": "US", "NOAA": "US", "FRED": "US",
  "Hacker News": "US", "GitHub": "US", "Stack Overflow": "US", "Engadget": "US",
  "Variety": "US", "Hollywood Reporter": "US", "ScienceDaily": "US",
  "Reuters": "GB", "Associated Press": "US", "AP News": "US",
  "El País": "ES", "El Mundo": "ES",
  "Le Monde": "FR", "Le Figaro": "FR", "France 24": "FR", "France 24 ES": "FR",
  "Der Spiegel": "DE", "Deutsche Welle": "DE", "DW Español": "DE",
  "La Repubblica": "IT", "Corriere della Sera": "IT",
  "Público": "PT", "Expresso": "PT",
  "Al Jazeera": "QA", "NHK": "JP", "The Japan Times": "JP",
  "Times of India": "IN", "The Hindu": "IN",
  "South China Morning Post": "CN", "Korea Herald": "KR",
  "The Straits Times": "SG", "The Jakarta Post": "ID",
  "Haaretz": "IL", "The Jerusalem Post": "IL", "Ahram Online": "EG",
  "News24": "ZA", "Premium Times": "NG", "Daily Nation": "KE",
  "NL Times": "NL", "Nature": "GB",
  "Telesur": "VE", "EFE News": "ES", "Prensa Latina": "CU",
  "Clarín": "AR", "La Nación": "AR",
  "El Universal MX": "MX", "El Tiempo": "CO", "El Comercio": "PE",
};

export function normalizeText(value?: string): string {
  return (value || "").normalize("NFC").toLowerCase().trim();
}

export function normalizeCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const cleaned = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  return undefined;
}

export function ensureTrendCountry(trend: TrendCardProps): TrendCardProps {
  const existing = normalizeCountryCode(trend.countryCode);
  if (existing && existing !== "GL" && existing.length === 2) {
    return { ...trend, countryCode: existing };
  }
  const detected = detectCountryFromContent(
    trend.title || "", trend.platform || "",
    trend.details || trend.description || "", trend.countryCode
  );
  const detectedNorm = normalizeCountryCode(detected);
  if (detectedNorm && detectedNorm !== "GL") {
    return { ...trend, countryCode: detectedNorm };
  }
  const platform = (trend.platform || "").trim();
  const mapped = SOURCE_COUNTRY_MAP[platform];
  if (mapped) return { ...trend, countryCode: mapped };
  return { ...trend, countryCode: "GL" };
}

export function normalizeCategory(title: string, platform: string, category?: string): string {
  const normalized = categorizeTrend(title, platform, category);
  if (STANDARD_CATEGORIES.has(normalized)) return normalized;
  if (normalizeText(normalized).includes("news") || normalizeText(normalized).includes("notí")) {
    return "Geopolítica";
  }
  return "Geral";
}

export function inferTypeFromSource(source?: string): string {
  const info = getSourceInfo(source || "");
  const typeMap: Record<string, string> = {
    "imprensa": "Imprensa",
    "redes-sociais": "Redes sociais",
    "buscas": "Buscas (Google)",
    "dados-oficiais": "Dados oficiais",
    "ciencia": "Ciência",
    "tech": "Tech",
    "enciclopedia": "Enciclopédia",
    "conflitos": "Conflitos",
  };
  return typeMap[info.mediaType] || "Imprensa";
}

export type NormalizedTrendForFilter = TrendCardProps & {
  source: string;
  type: string;
  normalizedCountry: string;
  normalizedCategory: string;
  hasExplicitCountry: boolean;
};

export function normalizeTrendForFilter(trend: TrendCardProps): NormalizedTrendForFilter {
  const source = (trend.platform || "desconhecido").trim() || "desconhecido";
  const normalizedCountry = normalizeCountryCode(trend.countryCode) || "GL";
  const normalizedCategory = normalizeText(trend.category || "Geral");

  return {
    ...trend,
    source,
    type: inferTypeFromSource(source),
    category: trend.category || "Geral",
    countryCode: trend.countryCode || "GL",
    normalizedCountry,
    normalizedCategory,
    hasExplicitCountry: Boolean(normalizeCountryCode(trend.countryCode)),
  };
}

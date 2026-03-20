/**
 * Comprehensive source map: maps every known platform/source to its
 * country, media type (for filter matching), default category, and reliability score.
 *
 * Media types match FilterBar options:
 *   "imprensa" | "redes-sociais" | "buscas" | "dados-oficiais" | "ciencia" | "tech" | "enciclopedia" | "conflitos"
 */

export interface SourceInfo {
  country: string;       // ISO 2-letter or "GL" for global
  mediaType: string;     // matches filter type
  category?: string;     // default category if not detected
  reliability: number;   // 0-1 score
  note?: string;
}

export const SOURCE_MAP: Record<string, SourceInfo> = {
  // ─── Brasil ──────────────────────────────────────
  "Folha de S.Paulo":     { country: "BR", mediaType: "imprensa", reliability: 0.9 },
  "O Globo":              { country: "BR", mediaType: "imprensa", reliability: 0.9 },
  "Estadão":              { country: "BR", mediaType: "imprensa", reliability: 0.9 },
  "G1":                   { country: "BR", mediaType: "imprensa", reliability: 0.8 },
  "UOL":                  { country: "BR", mediaType: "imprensa", reliability: 0.8 },
  "El País Brasil":       { country: "BR", mediaType: "imprensa", reliability: 0.85 },
  "DW Brasil":            { country: "BR", mediaType: "imprensa", reliability: 0.85 },
  "BBC Brasil":           { country: "BR", mediaType: "imprensa", reliability: 0.9 },
  "IBGE":                 { country: "BR", mediaType: "dados-oficiais", category: "Negócios/Finanças", reliability: 1.0 },

  // ─── EUA ─────────────────────────────────────────
  "New York Times":       { country: "US", mediaType: "imprensa", reliability: 0.95 },
  "NPR":                  { country: "US", mediaType: "imprensa", reliability: 0.9 },
  "TechCrunch":           { country: "US", mediaType: "imprensa", category: "Tecnologia", reliability: 0.8 },
  "The Verge":            { country: "US", mediaType: "imprensa", category: "Tecnologia", reliability: 0.8 },
  "Wired":                { country: "US", mediaType: "imprensa", category: "Tecnologia", reliability: 0.8 },
  "Ars Technica":         { country: "US", mediaType: "imprensa", category: "Tecnologia", reliability: 0.8 },
  "Forbes":               { country: "US", mediaType: "imprensa", category: "Negócios/Finanças", reliability: 0.8 },
  "Business Insider":     { country: "US", mediaType: "imprensa", category: "Negócios/Finanças", reliability: 0.75 },
  "ESPN":                 { country: "US", mediaType: "imprensa", category: "Esportes", reliability: 0.85 },
  "Variety":              { country: "US", mediaType: "imprensa", category: "Entretenimento", reliability: 0.8 },
  "Hollywood Reporter":   { country: "US", mediaType: "imprensa", category: "Entretenimento", reliability: 0.8 },
  "ScienceDaily":         { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.9 },
  "Engadget":             { country: "US", mediaType: "imprensa", category: "Tecnologia", reliability: 0.75 },
  "Washington Post":      { country: "US", mediaType: "imprensa", reliability: 0.9 },
  "CNN":                  { country: "US", mediaType: "imprensa", reliability: 0.8 },
  "AP News":              { country: "US", mediaType: "imprensa", reliability: 0.95 },
  "Associated Press":     { country: "US", mediaType: "imprensa", reliability: 0.95 },

  // ─── Reino Unido ─────────────────────────────────
  "BBC":                  { country: "GB", mediaType: "imprensa", reliability: 0.95 },
  "BBC News":             { country: "GB", mediaType: "imprensa", reliability: 0.95 },
  "BBC Sports":           { country: "GB", mediaType: "imprensa", category: "Esportes", reliability: 0.9 },
  "BBC Tech":             { country: "GB", mediaType: "imprensa", category: "Tecnologia", reliability: 0.9 },
  "BBC Science":          { country: "GB", mediaType: "imprensa", category: "Ciência", reliability: 0.9 },
  "The Guardian":         { country: "GB", mediaType: "imprensa", reliability: 0.9 },
  "Reuters":              { country: "GL", mediaType: "imprensa", reliability: 0.95 },
  "Sky Sports":           { country: "GB", mediaType: "imprensa", category: "Esportes", reliability: 0.85 },
  "The Telegraph":        { country: "GB", mediaType: "imprensa", reliability: 0.8 },
  "The Independent":      { country: "GB", mediaType: "imprensa", reliability: 0.8 },
  "Nature":               { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.95 },

  // ─── Europa ──────────────────────────────────────
  "Le Monde":             { country: "FR", mediaType: "imprensa", reliability: 0.9 },
  "Le Figaro":            { country: "FR", mediaType: "imprensa", reliability: 0.85 },
  "France 24":            { country: "FR", mediaType: "imprensa", reliability: 0.85 },
  "France 24 ES":         { country: "FR", mediaType: "imprensa", reliability: 0.85 },
  "Der Spiegel":          { country: "DE", mediaType: "imprensa", reliability: 0.85 },
  "Deutsche Welle":       { country: "DE", mediaType: "imprensa", reliability: 0.9 },
  "DW Español":           { country: "DE", mediaType: "imprensa", reliability: 0.85 },
  "La Repubblica":        { country: "IT", mediaType: "imprensa", reliability: 0.8 },
  "Corriere della Sera":  { country: "IT", mediaType: "imprensa", reliability: 0.8 },
  "El País":              { country: "ES", mediaType: "imprensa", reliability: 0.9 },
  "El Mundo":             { country: "ES", mediaType: "imprensa", reliability: 0.8 },
  "Público":              { country: "PT", mediaType: "imprensa", reliability: 0.85 },
  "Expresso":             { country: "PT", mediaType: "imprensa", reliability: 0.85 },
  "NL Times":             { country: "NL", mediaType: "imprensa", reliability: 0.8 },
  "RT":                   { country: "RU", mediaType: "imprensa", reliability: 0.5, note: "cobertura internacional" },
  "Russia Beyond":        { country: "RU", mediaType: "imprensa", reliability: 0.6 },
  "Moscow Times":         { country: "RU", mediaType: "imprensa", reliability: 0.7 },
  "TASS":                 { country: "RU", mediaType: "imprensa", reliability: 0.6, note: "fonte oficial" },

  // ─── América Latina ──────────────────────────────
  "Clarín":               { country: "AR", mediaType: "imprensa", reliability: 0.85 },
  "La Nación":            { country: "AR", mediaType: "imprensa", reliability: 0.85 },
  "El Universal MX":      { country: "MX", mediaType: "imprensa", reliability: 0.8 },
  "El Tiempo":            { country: "CO", mediaType: "imprensa", reliability: 0.8 },
  "El Comercio":          { country: "PE", mediaType: "imprensa", reliability: 0.8 },
  "El Mercurio":          { country: "CL", mediaType: "imprensa", reliability: 0.8 },
  "El Universal VE":      { country: "VE", mediaType: "imprensa", reliability: 0.7 },
  "Telesur":              { country: "VE", mediaType: "imprensa", reliability: 0.6 },
  "EFE News":             { country: "ES", mediaType: "imprensa", reliability: 0.85 },
  "Prensa Latina":        { country: "CU", mediaType: "imprensa", reliability: 0.6 },

  // ─── Ásia ────────────────────────────────────────
  "NHK":                  { country: "JP", mediaType: "imprensa", reliability: 0.9 },
  "The Japan Times":      { country: "JP", mediaType: "imprensa", reliability: 0.85 },
  "South China Morning Post": { country: "CN", mediaType: "imprensa", reliability: 0.7, note: "cobertura internacional" },
  "Xinhua":               { country: "CN", mediaType: "imprensa", reliability: 0.6, note: "fonte oficial" },
  "China Daily":          { country: "CN", mediaType: "imprensa", reliability: 0.6 },
  "Times of India":       { country: "IN", mediaType: "imprensa", reliability: 0.8 },
  "The Hindu":            { country: "IN", mediaType: "imprensa", reliability: 0.85 },
  "Korea Herald":         { country: "KR", mediaType: "imprensa", reliability: 0.8 },
  "The Straits Times":    { country: "SG", mediaType: "imprensa", reliability: 0.85 },
  "The Jakarta Post":     { country: "ID", mediaType: "imprensa", reliability: 0.8 },

  // ─── Oriente Médio e África ──────────────────────
  "Al Jazeera":           { country: "QA", mediaType: "imprensa", reliability: 0.8 },
  "Haaretz":              { country: "IL", mediaType: "imprensa", reliability: 0.7 },
  "The Jerusalem Post":   { country: "IL", mediaType: "imprensa", reliability: 0.7 },
  "Ahram Online":         { country: "EG", mediaType: "imprensa", reliability: 0.7 },
  "News24":               { country: "ZA", mediaType: "imprensa", reliability: 0.8 },
  "Premium Times":        { country: "NG", mediaType: "imprensa", reliability: 0.75 },
  "Daily Nation":         { country: "KE", mediaType: "imprensa", reliability: 0.75 },

  // ─── Redes sociais ───────────────────────────────
  "Reddit":               { country: "GL", mediaType: "redes-sociais", reliability: 0.6 },
  "Bluesky":              { country: "GL", mediaType: "redes-sociais", reliability: 0.5 },
  "Mastodon":             { country: "GL", mediaType: "redes-sociais", reliability: 0.5 },
  "X (Twitter)":          { country: "GL", mediaType: "redes-sociais", reliability: 0.5 },
  "YouTube":              { country: "GL", mediaType: "redes-sociais", reliability: 0.5 },

  // ─── Novas fontes de imprensa ──────────────────────
  "Currents":             { country: "GL", mediaType: "imprensa", reliability: 0.65, note: "Currents API — agregador global de notícias" },
  "Mediastack":           { country: "GL", mediaType: "imprensa", reliability: 0.65, note: "Mediastack — notícias em tempo real via API" },

  // ─── Buscas ──────────────────────────────────────
  "Google Trends":        { country: "GL", mediaType: "buscas", reliability: 0.8 },
  "Google News":          { country: "GL", mediaType: "buscas", reliability: 0.7 },

  // ─── Dados Oficiais ──────────────────────────────
  "World Bank":           { country: "GL", mediaType: "dados-oficiais", category: "Negócios/Finanças", reliability: 0.95 },
  "IMF":                  { country: "GL", mediaType: "dados-oficiais", category: "Negócios/Finanças", reliability: 0.95 },
  "FRED":                 { country: "US", mediaType: "dados-oficiais", category: "Negócios/Finanças", reliability: 0.95, note: "Federal Reserve Economic Data — indicadores econômicos oficiais dos EUA" },
  "The News API":         { country: "GL", mediaType: "imprensa", reliability: 0.8, note: "Agregador global de notícias em múltiplos idiomas" },
  "NOAA":                 { country: "US", mediaType: "dados-oficiais", category: "Clima/Meio Ambiente", reliability: 0.95 },

  // ─── Ciência ─────────────────────────────────────
  "OpenAlex":             { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.85 },
  "arXiv":                { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.8 },
  "PubMed":               { country: "GL", mediaType: "ciencia", category: "Saúde", reliability: 0.95 },
  "Crossref":             { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.8 },
  "Semantic Scholar":     { country: "GL", mediaType: "ciencia", category: "Ciência", reliability: 0.85 },

  // ─── Tech ────────────────────────────────────────
  "Hacker News":          { country: "GL", mediaType: "tech", category: "Tecnologia", reliability: 0.7 },
  "GitHub":               { country: "GL", mediaType: "tech", category: "Tecnologia", reliability: 0.7 },
  "Stack Overflow":       { country: "GL", mediaType: "tech", category: "Tecnologia", reliability: 0.7 },
  "Lobsters":             { country: "GL", mediaType: "tech", category: "Tecnologia", reliability: 0.7 },

  // ─── Enciclopédia ────────────────────────────────
  "Wikipedia":            { country: "GL", mediaType: "enciclopedia", category: "Conhecimento", reliability: 0.8 },

  // ─── Conflitos ───────────────────────────────────
  "GDELT":                { country: "GL", mediaType: "conflitos", category: "Conflitos/Crises", reliability: 0.7 },
  "GDELT DOC":            { country: "GL", mediaType: "conflitos", category: "Geral", reliability: 0.75, note: "GDELT DOC 2.0 — sentimento + volume global em 65 idiomas" },
  "ACLED":                { country: "GL", mediaType: "conflitos", category: "Conflitos/Crises", reliability: 0.9 },

  // ─── Dados Oficiais Internacionais ─────────────────
  "OMS (WHO)":            { country: "GL", mediaType: "dados-oficiais", category: "Saúde", reliability: 1.0 },
  "FMI (IMF)":            { country: "GL", mediaType: "dados-oficiais", category: "Negócios/Finanças", reliability: 1.0 },

  // ─── Aggregator Client-Side Sources ────────────────
  "Alpha Vantage":        { country: "US", mediaType: "dados-oficiais", category: "Economia", reliability: 0.9 },
  "Fixer.io":             { country: "GL", mediaType: "dados-oficiais", category: "Economia", reliability: 0.85 },
  "NewsData":             { country: "GL", mediaType: "imprensa", reliability: 0.7 },
};

// Map filter type values to source map mediaType values
const FILTER_TO_MEDIA_TYPE: Record<string, string[]> = {
  "Redes sociais": ["redes-sociais"],
  "Imprensa": ["imprensa"],
  "Buscas (Google)": ["buscas"],
  "Dados oficiais": ["dados-oficiais"],
  "Ciência": ["ciencia"],
  "Tech": ["tech"],
  "Enciclopédia": ["enciclopedia"],
  "Conflitos": ["conflitos"],
};

/**
 * Given a platform name, return the source info from the map.
 * Falls back to a sensible default for unknown sources.
 */
export function getSourceInfo(platform: string): SourceInfo {
  const trimmed = platform.trim();
  
  // Direct match
  if (SOURCE_MAP[trimmed]) return SOURCE_MAP[trimmed];
  
  // Partial match (e.g., "Google Trends Brasil" -> starts with "Google Trends")
  if (trimmed.startsWith("Google Trends")) {
    // Extract country from suffix
    const suffix = trimmed.replace("Google Trends", "").trim();
    const geoMap: Record<string, string> = {
      "Brasil": "BR", "Brazil": "BR", "EUA": "US", "USA": "US", "UK": "GB",
      "France": "FR", "Deutschland": "DE", "India": "IN", "Japan": "JP",
      "España": "ES", "Italia": "IT", "México": "MX", "Argentina": "AR",
      "Colombia": "CO", "Chile": "CL", "Portugal": "PT",
    };
    return {
      country: geoMap[suffix] || "GL",
      mediaType: "buscas",
      reliability: 0.8,
    };
  }
  
  // Unknown source — default to imprensa if it looks like news
  return { country: "GL", mediaType: "imprensa", reliability: 0.5 };
}

/**
 * Check if a platform matches a filter type selection.
 */
export function matchesFilterType(platform: string, filterType: string): boolean {
  if (filterType === "Todas mídias") return true;
  if (filterType === "Multiplataforma") return true; // handled separately
  
  const info = getSourceInfo(platform);
  const mediaTypes = FILTER_TO_MEDIA_TYPE[filterType];
  
  if (mediaTypes) {
    return mediaTypes.includes(info.mediaType);
  }
  
  return true;
}

/**
 * Validate and enrich a trend with source map data.
 * Fills in missing country, category, and type info.
 */
export function enrichTrendFromSourceMap(trend: {
  platform?: string;
  countryCode?: string;
  category?: string;
  title?: string;
}): { country: string; category?: string; mediaType: string; reliability: number } {
  const info = getSourceInfo(trend.platform || "");
  
  return {
    country: trend.countryCode || info.country,
    category: trend.category || info.category,
    mediaType: info.mediaType,
    reliability: info.reliability,
  };
}

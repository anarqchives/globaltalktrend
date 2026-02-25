/**
 * Unified trend categorization using multilingual keyword matching.
 * Returns a standardized category that matches the filter options.
 */

const categoryKeywords: Record<string, string[]> = {
  Política: [
    "eleição", "governo", "presidente", "congresso", "senado", "deputado", "voto", "partido", "ministro",
    "election", "government", "president", "congress", "senate", "parliament", "minister", "political", "politics", "democrat", "republican",
    "elección", "gobierno", "presidente",
    "élection", "gouvernement", "président",
    "wahl", "regierung", "präsident",
    "politica", "elezioni", "governo",
    "政治", "選挙", "정치", "سياسة", "राजनीति", "политика",
  ],
  Entretenimento: [
    "filme", "série", "música", "cinema", "ator", "atriz", "novela", "show", "celebridade", "estrela",
    "movie", "music", "entertainment", "actor", "actress", "celebrity", "film", "star", "trailer", "album", "song", "concert", "award", "oscar", "grammy", "netflix", "disney", "anime", "manga",
    "película", "cine", "música",
    "film", "musique", "divertissement",
    "unterhaltung", "musik", "schauspieler",
    "娱乐", "映画", "엔터테인먼트", "ترفيه", "मनोरंजन", "развлечения",
  ],
  Tecnologia: [
    "ia", "inteligência artificial", "app", "software", "hardware", "startup", "digital", "computador", "programação",
    "ai", "artificial intelligence", "tech", "technology", "software", "app", "startup", "digital", "computer", "programming", "cyber", "robot", "blockchain", "crypto", "bitcoin", "gpu", "chip", "nvidia", "apple", "google", "microsoft", "openai", "chatgpt",
    "tecnología", "tecnologie", "technologie",
    "科技", "テクノロジー", "기술", "تكنولوجيا", "तकनीक", "технологии",
  ],
  Esportes: [
    "futebol", "copa", "jogo", "campeonato", "gol", "seleção", "time", "liga", "olimpíada",
    "sports", "game", "match", "football", "soccer", "basketball", "tennis", "nba", "nfl", "fifa", "championship", "league", "world cup", "olympic", "goal", "player", "team", "score",
    "deporte", "fútbol", "partido",
    "sport", "fußball", "spiel",
    "体育", "スポーツ", "스포츠", "رياضة", "खेल", "спорт",
  ],
  Cultura: [
    "arte", "exposição", "museu", "cultura", "literatura", "livro", "teatro", "dança",
    "art", "culture", "exhibition", "museum", "literature", "book", "theater", "dance", "heritage", "festival",
    "cultura", "arte", "exposición",
    "kunst", "ausstellung", "museum",
    "文化", "芸術", "문화", "ثقافة", "संस्कृति", "культура",
  ],
  "Negócios/Finanças": [
    "bolsa", "mercado", "economia", "inflação", "dólar", "real", "ações", "investimento", "pib", "banco",
    "market", "economy", "business", "finance", "stock", "wall street", "inflation", "gdp", "investment", "bank", "trade", "tariff", "dollar", "euro", "revenue", "profit",
    "mercado", "economía", "negocio",
    "marché", "économie", "affaire",
    "wirtschaft", "markt", "geschäft",
    "经济", "経済", "경제", "اقتصاد", "अर्थव्यवस्था", "экономика",
  ],
  Ciência: [
    "pesquisa", "estudo", "ciência", "cientista", "descoberta", "nasa", "espaço", "vacina", "saúde",
    "science", "research", "study", "scientist", "discovery", "nasa", "space", "vaccine", "health", "medical", "biology", "physics", "climate", "environment",
    "ciencia", "investigación", "estudio",
    "wissenschaft", "forschung", "studie",
    "科学", "科學", "과학", "علوم", "विज्ञान", "наука",
  ],
};

// YouTube category ID mapping
const youtubeCategoryMap: Record<string, string> = {
  "1": "Entretenimento", // Film & Animation
  "2": "Entretenimento", // Autos & Vehicles
  "10": "Entretenimento", // Music
  "15": "Entretenimento", // Pets & Animals
  "17": "Esportes",
  "18": "Entretenimento", // Short Movies
  "19": "Entretenimento", // Travel & Events
  "20": "Entretenimento", // Gaming
  "22": "Cultura", // People & Blogs
  "23": "Entretenimento", // Comedy
  "24": "Entretenimento", // Entertainment
  "25": "Política", // News & Politics
  "26": "Cultura", // How-to & Style
  "27": "Cultura", // Education
  "28": "Tecnologia", // Science & Technology
  "29": "Entretenimento", // Nonprofits & Activism
};

// Reddit subreddit mapping
const subredditCategoryMap: Record<string, string> = {
  politics: "Política", worldnews: "Política", news: "Política", uspolitics: "Política",
  technology: "Tecnologia", programming: "Tecnologia", android: "Tecnologia", apple: "Tecnologia",
  science: "Ciência", askscience: "Ciência", space: "Ciência",
  sports: "Esportes", soccer: "Esportes", nba: "Esportes", nfl: "Esportes", formula1: "Esportes",
  movies: "Entretenimento", music: "Entretenimento", television: "Entretenimento", gaming: "Entretenimento",
  art: "Cultura", books: "Cultura", history: "Cultura",
  economics: "Negócios/Finanças", finance: "Negócios/Finanças", wallstreetbets: "Negócios/Finanças", investing: "Negócios/Finanças",
};

export function categorizeTrend(
  title: string,
  platform: string,
  existingCategory?: string,
  metadata?: { categoryId?: string; subreddit?: string }
): string {
  // Priority 1: YouTube category ID
  if (platform === "YouTube" && metadata?.categoryId) {
    const mapped = youtubeCategoryMap[metadata.categoryId];
    if (mapped) return mapped;
  }

  // Priority 2: Reddit subreddit
  if (platform === "Reddit") {
    const sub = metadata?.subreddit || existingCategory?.replace("r/", "") || "";
    const mapped = subredditCategoryMap[sub.toLowerCase()];
    if (mapped) return mapped;
  }

  // Priority 3: If existing category already matches a standard one, keep it
  const standardCategories = Object.keys(categoryKeywords);
  if (existingCategory && standardCategories.includes(existingCategory)) {
    return existingCategory;
  }

  // Priority 4: Keyword analysis on title + existing category text
  const searchText = `${title} ${existingCategory || ""}`.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return category;
    }
  }

  // Priority 5: Platform-based defaults
  if (["World Bank", "IBGE"].includes(platform)) return "Negócios/Finanças";
  if (platform === "OpenAlex") return "Ciência";

  return existingCategory || "Geral";
}

// ---- Country detection from content + platform ----

const sourceCountryMap: Record<string, string> = {
  "The Guardian": "GB",
  "BBC": "GB",
  "Reuters": "GL",
  "IBGE": "BR",
  "World Bank": "GL",
  "OpenAlex": "GL",
};

const countryKeywordsMap: Record<string, string[]> = {
  BR: ["brasil", "brasileiro", "brasileira", "rio de janeiro", "são paulo", "brasília", "governo federal", "lula", "bolsonaro", "real", "reais", "ibovespa", "petrobras", "stf", "senado federal"],
  US: ["usa", "united states", "estados unidos", "biden", "trump", "white house", "casa branca", "washington", "new york", "wall street", "pentagon", "congress", "silicon valley", "california", "texas", "florida"],
  GB: ["uk", "united kingdom", "reino unido", "britain", "british", "london", "londres", "king charles", "parliament", "downing street", "bbc", "premier league"],
  FR: ["france", "frança", "paris", "macron", "élysée", "ligue 1"],
  DE: ["germany", "alemanha", "berlin", "berlim", "scholz", "bundesliga", "bundestag"],
  ES: ["spain", "espanha", "madrid", "barcelona", "la liga", "sánchez"],
  IT: ["italy", "itália", "roma", "milan", "serie a", "meloni"],
  PT: ["portugal", "lisboa", "porto", "portuguesa"],
  AR: ["argentina", "buenos aires", "milei", "peso argentino"],
  CO: ["colombia", "colômbia", "bogotá"],
  MX: ["mexico", "méxico", "ciudad de méxico"],
  JP: ["japan", "japão", "tokyo", "tóquio", "yen"],
  KR: ["south korea", "coreia do sul", "seoul", "seul", "k-pop", "samsung"],
  CN: ["china", "beijing", "pequim", "shanghai", "xi jinping", "yuan"],
  IN: ["india", "índia", "modi", "mumbai", "delhi", "bollywood", "rupee"],
  AU: ["australia", "austrália", "sydney", "melbourne", "canberra"],
  CA: ["canada", "canadá", "ottawa", "toronto", "trudeau"],
  RU: ["russia", "rússia", "moscow", "moscou", "putin", "kremlin"],
  UA: ["ukraine", "ucrânia", "kiev", "kyiv", "zelensky"],
  IL: ["israel", "tel aviv", "jerusalem", "jerusalém", "netanyahu"],
  SA: ["saudi", "arábia saudita", "riyadh"],
  AE: ["emirates", "emirados", "dubai", "abu dhabi"],
  EG: ["egypt", "egito", "cairo"],
  NG: ["nigeria", "nigéria", "lagos"],
  ZA: ["south africa", "áfrica do sul", "cape town", "johannesburg"],
};

/**
 * Detect country code from trend content using multi-layer analysis:
 * 1. Source-based (e.g., The Guardian → GB)
 * 2. Content keyword analysis
 * 3. Existing countryCode validation
 */
export function detectCountryFromContent(
  title: string,
  platform: string,
  description?: string,
  existingCode?: string
): string | undefined {
  // Layer 1: Known source mapping
  const sourceCountry = sourceCountryMap[platform];
  if (sourceCountry && sourceCountry !== "GL") {
    // Still check content — source gives default but content may override
    const text = `${title} ${description || ""}`.toLowerCase();
    for (const [code, keywords] of Object.entries(countryKeywordsMap)) {
      if (keywords.some(k => text.includes(k))) return code;
    }
    return sourceCountry;
  }

  // Layer 2: Content keyword analysis
  const text = `${title} ${description || ""}`.toLowerCase();
  for (const [code, keywords] of Object.entries(countryKeywordsMap)) {
    if (keywords.some(k => text.includes(k))) return code;
  }

  // Layer 3: Return existing code if valid
  if (existingCode && existingCode.length >= 2) {
    return existingCode.slice(0, 2).toUpperCase();
  }

  return undefined;
}

// Country code to flag emoji
export function countryCodeToFlag(code?: string): string | null {
  if (!code || code.length < 2) return null;
  const cc = code.slice(0, 2).toUpperCase();
  const codePoints = [...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return null;
  }
}

// Format volume for display (e.g., 100000 → "100K")
export function formatVolume(volume: string): string {
  const num = parseInt(volume.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return volume;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return volume;
}

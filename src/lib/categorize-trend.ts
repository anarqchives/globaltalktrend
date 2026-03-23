/**
 * Unified trend categorization — 10 canonical categories.
 *
 * CANONICAL TAXONOMY (do NOT add others):
 *   Geopolítica | Economia | Tecnologia | Ciência | Saúde
 *   Entretenimento | Esportes | Cultura | Meio Ambiente | Educação | Geral
 *
 * Old → New mappings:
 *   Política → Geopolítica
 *   Conflitos/Crises → Geopolítica
 *   Negócios/Finanças → Economia
 *   Clima/Meio Ambiente → Meio Ambiente
 *   Conhecimento → Cultura
 */

const LEGACY_TO_CANONICAL: Record<string, string> = {
  "Política": "Geopolítica",
  "Conflitos/Crises": "Geopolítica",
  "Negócios/Finanças": "Economia",
  "Clima/Meio Ambiente": "Meio Ambiente",
  "Conhecimento": "Cultura",
};

export function canonicalizeCategory(cat: string): string {
  return LEGACY_TO_CANONICAL[cat] || cat;
}

const categoryAliasMap: Record<string, string> = {
  "politics": "Geopolítica", "political": "Geopolítica", "us news": "Geopolítica", "uk news": "Geopolítica",
  "world news": "Geopolítica", "us politics": "Geopolítica", "uk politics": "Geopolítica", "world": "Geopolítica",
  "policy": "Geopolítica", "law": "Geopolítica", "diplomacy": "Geopolítica", "defense": "Geopolítica",
  "news": "Geral", "notícias": "Geral", "noticias": "Geral",
  "global development": "Geopolítica", "international": "Geopolítica", "foreign affairs": "Geopolítica",
  "government": "Geopolítica", "congress": "Geopolítica", "senate": "Geopolítica",
  "national security": "Geopolítica", "homeland": "Geopolítica", "geopolitics": "Geopolítica",
  "elections": "Geopolítica", "voting": "Geopolítica", "legislation": "Geopolítica",
  "australia news": "Geral", "europe": "Geral", "asia pacific": "Geral",
  "americas": "Geral", "middle east": "Geopolítica", "africa": "Geral",
  "global": "Geral", "breaking news": "Geral", "top stories": "Geral",
  "headlines": "Geral", "latest": "Geral", "general": "Geral",
  "technology": "Tecnologia", "tech": "Tecnologia", "digital": "Tecnologia",
  "computing": "Tecnologia", "artificial intelligence": "Tecnologia", "cybersecurity": "Tecnologia",
  "science": "Ciência", "environment": "Meio Ambiente", "climate": "Meio Ambiente",
  "climate crisis": "Meio Ambiente", "green": "Meio Ambiente", "sustainability": "Meio Ambiente",
  "sport": "Esportes", "sports": "Esportes", "football": "Esportes", "soccer": "Esportes",
  "cricket": "Esportes", "rugby": "Esportes", "tennis": "Esportes", "f1": "Esportes",
  "culture": "Cultura", "arts": "Cultura", "books": "Cultura", "stage": "Cultura",
  "lifestyle": "Cultura", "fashion": "Cultura", "food": "Cultura", "travel": "Cultura",
  "film": "Entretenimento", "movies": "Entretenimento", "music": "Entretenimento", "tv": "Entretenimento",
  "media": "Entretenimento", "television": "Entretenimento", "entertainment": "Entretenimento",
  "games": "Entretenimento", "gaming": "Entretenimento", "celebrities": "Entretenimento",
  "business": "Economia", "economy": "Economia", "finance": "Economia", "money": "Economia",
  "markets": "Economia", "stocks": "Economia", "banking": "Economia",
  "health": "Saúde", "wellbeing": "Saúde", "mental health": "Saúde", "medicine": "Saúde",
  "society": "Cultura", "education": "Educação",
  "opinion": "Geral", "editorial": "Geral", "analysis": "Geral",
  "comment": "Geral", "debate": "Geral", "investigation": "Geral",
  "trending": "Geral", "social": "Geral", "fediverso": "Geral",
  "miscellaneous": "Geral", "other": "Geral", "uncategorized": "Geral",
  "conflict": "Geopolítica", "war": "Geopolítica", "crisis": "Geopolítica",
};

// ⚠️ ORDER MATTERS: Entretenimento/Esportes BEFORE Geopolítica
const categoryKeywords: Record<string, string[]> = {
  Entretenimento: [
    "bbb", "big brother", "big brother brasil", "reality show", "reality tv", "paredão", "sincerão",
    "eliminado do bbb", "participante", "confinamento", "casa de vidro", "prova do líder", "prova do anjo",
    "masterchef", "the voice", "a fazenda", "ilha da tentação", "survivor", "bachelor", "bachelorette", "love island",
    "rupaul", "drag race", "american idol", "x factor", "got talent", "the masked",
    "k-drama", "kdrama", "doramas", "telenovela", "streaming", "hbo", "prime video",
    "globoplay", "paramount", "crunchyroll", "tiktoker", "influencer", "youtuber",
    "filme", "série", "música", "cinema", "ator", "atriz", "novela", "show", "celebridade", "estrela",
    "movie", "music", "entertainment", "actor", "actress", "celebrity", "film", "star", "trailer", "album", "song", "concert", "award", "oscar", "grammy", "netflix", "disney", "anime", "manga",
    "película", "cine", "música", "film", "musique", "divertissement", "unterhaltung", "musik", "schauspieler",
    "娱乐", "映画", "엔터테인먼트", "ترفيه", "मनोरंजन", "развлечения",
  ],
  Esportes: [
    "futebol", "copa", "campeonato", "gol", "seleção", "time", "liga", "olimpíada", "esporte",
    "sports", "game", "match", "football", "soccer", "basketball", "tennis", "nba", "nfl", "fifa", "championship", "league", "world cup", "olympic", "goal", "player", "team", "score",
    "champions league", "bundesliga", "premier league", "la liga", "serie a", "ligue 1", "taekwondo", "cricket", "rugby",
    "borussia", "atalanta", "barcelona", "real madrid", "manchester", "liverpool", "arsenal", "chelsea", "juventus",
    "deporte", "fútbol", "partido", "sport", "fußball", "spiel",
    "体育", "スポーツ", "스포츠", "رياضة", "खेल", "спорт",
  ],
  Tecnologia: [
    "ia", "inteligência artificial", "app", "software", "hardware", "startup", "digital", "computador", "programação",
    "ai", "artificial intelligence", "tech", "technology", "software", "app", "startup", "digital", "computer", "programming", "cyber", "robot", "blockchain", "crypto", "bitcoin", "gpu", "chip", "nvidia", "apple", "google", "microsoft", "openai", "chatgpt",
    "tecnología", "tecnologie", "technologie",
    "科技", "テクノロジー", "기술", "تكنولوجيا", "तकनीक", "технологии",
  ],
  Ciência: [
    "ciência", "cientista", "descoberta", "nasa", "espaço", "vacina", "laboratório",
    "science", "research", "study", "scientist", "discovery", "nasa", "space", "biology", "physics", "chemistry", "arxiv", "preprint",
    "ciencia", "investigación", "wissenschaft", "forschung", "studie",
    "科学", "科學", "과학", "علوم", "विज्ञान", "наука",
  ],
  Saúde: [
    "saúde", "doença", "epidemia", "pandemia", "hospital", "médico", "vacina", "oms", "surto",
    "health", "disease", "epidemic", "pandemic", "hospital", "doctor", "vaccine", "who", "outbreak", "medical", "clinical", "pubmed", "patient", "therapy", "drug",
    "salud", "santé", "gesundheit",
    "健康", "건강", "صحة", "स्वास्थ्य", "здоровье",
  ],
  Economia: [
    "bolsa", "mercado", "economia", "inflação", "dólar", "real", "ações", "investimento", "pib", "banco", "imposto", "renda", "tributário", "fiscal",
    "desocupação", "desemprego", "emprego", "trabalho", "salário", "aposentadoria", "previdência", "orçamento",
    "market", "economy", "business", "finance", "stock", "wall street", "inflation", "gdp", "investment", "bank", "trade", "tariff", "dollar", "euro", "revenue", "profit", "capital gains", "tax", "budget", "treasury", "unemployment", "jobs", "wages",
    "mercado", "economía", "negocio", "marché", "économie", "affaire", "wirtschaft", "markt", "geschäft",
    "经济", "経済", "경제", "اقتصاد", "अर्थव्यवस्था", "экономика",
  ],
  "Meio Ambiente": [
    "clima", "aquecimento", "desmatamento", "queimada", "inundação", "furacão", "tempestade", "seca", "poluição", "emissões",
    "climate", "warming", "deforestation", "wildfire", "flood", "hurricane", "storm", "drought", "pollution", "emissions", "weather", "noaa", "tornado", "blizzard",
    "environnement", "klima", "umwelt",
    "气候", "環境", "기후", "مناخ", "जलवायु", "климат",
  ],
  Cultura: [
    "arte", "exposição", "museu", "cultura", "literatura", "livro", "teatro", "dança", "wikipedia", "enciclopédia",
    "art", "culture", "exhibition", "museum", "literature", "book", "theater", "dance", "heritage", "festival",
    "encyclopedia", "most viewed", "trending article", "pageviews",
    "cultura", "arte", "exposición", "kunst", "ausstellung", "museum",
    "文化", "芸術", "문화", "ثقافة", "संस्कृति", "культура",
  ],
  Educação: [
    "educação", "escola", "universidade", "ensino", "professor", "aluno", "vestibular", "enem",
    "education", "school", "university", "teaching", "student", "academic", "scholarship", "curriculum",
    "educación", "éducation", "bildung",
  ],
  // ⚠️ Geopolítica LAST — to avoid false positives
  Geopolítica: [
    "eleição", "eleitoral", "governo", "presidente", "congresso", "senado", "deputado", "voto", "partido", "ministro", "prefeito", "governador", "câmara", "plenário",
    "conflito", "guerra", "protesto", "crise", "refugiado", "sanção", "ataque", "bombardeio",
    "election", "government", "president", "congress", "senate", "parliament", "minister", "political", "politics", "democrat", "republican", "byelection", "campaign",
    "policy", "legislation", "lawmaker", "diplomat", "sanctions", "nuclear talks", "state of the union", "oversight", "committee", "deposition", "impeach",
    "conflict", "war", "protest", "crisis", "refugee", "sanction", "attack", "bombing", "gdelt", "acled", "violence", "militant",
    "trump", "biden", "obama", "clinton", "starmer", "sunak", "macron", "putin", "zelensky", "xi jinping", "modi",
    "pentagon", "nato", "eu summit", "un general assembly", "white house", "downing street", "capitol hill",
    "elección", "gobierno", "presidente", "élection", "gouvernement", "président",
    "wahl", "regierung", "präsident", "politica", "elezioni", "governo",
    "conflit", "krieg", "konflikt",
    "政治", "選挙", "정치", "سياسة", "राजनीति", "политика",
    "冲突", "紛争", "분쟁", "صراع", "संघर्ष", "конфликт",
  ],
};

const youtubeCategoryMap: Record<string, string> = {
  "1": "Entretenimento", "2": "Entretenimento", "10": "Entretenimento",
  "15": "Entretenimento", "17": "Esportes", "18": "Entretenimento",
  "19": "Entretenimento", "20": "Entretenimento", "22": "Cultura",
  "23": "Entretenimento", "24": "Entretenimento", "25": "Geopolítica",
  "26": "Cultura", "27": "Educação", "28": "Tecnologia", "29": "Entretenimento",
};

const subredditCategoryMap: Record<string, string> = {
  politics: "Geopolítica", worldnews: "Geopolítica", news: "Geopolítica", uspolitics: "Geopolítica",
  technology: "Tecnologia", programming: "Tecnologia", android: "Tecnologia", apple: "Tecnologia",
  science: "Ciência", askscience: "Ciência", space: "Ciência",
  sports: "Esportes", soccer: "Esportes", nba: "Esportes", nfl: "Esportes", formula1: "Esportes",
  movies: "Entretenimento", music: "Entretenimento", television: "Entretenimento", gaming: "Entretenimento",
  art: "Cultura", books: "Cultura", history: "Cultura",
  economics: "Economia", finance: "Economia", wallstreetbets: "Economia", investing: "Economia",
  education: "Educação",
  environment: "Meio Ambiente", climate: "Meio Ambiente",
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

  // Priority 3: Keyword analysis on title
  const searchText = `${title} ${existingCategory || ""}`.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return category;
    }
  }

  // Priority 4: Category alias mapping
  if (existingCategory) {
    const alias = categoryAliasMap[existingCategory.toLowerCase().trim()];
    if (alias) return alias;
    // Also check legacy → canonical
    const canonical = LEGACY_TO_CANONICAL[existingCategory];
    if (canonical) return canonical;
  }

  // Priority 5: If existing category already matches canonical, keep it
  const canonicalCategories = new Set([...Object.keys(categoryKeywords), "Geral"]);
  if (existingCategory && canonicalCategories.has(existingCategory)) {
    return existingCategory;
  }

  // Priority 6: Platform-based defaults
  if (["World Bank", "IBGE", "IMF", "FRED", "FMI (IMF)"].includes(platform)) return "Economia";
  if (["OpenAlex", "arXiv", "Crossref", "Semantic Scholar"].includes(platform)) return "Ciência";
  if (["PubMed", "OMS (WHO)"].includes(platform)) return "Saúde";
  if (platform === "NOAA") return "Meio Ambiente";
  if (["GDELT", "ACLED", "GDELT DOC"].includes(platform)) return "Geopolítica";
  if (platform === "Wikipedia") return "Cultura";
  if (platform === "Lobsters") return "Tecnologia";

  return existingCategory ? canonicalizeCategory(existingCategory) : "Geral";
}

// ---- Country detection from content + platform ----

const sourceCountryMap: Record<string, string> = {
  "The Guardian": "GB", "BBC": "GB", "BBC News": "GB", "BBC Brasil": "BR",
  "Reuters": "GL", "AP News": "US", "Associated Press": "US",
  "IBGE": "BR", "G1": "BR", "Folha de S.Paulo": "BR", "O Globo": "BR",
  "Estadão": "BR", "El País Brasil": "BR", "DW Brasil": "BR",
  "Telesur": "VE", "El Universal VE": "VE", "EFE News": "ES",
  "Prensa Latina": "CU", "France 24 ES": "FR", "DW Español": "DE",
  "Clarín": "AR", "La Nación": "AR", "El Universal MX": "MX",
  "El Tiempo": "CO", "El Comercio": "PE", "El País": "ES",
  "Le Monde": "FR", "Le Figaro": "FR", "France 24": "FR",
  "Der Spiegel": "DE", "Deutsche Welle": "DE",
  "La Repubblica": "IT", "Corriere della Sera": "IT", "El Mundo": "ES",
  "Público": "PT", "Expresso": "PT",
  "Haaretz": "IL", "The Jerusalem Post": "IL", "Ahram Online": "EG",
  "Al Jazeera": "QA", "NHK": "JP", "The Japan Times": "JP",
  "South China Morning Post": "CN", "Times of India": "IN", "The Hindu": "IN",
  "Korea Herald": "KR", "The Straits Times": "SG", "The Jakarta Post": "ID",
  "News24": "ZA", "Premium Times": "NG", "Daily Nation": "KE",
  "World Bank": "GL", "OpenAlex": "GL", "IMF": "GL",
  "FRED": "US", "NOAA": "US", "GDELT": "GL",
  "arXiv": "GL", "PubMed": "GL", "Crossref": "GL",
  "Wikipedia": "GL", "New York Times": "US", "NPR": "US",
  "TechCrunch": "US", "The Verge": "US", "Wired": "US",
  "Ars Technica": "US", "Forbes": "US", "Business Insider": "US",
  "ESPN": "US", "Variety": "US", "Hollywood Reporter": "US",
  "Sky Sports": "GB", "The Telegraph": "GB", "The Independent": "GB",
  "NL Times": "NL", "Nature": "GB", "ScienceDaily": "US",
  "Engadget": "US", "El Mercurio": "CL",
  "Google News": "GL", "Reddit": "GL",
  "Semantic Scholar": "GL", "OMS (WHO)": "GL", "FMI (IMF)": "GL",
  "Lobsters": "US", "ACLED": "GL", "GDELT DOC": "GL",
  "Carta Capital": "BR", "UOL": "BR",
  "Tagesschau": "DE", "Ukrinform": "UA",
  "Morocco World News": "MA", "Daily News Egypt": "EG", "Egypt Independent": "EG",
  "Greek Reporter": "GR", "Russia Beyond": "RU", "TASS": "RU",
  "Kyiv Post": "UA", "La Stampa": "IT", "Hindustan Times": "IN",
  "ABC News AU": "AU",
};

const countryKeywordsMap: Record<string, string[]> = {
  BR: ["brasil", "brasileiro", "brasileira", "rio de janeiro", "são paulo", "brasília", "governo federal", "lula", "bolsonaro", "real", "reais", "ibovespa", "petrobras", "stf", "senado federal", "câmara dos deputados", "folha", "estadão", "globo", "curitiba", "belo horizonte", "salvador", "recife", "fortaleza", "manaus", "bbb", "big brother brasil", "paredão", "sincerão", "rede globo", "globoplay", "carnaval", "sertanejo", "axé", "funk brasileiro", "samba", "pagode", "novela da globo", "fantástico", "jornal nacional"],
  US: ["usa", "united states", "estados unidos", "biden", "trump", "white house", "casa branca", "washington", "new york", "wall street", "pentagon", "congress", "silicon valley", "california", "texas", "florida", "los angeles", "chicago", "boston", "seattle", "san francisco", "atlanta", "denver", "nba", "nfl", "mlb", "cia", "fbi", "supreme court", "oval office", "fed ", "federal reserve"],
  GB: ["uk", "united kingdom", "reino unido", "britain", "british", "london", "londres", "king charles", "parliament", "downing street", "bbc", "premier league", "manchester", "liverpool", "scotland", "wales", "northern ireland", "nhs", "westminster"],
  FR: ["france", "frança", "paris", "macron", "élysée", "ligue 1", "lyon", "marseille", "toulouse", "assemblée nationale"],
  DE: ["germany", "alemanha", "berlin", "berlim", "scholz", "bundesliga", "bundestag", "munich", "münchen", "frankfurt", "hamburg"],
  ES: ["spain", "espanha", "madrid", "barcelona", "la liga", "sánchez", "sevilla", "valencia", "cataluña", "catalunha"],
  IT: ["italy", "itália", "roma", "milan", "serie a", "meloni", "napoli", "torino", "venezia", "firenze", "parlamento italiano"],
  PT: ["portugal", "lisboa", "porto", "portuguesa", "algarve", "coimbra"],
  AR: ["argentina", "buenos aires", "milei", "peso argentino", "córdoba", "rosario", "mendoza"],
  CO: ["colombia", "colômbia", "bogotá", "medellín", "cali", "petro"],
  MX: ["mexico", "méxico", "ciudad de méxico", "guadalajara", "monterrey", "amlo", "pemex"],
  JP: ["japan", "japão", "tokyo", "tóquio", "yen", "osaka", "kyoto", "nintendo", "sony"],
  KR: ["south korea", "coreia do sul", "seoul", "seul", "k-pop", "samsung", "hyundai", "busan"],
  CN: ["china", "beijing", "pequim", "shanghai", "xi jinping", "yuan", "guangzhou", "shenzhen", "huawei", "tencent"],
  IN: ["india", "índia", "modi", "mumbai", "delhi", "bollywood", "rupee", "bangalore", "kolkata", "chennai"],
  AU: ["australia", "austrália", "australian", "sydney", "melbourne", "canberra", "queensland", "victoria", "new south wales"],
  CL: ["chile", "chileno", "chilena", "santiago", "valparaíso", "boric"],
  NZ: ["new zealand", "nova zelândia", "auckland", "wellington"],
  CA: ["canada", "canadá", "ottawa", "toronto", "trudeau", "vancouver", "montreal", "quebec"],
  RU: ["russia", "rússia", "moscow", "moscou", "putin", "kremlin", "saint petersburg", "são petersburgo"],
  UA: ["ukraine", "ucrânia", "kiev", "kyiv", "zelensky", "odessa", "kharkiv", "crimea", "crimeia"],
  IL: ["israel", "tel aviv", "jerusalem", "jerusalém", "netanyahu", "knesset", "idf"],
  PS: ["palestina", "palestine", "palestinian", "palestino", "palestinos", "gaza", "cisjordânia", "west bank", "ramallah", "faixa de gaza", "hamas", "fatah", "al-quds", "nablus", "hebron"],
  IR: ["iran", "irã", "tehran", "teerã", "khamenei", "raisi"],
  IQ: ["iraq", "iraque", "baghdad", "bagdá"],
  EG: ["egypt", "egito", "cairo", "suez"],
  NG: ["nigeria", "nigéria", "lagos", "abuja"],
  ZA: ["south africa", "áfrica do sul", "johannesburg", "cape town"],
  SA: ["saudi", "saudita", "riyadh"],
  TR: ["turkey", "turquia", "istanbul", "istambul", "erdogan", "ankara"],
  VE: ["venezuela", "caracas", "maduro"],
  PL: ["poland", "polônia", "warsaw", "varsóvia"],
  NL: ["netherlands", "holanda", "amsterdam", "rotterdam"],
  SE: ["sweden", "suécia", "stockholm", "estocolmo"],
  NO: ["norway", "noruega", "oslo"],
};

export function detectCountryFromContent(title: string, platform: string, description?: string, existingCode?: string): string | undefined {
  const text = `${title} ${description || ""}`.toLowerCase();
  for (const [code, keywords] of Object.entries(countryKeywordsMap)) {
    if (keywords.some(kw => text.includes(kw))) return code;
  }
  const mapped = sourceCountryMap[platform];
  if (mapped && mapped !== "GL") return mapped;
  if (existingCode) {
    const cleaned = existingCode.toUpperCase().replace(/[^A-Z]/g, "");
    if (cleaned.length === 2 && cleaned !== "GL") return cleaned;
  }
  return undefined;
}

export function countryCodeToFlag(code?: string): string | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  if (upper === "GL") return "🌐";
  return String.fromCodePoint(...[...upper].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

export function formatVolume(volume: string): string {
  if (!volume) return "";
  const num = parseInt(volume, 10);
  if (isNaN(num)) return volume;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
}

/**
 * Unified trend categorization using multilingual keyword matching.
 * Returns a standardized category that matches the filter options.
 * 
 * ⚠️ CRITICAL: categoryKeywords order matters! More specific categories
 * (Entretenimento, Esportes) MUST come BEFORE generic ones (Política)
 * to prevent false positives like "BBB eliminação com 55% dos votos" → Política.
 */

// Map common source categories (English) to standard categories
const categoryAliasMap: Record<string, string> = {
  "politics": "Política", "political": "Política", "us news": "Política", "uk news": "Política",
  "world news": "Política", "us politics": "Política", "uk politics": "Política", "world": "Política",
  "policy": "Política", "law": "Política", "diplomacy": "Política", "defense": "Política",
  "news": "Geral", "notícias": "Geral", "noticias": "Geral",
  "global development": "Política", "international": "Política", "foreign affairs": "Política",
  "government": "Política", "congress": "Política", "senate": "Política",
  "national security": "Política", "homeland": "Política", "geopolitics": "Política",
  "elections": "Política", "voting": "Política", "legislation": "Política",
  "australia news": "Geral", "europe": "Geral", "asia pacific": "Geral",
  "americas": "Geral", "middle east": "Geral", "africa": "Geral",
  "global": "Geral", "breaking news": "Geral", "top stories": "Geral",
  "headlines": "Geral", "latest": "Geral", "general": "Geral",
  "technology": "Tecnologia", "tech": "Tecnologia", "digital": "Tecnologia",
  "computing": "Tecnologia", "artificial intelligence": "Tecnologia", "cybersecurity": "Tecnologia",
  "science": "Ciência", "environment": "Clima/Meio Ambiente", "climate": "Clima/Meio Ambiente",
  "climate crisis": "Clima/Meio Ambiente", "green": "Clima/Meio Ambiente", "sustainability": "Clima/Meio Ambiente",
  "sport": "Esportes", "sports": "Esportes", "football": "Esportes", "soccer": "Esportes",
  "cricket": "Esportes", "rugby": "Esportes", "tennis": "Esportes", "f1": "Esportes",
  "culture": "Cultura", "arts": "Cultura", "books": "Cultura", "stage": "Cultura",
  "lifestyle": "Cultura", "fashion": "Cultura", "food": "Cultura", "travel": "Cultura",
  "film": "Entretenimento", "movies": "Entretenimento", "music": "Entretenimento", "tv": "Entretenimento",
  "media": "Entretenimento", "television": "Entretenimento", "entertainment": "Entretenimento",
  "games": "Entretenimento", "gaming": "Entretenimento", "celebrities": "Entretenimento",
  "business": "Negócios/Finanças", "economy": "Negócios/Finanças", "finance": "Negócios/Finanças", "money": "Negócios/Finanças",
  "markets": "Negócios/Finanças", "stocks": "Negócios/Finanças", "banking": "Negócios/Finanças",
  "health": "Saúde", "wellbeing": "Saúde", "mental health": "Saúde", "medicine": "Saúde",
  "society": "Cultura", "education": "Cultura",
  "opinion": "Geral", "editorial": "Geral", "analysis": "Geral",
  "comment": "Geral", "debate": "Geral", "investigation": "Geral",
  "trending": "Geral", "social": "Geral", "fediverso": "Geral",
  "miscellaneous": "Geral", "other": "Geral", "uncategorized": "Geral",
};

// ⚠️ ORDER MATTERS: Entretenimento/Esportes BEFORE Política
const categoryKeywords: Record<string, string[]> = {
  Entretenimento: [
    // Reality shows & TV — must match BEFORE "voto"/"eliminação" trigger Política
    "bbb", "big brother", "big brother brasil", "reality show", "reality tv", "paredão", "sincerão",
    "eliminado do bbb", "participante", "confinamento", "casa de vidro", "prova do líder", "prova do anjo",
    "masterchef", "the voice", "a fazenda", "ilha da tentação", "survivor", "bachelor", "bachelorette", "love island",
    "rupaul", "drag race", "american idol", "x factor", "got talent", "the masked",
    "k-drama", "kdrama", "doramas", "telenovela", "streaming", "hbo", "prime video",
    "globoplay", "paramount", "crunchyroll", "tiktoker", "influencer", "youtuber",
    // General entertainment
    "filme", "série", "música", "cinema", "ator", "atriz", "novela", "show", "celebridade", "estrela",
    "movie", "music", "entertainment", "actor", "actress", "celebrity", "film", "star", "trailer", "album", "song", "concert", "award", "oscar", "grammy", "netflix", "disney", "anime", "manga",
    "película", "cine", "música",
    "film", "musique", "divertissement",
    "unterhaltung", "musik", "schauspieler",
    "娱乐", "映画", "엔터테인먼트", "ترفيه", "मनोरंजन", "развлечения",
  ],
  Esportes: [
    "futebol", "copa", "campeonato", "gol", "seleção", "time", "liga", "olimpíada", "esporte",
    "sports", "game", "match", "football", "soccer", "basketball", "tennis", "nba", "nfl", "fifa", "championship", "league", "world cup", "olympic", "goal", "player", "team", "score",
    "champions league", "bundesliga", "premier league", "la liga", "serie a", "ligue 1", "taekwondo", "cricket", "rugby",
    "borussia", "atalanta", "barcelona", "real madrid", "manchester", "liverpool", "arsenal", "chelsea", "juventus",
    "deporte", "fútbol", "partido",
    "sport", "fußball", "spiel",
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
    "ciencia", "investigación",
    "wissenschaft", "forschung", "studie",
    "科学", "科學", "과학", "علوم", "विज्ञान", "наука",
  ],
  Saúde: [
    "saúde", "doença", "epidemia", "pandemia", "hospital", "médico", "vacina", "oms", "surto",
    "health", "disease", "epidemic", "pandemic", "hospital", "doctor", "vaccine", "who", "outbreak", "medical", "clinical", "pubmed", "patient", "therapy", "drug",
    "salud", "santé", "gesundheit",
    "健康", "건강", "صحة", "स्वास्थ्य", "здоровье",
  ],
  "Negócios/Finanças": [
    "bolsa", "mercado", "economia", "inflação", "dólar", "real", "ações", "investimento", "pib", "banco", "imposto", "renda", "tributário", "fiscal",
    "desocupação", "desemprego", "emprego", "trabalho", "salário", "aposentadoria", "previdência", "orçamento",
    "market", "economy", "business", "finance", "stock", "wall street", "inflation", "gdp", "investment", "bank", "trade", "tariff", "dollar", "euro", "revenue", "profit", "capital gains", "tax", "budget", "treasury", "unemployment", "jobs", "wages",
    "mercado", "economía", "negocio",
    "marché", "économie", "affaire",
    "wirtschaft", "markt", "geschäft",
    "经济", "経済", "경제", "اقتصاد", "अर्थव्यवस्था", "экономика",
  ],
  "Clima/Meio Ambiente": [
    "clima", "aquecimento", "desmatamento", "queimada", "inundação", "furacão", "tempestade", "seca", "poluição", "emissões",
    "climate", "warming", "deforestation", "wildfire", "flood", "hurricane", "storm", "drought", "pollution", "emissions", "weather", "noaa", "tornado", "blizzard",
    "environnement", "klima", "umwelt",
    "气候", "環境", "기후", "مناخ", "जलवायु", "климат",
  ],
  "Conflitos/Crises": [
    "conflito", "guerra", "protesto", "crise", "refugiado", "sanção", "ataque", "bombardeio",
    "conflict", "war", "protest", "crisis", "refugee", "sanction", "attack", "bombing", "gdelt", "acled", "violence", "militant",
    "conflit", "krieg", "konflikt",
    "冲突", "紛争", "분쟁", "صراع", "संघर्ष", "конфликт",
  ],
  Cultura: [
    "arte", "exposição", "museu", "cultura", "literatura", "livro", "teatro", "dança",
    "art", "culture", "exhibition", "museum", "literature", "book", "theater", "dance", "heritage", "festival",
    "cultura", "arte", "exposición",
    "kunst", "ausstellung", "museum",
    "文化", "芸術", "문화", "ثقافة", "संस्कृति", "культура",
  ],
  // ⚠️ Política LAST — to avoid false positives with "voto", "eliminação" in entertainment
  Política: [
    "eleição", "eleitoral", "governo", "presidente", "congresso", "senado", "deputado", "voto", "partido", "ministro", "prefeito", "governador", "câmara", "plenário",
    "election", "government", "president", "congress", "senate", "parliament", "minister", "political", "politics", "democrat", "republican", "byelection", "campaign",
    "policy", "legislation", "lawmaker", "diplomat", "sanctions", "nuclear talks", "state of the union", "oversight", "committee", "deposition", "impeach",
    "trump", "biden", "obama", "clinton", "starmer", "sunak", "macron", "putin", "zelensky", "xi jinping", "modi",
    "pentagon", "nato", "eu summit", "un general assembly", "white house", "downing street", "capitol hill",
    "elección", "gobierno", "presidente",
    "élection", "gouvernement", "président",
    "wahl", "regierung", "präsident",
    "politica", "elezioni", "governo",
    "政治", "選挙", "정치", "سياسة", "राजनीति", "политика",
  ],
  Conhecimento: [
    "wikipedia", "enciclopédia", "artigo mais acessado", "pageviews",
    "encyclopedia", "most viewed", "trending article",
  ],
};

// YouTube category ID mapping
const youtubeCategoryMap: Record<string, string> = {
  "1": "Entretenimento", "2": "Entretenimento", "10": "Entretenimento",
  "15": "Entretenimento", "17": "Esportes", "18": "Entretenimento",
  "19": "Entretenimento", "20": "Entretenimento", "22": "Cultura",
  "23": "Entretenimento", "24": "Entretenimento", "25": "Política",
  "26": "Cultura", "27": "Cultura", "28": "Tecnologia", "29": "Entretenimento",
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

  // Priority 3: ALWAYS do keyword analysis on title FIRST — this catches
  // entertainment content that source categories would misclassify as "news"/"politics"
  const searchText = `${title} ${existingCategory || ""}`.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => searchText.includes(kw))) {
      return category;
    }
  }

  // Priority 4: Category alias mapping (e.g., "Politics" → "Política")
  // Moved AFTER keyword analysis so content-based detection wins
  if (existingCategory) {
    const alias = categoryAliasMap[existingCategory.toLowerCase().trim()];
    if (alias) return alias;
  }

  // Priority 5: If existing category already matches a standard one, keep it
  const standardCategories = Object.keys(categoryKeywords);
  if (existingCategory && standardCategories.includes(existingCategory)) {
    return existingCategory;
  }

  // Priority 6: Platform-based defaults
  if (["World Bank", "IBGE", "IMF", "FRED", "FMI (IMF)"].includes(platform)) return "Negócios/Finanças";
  if (["OpenAlex", "arXiv", "Crossref", "Semantic Scholar"].includes(platform)) return "Ciência";
  if (["PubMed", "OMS (WHO)"].includes(platform)) return "Saúde";
  if (platform === "NOAA") return "Clima/Meio Ambiente";
  if (["GDELT", "ACLED"].includes(platform)) return "Conflitos/Crises";
  if (platform === "Wikipedia") return "Conhecimento";
  if (platform === "Lobsters") return "Tecnologia";

  return existingCategory || "Geral";
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
};

const countryKeywordsMap: Record<string, string[]> = {
  BR: [
    "brasil", "brasileiro", "brasileira", "rio de janeiro", "são paulo", "brasília",
    "governo federal", "lula", "bolsonaro", "real", "reais", "ibovespa", "petrobras",
    "stf", "senado federal", "câmara dos deputados", "folha", "estadão", "globo",
    "curitiba", "belo horizonte", "salvador", "recife", "fortaleza", "manaus",
    // Brazilian entertainment & culture
    "bbb", "big brother brasil", "paredão", "sincerão", "rede globo", "globoplay",
    "carnaval", "sertanejo", "axé", "funk brasileiro", "samba", "pagode",
    "novela da globo", "fantástico", "jornal nacional",
  ],
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
  SA: ["saudi", "arábia saudita", "riyadh", "jeddah", "mecca", "meca"],
  AE: ["emirates", "emirados", "dubai", "abu dhabi"],
  EG: ["egypt", "egito", "cairo", "suez"],
  NG: ["nigeria", "nigéria", "lagos", "abuja"],
  ZA: ["south africa", "áfrica do sul", "cape town", "johannesburg", "pretoria"],
  TR: ["turkey", "turquia", "türkiye", "istanbul", "ankara", "erdogan"],
  PL: ["poland", "polônia", "warsaw", "varsóvia", "cracóvia", "krakow"],
  SE: ["sweden", "suécia", "stockholm", "estocolmo"],
  NO: ["norway", "noruega", "oslo"],
  VE: ["venezuela", "venezuelan", "venezuelano", "venezuelana", "caracas", "maduro", "guaidó", "guaido", "oposición venezolana", "oposição venezuelana", "pdvsa", "petróleo venezuela", "maracaibo", "mérida", "barquisimeto", "valencia venezuela", "chavismo", "chavista"],
  CU: ["cuba", "cubano", "cubana", "havana", "habana", "díaz-canel"],
  EC: ["ecuador", "equador", "quito", "guayaquil", "noboa"],
  UY: ["uruguay", "uruguai", "montevideo", "montevidéu"],
  PY: ["paraguay", "paraguai", "asunción", "assunção"],
  BO: ["bolivia", "bolívia", "la paz", "santa cruz bolivia"],
  CR: ["costa rica", "san josé costa"],
  PA: ["panama", "panamá", "canal de panamá"],
  GT: ["guatemala", "cidade da guatemala"],
  HN: ["honduras", "tegucigalpa"],
  SV: ["el salvador", "bukele", "san salvador"],
  NI: ["nicaragua", "nicarágua", "managua", "ortega nicaragua"],
  DO: ["república dominicana", "dominican republic", "santo domingo"],
  PE: ["peru", "lima", "peruvian", "peruano"],
  PH: ["philippines", "filipinas", "manila"],
  TH: ["thailand", "tailândia", "bangkok"],
  VN: ["vietnam", "vietnã", "hanoi"],
  ID: ["indonesia", "indonésia", "jakarta"],
  PK: ["pakistan", "paquistão", "islamabad", "karachi", "lahore"],
  KE: ["kenya", "quênia", "nairobi"],
  MA: ["morocco", "marrocos", "rabat", "casablanca"],
  ET: ["ethiopia", "etiópia", "addis ababa"],
  IR: ["iran", "irã", "tehran", "teerã", "khamenei", "iranian"],
  IQ: ["iraq", "iraque", "baghdad", "bagdá"],
  SY: ["syria", "síria", "damascus", "damasco"],
  LB: ["lebanon", "líbano", "beirut", "hezbollah"],
  JO: ["jordan", "jordânia", "amman"],
};

/**
 * Detect country code from trend content using multi-layer analysis:
 * 1. Content keyword analysis (HIGHEST priority — content always wins)
 * 2. Source-based (e.g., The Guardian → GB)
 * 3. Existing countryCode validation
 */
export function detectCountryFromContent(
  title: string,
  platform: string,
  description?: string,
  existingCode?: string
): string | undefined {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Layer 1: Content keyword analysis ALWAYS first — content overrides source
  for (const [code, keywords] of Object.entries(countryKeywordsMap)) {
    if (keywords.some(k => text.includes(k))) return code;
  }

  // Layer 2: Known source mapping (only if content didn't match)
  const sourceCountry = sourceCountryMap[platform];
  if (sourceCountry && sourceCountry !== "GL") {
    return sourceCountry;
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

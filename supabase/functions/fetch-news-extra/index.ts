import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrendItem {
  icon: string;
  platform: string;
  title: string;
  category: string;
  time: string;
  volume: string;
  change: string;
  changePositive: boolean;
  sparkData: number[];
  details?: string;
  description?: string;
  countryCode?: string;
  sourceUrl?: string;
  thumbnail?: string;
  publishedAt?: string;
  trustBadge?: string;
  historicalData?: { hour: string; value: number }[];
  metricLabel?: string;
}

function generateHistorical(baseValue: number, label: string) {
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

function sparkRandom() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 70 + 30));
}

// Lang-aware caches
let cachedResponses: Record<string, { data: string; timestamp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000;
const langToGNewsLang: Record<string, string> = { pt: "pt", en: "en", es: "es", fr: "fr", de: "de", it: "it", ar: "ar", ru: "ru", zh: "zh", ja: "ja", ko: "ko", hi: "hi" };

// ── NewsData ──
async function fetchNewsData(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("NEWSDATA_API_KEY");
  if (!key) { console.log("NEWSDATA_API_KEY not set"); return []; }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://newsdata.io/api/1/latest?apikey=${key}&language=${lang},en&size=12`, { signal: controller.signal });
    if (res.status === 429) { console.warn("NewsData quota exceeded (429)"); return []; }
    if (!res.ok) { console.error("NewsData error:", res.status); return []; }
    const data = await res.json();
    return (data.results || []).map((a: any) => {
      const src = a.source_name || a.source_id || "NewsData";
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 15 + 5), "artigos");
      return {
        icon: "📰", platform: "NewsData", title: a.title || "Sem título",
        category: (a.category || ["Notícias"])[0] || "Notícias", time: "agora",
        volume: src, change: "+novo", changePositive: true, sparkData: sparkRandom(),
        details: a.description?.slice(0, 200) || "", description: a.description?.slice(0, 150) || "",
        sourceUrl: a.link || "", thumbnail: a.image_url || "", publishedAt: a.pubDate || "",
        countryCode: (a.country || ["US"])[0]?.toUpperCase() || "US",
        historicalData, metricLabel, trustBadge: "international",
      };
    });
  } catch (e) { console.error("NewsData fetch error:", e); return []; }
}

// ── GNews ──
async function fetchGNews(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("GNEWS_API_KEY");
  if (!key) { console.log("GNEWS_API_KEY not set"); return []; }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const gnewsLang = langToGNewsLang[lang] || "pt";
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?lang=${gnewsLang}&max=12&apikey=${key}`, { signal: controller.signal });
    if (res.status === 429) { console.warn("GNews quota exceeded (429)"); return []; }
    if (!res.ok) {
      const res2 = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&max=12&apikey=${key}`);
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return mapGNewsArticles(data2.articles || []);
    }
    const data = await res.json();
    return mapGNewsArticles(data.articles || []);
  } catch (e) { console.error("GNews fetch error:", e); return []; }
}

function mapGNewsArticles(articles: any[]): TrendItem[] {
  return articles.map((a: any) => {
    const src = a.source?.name || "GNews";
    const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 12 + 3), "artigos");
    return {
      icon: "🗞️", platform: "GNews", title: a.title || "Sem título",
      category: "Notícias", time: "agora", volume: src, change: "+novo", changePositive: true,
      sparkData: sparkRandom(), details: a.description?.slice(0, 200) || "",
      description: a.description?.slice(0, 150) || "", sourceUrl: a.url || "",
      thumbnail: a.image || "", publishedAt: a.publishedAt || "", countryCode: "BR",
      historicalData, metricLabel, trustBadge: "international",
    };
  });
}

// ── Bing News ──
async function fetchBingNews(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("BING_NEWS_API_KEY");
  if (!key) { console.log("BING_NEWS_API_KEY not set"); return []; }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const mkt = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "de" ? "de-DE" : lang === "it" ? "it-IT" : lang === "ja" ? "ja-JP" : lang === "ko" ? "ko-KR" : "en-US";
    const res = await fetch(`https://api.bing.microsoft.com/v7.0/news/trendingtopics?mkt=${mkt}&count=12`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      signal: controller.signal,
    });
    if (res.status === 429) { console.warn("Bing quota exceeded (429)"); return []; }
    if (!res.ok) {
      const res2 = await fetch("https://api.bing.microsoft.com/v7.0/news?mkt=en-US&count=12", {
        headers: { "Ocp-Apim-Subscription-Key": key },
      });
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return (data2.value || []).map((a: any) => {
        const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 10 + 5), "menções");
        return {
          icon: "🔎", platform: "Bing News", title: a.name || "Sem título",
          category: a.category || "Notícias", time: "agora",
          volume: a.provider?.[0]?.name || "Bing", change: "+novo", changePositive: true,
          sparkData: sparkRandom(), details: a.description?.slice(0, 200) || "",
          sourceUrl: a.url || "", countryCode: "US", historicalData, metricLabel, trustBadge: "international",
        };
      });
    }
    const data = await res.json();
    return (data.value || []).map((topic: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 10), "buscas");
      return {
        icon: "🔎", platform: "Bing News", title: topic.name || topic.query?.text || "Sem título",
        category: "Trending", time: "agora", volume: topic.image?.url ? "com imagem" : "trending",
        change: "+trending", changePositive: true, sparkData: sparkRandom(),
        details: topic.newsSearchUrl ? `Pesquisar: ${topic.name}` : "",
        sourceUrl: topic.webSearchUrl || topic.newsSearchUrl || "", countryCode: "BR",
        historicalData, metricLabel, trustBadge: "international",
      };
    });
  } catch (e) { console.error("Bing News fetch error:", e); return []; }
}

// ── New York Times (Top Stories + Article Search) ──
async function fetchNYTimes(lang = "pt"): Promise<TrendItem[]> {
  const key = Deno.env.get("NYT_API_KEY");
  if (!key) { console.log("NYT_API_KEY not set"); return []; }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    // Fetch Top Stories from multiple sections
    const sections = ["world", "technology", "science", "business", "health"];
    const sectionToCategory: Record<string, string> = {
      world: "Política", technology: "Tecnologia", science: "Ciência",
      business: "Negócios/Finanças", health: "Saúde",
    };

    const results: TrendItem[] = [];

    // Top Stories - pick 2 from each section
    for (const section of sections) {
      try {
        const res = await fetch(
          `https://api.nytimes.com/svc/topstories/v2/${section}.json?api-key=${key}`,
          { signal: controller.signal }
        );
        if (res.status === 429) { console.warn("NYT quota exceeded"); break; }
        if (!res.ok) continue;
        const data = await res.json();
        const articles = (data.results || []).slice(0, 2);
        for (const a of articles) {
          const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 25 + 10), "leituras");
          const multimedia = a.multimedia?.find((m: any) => m.format === "Large Thumbnail" || m.format === "threeByTwoSmallAt2X");
          results.push({
            icon: "🗽", platform: "New York Times", title: a.title || "Sem título",
            category: sectionToCategory[section] || "Notícias", time: "agora",
            volume: "NYT " + (section.charAt(0).toUpperCase() + section.slice(1)),
            change: "+novo", changePositive: true, sparkData: sparkRandom(),
            details: a.abstract?.slice(0, 200) || "", description: a.abstract?.slice(0, 150) || "",
            sourceUrl: a.url || "", thumbnail: multimedia?.url || "",
            publishedAt: a.published_date || "", countryCode: "US",
            historicalData, metricLabel, trustBadge: "verified",
          });
        }
      } catch { /* skip section */ }
    }

    console.log(`📰 NYT retornou: ${results.length} itens`);
    return results.slice(0, 12);
  } catch (e) { console.error("NYT fetch error:", e); return []; }
}

// ── NPR (RSS feed - no API key needed) ──
async function fetchNPR(): Promise<TrendItem[]> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    // NPR provides RSS feeds for news
    const feeds = [
      { url: "https://feeds.npr.org/1001/rss.xml", category: "Notícias", name: "News" },
      { url: "https://feeds.npr.org/1019/rss.xml", category: "Tecnologia", name: "Technology" },
      { url: "https://feeds.npr.org/1007/rss.xml", category: "Ciência", name: "Science" },
      { url: "https://feeds.npr.org/1006/rss.xml", category: "Saúde", name: "Health" },
    ];

    const results: TrendItem[] = [];

    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalTalkTrend/1.0)" },
        });
        if (!res.ok) continue;
        const xml = await res.text();

        // Parse RSS items
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        let count = 0;
        while ((match = itemRegex.exec(xml)) !== null && count < 3) {
          const block = match[1];
          const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
            || block.match(/<title>(.*?)<\/title>/)?.[1] || "";
          const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]>/)?.[1]
            || block.match(/<description>(.*?)<\/description>/)?.[1] || "";
          const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
          const mediaUrl = block.match(/<media:content[^>]*url="([^"]+)"/)?.[1]
            || block.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] || "";

          if (!title) continue;

          const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 15 + 5), "ouvintes");
          results.push({
            icon: "🎙️", platform: "NPR", title: title.replace(/<[^>]*>/g, ""),
            category: feed.category, time: "agora", volume: `NPR ${feed.name}`,
            change: "+novo", changePositive: true, sparkData: sparkRandom(),
            details: desc.replace(/<[^>]*>/g, "").slice(0, 200),
            description: desc.replace(/<[^>]*>/g, "").slice(0, 150),
            sourceUrl: link, thumbnail: mediaUrl, publishedAt: pubDate, countryCode: "US",
            historicalData, metricLabel, trustBadge: "verified",
          });
          count++;
        }
      } catch { /* skip feed */ }
    }

    console.log(`🎙️ NPR retornou: ${results.length} itens`);
    return results;
  } catch (e) { console.error("NPR fetch error:", e); return []; }
}

// ── RSS Feeds – Global sources organized by region ──
const RSS_FEEDS = [
  // ── AMÉRICA LATINA ──
  { url: "https://feeds.folha.uol.com.br/emcimadahora/rss.xml", name: "Folha de S.Paulo", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://oglobo.globo.com/rss.xml", name: "O Globo", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://www.estadao.com.br/feed", name: "Estadão", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://g1.globo.com/rss/g1", name: "G1", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://www.clarin.com/rss/lo-ultimo/", name: "Clarín", icon: "🇦🇷", country: "AR", category: "Notícias" },
  { url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/", name: "La Nación", icon: "🇦🇷", country: "AR", category: "Notícias" },
  { url: "https://www.eluniversal.com.mx/arc/outboundfeeds/rss/", name: "El Universal MX", icon: "🇲🇽", country: "MX", category: "Notícias" },
  { url: "https://www.eltiempo.com/rss.xml", name: "El Tiempo", icon: "🇨🇴", country: "CO", category: "Notícias" },
  { url: "https://elcomercio.pe/feed", name: "El Comercio", icon: "🇵🇪", country: "PE", category: "Notícias" },
  // Chile
  { url: "https://www.elmercurio.com/Home/FeedRss", name: "El Mercurio", icon: "🇨🇱", country: "CL", category: "Notícias" },
  // Venezuela
  { url: "https://www.telesurtv.net/news/feed", name: "Telesur", icon: "🇻🇪", country: "VE", category: "Notícias" },
  { url: "https://www.eluniversal.com/venezuela/feed", name: "El Universal VE", icon: "🇻🇪", country: "VE", category: "Notícias" },
  { url: "https://efe.com/feed", name: "EFE News", icon: "🌐", country: "ES", category: "Notícias" },
  { url: "https://www.prensa-latina.cu/feed", name: "Prensa Latina", icon: "🇨🇺", country: "CU", category: "Notícias" },
  // Cobertura internacional em espanhol
  { url: "https://www.france24.com/es/rss", name: "France 24 ES", icon: "🇫🇷", country: "FR", category: "Notícias" },
  { url: "https://rss.dw.com/rdf/rss-es-all", name: "DW Español", icon: "🇩🇪", country: "DE", category: "Notícias" },

  // ── EUROPA ──
  { url: "http://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", icon: "🇬🇧", country: "GB", category: "Notícias" },
  { url: "http://feeds.bbci.co.uk/portuguese/rss.xml", name: "BBC Brasil", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "http://feeds.bbci.co.uk/news/technology/rss.xml", name: "BBC News", icon: "🇬🇧", country: "GB", category: "Tecnologia" },
  { url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", name: "BBC News", icon: "🇬🇧", country: "GB", category: "Ciência" },
  { url: "https://www.telegraph.co.uk/rss.xml", name: "The Telegraph", icon: "🇬🇧", country: "GB", category: "Notícias" },
  { url: "https://www.independent.co.uk/rss", name: "The Independent", icon: "🇬🇧", country: "GB", category: "Notícias" },
  { url: "https://rss.dw.com/rdf/rss-en-world", name: "Deutsche Welle", icon: "🇩🇪", country: "DE", category: "Notícias" },
  { url: "https://rss.dw.com/rdf/rss-pt-br", name: "DW Brasil", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://www.spiegel.de/international/index.rss", name: "Der Spiegel", icon: "🇩🇪", country: "DE", category: "Notícias" },
  { url: "https://www.lemonde.fr/rss/une.xml", name: "Le Monde", icon: "🇫🇷", country: "FR", category: "Notícias" },
  { url: "https://www.lefigaro.fr/rss/figaro_actualites.xml", name: "Le Figaro", icon: "🇫🇷", country: "FR", category: "Notícias" },
  { url: "https://www.france24.com/fr/rss", name: "France 24", icon: "🇫🇷", country: "FR", category: "Notícias" },
  { url: "https://www.repubblica.it/rss", name: "La Repubblica", icon: "🇮🇹", country: "IT", category: "Notícias" },
  { url: "https://xml2.corrieredellasera.it/rss/homepage.xml", name: "Corriere della Sera", icon: "🇮🇹", country: "IT", category: "Notícias" },
  { url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", name: "El País", icon: "🇪🇸", country: "ES", category: "Notícias" },
  { url: "https://feeds.elpais.com/mrss-s/pages/ep/site/brasil.elpais.com/portada", name: "El País Brasil", icon: "🇧🇷", country: "BR", category: "Notícias" },
  { url: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", name: "El Mundo", icon: "🇪🇸", country: "ES", category: "Notícias" },
  { url: "https://feeds.feedburner.com/PublicoRSS", name: "Público", icon: "🇵🇹", country: "PT", category: "Notícias" },
  { url: "https://expresso.pt/feed", name: "Expresso", icon: "🇵🇹", country: "PT", category: "Notícias" },
  { url: "https://nltimes.nl/feed", name: "NL Times", icon: "🇳🇱", country: "NL", category: "Notícias" },

  // ── ÁSIA ──
  { url: "https://www3.nhk.or.jp/rss/news/cat0.xml", name: "NHK", icon: "🇯🇵", country: "JP", category: "Notícias" },
  { url: "https://www.japantimes.co.jp/feed", name: "The Japan Times", icon: "🇯🇵", country: "JP", category: "Notícias" },
  { url: "https://www.scmp.com/rss/4/feed", name: "South China Morning Post", icon: "🇨🇳", country: "CN", category: "Notícias" },
  { url: "http://www.xinhuanet.com/english/rss/worldrss.xml", name: "Xinhua", icon: "🇨🇳", country: "CN", category: "Notícias" },
  { url: "https://www.chinadaily.com.cn/rss/world_rss.xml", name: "China Daily", icon: "🇨🇳", country: "CN", category: "Notícias" },
  { url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", name: "Times of India", icon: "🇮🇳", country: "IN", category: "Notícias" },
  { url: "https://www.thehindu.com/feeder/default.rss", name: "The Hindu", icon: "🇮🇳", country: "IN", category: "Notícias" },
  { url: "https://www.ndtv.com/rss/top-stories", name: "NDTV", icon: "🇮🇳", country: "IN", category: "Notícias" },
  { url: "http://www.koreaherald.com/rss_xml.php", name: "Korea Herald", icon: "🇰🇷", country: "KR", category: "Notícias" },
  { url: "https://www.straitstimes.com/news/asia/rss.xml", name: "The Straits Times", icon: "🇸🇬", country: "SG", category: "Notícias" },
  { url: "https://www.thejakartapost.com/rss", name: "The Jakarta Post", icon: "🇮🇩", country: "ID", category: "Notícias" },

  // ── RÚSSIA / EURÁSIA ──
  { url: "https://tass.com/rss/v2.xml", name: "TASS", icon: "🇷🇺", country: "RU", category: "Notícias" },
  { url: "https://www.rt.com/rss/news/", name: "RT", icon: "🇷🇺", country: "RU", category: "Notícias" },
  { url: "https://www.themoscowtimes.com/rss/news", name: "Moscow Times", icon: "🇷🇺", country: "RU", category: "Notícias" },
  { url: "https://www.rbth.com/rss", name: "Russia Beyond", icon: "🇷🇺", country: "RU", category: "Notícias" },

  // ── ORIENTE MÉDIO & ÁFRICA ──
  { url: "https://www.haaretz.com/cmlink/haaretz-en-rss-1.0", name: "Haaretz", icon: "🇮🇱", country: "IL", category: "Notícias" },
  { url: "https://www.jpost.com/Rss/RssFeedsHeadlines.aspx", name: "The Jerusalem Post", icon: "🇮🇱", country: "IL", category: "Notícias" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", icon: "🇶🇦", country: "QA", category: "Notícias" },
  { url: "http://english.ahram.org.eg/rss.aspx", name: "Ahram Online", icon: "🇪🇬", country: "EG", category: "Notícias" },
  { url: "https://www.news24.com/rss", name: "News24", icon: "🇿🇦", country: "ZA", category: "Notícias" },
  { url: "https://www.premiumtimesng.com/feed", name: "Premium Times", icon: "🇳🇬", country: "NG", category: "Notícias" },
  { url: "https://www.nation.co.ke/feed", name: "Daily Nation", icon: "🇰🇪", country: "KE", category: "Notícias" },

  // ── AGREGADORES GLOBAIS ──
  { url: "https://feeds.reuters.com/reuters/worldnews", name: "Reuters", icon: "🌐", country: "US", category: "Política" },
  { url: "https://feeds.reuters.com/reuters/technologyNews", name: "Reuters", icon: "🌐", country: "US", category: "Tecnologia" },
  { url: "https://feeds.reuters.com/reuters/businessNews", name: "Reuters", icon: "🌐", country: "US", category: "Negócios/Finanças" },
  { url: "https://rss.app/feeds/v1.1/ap-top-news.rss", name: "AP News", icon: "🇺🇸", country: "US", category: "Notícias" },

  // ── ESPECIALIZADAS: TECNOLOGIA ──
  { url: "https://techcrunch.com/feed", name: "TechCrunch", icon: "💻", country: "US", category: "Tecnologia" },
  { url: "https://www.theverge.com/rss/index.xml", name: "The Verge", icon: "💻", country: "US", category: "Tecnologia" },
  { url: "https://www.wired.com/feed/rss", name: "Wired", icon: "💻", country: "US", category: "Tecnologia" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", icon: "💻", country: "US", category: "Tecnologia" },
  { url: "https://www.engadget.com/rss.xml", name: "Engadget", icon: "💻", country: "US", category: "Tecnologia" },

  // ── ESPECIALIZADAS: CIÊNCIA ──
  { url: "https://www.eurekalert.org/rss.xml", name: "EurekAlert!", icon: "🔬", country: "US", category: "Ciência" },
  { url: "https://www.sciencedaily.com/rss/all.xml", name: "ScienceDaily", icon: "🔬", country: "US", category: "Ciência" },
  { url: "https://www.nature.com/nature.rss", name: "Nature", icon: "🔬", country: "GB", category: "Ciência" },

  // ── ESPECIALIZADAS: NEGÓCIOS ──
  { url: "https://www.forbes.com/real-time/feed2/", name: "Forbes", icon: "💰", country: "US", category: "Negócios/Finanças" },
  { url: "https://www.businessinsider.com/rss", name: "Business Insider", icon: "💰", country: "US", category: "Negócios/Finanças" },

  // ── ESPECIALIZADAS: ESPORTES ──
  { url: "https://www.espn.com/espn/rss/news", name: "ESPN", icon: "⚽", country: "US", category: "Esportes" },
  { url: "https://www.skysports.com/rss/12040", name: "Sky Sports", icon: "⚽", country: "GB", category: "Esportes" },

  // ── ESPECIALIZADAS: ENTRETENIMENTO ──
  { url: "https://variety.com/feed/", name: "Variety", icon: "🎬", country: "US", category: "Entretenimento" },
  { url: "https://www.hollywoodreporter.com/feed/", name: "Hollywood Reporter", icon: "🎬", country: "US", category: "Entretenimento" },

  // ── AGREGADORES ──
  { url: "https://news.google.com/rss", name: "Google News", icon: "🌐", country: "GL", category: "Geral" },
  { url: "https://www.reddit.com/r/all/.rss", name: "Reddit", icon: "🟠", country: "GL", category: "Geral" },
];

function inferCategoryFromContent(title: string, feedCategory: string): string {
  const t = title.toLowerCase();
  if (/tech|digital|cyber|ai |artificial|software|hardware|app\b|startup/i.test(t)) return "Tecnologia";
  if (/scien|climat|environment|space|nasa|physics|biology/i.test(t)) return "Ciência";
  if (/econom|business|market|stock|trade|finance|bank|gdp|inflation/i.test(t)) return "Negócios/Finanças";
  if (/sport|football|soccer|olympic|nba|fifa|tennis/i.test(t)) return "Esportes";
  if (/health|covid|virus|vaccine|hospital|medical|disease/i.test(t)) return "Saúde";
  if (/politi|election|president|congress|senate|parliament|governo|trump|biden/i.test(t)) return "Política";
  if (/cultur|movie|film|music|art|book|museum|festival/i.test(t)) return "Entretenimento";
  return feedCategory;
}

async function fetchRSSFeeds(): Promise<TrendItem[]> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 15000);

  // Shuffle and pick up to 30 feeds per invocation to stay fast
  const shuffled = [...RSS_FEEDS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 30);

  const fetches = selected.map(async (feed) => {
    try {
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalTalkTrend/1.0)" },
      });
      if (!res.ok) return [];
      const xml = await res.text();

      const items: TrendItem[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 2) {
        const block = match[1];
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || block.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] || "";
        const desc = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1]
          || block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "";
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        const mediaUrl = block.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1]
          || block.match(/<media:content[^>]*url="([^"]+)"/)?.[1]
          || block.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] || "";

        if (!title || title.length < 5) continue;

        const cleanTitle = title.replace(/<[^>]*>/g, "").trim();
        const cleanDesc = desc.replace(/<[^>]*>/g, "").trim();
        const category = inferCategoryFromContent(cleanTitle, feed.category);
        const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 5), "artigos");

        items.push({
          icon: feed.icon, platform: feed.name, title: cleanTitle,
          category, time: "agora", volume: feed.name,
          change: "+novo", changePositive: true, sparkData: sparkRandom(),
          details: cleanDesc.slice(0, 200), description: cleanDesc.slice(0, 150),
          sourceUrl: link, thumbnail: mediaUrl, publishedAt: pubDate,
          countryCode: feed.country, historicalData, metricLabel, trustBadge: "verified",
        });
        count++;
      }
      return items;
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  const results = allResults.flat();
  console.log(`📡 RSS Feeds retornou: ${results.length} itens de ${selected.length} feeds (${RSS_FEEDS.length} total disponíveis)`);
  return results;
}

// ── Guardian as primary fallback ──
async function fetchGuardianFallback(): Promise<TrendItem[]> {
  const key = Deno.env.get("GUARDIAN_API_KEY");
  if (!key) { console.log("📰 The Guardian: chave ausente (GUARDIAN_API_KEY)"); return []; }
  try {
    console.log("📰 The Guardian: buscando...");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://content.guardianapis.com/search?api-key=${key}&page-size=15&order-by=newest&show-fields=trailText,thumbnail`,
      { signal: controller.signal }
    );
    if (!res.ok) { console.log("📰 The Guardian retornou: 0 itens"); return []; }
    const data = await res.json();
    const items = (data.response?.results || []).map((a: any) => {
      const { historicalData, metricLabel } = generateHistorical(Math.floor(Math.random() * 20 + 5), "artigos");
      return {
        icon: "📰", platform: "The Guardian", title: a.webTitle || "Sem título",
        category: a.sectionName || "Notícias", time: "agora", volume: "The Guardian",
        change: "+novo", changePositive: true, sparkData: sparkRandom(),
        details: a.fields?.trailText?.slice(0, 200) || "", sourceUrl: a.webUrl || "",
        thumbnail: a.fields?.thumbnail || "", publishedAt: a.webPublicationDate || "",
        countryCode: "GB", historicalData, metricLabel, trustBadge: "verified",
      };
    });
    console.log("📰 The Guardian retornou:", items.length, "itens");
    return items;
  } catch (e) { console.error("Guardian fallback error:", e); return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let lang = "pt";
    try { const body = await req.json(); lang = body?.lang || "pt"; } catch { /* no body */ }

    const cacheKey = `news_extra_v2_${lang}`;
    const cached = cachedResponses[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(cached.data, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all sources in parallel
    const [newsData, gnews, bing, nyt, npr, rss] = await Promise.all([
      fetchNewsData(lang),
      fetchGNews(lang),
      fetchBingNews(lang),
      fetchNYTimes(lang),
      fetchNPR(),
      fetchRSSFeeds(),
    ]);
    
    let trends = [...newsData, ...gnews, ...bing, ...nyt, ...npr, ...rss];
    console.log(`fetch-news-extra [${lang}]: ${newsData.length} NewsData, ${gnews.length} GNews, ${bing.length} Bing, ${nyt.length} NYT, ${npr.length} NPR, ${rss.length} RSS`);
    
    // If all primary APIs returned empty, use Guardian fallback
    if (trends.length === 0) {
      console.log("All news APIs returned empty, using Guardian fallback");
      trends = await fetchGuardianFallback();
    }

    const responseData = JSON.stringify({ trends });
    cachedResponses[cacheKey] = { data: responseData, timestamp: Date.now() };

    return new Response(responseData, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-news-extra:", error);
    return new Response(
      JSON.stringify({ error: "Failed", trends: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

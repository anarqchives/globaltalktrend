/**
 * GDELT DOC API — 100% open, no key required.
 * Fetches global news articles and maps to UnifiedTrend.
 */
import type { UnifiedTrend } from "./aggregatorService";

const ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const CACHE_TTL = 15 * 60 * 1000; // 15 min
const THROTTLE_MS = 5000;

let lastRequestTs = 0;
let cache: { data: UnifiedTrend[]; ts: number } | null = null;

const VERIFIED_DOMAINS = [
  "reuters", "bbc", "cnn", "apnews", "bloomberg", "guardian", "nytimes",
  "washingtonpost", "aljazeera", "france24", "dw.com", "elpais", "folha",
  "globo", "estadao", "lemonde", "spiegel", "corriere",
];

const COUNTRY_MAP: Record<string, string> = {
  "united states": "us", "brazil": "br", "united kingdom": "gb", "france": "fr",
  "germany": "de", "japan": "jp", "china": "cn", "india": "in", "russia": "ru",
  "canada": "ca", "australia": "au", "italy": "it", "spain": "es", "mexico": "mx",
  "south korea": "kr", "argentina": "ar", "portugal": "pt", "israel": "il",
  "turkey": "tr", "saudi arabia": "sa", "south africa": "za", "nigeria": "ng",
  "egypt": "eg", "iran": "ir", "ukraine": "ua", "poland": "pl", "colombia": "co",
  "chile": "cl", "indonesia": "id", "pakistan": "pk", "thailand": "th",
};

function cleanDomain(domain: string): string {
  return domain.replace(/^www\./, "").replace(/\.(com|org|net|co\.uk|com\.br).*/, "")
    .split(".")[0].charAt(0).toUpperCase() + domain.replace(/^www\./, "").split(".")[0].slice(1);
}

function parseGdeltDate(d: string): string {
  if (!d || d.length < 14) return new Date().toISOString();
  const y = d.slice(0, 4), m = d.slice(4, 6), day = d.slice(6, 8);
  const h = d.slice(8, 10), min = d.slice(10, 12), s = d.slice(12, 14);
  return new Date(`${y}-${m}-${day}T${h}:${min}:${s}Z`).toISOString();
}

function isVerified(domain: string): boolean {
  const d = domain.toLowerCase();
  return VERIFIED_DOMAINS.some((v) => d.includes(v));
}

function mapCountry(sc?: string): string {
  if (!sc) return "GL";
  return COUNTRY_MAP[sc.toLowerCase()] || sc.slice(0, 2).toLowerCase() || "GL";
}

async function throttledFetch(url: string): Promise<any> {
  const now = Date.now();
  const wait = THROTTLE_MS - (now - lastRequestTs);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTs = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GDELT ${res.status}`);
  return res.json();
}

async function fetchQuery(query: string, lang = "eng", max = 75): Promise<UnifiedTrend[]> {
  const params = new URLSearchParams({
    query, mode: "artlist", format: "json", maxrecords: String(max), sourcelang: lang,
  });
  const data = await throttledFetch(`${ENDPOINT}?${params}`);
  const articles: any[] = data?.articles || [];
  return articles.map((a) => {
    const domain = a.domain || "";
    const verified = isVerified(domain);
    return {
      id: `gdelt-${btoa(a.url || a.title).slice(0, 20)}`,
      title: a.title || "Sem título",
      context: "",
      source: cleanDomain(domain),
      sourceType: verified ? "imprensa-verificada" : "imprensa",
      sourceTag: "GDELT",
      date: parseGdeltDate(a.seendate),
      country: mapCountry(a.sourcecountry),
      category: "Geopolítica",
      image: a.socialimage || null,
      url: a.url || "",
      value: null,
      change: null,
      tags: [],
      verified,
    } satisfies UnifiedTrend;
  });
}

export async function fetchGdeltTrends(countryFilter?: string): Promise<UnifiedTrend[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  try {
    const queries: Promise<UnifiedTrend[]>[] = [
      fetchQuery("(global OR world) news", "eng", 75),
    ];
    if (countryFilter && countryFilter !== "GL") {
      queries.push(fetchQuery(countryFilter, "eng", 50));
    }
    const results = await Promise.allSettled(queries);
    const all = results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
    cache = { data: all, ts: Date.now() };
    return all;
  } catch (e) {
    console.warn("GDELT fetch failed:", e);
    return cache?.data || [];
  }
}

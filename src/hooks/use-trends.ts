import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendCardProps } from "../components/TrendCard";
import { toast } from "@/hooks/use-toast";
import { FilterState } from "../components/FilterBar";
import { categorizeTrend, detectCountryFromContent } from "@/lib/categorize-trend";
import { useHistoricalTrends, saveToHistoricalCollector, getFromHistoricalCollector } from "./use-historical-trends";
import { getSourceInfo, matchesFilterType } from "@/lib/source-map";

const CACHE_KEY = "gtt_trends_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const PREDICTIVE_CACHE_KEY = "gtt_predictive_cache";
const SOURCE_HEALTH_KEY = "gtt_source_health";

const STANDARD_CATEGORIES = new Set([
  "Política", "Entretenimento", "Tecnologia", "Esportes", "Cultura",
  "Negócios/Finanças", "Ciência", "Saúde", "Clima/Meio Ambiente",
  "Conflitos/Crises", "Conhecimento", "Geral",
]);

// ─── Source Priority Groups ────────────────────────────────────────
const SOURCE_GROUPS: Record<string, string[]> = {
  imprensa: ["The Guardian", "NewsAPI", "NewsData", "GNews", "Bing News"],
  social: ["Reddit", "Bluesky", "Mastodon", "X (Twitter)"],
  dados: ["World Bank", "IBGE", "IMF", "FRED", "NOAA"],
  ciencia: ["OpenAlex", "arXiv", "PubMed", "Crossref"],
  tech: ["Hacker News", "GitHub", "Stack Overflow"],
  busca: ["Google Trends"],
  enciclopedia: ["Wikipedia"],
  conflitos: ["GDELT"],
};

// ─── Source Health Tracker ──────────────────────────────────────────
type SourceHealthEntry = { ok: boolean; count: number; lastOk: number; failures: number };
type SourceHealthMap = Record<string, SourceHealthEntry>;

function loadSourceHealth(): SourceHealthMap {
  try {
    const raw = localStorage.getItem(SOURCE_HEALTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSourceHealth(health: SourceHealthMap) {
  try { localStorage.setItem(SOURCE_HEALTH_KEY, JSON.stringify(health)); } catch {}
}

function updateSourceHealth(health: SourceHealthMap, platform: string, ok: boolean, count: number): SourceHealthMap {
  const prev = health[platform] || { ok: false, count: 0, lastOk: 0, failures: 0 };
  return {
    ...health,
    [platform]: {
      ok,
      count,
      lastOk: ok ? Date.now() : prev.lastOk,
      failures: ok ? 0 : prev.failures + 1,
    },
  };
}

// ─── Predictive Cache ──────────────────────────────────────────────
type PredictiveCacheEntry = { ts: number; data: TrendCardProps[] };
type PredictiveCache = Record<string, PredictiveCacheEntry>;

function getPredictiveCacheKey(filters: FilterState): string {
  return `${filters.country}|${filters.category}|${filters.type}`;
}

function getTimeSlotKey(): string {
  const now = new Date();
  return `${now.getDay()}:${now.getHours()}`;
}

function loadPredictiveCache(): PredictiveCache {
  try {
    const raw = localStorage.getItem(PREDICTIVE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PredictiveCache;
    // Prune entries older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const pruned: PredictiveCache = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.ts > cutoff) pruned[key] = entry;
    }
    return pruned;
  } catch { return {}; }
}

function savePredictiveCache(cache: PredictiveCache) {
  try {
    // Keep max 30 entries
    const entries = Object.entries(cache).sort((a, b) => b[1].ts - a[1].ts).slice(0, 30);
    localStorage.setItem(PREDICTIVE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

function saveToPredictiveCache(filters: FilterState, data: TrendCardProps[]) {
  if (data.length === 0) return;
  const cache = loadPredictiveCache();
  const key = `${getPredictiveCacheKey(filters)}:${getTimeSlotKey()}`;
  cache[key] = { ts: Date.now(), data: data.slice(0, 30) };
  savePredictiveCache(cache);
}

function getFromPredictiveCache(filters: FilterState): TrendCardProps[] | null {
  const cache = loadPredictiveCache();
  const filterKey = getPredictiveCacheKey(filters);
  const timeSlot = getTimeSlotKey();
  
  // 1. Try exact match (same filter + same time slot)
  const exactKey = `${filterKey}:${timeSlot}`;
  if (cache[exactKey]?.data?.length) return cache[exactKey].data;
  
  // 2. Try same filter, any time slot (most recent)
  const candidates = Object.entries(cache)
    .filter(([k]) => k.startsWith(filterKey + ":"))
    .sort((a, b) => b[1].ts - a[1].ts);
  if (candidates.length > 0) return candidates[0][1].data;
  
  return null;
}

// ─── Contextual Fallback Generator ─────────────────────────────────
function generateContextualFallback(filters: FilterState): TrendCardProps[] {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  
  const categoryFallbacks: Record<string, TrendCardProps[]> = {
    "Política": [
      { icon: "🏛️", platform: "The Guardian", title: "Eleições e decisões políticas movimentam a semana", category: "Política", time: "recente", volume: "Análise", change: "em alta", changePositive: true, sparkData: [30, 40, 50, 60, 70, 65, 75, 80, 85, 90], details: "Acompanhe os principais movimentos políticos globais.", countryCode: filters.country !== "global" ? filters.country.toUpperCase() : "GL" },
      { icon: "📰", platform: "BBC News", title: "Líderes mundiais discutem novas sanções e acordos diplomáticos", category: "Política", time: "recente", volume: "Destaque", change: "+trending", changePositive: true, sparkData: [20, 35, 45, 55, 65, 70, 80, 85, 88, 92], details: "Diplomacia e relações internacionais em foco.", countryCode: "GB" },
      { icon: "🗽", platform: "New York Times", title: "Congresso debate nova legislação sobre inteligência artificial", category: "Política", time: "recente", volume: "Alto", change: "+novo", changePositive: true, sparkData: [15, 25, 40, 50, 60, 70, 75, 82, 88, 90], details: "Regulamentação de IA avança no legislativo.", countryCode: "US" },
      { icon: "🇧🇷", platform: "Folha de S.Paulo", title: "Pesquisa eleitoral revela novos cenários para 2026", category: "Política", time: "recente", volume: "Pesquisa", change: "+280%", changePositive: true, sparkData: [10, 20, 30, 50, 65, 78, 85, 90, 93, 96], details: "Novos dados de intenção de voto movimentam o cenário político.", countryCode: "BR" },
      { icon: "🇪🇸", platform: "El País", title: "União Europeia anuncia pacote de medidas econômicas", category: "Política", time: "recente", volume: "Europa", change: "+120%", changePositive: true, sparkData: [25, 35, 42, 55, 60, 68, 75, 80, 85, 88], details: "Novas políticas econômicas impactam mercados europeus.", countryCode: "ES" },
    ],
    "Tecnologia": [
      { icon: "💻", platform: "Hacker News", title: "Novos avanços em IA e desenvolvimento de software", category: "Tecnologia", time: "recente", volume: "Trending", change: "+alto", changePositive: true, sparkData: [20, 35, 45, 55, 60, 70, 80, 85, 90, 95], details: "As principais tendências do mundo tech.", countryCode: "US" },
      { icon: "🔍", platform: "Google Trends", title: "Busca por ferramentas de IA generativa bate recorde", category: "Tecnologia", time: "recente", volume: "1.5M", change: "+220%", changePositive: true, sparkData: [15, 30, 45, 55, 65, 75, 82, 88, 92, 96], details: "Crescimento acelerado no interesse por IA.", countryCode: "US" },
      { icon: "💬", platform: "Reddit", title: "Comunidade debate privacidade e regulação de big tech", category: "Tecnologia", time: "recente", volume: "12K", change: "+hot", changePositive: true, sparkData: [18, 28, 38, 48, 58, 65, 72, 80, 85, 90], details: "Discussão intensa sobre privacidade digital.", countryCode: "US" },
    ],
    "Esportes": [
      { icon: "⚽", platform: "YouTube", title: "Destaques esportivos da semana", category: "Esportes", time: "recente", volume: "Popular", change: "+trending", changePositive: true, sparkData: [25, 40, 55, 50, 65, 70, 80, 90, 85, 95], details: "Os momentos mais comentados do esporte mundial.", countryCode: filters.country !== "global" ? filters.country.toUpperCase() : "GL" },
      { icon: "📰", platform: "BBC News", title: "Transferências de jogadores agitam o mercado europeu", category: "Esportes", time: "recente", volume: "Alto", change: "+180%", changePositive: true, sparkData: [20, 35, 45, 60, 70, 78, 85, 90, 92, 95], details: "Janela de transferências movimenta clubes.", countryCode: "GB" },
      { icon: "💬", platform: "Reddit", title: "Fãs debatem melhores jogadas da temporada", category: "Esportes", time: "recente", volume: "8K", change: "+hot", changePositive: true, sparkData: [15, 25, 40, 55, 65, 72, 80, 85, 90, 93], details: "As melhores jogadas e gols do período.", countryCode: "US" },
    ],
    "Ciência": [
      { icon: "🔬", platform: "OpenAlex", title: "Pesquisas científicas em destaque", category: "Ciência", time: "recente", volume: "Publicações", change: "+novo", changePositive: true, sparkData: [10, 15, 20, 30, 40, 50, 55, 60, 70, 75], details: "Últimas publicações e descobertas científicas.", countryCode: "US", trustBadge: "scientific" as any },
      { icon: "📚", platform: "Wikipedia", title: "Artigo sobre nova descoberta espacial em alta", category: "Ciência", time: "recente", volume: "890K views", change: "+340%", changePositive: true, sparkData: [8, 15, 25, 40, 55, 68, 78, 85, 90, 95], details: "Interesse público em exploração espacial cresce.", countryCode: "US" },
      { icon: "📰", platform: "The Guardian", title: "Estudo revela avanços na luta contra doenças raras", category: "Ciência", time: "recente", volume: "Destaque", change: "+novo", changePositive: true, sparkData: [12, 20, 30, 42, 52, 60, 68, 75, 82, 88], details: "Pesquisadores publicam resultados promissores.", countryCode: "GB", trustBadge: "scientific" as any },
    ],
    "Entretenimento": [
      { icon: "🎬", platform: "YouTube", title: "Entretenimento: os conteúdos mais assistidos", category: "Entretenimento", time: "recente", volume: "Viral", change: "+trending", changePositive: true, sparkData: [30, 50, 60, 70, 75, 85, 90, 88, 92, 95], details: "O que está bombando no entretenimento.", countryCode: filters.country !== "global" ? filters.country.toUpperCase() : "GL" },
      { icon: "💬", platform: "Reddit", title: "Fãs reagem a novo trailer de série aguardada", category: "Entretenimento", time: "recente", volume: "25K", change: "+hot", changePositive: true, sparkData: [20, 35, 50, 62, 70, 78, 85, 90, 93, 96], details: "Discussão viral sobre nova produção.", countryCode: "US" },
      { icon: "🔍", platform: "Google Trends", title: "Buscas por premiação de cinema disparam", category: "Entretenimento", time: "recente", volume: "2.1M", change: "+450%", changePositive: true, sparkData: [10, 20, 35, 50, 65, 78, 88, 92, 95, 98], details: "Temporada de prêmios gera pico de interesse.", countryCode: "US" },
    ],
    "Saúde": [
      { icon: "🏥", platform: "PubMed", title: "Saúde e bem-estar: tendências globais", category: "Saúde", time: "recente", volume: "Pesquisa", change: "+novo", changePositive: true, sparkData: [15, 20, 25, 35, 40, 50, 55, 60, 65, 70], details: "Acompanhe as últimas tendências em saúde.", countryCode: "US", trustBadge: "scientific" as any },
      { icon: "📰", platform: "BBC News", title: "OMS alerta para aumento de casos de doença respiratória", category: "Saúde", time: "recente", volume: "Alto", change: "+180%", changePositive: true, sparkData: [12, 22, 35, 48, 58, 65, 72, 80, 85, 90], details: "Organização Mundial da Saúde emite comunicado.", countryCode: "GL", trustBadge: "official" as any },
    ],
    "Negócios/Finanças": [
      { icon: "📊", platform: "World Bank", title: "Indicadores econômicos globais em atualização", category: "Negócios/Finanças", time: "recente", volume: "Relatório", change: "+novo", changePositive: true, sparkData: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62], details: "Dados macroeconômicos atualizados.", countryCode: "GL", trustBadge: "official" as any },
      { icon: "📰", platform: "Reuters", title: "Mercados reagem a decisões de bancos centrais", category: "Negócios/Finanças", time: "recente", volume: "Alto", change: "+150%", changePositive: true, sparkData: [25, 35, 45, 55, 62, 70, 78, 82, 88, 92], details: "Bolsas de valores apresentam volatilidade.", countryCode: "US" },
      { icon: "💬", platform: "Reddit", title: "Investidores discutem estratégias para cenário atual", category: "Negócios/Finanças", time: "recente", volume: "5K", change: "+hot", changePositive: true, sparkData: [18, 28, 38, 48, 55, 62, 70, 78, 85, 88], details: "Comunidade financeira debate oportunidades.", countryCode: "US" },
    ],
    "Clima/Meio Ambiente": [
      { icon: "🌍", platform: "The Guardian", title: "Relatório climático aponta recordes de temperatura", category: "Clima/Meio Ambiente", time: "recente", volume: "Destaque", change: "+novo", changePositive: false, sparkData: [30, 40, 50, 58, 65, 72, 78, 85, 90, 95], details: "Dados climáticos preocupam cientistas.", countryCode: "GB" },
      { icon: "📊", platform: "NOAA", title: "Monitoramento de eventos climáticos extremos", category: "Clima/Meio Ambiente", time: "recente", volume: "Oficial", change: "+dados", changePositive: true, sparkData: [20, 25, 35, 45, 55, 60, 68, 75, 80, 85], details: "Acompanhamento em tempo real de fenômenos climáticos.", countryCode: "US", trustBadge: "official" as any },
    ],
  };

  const countryFallbacks: Record<string, TrendCardProps[]> = {
    BR: [
      { icon: "🇧🇷", platform: "Google Trends", title: "O que o Brasil está pesquisando agora", category: "Geral", time: timeStr, volume: "Alto", change: "+trending", changePositive: true, sparkData: [30, 45, 55, 60, 70, 80, 85, 90, 92, 95], details: "As buscas mais populares no Brasil neste momento.", countryCode: "BR" },
      { icon: "🇧🇷", platform: "Folha de S.Paulo", title: "Pesquisa eleitoral revela novos cenários para 2026", category: "Política", time: timeStr, volume: "Pesquisa", change: "+280%", changePositive: true, sparkData: [10, 20, 30, 50, 65, 78, 85, 90, 93, 96], details: "Novos dados de intenção de voto movimentam o cenário político.", countryCode: "BR" },
      { icon: "📊", platform: "IBGE", title: "IBGE divulga novos indicadores econômicos", category: "Negócios/Finanças", time: timeStr, volume: "Oficial", change: "+novo", changePositive: true, sparkData: [20, 25, 30, 40, 50, 55, 60, 65, 70, 75], details: "Dados oficiais do Instituto Brasileiro de Geografia e Estatística.", countryCode: "BR", trustBadge: "official" as any },
    ],
    US: [
      { icon: "🇺🇸", platform: "Google Trends", title: "Top trending topics in the United States", category: "Geral", time: timeStr, volume: "High", change: "+trending", changePositive: true, sparkData: [25, 40, 50, 65, 70, 80, 85, 88, 92, 96], details: "What Americans are searching for right now.", countryCode: "US" },
      { icon: "🗽", platform: "New York Times", title: "Congress debates new legislation on AI regulation", category: "Política", time: timeStr, volume: "Alto", change: "+novo", changePositive: true, sparkData: [15, 25, 40, 50, 60, 70, 75, 82, 88, 90], details: "Regulamentação de IA avança no legislativo americano.", countryCode: "US" },
    ],
    PS: [
      { icon: "🇵🇸", platform: "Al Jazeera", title: "Últimas notícias sobre Gaza e o conflito na Palestina", category: "Conflitos/Crises", time: timeStr, volume: "Alto", change: "+trending", changePositive: false, sparkData: [40, 55, 65, 75, 80, 85, 90, 92, 95, 98], details: "Acompanhe a cobertura em tempo real do conflito na região.", countryCode: "PS" },
      { icon: "📰", platform: "Reuters", title: "Negociações de cessar-fogo em Gaza avançam", category: "Política", time: timeStr, volume: "Destaque", change: "+280%", changePositive: true, sparkData: [20, 35, 50, 60, 70, 78, 85, 90, 93, 96], details: "Mediadores internacionais pressionam por acordo.", countryCode: "PS" },
      { icon: "📰", platform: "BBC News", title: "Crise humanitária em Gaza: ONU pede acesso para ajuda", category: "Conflitos/Crises", time: timeStr, volume: "Destaque", change: "+350%", changePositive: false, sparkData: [45, 55, 65, 72, 80, 85, 90, 93, 96, 98], details: "Agências humanitárias relatam situação crítica na Faixa de Gaza.", countryCode: "PS" },
    ],
    RU: [
      { icon: "🇷🇺", platform: "Reuters", title: "Situação na Rússia e impacto das sanções internacionais", category: "Política", time: timeStr, volume: "Destaque", change: "+150%", changePositive: false, sparkData: [35, 45, 55, 60, 68, 75, 80, 85, 88, 92], details: "Análise do cenário geopolítico russo.", countryCode: "RU" },
      { icon: "📰", platform: "BBC News", title: "Economia russa enfrenta desafios com sanções ocidentais", category: "Negócios/Finanças", time: timeStr, volume: "Análise", change: "+120%", changePositive: false, sparkData: [30, 40, 50, 55, 62, 68, 75, 80, 85, 88], details: "Impacto das sanções no comércio e indústria da Rússia.", countryCode: "RU" },
    ],
    UA: [
      { icon: "🇺🇦", platform: "BBC News", title: "Conflito na Ucrânia: últimas atualizações", category: "Conflitos/Crises", time: timeStr, volume: "Alto", change: "+200%", changePositive: false, sparkData: [30, 45, 55, 65, 72, 80, 85, 90, 93, 96], details: "Cobertura contínua do conflito no leste europeu.", countryCode: "UA" },
      { icon: "📰", platform: "Reuters", title: "Zelensky discursa na ONU pedindo apoio internacional", category: "Política", time: timeStr, volume: "Destaque", change: "+180%", changePositive: true, sparkData: [25, 40, 55, 65, 72, 80, 85, 88, 92, 95], details: "Líder ucraniano reforça pedidos de ajuda militar e humanitária.", countryCode: "UA" },
    ],
    VE: [
      { icon: "🇻🇪", platform: "Telesur", title: "Crise política na Venezuela: oposição pressiona por eleições", category: "Política", time: timeStr, volume: "Destaque", change: "+250%", changePositive: false, sparkData: [35, 48, 58, 68, 75, 82, 88, 92, 95, 97], details: "Tensões políticas crescem com disputas entre governo e oposição.", countryCode: "VE" },
      { icon: "📰", platform: "Reuters", title: "Venezuela enfrenta desafios econômicos e crise migratória", category: "Negócios/Finanças", time: timeStr, volume: "Alto", change: "+180%", changePositive: false, sparkData: [30, 42, 52, 60, 68, 75, 80, 85, 90, 93], details: "Inflação e escassez afetam milhões de venezuelanos.", countryCode: "VE" },
      { icon: "📰", platform: "BBC News", title: "Maduro anuncia novas medidas econômicas na Venezuela", category: "Política", time: timeStr, volume: "Destaque", change: "+200%", changePositive: false, sparkData: [28, 38, 48, 58, 65, 72, 78, 84, 88, 92], details: "Governo venezuelano tenta estabilizar economia em meio a sanções.", countryCode: "VE" },
      { icon: "🌐", platform: "EFE News", title: "Diáspora venezuelana cresce: impacto na América Latina", category: "Política", time: timeStr, volume: "Análise", change: "+150%", changePositive: false, sparkData: [20, 30, 42, 52, 60, 68, 75, 80, 85, 88], details: "Milhões de venezuelanos emigraram nos últimos anos.", countryCode: "VE" },
    ],
    GB: [
      { icon: "🇬🇧", platform: "BBC News", title: "UK politics: latest developments in Parliament", category: "Política", time: timeStr, volume: "Alto", change: "+trending", changePositive: true, sparkData: [25, 38, 48, 58, 68, 75, 82, 88, 92, 95], details: "As últimas notícias do parlamento britânico.", countryCode: "GB" },
      { icon: "📰", platform: "The Guardian", title: "Economy and public services dominate UK debate", category: "Negócios/Finanças", time: timeStr, volume: "Destaque", change: "+120%", changePositive: true, sparkData: [20, 32, 42, 52, 60, 68, 75, 80, 85, 88], details: "Economia britânica em foco no debate público.", countryCode: "GB" },
    ],
    FR: [
      { icon: "🇫🇷", platform: "Le Monde", title: "France: actualités politiques et sociales", category: "Política", time: timeStr, volume: "Alto", change: "+trending", changePositive: true, sparkData: [22, 35, 45, 55, 65, 72, 80, 85, 90, 93], details: "Dernières nouvelles de la politique française.", countryCode: "FR" },
    ],
    DE: [
      { icon: "🇩🇪", platform: "Der Spiegel", title: "Deutschland: aktuelle Nachrichten und Analysen", category: "Política", time: timeStr, volume: "Alto", change: "+trending", changePositive: true, sparkData: [20, 32, 42, 55, 62, 70, 78, 84, 90, 93], details: "As últimas notícias e análises da Alemanha.", countryCode: "DE" },
    ],
    AR: [
      { icon: "🇦🇷", platform: "Clarín", title: "Argentina: Milei anuncia novas reformas econômicas", category: "Política", time: timeStr, volume: "Alto", change: "+200%", changePositive: true, sparkData: [25, 38, 50, 60, 70, 78, 85, 90, 93, 96], details: "Presidente argentino avança com agenda de reformas.", countryCode: "AR" },
    ],
    MX: [
      { icon: "🇲🇽", platform: "El Universal MX", title: "México: economia e segurança dominam a agenda", category: "Política", time: timeStr, volume: "Alto", change: "+150%", changePositive: true, sparkData: [22, 35, 45, 55, 65, 72, 78, 84, 88, 92], details: "Principais temas em discussão no cenário mexicano.", countryCode: "MX" },
    ],
    CO: [
      { icon: "🇨🇴", platform: "El Tiempo", title: "Colômbia: processo de paz e reformas sociais avançam", category: "Política", time: timeStr, volume: "Destaque", change: "+130%", changePositive: true, sparkData: [20, 30, 42, 52, 60, 68, 75, 80, 85, 88], details: "Governo colombiano prossegue com agenda de reformas.", countryCode: "CO" },
    ],
    IL: [
      { icon: "🇮🇱", platform: "Haaretz", title: "Israel: tensões regionais e política doméstica", category: "Política", time: timeStr, volume: "Alto", change: "+200%", changePositive: false, sparkData: [35, 48, 58, 68, 75, 82, 88, 92, 95, 97], details: "Análise das dinâmicas políticas e de segurança em Israel.", countryCode: "IL" },
    ],
    CN: [
      { icon: "🇨🇳", platform: "South China Morning Post", title: "China: economia e relações internacionais em foco", category: "Negócios/Finanças", time: timeStr, volume: "Destaque", change: "+150%", changePositive: true, sparkData: [25, 38, 48, 58, 65, 72, 78, 84, 88, 92], details: "As últimas notícias sobre a economia e geopolítica chinesa.", countryCode: "CN" },
    ],
    IN: [
      { icon: "🇮🇳", platform: "Times of India", title: "India: technology boom and political developments", category: "Tecnologia", time: timeStr, volume: "Alto", change: "+180%", changePositive: true, sparkData: [22, 35, 48, 58, 68, 75, 82, 88, 92, 95], details: "Índia se destaca como potência tecnológica emergente.", countryCode: "IN" },
    ],
    JP: [
      { icon: "🇯🇵", platform: "NHK", title: "Japan: economic recovery and innovation drive", category: "Negócios/Finanças", time: timeStr, volume: "Destaque", change: "+120%", changePositive: true, sparkData: [20, 30, 40, 50, 58, 65, 72, 78, 84, 88], details: "Japão investe em inovação e recuperação econômica.", countryCode: "JP" },
    ],
    EG: [
      { icon: "🇪🇬", platform: "Ahram Online", title: "Egito: economia do Canal de Suez e diplomacia regional", category: "Negócios/Finanças", time: timeStr, volume: "Destaque", change: "+100%", changePositive: true, sparkData: [18, 28, 38, 48, 55, 62, 68, 75, 80, 85], details: "Egito mantém papel central na diplomacia do Oriente Médio.", countryCode: "EG" },
    ],
    NG: [
      { icon: "🇳🇬", platform: "Premium Times", title: "Nigéria: economia e política em transformação", category: "Política", time: timeStr, volume: "Destaque", change: "+130%", changePositive: true, sparkData: [20, 30, 40, 50, 58, 65, 72, 78, 84, 88], details: "Maior economia da África passa por reformas estruturais.", countryCode: "NG" },
    ],
    ZA: [
      { icon: "🇿🇦", platform: "News24", title: "África do Sul: desafios energéticos e crescimento econômico", category: "Negócios/Finanças", time: timeStr, volume: "Análise", change: "+110%", changePositive: false, sparkData: [22, 32, 42, 50, 58, 64, 70, 76, 82, 86], details: "Crise energética impacta o desenvolvimento sul-africano.", countryCode: "ZA" },
    ],
    TR: [
      { icon: "🇹🇷", platform: "Reuters", title: "Turquia: economia e geopolítica na encruzilhada", category: "Política", time: timeStr, volume: "Destaque", change: "+140%", changePositive: false, sparkData: [25, 35, 45, 55, 62, 70, 76, 82, 86, 90], details: "Turquia navega entre influência regional e desafios econômicos.", countryCode: "TR" },
    ],
    KR: [
      { icon: "🇰🇷", platform: "Korea Herald", title: "Coreia do Sul: tecnologia e cultura K-pop em alta", category: "Tecnologia", time: timeStr, volume: "Alto", change: "+200%", changePositive: true, sparkData: [25, 38, 50, 60, 70, 78, 85, 90, 93, 96], details: "Inovação tecnológica e exportações culturais em crescimento.", countryCode: "KR" },
    ],
    AU: [
      { icon: "🇦🇺", platform: "BBC News", title: "Austrália: clima extremo e política energética", category: "Clima/Meio Ambiente", time: timeStr, volume: "Destaque", change: "+120%", changePositive: false, sparkData: [20, 30, 42, 52, 60, 68, 75, 80, 85, 88], details: "Eventos climáticos extremos impactam economia australiana.", countryCode: "AU" },
    ],
    CA: [
      { icon: "🇨🇦", platform: "Reuters", title: "Canadá: imigração e economia dominam debate público", category: "Política", time: timeStr, volume: "Alto", change: "+130%", changePositive: true, sparkData: [22, 34, 44, 54, 62, 70, 76, 82, 86, 90], details: "Políticas de imigração e mercado de trabalho em discussão.", countryCode: "CA" },
    ],
  };

  // Build fallback list based on active filters
  const results: TrendCardProps[] = [];

  // Add country-specific fallback FIRST (highest priority)
  const cc = filters.country !== "global" ? filters.country.toUpperCase() : "";
  if (cc && countryFallbacks[cc]) {
    results.push(...countryFallbacks[cc]);
  }

  // Add category-specific fallback
  if (filters.category !== "Todas" && categoryFallbacks[filters.category]) {
    // Only add category items that match the country filter (or if global)
    const catItems = categoryFallbacks[filters.category].filter(item => {
      if (filters.country === "global") return true;
      return normalizeCountryCode(item.countryCode) === cc;
    });
    for (const item of catItems) {
      if (!results.some(r => r.title === item.title)) results.push(item);
    }
  }

  // Always add generic fallbacks if we don't have enough
  if (results.length < 5) {
    const genericFallbacks: TrendCardProps[] = [
      { icon: "🌍", platform: "Google Trends", title: "Tendências globais em tempo real", category: "Geral", time: timeStr, volume: "Global", change: "+ativo", changePositive: true, sparkData: [20, 30, 40, 50, 60, 70, 75, 80, 85, 90], details: "Fontes temporariamente limitadas. Mostrando dados contextuais. Atualize em breve para conteúdo ao vivo.", countryCode: cc || "GL" },
      { icon: "📰", platform: "Reuters", title: "Notícias internacionais em destaque", category: "Política", time: timeStr, volume: "Destaque", change: "+novo", changePositive: true, sparkData: [15, 25, 35, 50, 55, 65, 75, 80, 85, 88], details: "Acompanhe as manchetes mais relevantes do momento.", countryCode: cc || "GL", trustBadge: "verified" as any },
      { icon: "💬", platform: "Reddit", title: "Discussões mais populares da comunidade", category: "Geral", time: timeStr, volume: "Popular", change: "+hot", changePositive: true, sparkData: [10, 20, 35, 45, 55, 60, 70, 80, 85, 90], details: "Os tópicos mais discutidos nas redes sociais.", countryCode: "US" },
    ];
    for (const fb of genericFallbacks) {
      if (results.length >= 8) break;
      if (!results.some(r => r.title === fb.title)) results.push(fb);
    }
  }

  // Add visual indicator that these are fallback
  return results.map(t => ({
    ...t,
    details: `${t.details || ""}\n\n⏰ Conteúdo contextual — dados ao vivo serão carregados na próxima atualização.`,
  }));
}

// ─── Common types and helpers ──────────────────────────────────────
type TrendsCachePayload = { ts: number; data: TrendCardProps[] };

function normalizeText(value?: string): string {
  return (value || "").normalize("NFC").toLowerCase().trim();
}

function normalizeCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const cleaned = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  return undefined;
}

// ─── Ensure every trend has a country code ─────────────────────────
const SOURCE_COUNTRY_MAP: Record<string, string> = {
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
  // Latin America
  "Telesur": "VE", "EFE News": "ES", "Prensa Latina": "CU",
  "Clarín": "AR", "La Nación": "AR",
  "El Universal MX": "MX", "El Tiempo": "CO", "El Comercio": "PE",
};

function ensureTrendCountry(trend: TrendCardProps): TrendCardProps {
  // If already has a valid 2-letter country code, keep it
  const existing = normalizeCountryCode(trend.countryCode);
  if (existing && existing !== "GL" && existing.length === 2) {
    return { ...trend, countryCode: existing };
  }

  // Try to detect from content
  const detected = detectCountryFromContent(
    trend.title || "", trend.platform || "",
    trend.details || trend.description || "", trend.countryCode
  );
  const detectedNorm = normalizeCountryCode(detected);
  if (detectedNorm && detectedNorm !== "GL") {
    return { ...trend, countryCode: detectedNorm };
  }

  // Assign based on source/platform
  const platform = (trend.platform || "").trim();
  const mapped = SOURCE_COUNTRY_MAP[platform];
  if (mapped) {
    return { ...trend, countryCode: mapped };
  }

  // Default to GL (global) — these will NOT match specific country filters
  return { ...trend, countryCode: "GL" };
}

function normalizeCategory(title: string, platform: string, category?: string): string {
  const normalized = categorizeTrend(title, platform, category);
  if (STANDARD_CATEGORIES.has(normalized)) return normalized;
  if (normalizeText(normalized).includes("news") || normalizeText(normalized).includes("notí")) {
    return "Política";
  }
  return "Geral";
}

function inferTypeFromSource(source?: string): string {
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

type NormalizedTrendForFilter = TrendCardProps & {
  source: string;
  type: string;
  normalizedCountry: string;
  normalizedCategory: string;
  hasExplicitCountry: boolean;
};

function normalizeTrendForFilter(trend: TrendCardProps): NormalizedTrendForFilter {
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

function getCachedTrends(): TrendsCachePayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrendsCachePayload;
    if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) {
      // Don't remove — keep as stale fallback
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getStaleCachedTrends(): TrendCardProps[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrendsCachePayload;
    return parsed?.data || [];
  } catch { return []; }
}

function setCachedTrends(data: TrendCardProps[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data.slice(0, 120) }));
  } catch {}
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) window.clearTimeout(timeoutId);
  return result;
}

// ─── Fallback Data ─────────────────────────────────────────────────
const fallbackData: TrendCardProps[] = [
  { icon: "🔍", platform: "Google Trends", title: "Eleições 2026: pesquisas apontam novo cenário", category: "Política", time: "há 12 min", volume: "1.2M buscas", change: "+340%", changePositive: true, sparkData: [10, 15, 12, 25, 40, 65, 80, 95, 88, 92], details: "Volume de buscas disparou nas últimas horas.", countryCode: "BR" },
  { icon: "▶", platform: "YouTube", title: "Nova descoberta científica surpreende pesquisadores", category: "Ciência", time: "há 25 min", volume: "890K views", change: "+180%", changePositive: true, sparkData: [20, 30, 25, 45, 60, 75, 85, 90, 88, 95], details: "Vídeo viral sobre avanço na medicina genética.", countryCode: "US" },
  { icon: "💬", platform: "Reddit", title: "Inteligência artificial e o futuro do trabalho", category: "Tecnologia", time: "há 30 min", volume: "45K upvotes", change: "+92%", changePositive: true, sparkData: [15, 25, 35, 50, 55, 70, 80, 75, 85, 90], details: "Discussão sobre impactos da IA no mercado de trabalho.", countryCode: "US" },
  { icon: "📰", platform: "The Guardian", title: "Climate summit reaches historic agreement", category: "Meio Ambiente", time: "há 45 min", volume: "320K leituras", change: "+210%", changePositive: true, sparkData: [5, 10, 20, 35, 55, 70, 80, 90, 88, 92], details: "Líderes mundiais chegam a acordo histórico sobre clima.", countryCode: "GB" },
  { icon: "🔶", platform: "Hacker News", title: "Open source project breaks new ground in AI safety", category: "Tecnologia", time: "há 1h", volume: "580 pts", change: "+95 comments", changePositive: true, sparkData: [10, 20, 30, 40, 50, 60, 55, 70, 65, 80], details: "Novo framework de segurança para modelos de linguagem.", countryCode: "US" },
  { icon: "📊", platform: "World Bank", title: "PIB global cresce 3.2% no primeiro trimestre", category: "Economia", time: "há 2h", volume: "Relatório oficial", change: "+0.4%", changePositive: true, sparkData: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62], details: "Dados preliminares indicam crescimento acima do esperado.", countryCode: "US", trustBadge: "official" as any },
  { icon: "🦋", platform: "Bluesky", title: "Debate sobre regulação de redes sociais ganha força", category: "Política", time: "há 1h", volume: "12K likes", change: "+trending", changePositive: true, sparkData: [15, 25, 30, 45, 55, 65, 70, 75, 80, 85], details: "Usuários discutem propostas de regulamentação digital.", countryCode: "US" },
  { icon: "📚", platform: "Wikipedia", title: "Artigo sobre exploração espacial bate recorde de acessos", category: "Ciência", time: "há 3h", volume: "2.1M views", change: "+450%", changePositive: true, sparkData: [5, 10, 15, 30, 50, 70, 85, 90, 95, 98], details: "Interesse público cresce após anúncio de missão lunar.", countryCode: "US" },
  { icon: "📱", platform: "Google Trends", title: "iPhone 18 Pro: rumores de design dominam buscas", category: "Tecnologia", time: "há 40 min", volume: "528K buscas", change: "+220%", changePositive: true, sparkData: [12, 18, 25, 35, 48, 62, 74, 86, 92, 96], details: "Crescimento acelerado de interesse por vazamentos do novo modelo.", countryCode: "US" },
  { icon: "⚽", platform: "YouTube", title: "Final Champions League: números e melhores momentos", category: "Esportes", time: "há 55 min", volume: "3.2M views", change: "+310%", changePositive: true, sparkData: [18, 26, 40, 58, 70, 82, 88, 93, 96, 99], details: "Pico global de visualizações após a grande final.", countryCode: "GB" },
];

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

// ─── Client-side fetchers ──────────────────────────────────────────
async function fetchRedditClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://www.reddit.com/r/all/hot.json?limit=8", {
      headers: { "User-Agent": "TrendSphere/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((child: any) => {
      const post = child.data;
      const ups = post.ups || 0;
      const comments = post.num_comments || 0;
      const { historicalData, metricLabel } = generateHistorical(ups / 24, "upvotes/hora");
      const rawThumb = post.thumbnail;
      const thumbnail = rawThumb && rawThumb.startsWith("http") ? rawThumb : "";
      return {
        icon: "💬", platform: "Reddit", title: post.title?.slice(0, 100) || "Sem título",
        category: `r/${post.subreddit}`, time: "agora",
        volume: ups >= 1000 ? `${(ups / 1000).toFixed(1)}K` : `${ups}`,
        change: `+${post.upvote_ratio ? Math.round(post.upvote_ratio * 100) : 0}%`,
        changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10)),
        details: post.selftext?.slice(0, 200) || `${comments} comentários`,
        description: post.selftext?.slice(0, 150) || "",
        commentCount: comments,
        sourceUrl: `https://www.reddit.com${post.permalink}`,
        thumbnail, publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "",
        historicalData, metricLabel,
      };
    });
  } catch { return []; }
}

async function fetchBlueskyClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://public.api.bsky.app/xrpc/app.bsky.feed.getPopularFeedGenerators?limit=8");
    if (!res.ok) {
      const res2 = await fetch("https://public.api.bsky.app/xrpc/app.bsky.unspecced.getPopularFeedGenerators?limit=8");
      if (!res2.ok) return [];
      const data2 = await res2.json();
      return (data2.feeds || []).slice(0, 5).map((feed: any) => {
        const likes = feed.likeCount || 0;
        const { historicalData, metricLabel } = generateHistorical(likes / 24, "likes/hora");
        return {
          icon: "🦋", platform: "Bluesky", title: feed.displayName || "Feed popular",
          category: "Social", time: "agora",
          volume: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K likes` : `${likes} likes`,
          change: "+trending", changePositive: true,
          sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
          details: feed.description?.slice(0, 200) || "",
          sourceUrl: feed.uri ? `https://bsky.app/profile/${feed.creator?.handle || ""}` : "",
          countryCode: "US", historicalData, metricLabel,
        };
      });
    }
    const data = await res.json();
    return (data.feeds || []).slice(0, 5).map((feed: any) => {
      const likes = feed.likeCount || 0;
      const { historicalData, metricLabel } = generateHistorical(likes / 24, "likes/hora");
      return {
        icon: "🦋", platform: "Bluesky", title: feed.displayName || "Feed popular",
        category: "Social", time: "agora",
        volume: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K likes` : `${likes} likes`,
        change: "+trending", changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: feed.description?.slice(0, 200) || "",
        sourceUrl: feed.uri ? `https://bsky.app/profile/${feed.creator?.handle || ""}` : "",
        countryCode: "US", historicalData, metricLabel,
      };
    });
  } catch { return []; }
}

async function fetchMastodonClientSide(): Promise<TrendCardProps[]> {
  try {
    const res = await fetch("https://mastodon.social/api/v1/trends/statuses?limit=5");
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((status: any) => {
      const reblogs = status.reblogs_count || 0;
      const favs = status.favourites_count || 0;
      const { historicalData, metricLabel } = generateHistorical((reblogs + favs) / 24, "interações/hora");
      const content = (status.content || "").replace(/<[^>]*>/g, "").slice(0, 100);
      return {
        icon: "🐘", platform: "Mastodon", title: content || "Post em alta",
        category: "Fediverso", time: "agora",
        volume: `${reblogs + favs >= 1000 ? `${((reblogs + favs) / 1000).toFixed(1)}K` : reblogs + favs} interações`,
        change: `+${reblogs} boosts`, changePositive: true,
        sparkData: Array.from({ length: 10 }, () => Math.floor(Math.random() * 80 + 20)),
        details: content, sourceUrl: status.url || status.uri || "",
        countryCode: "US", historicalData, metricLabel,
      };
    });
  } catch { return []; }
}

// ─── Main Hook ─────────────────────────────────────────────────────
export function useTrends(filters: FilterState, onTrendCountsChange: (counts: Record<string, number>) => void, lang: string = "pt") {
  const cached = getCachedTrends();
  const cacheAgeMs = cached ? Date.now() - cached.ts : Number.POSITIVE_INFINITY;
  const [trends, setTrends] = useState<TrendCardProps[]>(cached?.data || []);
  const [loading, setLoading] = useState(!cached);
  const [isFirstLoad, setIsFirstLoad] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(cached ? new Date(cached.ts) : null);
  const [sourcesStatus, setSourcesStatus] = useState<Record<string, { ok: boolean; count: number; lastUpdate: Date }>>({});
  const { fetchHistorical, fetchCategoryFallback } = useHistoricalTrends();

  const fetchTrends = useCallback(async () => {
    try {
      if (import.meta.env.DEV) console.log("📥 Iniciando carregamento de trends");
      setLoading(true);
      let health = loadSourceHealth();

      const invokeFunctionWithLogs = async (
        sourceName: string,
        functionName: string,
        timeoutMs: number
      ) => {
        if (import.meta.env.DEV) console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(
          supabase.functions.invoke(functionName, { body: { lang } }).catch(() => ({ data: { trends: [] } })),
          timeoutMs,
          { data: { trends: [] } } as Awaited<ReturnType<typeof supabase.functions.invoke>>
        );
        const count = result.data?.trends?.length || 0;
        if (import.meta.env.DEV) console.log(`✅ ${sourceName} retornou:`, count, "itens");
        
        // Track health per source
        const platforms: string[] = (result.data?.trends || []).map((t: any) => String(t.platform || ""));
        const uniquePlatforms = Array.from(new Set(platforms));
        if (uniquePlatforms.length > 0) {
          for (const p of uniquePlatforms) {
            const pCount = platforms.filter((x: string) => x === p).length;
            health = updateSourceHealth(health, p, pCount > 0, pCount);
          }
        } else {
          // Mark function-level failure
          health = updateSourceHealth(health, sourceName, false, 0);
        }
        
        return result;
      };

      const fetchClientSourceWithLogs = async (
        sourceName: string,
        fetchPromise: Promise<TrendCardProps[]>,
        timeoutMs = 8000
      ) => {
        if (import.meta.env.DEV) console.log(`🔍 Buscando ${sourceName}...`);
        const result = await withTimeout(fetchPromise, timeoutMs, [] as TrendCardProps[]);
        if (import.meta.env.DEV) console.log(`✅ ${sourceName} retornou:`, result.length, "itens");
        health = updateSourceHealth(health, sourceName, result.length > 0, result.length);
        return result;
      };

      const [edgeResult, extraResult, extraSourcesResult, socialTrendsResult, openDataResult, redditItems, blueskyItems, mastodonItems] = await Promise.all([
        invokeFunctionWithLogs("Google Trends", "fetch-trends", 12000),
        invokeFunctionWithLogs("The Guardian/News Extra", "fetch-news-extra", 10000),
        invokeFunctionWithLogs("Fontes Oficiais Extras", "fetch-extra-sources", 10000),
        invokeFunctionWithLogs("Social Trends", "fetch-social-trends", 10000),
        invokeFunctionWithLogs("Open Data", "fetch-open-data", 12000),
        fetchClientSourceWithLogs("Reddit", fetchRedditClientSide()),
        fetchClientSourceWithLogs("Bluesky", fetchBlueskyClientSide()),
        fetchClientSourceWithLogs("Mastodon", fetchMastodonClientSide()),
      ]);

      // Save health state
      saveSourceHealth(health);

      const edgeTrends: TrendCardProps[] = edgeResult.data?.trends || [];
      const extraTrends: TrendCardProps[] = extraResult.data?.trends || [];
      const extraSourcesTrends: TrendCardProps[] = extraSourcesResult.data?.trends || [];
      const socialTrends: TrendCardProps[] = socialTrendsResult.data?.trends || [];
      const openDataTrends: TrendCardProps[] = openDataResult.data?.trends || [];
      const rawTrends = [...edgeTrends, ...extraTrends, ...extraSourcesTrends, ...socialTrends, ...openDataTrends, ...redditItems, ...blueskyItems, ...mastodonItems];
      
      if (import.meta.env.DEV) console.log("📦 Total de trends combinadas:", rawTrends.length);

      // If all live sources failed, try stale cache before fallback
      if (rawTrends.length === 0) {
        const stale = getStaleCachedTrends();
        if (stale.length > 0) {
          if (import.meta.env.DEV) console.log("♻️ Usando cache expirado como fallback:", stale.length, "itens");
          setTrends(stale);
          setLoading(false);
          setIsFirstLoad(false);
          return;
        }
      }

      // Apply unified categorization, normalization, trust badges, AND ensure country
      const allTrends = rawTrends.map((t) => {
        const category = normalizeCategory(t.title || "Sem título", t.platform || "Unknown", t.category);
        const sourceInfo = getSourceInfo(t.platform || "Unknown");
        const detectedCountry = detectCountryFromContent(t.title || "", t.platform || "Unknown", t.details || t.description || "", t.countryCode);
        // Priority: detected from content > existing > source map default
        const countryCode = normalizeCountryCode(detectedCountry || t.countryCode || sourceInfo.country);

        let trustBadge = t.trustBadge;
        if (!trustBadge) {
          const mt = sourceInfo.mediaType;
          if (mt === "dados-oficiais") trustBadge = "official";
          else if (mt === "ciencia") trustBadge = "scientific";
          else if (["The Guardian", "BBC", "Reuters", "BBC News"].includes(t.platform)) trustBadge = "international";
          else if (mt === "imprensa") trustBadge = "press";
          else if (mt === "conflitos") trustBadge = "verified";
        }

        const normalized = {
          ...t,
          title: (t.title || "Sem título").trim(),
          platform: t.platform || "Unknown",
          category: category || sourceInfo.category || "Geral",
          countryCode,
          trustBadge,
          reliability: sourceInfo.reliability,
        };
        // CRITICAL: Ensure every trend has a valid country code
        return ensureTrendCountry(normalized);
      });

      // Merge with historical 24h trends from snapshots
      const historicalTrends = await withTimeout(fetchHistorical(), 5000, []);

      // Deduplicate
      const seenTitles = new Set<string>();
      const deduped = allTrends.filter(t => {
        const key = t.title.toLowerCase().trim().slice(0, 80);
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });

      const liveTitleSet = new Set(deduped.map(t => `${t.title}||${t.platform}`));
      const uniqueHistorical = historicalTrends.filter(h => !liveTitleSet.has(`${h.title}||${h.platform}`));

      const scoredLive = deduped.map(t => ({
        ...t,
        relevanceScore: t.relevanceScore ?? 80 + Math.random() * 20,
        firstSeenAt: t.firstSeenAt || new Date().toISOString(),
      }));

      // Quality filter: remove low-quality content
      const qualityFilter = (trend: TrendCardProps): boolean => {
        const p = trend.platform.toLowerCase();
        const vol = parseInt((trend.volume || "0").replace(/[^0-9]/g, "")) || 0;
        if (p.includes("stack overflow") && vol < 100) return false;
        if (p.includes("mastodon") && vol < 10) return false;
        if (p.includes("reddit") && vol < 50) return false;
        if (p.includes("bluesky") && vol < 20) return false;
        if (p.includes("github") && vol < 10) return false;
        if (p.includes("hacker news") && vol < 20) return false;
        return true;
      };

      const combinedTrends = [...scoredLive, ...uniqueHistorical].filter(qualityFilter);

      // Check press availability
      const pressPlatforms = SOURCE_GROUPS.imprensa;
      const imprensaData = combinedTrends.filter((trend) => pressPlatforms.includes(trend.platform));
      if (imprensaData.length === 0) {
        if (import.meta.env.DEV) console.log("📰 Imprensa sem dados - mostrando aviso");
        combinedTrends.unshift({
          icon: "📰", platform: "The Guardian",
          title: "Fontes de imprensa temporariamente indisponíveis",
          category: "Geral", time: "agora", volume: "Sistema", change: "sem dados",
          changePositive: false, sparkData: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          details: "The Guardian e outras fontes podem estar com limite de API. Tente novamente mais tarde.",
          countryCode: "GL", trustBadge: "verified",
        });
      }

      if (combinedTrends.length > 0) {
        // Save to localStorage historical collector for layered fallback
        saveToHistoricalCollector(combinedTrends);
        setTrends(combinedTrends);
        setCachedTrends(combinedTrends);
        const now = new Date();
        setLastUpdated(now);

        // Track source status
        const statusMap: Record<string, { ok: boolean; count: number; lastUpdate: Date }> = {};
        const platformCounts: Record<string, number> = {};
        for (const t of combinedTrends) {
          platformCounts[t.platform] = (platformCounts[t.platform] || 0) + 1;
        }
        const allPlatforms = [
          ...SOURCE_GROUPS.imprensa, ...SOURCE_GROUPS.social, ...SOURCE_GROUPS.dados,
          ...SOURCE_GROUPS.ciencia, ...SOURCE_GROUPS.tech, ...SOURCE_GROUPS.busca,
          ...SOURCE_GROUPS.enciclopedia, ...SOURCE_GROUPS.conflitos,
          "YouTube",
        ];
        for (const p of allPlatforms) {
          statusMap[p] = { ok: (platformCounts[p] || 0) > 0, count: platformCounts[p] || 0, lastUpdate: now };
        }
        setSourcesStatus(statusMap);

        if (import.meta.env.DEV) console.log('🔄 Atualização:', {
          timestamp: now.toLocaleTimeString(),
          live: allTrends.length,
          historical: uniqueHistorical.length,
          total: combinedTrends.length,
          fontes: [...new Set(combinedTrends.map(t => t.platform))],
          porFonte: platformCounts,
          healthSummary: Object.entries(health).filter(([, v]) => (v as SourceHealthEntry).failures > 0).map(([k, v]) => `${k}: ${(v as SourceHealthEntry).failures} falhas`),
        });

        // Save snapshots
        supabase.functions.invoke("save-trend-snapshots", {
          body: { trends: allTrends.slice(0, 120) },
        }).catch(() => {});

        if (!isFirstLoad) {
          toast({ title: "✅ Atualizado", description: `${combinedTrends.length} trends (${allTrends.length} ao vivo + ${uniqueHistorical.length} históricas)` });
        }
        setIsFirstLoad(false);
      } else {
        console.warn("All data sources returned empty, using fallback data");
        setTrends(fallbackData);
        setIsFirstLoad(false);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      if (trends.length <= 1) {
        // Try stale cache before generic fallback
        const stale = getStaleCachedTrends();
        setTrends(stale.length > 0 ? stale : fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [isFirstLoad, lang]);

  useEffect(() => {
    let intervalId: number | undefined;
    let initialFetchTimer: number | undefined;

    // Smart refresh: track user activity to defer refresh during interaction
    let lastActivity = Date.now();
    const IDLE_THRESHOLD = 30_000; // 30s of inactivity before auto-refresh

    const trackActivity = () => { lastActivity = Date.now(); };
    window.addEventListener("mousemove", trackActivity, { passive: true });
    window.addEventListener("scroll", trackActivity, { passive: true });
    window.addEventListener("keydown", trackActivity, { passive: true });
    window.addEventListener("click", trackActivity, { passive: true });

    const smartFetch = () => {
      const idle = Date.now() - lastActivity > IDLE_THRESHOLD;
      if (idle) {
        if (import.meta.env.DEV) console.log("🔄 Usuário inativo, atualizando trends...");
        fetchTrends();
      } else {
        if (import.meta.env.DEV) console.log("⏳ Usuário ativo, adiando atualização por 30s...");
        // Retry in 30s
        window.setTimeout(() => {
          if (Date.now() - lastActivity > IDLE_THRESHOLD) fetchTrends();
        }, IDLE_THRESHOLD);
      }
    };

    const startPolling = () => {
      intervalId = window.setInterval(smartFetch, 10 * 60 * 1000);
    };

    const handleTrendRefresh = () => fetchTrends();
    window.addEventListener("trend-refresh", handleTrendRefresh);

    if (cacheAgeMs < CACHE_TTL) {
      const remainingMs = CACHE_TTL - cacheAgeMs;
      initialFetchTimer = window.setTimeout(fetchTrends, remainingMs);
      startPolling();
    } else {
      fetchTrends();
      startPolling();
    }

    return () => {
      if (initialFetchTimer) window.clearTimeout(initialFetchTimer);
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("trend-refresh", handleTrendRefresh);
      window.removeEventListener("mousemove", trackActivity);
      window.removeEventListener("scroll", trackActivity);
      window.removeEventListener("keydown", trackActivity);
      window.removeEventListener("click", trackActivity);
    };
  }, [fetchTrends, cacheAgeMs]);

  // Forced fallback after 5s if still empty
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!loading && trends.length === 0) {
        if (import.meta.env.DEV) console.log("⚠️ Usando fallback - sem dados reais");
        setTrends(fallbackData);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [loading, trends.length]);

  // ─── Filtered Trends with Smart Fallback ─────────────────────────
  const filteredTrends = useMemo(() => {
    const countryFilter = normalizeCountryCode(filters.country) || (filters.country === "global" ? "GL" : undefined);
    const filterCategory = normalizeText(filters.category);

    const normalizedTrends = trends.map(normalizeTrendForFilter);

    const matchesType = (trend: NormalizedTrendForFilter) => {
      return matchesFilterType(trend.source, filters.type);
    };

    const filtered = normalizedTrends.filter((trend) => {
      // STRICT country filter: when a specific country is selected,
      // ONLY show trends that match that exact country.
      // Trends with GL (global/unknown) are excluded from specific country filters.
      const matchCountry =
        filters.country === "global" ||
        trend.normalizedCountry === countryFilter;

      const matchCategory =
        filters.category === "Todas" ||
        trend.normalizedCategory === filterCategory ||
        trend.normalizedCategory.startsWith(filterCategory);

      const matchSource = matchesType(trend);

      return matchCountry && matchCategory && matchSource;
    });

    // ── SMART FALLBACK: Hierarchical data recovery ──
    if (filtered.length === 0 && filters.country !== "global" && trends.length > 0) {
      if (import.meta.env.DEV) console.log(`🧠 Zero trends para país ${countryFilter} — iniciando fallback hierárquico`);

      let combined: TrendCardProps[] = [];
      const seenKeys = new Set<string>();

      const addUnique = (items: TrendCardProps[]) => {
        for (const item of items) {
          const key = item.title.toLowerCase().slice(0, 60);
          if (seenKeys.has(key)) continue;
          // CRITICAL: only add items that match the selected country
          const itemCountry = normalizeCountryCode(item.countryCode) || "GL";
          if (itemCountry !== countryFilter) continue;
          seenKeys.add(key);
          combined.push(item);
        }
      };

      // Layer 1: localStorage historical collector (same country only)
      const localHistorical = getFromHistoricalCollector(filters.category, filters.country);
      if (localHistorical.length > 0) {
        if (import.meta.env.DEV) console.log("📂 Camada 1 - Cache local (mesmo país):", localHistorical.length, "itens");
        addUnique(localHistorical);
      }

      // Layer 2: Predictive cache (same country only)
      if (combined.length < 3) {
        const predicted = getFromPredictiveCache(filters);
        if (predicted && predicted.length > 0) {
          if (import.meta.env.DEV) console.log("📊 Camada 2 - Cache preditivo (mesmo país):", predicted.length, "itens");
          addUnique(predicted);
        }
      }

      // Layer 3: Search ALL trends for keyword matches related to the country
      if (combined.length < 3) {
        if (import.meta.env.DEV) console.log("🔍 Camada 3 - Busca por palavras-chave do país em trends globais");
        const countryKeywords: Record<string, string[]> = {
          VE: ["venezuela", "maduro", "caracas", "guaidó", "pdvsa", "chavismo"],
          PS: ["gaza", "palestina", "palestine", "hamas", "cisjordânia", "west bank"],
          UA: ["ucrânia", "ukraine", "kyiv", "zelensky", "kharkiv"],
          RU: ["rússia", "russia", "putin", "kremlin", "moscou"],
          BR: ["brasil", "lula", "bolsonaro", "ibge", "são paulo", "brasília"],
          IL: ["israel", "netanyahu", "tel aviv", "jerusalém", "idf"],
          AR: ["argentina", "milei", "buenos aires"],
          MX: ["méxico", "mexico"],
          CO: ["colômbia", "colombia", "bogotá"],
        };
        const keywords = countryKeywords[countryFilter || ""] || [];
        if (keywords.length > 0) {
          const keywordMatches = normalizedTrends.filter(t => {
            const text = `${t.title} ${t.details || ""}`.toLowerCase();
            return keywords.some(k => text.includes(k));
          });
          for (const match of keywordMatches) {
            const key = match.title.toLowerCase().slice(0, 60);
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combined.push({ ...match, countryCode: countryFilter || "GL" });
            }
          }
          if (keywordMatches.length > 0) {
            if (import.meta.env.DEV) console.log("🔍 Camada 3 - Encontradas por palavras-chave:", keywordMatches.length);
          }
        }
      }

      if (combined.length > 0) {
        if (import.meta.env.DEV) console.log(`✅ Fallback com ${combined.length} itens do mesmo país`);
        return combined.sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
      }

      // Layer 4: Contextual fallback (generated data with clear indicator)
      if (import.meta.env.DEV) console.log(`📋 Camada 4 - Fallback contextualizado para ${countryFilter}`);
      const contextual = generateContextualFallback(filters);
      if (contextual.length > 0) {
        return contextual;
      }

      // No data at all for this country — show empty state
      if (import.meta.env.DEV) console.log(`ℹ️ Nenhuma trend encontrada para ${countryFilter}`);
      return [];
    }

    // Same for category-only or combined filters with no results
    if (filtered.length === 0 && trends.length > 0) {
      const hasActiveFilters = filters.category !== "Todas" || filters.type !== "Todas mídias";
      if (hasActiveFilters) {
        if (import.meta.env.DEV) console.log(`🧠 Zero trends para filtros ativos (cat=${filterCategory}, type=${filters.type}) — usando fallback`);
        
        // Try relaxing type filter first (keep category)
        if (filters.type !== "Todas mídias" && filters.category !== "Todas") {
          const categoryOnly = normalizedTrends.filter(t => {
            const matchCountry = filters.country === "global" || t.normalizedCountry === countryFilter;
            const matchCategory = t.normalizedCategory === filterCategory || t.normalizedCategory.startsWith(filterCategory);
            return matchCountry && matchCategory;
          });
          if (categoryOnly.length > 0) {
            if (import.meta.env.DEV) console.log(`✅ Fallback: ${categoryOnly.length} trends da categoria (ignorando tipo)`);
            return categoryOnly.sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
          }
        }
        
        // Contextual fallback
        const contextual = generateContextualFallback(filters);
        if (contextual.length > 0) return contextual;
      }
    }

    // Save successful filter results to predictive cache
    if (filtered.length > 0) {
      saveToPredictiveCache(filters, filtered);
    }

    return [...filtered].sort((a, b) => (b.relevanceScore || 50) - (a.relevanceScore || 50));
  }, [trends, filters]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔎 Filtros aplicados:", filters);
      console.log("📋 Trends após filtro:", filteredTrends.length);
    }
  }, [filters, filteredTrends.length]);

  const leftTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 0), [filteredTrends]);
  const rightTrends = useMemo(() => filteredTrends.filter((_, i) => i % 2 === 1), [filteredTrends]);

  const countriesCount = useMemo(() => {
    const codes = new Set(trends.map(t => t.countryCode).filter(Boolean));
    return codes.size;
  }, [trends]);

  const trendCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (filters.country !== "global") {
      counts[filters.country] = filteredTrends.length;
    } else {
      for (const trend of filteredTrends) {
        const code = trend.countryCode || "BR";
        counts[code] = (counts[code] || 0) + 1;
      }
      const redditCount = filteredTrends.filter((t) => t.platform === "Reddit").length;
      counts["US"] = (counts["US"] || 0) + redditCount;
      const baselineCountries = ["CN", "NL", "SE", "NO", "UA", "CL", "PE", "VE", "PT", "KE", "MA", "ET", "AE", "NZ", "VN", "PK"];
      for (const cc of baselineCountries) {
        if (!counts[cc]) counts[cc] = 1;
      }
    }
    return counts;
  }, [filteredTrends, filters.country]);

  useEffect(() => {
    onTrendCountsChange(trendCounts);
  }, [trendCounts, onTrendCountsChange]);

  return { leftTrends, rightTrends, loading, isFirstLoad, filteredTrends, allTrends: trends, fetchTrends, countriesCount, lastUpdated, sourcesStatus };
}

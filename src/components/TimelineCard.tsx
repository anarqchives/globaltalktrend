import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendCardProps } from "./TrendCard";

/* ─── Source classification ─── */
const SOURCE_TYPE_MAP: Record<string, string> = {
  "the guardian": "imprensa", "npr": "imprensa", "newsapi": "imprensa", "gnews": "imprensa",
  "bing news": "imprensa", "newsdata": "imprensa", "thenewsapi": "imprensa", "the news api": "imprensa",
  "variety": "imprensa", "bbc": "imprensa", "reuters": "imprensa", "france 24": "imprensa",
  "ap news": "imprensa", "bloomberg": "imprensa", "nyt": "imprensa", "guardian": "imprensa",
  "reddit": "redes_sociais", "bluesky": "redes_sociais", "mastodon": "redes_sociais",
  "x (twitter)": "redes_sociais", "youtube": "redes_sociais", "hacker news": "redes_sociais",
  "lobsters": "redes_sociais",
  "google trends": "google_trends",
  "world bank": "dados_oficiais", "worldbank": "dados_oficiais", "fred": "dados_oficiais",
  "ibge": "dados_oficiais", "imf": "dados_oficiais", "who": "dados_oficiais",
  "pubmed": "cientifico", "openal": "cientifico", "arxiv": "cientifico",
  "crossref": "cientifico", "semantic scholar": "cientifico",
  "wikipedia": "enciclopedico",
};

function getSourceType(platform: string): string {
  const p = platform.toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_TYPE_MAP)) { if (p.includes(key)) return val; }
  return "imprensa";
}

/* Source dot colors using CSS variable HSL values */
const SOURCE_COLORS: Record<string, string> = {
  imprensa: "var(--source-press)",
  redes_sociais: "var(--source-social)",
  google_trends: "var(--source-search)",
  dados_oficiais: "var(--source-official)",
  cientifico: "var(--source-academic)",
  enciclopedico: "var(--source-encyclopedic)",
};

/* Fallback hex for SVG (CSS vars don't work in SVG attributes) */
const SOURCE_HEX: Record<string, string> = {
  imprensa: "#5580AA", redes_sociais: "#C08040", google_trends: "#C09020",
  dados_oficiais: "#558855", cientifico: "#7070AA", enciclopedico: "#408888",
};

const SOURCE_BADGES: Record<string, { label: Record<string, string>; icon: string; css: string; explanation: Record<string, string> }> = {
  imprensa: {
    label: { pt: "Imprensa", en: "Press" }, icon: "✓", css: "source-badge-press",
    explanation: { pt: "Veículos de imprensa profissional com equipe editorial", en: "Professional press outlets with editorial teams" },
  },
  dados_oficiais: {
    label: { pt: "Dados Oficiais", en: "Official Data" }, icon: "◆", css: "source-badge-official",
    explanation: { pt: "Instituições governamentais e organismos internacionais", en: "Government institutions and international organizations" },
  },
  cientifico: {
    label: { pt: "Acadêmico", en: "Academic" }, icon: "◈", css: "source-badge-academic",
    explanation: { pt: "Publicações científicas revisadas por pares", en: "Peer-reviewed scientific publications" },
  },
  enciclopedico: {
    label: { pt: "Enciclopédico", en: "Encyclopedic" }, icon: "◎", css: "source-badge-encyclopedic",
    explanation: { pt: "Plataformas de conhecimento colaborativo", en: "Collaborative knowledge platforms" },
  },
  redes_sociais: {
    label: { pt: "Social", en: "Social" }, icon: "◉", css: "source-badge-social",
    explanation: { pt: "Redes sociais e comunidades online", en: "Social networks and online communities" },
  },
  google_trends: {
    label: { pt: "Buscas", en: "Searches" }, icon: "◉", css: "source-badge-search",
    explanation: { pt: "Dados de volume de buscas em mecanismos de pesquisa", en: "Search engine volume data" },
  },
};

/* ─── Term explanations — expanded ─── */
const TERM_EXPLANATIONS: Record<string, Record<string, string>> = {
  pt: {
    "CPIAUCSL": "CPI = Consumer Price Index — Índice de Preços ao Consumidor dos EUA, principal medida de inflação",
    "PMID": "PMID = PubMed Identifier — código único que identifica artigos na base biomédica MEDLINE/PubMed mantida pela National Library of Medicine",
    "FRED": "FRED = Federal Reserve Economic Data — base de dados do Fed de St. Louis com +800 mil séries temporais econômicas",
    "DOI": "DOI = Digital Object Identifier — identificador permanente para publicações acadêmicas digitais",
    "GDP": "GDP = Gross Domestic Product — Produto Interno Bruto, principal indicador de atividade econômica de um país",
    "CPI": "CPI = Consumer Price Index — Índice de Preços ao Consumidor, mede a inflação nos gastos domésticos",
    "WHO": "WHO = World Health Organization — Organização Mundial da Saúde, agência especializada da ONU",
    "IMF": "IMF = International Monetary Fund — Fundo Monetário Internacional, monitora estabilidade financeira global",
    "IBGE": "IBGE = Instituto Brasileiro de Geografia e Estatística — órgão oficial de dados demográficos e econômicos do Brasil",
    "GDELT": "GDELT = Global Database of Events, Language, and Tone — monitora eventos globais em 65 idiomas em tempo real",
    "ARXIV": "arXiv = repositório de preprints científicos em física, matemática, ciência da computação e áreas correlatas",
    "OPENAL": "OpenAlex = índice aberto de publicações acadêmicas com metadados de citações e autores",
    "CROSSREF": "Crossref = organização que registra metadados de publicações acadêmicas e atribui DOIs",
    "SEMANTIC": "Semantic Scholar = mecanismo de busca acadêmica com IA para artigos científicos",
    "WORLD BANK": "World Bank = Banco Mundial — organismo internacional que fornece dados socioeconômicos de 200+ países",
    "PCE": "PCE = Personal Consumption Expenditures — índice de gastos de consumo pessoal, usado pelo Fed para metas de inflação",
    "NFP": "NFP = Non-Farm Payrolls — relatório mensal de empregos dos EUA excluindo setor agrícola",
    "ISM": "ISM = Institute for Supply Management — índice que mede atividade manufatureira",
    "PMI": "PMI = Purchasing Managers' Index — índice de gerentes de compras, indicador antecedente da economia",
  },
  en: {
    "CPIAUCSL": "CPI = Consumer Price Index — key US inflation measure published by the Bureau of Labor Statistics",
    "PMID": "PMID = PubMed Identifier — unique code for scientific articles in the MEDLINE/PubMed biomedical database",
    "FRED": "FRED = Federal Reserve Economic Data — St. Louis Fed database with 800K+ economic time series",
    "DOI": "DOI = Digital Object Identifier — permanent identifier for academic digital publications",
    "GDP": "GDP = Gross Domestic Product — primary measure of economic output for a country",
    "CPI": "CPI = Consumer Price Index — measures inflation in household spending",
    "WHO": "WHO = World Health Organization — UN specialized health agency",
    "IMF": "IMF = International Monetary Fund — monitors global financial stability",
    "IBGE": "IBGE = Brazilian Institute of Geography and Statistics — official demographic and economic data agency",
    "GDELT": "GDELT = Global Database of Events, Language, and Tone — monitors global events in 65 languages in real time",
    "ARXIV": "arXiv = scientific preprint repository for physics, mathematics, computer science and related fields",
    "OPENAL": "OpenAlex = open index of academic publications with citation and author metadata",
    "CROSSREF": "Crossref = organization that registers academic publication metadata and assigns DOIs",
    "SEMANTIC": "Semantic Scholar = AI-powered academic search engine for scientific papers",
    "WORLD BANK": "World Bank = international organization providing socioeconomic data from 200+ countries",
    "PCE": "PCE = Personal Consumption Expenditures — consumer spending index used by the Fed for inflation targets",
    "NFP": "NFP = Non-Farm Payrolls — monthly US employment report excluding the agricultural sector",
    "ISM": "ISM = Institute for Supply Management — index measuring manufacturing activity",
    "PMI": "PMI = Purchasing Managers' Index — leading economic indicator",
  },
};

function findTermExplanation(title: string, lang: string): string | null {
  const terms = TERM_EXPLANATIONS[lang] || TERM_EXPLANATIONS.pt;
  const upper = title.toUpperCase();
  for (const [term, explanation] of Object.entries(terms)) {
    if (upper.includes(term)) return explanation;
  }
  return null;
}

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const decodeEntities = (text: string): string => {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  const el = typeof document !== "undefined" ? document.createElement("textarea") : null;
  if (!el) return text;
  el.innerHTML = text;
  return el.value;
};

const relativeTimeFormats: Record<string, { now: string; min: string; h: string; d: string }> = {
  pt: { now: "agora", min: "há {n}min", h: "há {n}h", d: "há {n}d" },
  en: { now: "now", min: "{n}min ago", h: "{n}h ago", d: "{n}d ago" },
  es: { now: "ahora", min: "hace {n}min", h: "hace {n}h", d: "hace {n}d" },
  fr: { now: "maintenant", min: "il y a {n}min", h: "il y a {n}h", d: "il y a {n}j" },
  de: { now: "jetzt", min: "vor {n}min", h: "vor {n}h", d: "vor {n}T" },
};

const SPORTS_TERMS = ["esportes", "sports", "jogo", "copa", "game", "nba", "nfl", "fifa", "gol", "futebol", "football", "soccer"];
const POLITICS_TERMS = ["política", "politics", "eleição", "governo", "election", "trump", "biden", "congress"];

function validateTag(tagLabel: string, title: string): boolean {
  const tL = title.toLowerCase();
  const tagL = tagLabel.toLowerCase();
  if (SPORTS_TERMS.some(t => tagL.includes(t)) && !SPORTS_TERMS.some(t => tL.includes(t))) return false;
  if (POLITICS_TERMS.some(t => tagL.includes(t)) && !POLITICS_TERMS.some(t => tL.includes(t))) return false;
  return true;
}

/* ─── Sparkline ─── */
const SparklineChart = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const id = useMemo(() => `sp_${Math.random().toString(36).slice(2, 7)}`, []);
  const { pathD, areaD, lastPt } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "", lastPt: { x: 0, y: 0 } };
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const w = 100, h = 24, pad = 2;
    const pts = data.map((v, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    }));
    const d = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `${acc} C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
    }, "");
    return { pathD: d, areaD: `${d} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`, lastPt: pts[pts.length - 1] };
  }, [data]);

  if (!data || data.length < 2) return <span className="text-[8px] text-muted-foreground/30 italic">—</span>;

  return (
    <svg width={100} height={24} viewBox="0 0 100 24" className="w-full h-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <motion.path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeInOut" }} />
      <circle cx={lastPt.x} cy={lastPt.y} r="1.5" fill={color}>
        <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
});
SparklineChart.displayName = "SparklineChart";

export const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] } },
};

export interface TimelineCardProps extends TrendCardProps {
  onClick?: () => void;
  onFilterPlatform?: (platform: string) => void;
  onSaveCard?: (card: any) => void;
  staggerIndex?: number;
  compact?: boolean;
  isSelected?: boolean;
  isMultiplatform?: boolean;
}

const TimelineCard = ({
  platform, title, category, time, volume, change, changePositive,
  historicalData, countryCode, sources, sourceUrl, trustBadge, thumbnail,
  publishedAt, description, details, translated, isMultiplatform, sparkData: rawSparkData,
  onClick, onFilterPlatform, onSaveCard,
  staggerIndex = 0, compact = false, isSelected = false,
}: TimelineCardProps) => {
  const { lang } = useLanguage();

  const sourceType = getSourceType(platform);
  const sparkHex = SOURCE_HEX[sourceType] || "#6B6560";
  const flag = countryCodeToFlag(countryCode);
  const badge = SOURCE_BADGES[sourceType];

  const formattedTime = useMemo(() => {
    if (!publishedAt) {
      if (!time) return time;
      const lower = time.toLowerCase().trim();
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (lower === "agora" || lower === "now") return fmt.now;
      const match = lower.match(/(?:há\s*)?(\d+)\s*(min|m|h|d)/i);
      if (!match) return time;
      const val = match[1], unit = match[2].toLowerCase();
      if (unit === "min" || unit === "m") return fmt.min.replace("{n}", val);
      if (unit === "h") return fmt.h.replace("{n}", val);
      if (unit === "d") return fmt.d.replace("{n}", val);
      return time;
    }
    try {
      const date = new Date(publishedAt);
      if (isNaN(date.getTime())) return time;
      const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
      const fmt = relativeTimeFormats[lang] || relativeTimeFormats.pt;
      if (diffMin < 1) return fmt.now;
      if (diffMin < 60) return fmt.min.replace("{n}", String(diffMin));
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return fmt.h.replace("{n}", String(diffH));
      return date.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short" });
    } catch { return time; }
  }, [publishedAt, time, lang]);

  const tags = useMemo(() => {
    const result: { label: string; css: string }[] = [];
    if (trustBadge === "verified" || trustBadge === "press") {
      result.push({ label: "✓ " + (lang === "pt" ? "Verificado" : "Verified"), css: "source-badge-press" });
    } else if (trustBadge === "scientific") {
      result.push({ label: "🔬 " + (lang === "pt" ? "Científico" : "Scientific"), css: "source-badge-academic" });
    }
    const ch = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
    if (ch > 200) result.push({ label: "+trending", css: "source-badge-search" });
    else if (changePositive && ch > 50) result.push({ label: "+popular", css: "source-badge-press" });
    if (isMultiplatform) result.push({ label: "🌐 Multi", css: "source-badge-official" });
    return result.filter(tag => validateTag(tag.label, title));
  }, [trustBadge, change, changePositive, isMultiplatform, title, lang]);

  const sparkData = useMemo(() => {
    if (historicalData && historicalData.length >= 2) return historicalData.slice(-12).map(d => d.value);
    if (rawSparkData && rawSparkData.length >= 2) return rawSparkData.slice(-12);
    return null;
  }, [historicalData, rawSparkData]);

  const volStr = (volume || "0").toLowerCase();
  let vol = parseFloat(volStr.replace(/[^0-9.]/g, "")) || 0;
  if (volStr.includes("m")) vol *= 1_000_000;
  else if (volStr.includes("k")) vol *= 1_000;
  const showVolume = vol > 0;
  const changeNum = Math.abs(parseFloat(change?.replace(/[^0-9.\-]/g, "") || "0"));
  const showChange = changeNum > 0;

  const contextSnippet = useMemo(() => {
    const raw = description || details || "";
    const normTitle = title.toLowerCase().trim();
    const normDesc = raw.toLowerCase().trim();
    if (!normDesc || normDesc === normTitle || normDesc.startsWith(normTitle.slice(0, 30))) return null;
    return raw.slice(0, 140) + (raw.length > 140 ? "…" : "");
  }, [description, details, title]);

  const termExplanation = useMemo(() => findTermExplanation(title, lang), [title, lang]);

  const propagationSources = useMemo(() => {
    if (!sources || sources.length <= 1) return null;
    return sources.slice(0, 4).map(s => typeof s === "string" ? s : (s as any).name || (s as any).platform || "");
  }, [sources]);

  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className={`bg-card rounded-md border cursor-pointer w-full relative overflow-hidden
        transition-all duration-200 ease-[cubic-bezier(0.21,0.47,0.32,0.98)]
        ${isSelected
          ? "border-l-[3px] shadow-elevation-md" : "border-border/25 shadow-elevation-xs hover:shadow-elevation-sm hover:-translate-y-[1px]"}`}
      style={{
        padding: compact ? "8px 10px" : "10px 12px",
        borderLeftColor: isSelected ? `hsl(${SOURCE_COLORS[sourceType] || "var(--source-press)"})` : undefined,
      }}
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `hsl(${SOURCE_COLORS[sourceType] || "var(--source-press)"})` }} />

      {/* ① Source · time · country · badge */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onFilterPlatform?.(platform); }}
          className="flex items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity compact-btn">
          <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: `hsl(${SOURCE_COLORS[sourceType]})` }} />
          <span className="text-[10px] uppercase tracking-[0.06em] font-bold" style={{ color: `hsl(${SOURCE_COLORS[sourceType]})` }}>
            {platform}
          </span>
        </button>
        <span className="text-[9px] text-muted-foreground/25">·</span>
        <span className="text-[9px] text-muted-foreground">{formattedTime}</span>
        {flag && <span className="text-[11px]" title={countryCode}>{flag}</span>}
        {badge && (
          <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ml-auto ${badge.css}`}
            title={badge.explanation[lang] || badge.explanation.en}>
            {badge.icon} {badge.label[lang] || badge.label.en}
          </span>
        )}
        {!badge && <div className="flex-1" />}
        <button onClick={(e) => {
          e.stopPropagation();
          onSaveCard?.({ title, platform, category, country_code: countryCode, source_url: sourceUrl, description: contextSnippet || "" });
        }} className="compact-btn p-0.5 rounded-md text-muted-foreground/15 hover:text-foreground/50 transition-colors flex-shrink-0">
          <Bookmark className="w-3 h-3" />
        </button>
      </div>

      {/* ② Title */}
      <h3 className={`font-semibold text-foreground leading-snug mb-1 ${compact ? "text-[11px] line-clamp-1" : "text-[12px] line-clamp-2"}`}
        style={{ wordBreak: "break-word", overflow: "hidden", textOverflow: "ellipsis" }}>
        {decodeEntities(title)}
      </h3>

      {/* ③ Context */}
      {contextSnippet && !compact && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 mb-1.5">{decodeEntities(contextSnippet)}</p>
      )}

      {/* ④ Term explanation */}
      {termExplanation && !compact && (
        <div className="flex items-start gap-1.5 mb-1.5 px-2 py-1.5 rounded-md text-[9px] leading-relaxed bg-info-bg border-l-2 border-info-fg text-info-fg">
          <span className="flex-shrink-0">💡</span>
          <span className="line-clamp-2">{termExplanation}</span>
        </div>
      )}

      {/* ⑤ Tags */}
      {tags.length > 0 && !compact && (
        <div className="flex items-center gap-1 flex-wrap mb-1.5">
          {tags.map((tag, i) => (
            <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-[0.04em] ${tag.css}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ⑥ Sparkline + Metrics */}
      <div className="flex items-end gap-2 mt-1">
        <div className="flex-1 min-w-0" style={{ height: 22 }}>
          <SparklineChart data={sparkData || []} color={sparkHex} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showChange && (
            <span className={`text-[10px] font-bold ${changePositive ? "text-success-fg" : "text-destructive"}`}>
              {changePositive ? "↗" : "↘"}{change}
            </span>
          )}
          {showVolume && (
            <span className="text-[10px] font-semibold text-foreground tabular-nums">{volume}</span>
          )}
          {sources && sources.length > 1 && (
            <span className="text-[8px] text-muted-foreground tabular-nums" title={lang === "pt" ? `${sources.length} fontes confirmam` : `${sources.length} sources confirm`}>
              {sources.length}src
            </span>
          )}
        </div>
      </div>

      {/* ⑦ Propagation */}
      {propagationSources && !compact && (
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/15 overflow-hidden">
          <span className="text-[7px] text-muted-foreground/40 uppercase tracking-wider flex-shrink-0"
            title={lang === "pt" ? "Propagação: caminho entre fontes que cobrem esta tendência" : "Propagation: path between sources covering this trend"}>
            PROP
          </span>
          {propagationSources.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[8px] text-muted-foreground/25">→</span>}
              <span className="text-[8px] font-medium text-muted-foreground px-1 py-0.5 rounded bg-muted/40 truncate max-w-[60px]">{s}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Compact metrics */}
      {compact && (showVolume || showChange) && (
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
          {showVolume && <span className="font-medium tabular-nums">{volume}</span>}
          {showChange && <span className={`font-bold ${changePositive ? "text-success-fg" : "text-destructive"}`}>{change}</span>}
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(TimelineCard);

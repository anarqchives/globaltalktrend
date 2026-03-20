import React, { useState, useMemo } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { FilterState, countries } from "@/components/FilterBar";

interface FilterBlockProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

const CATEGORIES = [
  { value: "Todas", label: { pt: "Todas", en: "All", es: "Todas" } },
  { value: "Entretenimento", label: { pt: "Entretenimento", en: "Entertainment", es: "Entretenimiento" } },
  { value: "Tecnologia", label: { pt: "Tecnologia", en: "Technology", es: "Tecnología" } },
  { value: "Geopolítica", label: { pt: "Geopolítica", en: "Geopolitics", es: "Geopolítica" } },
  { value: "Esportes", label: { pt: "Esportes", en: "Sports", es: "Deportes" } },
  { value: "Ciências", label: { pt: "Ciências", en: "Sciences", es: "Ciencias" } },
  { value: "Cultura", label: { pt: "Cultura", en: "Culture", es: "Cultura" } },
  { value: "Economia", label: { pt: "Economia", en: "Economy", es: "Economía" } },
];

const SOURCE_TYPES = [
  { v: "Todas mídias", l: { pt: "Todas", en: "All", es: "Todas" } },
  { v: "Imprensa", l: { pt: "Imprensa", en: "Press", es: "Prensa" } },
  { v: "Redes sociais", l: { pt: "Social", en: "Social", es: "Social" } },
  { v: "Buscas (Google)", l: { pt: "Buscas", en: "Searches", es: "Búsquedas" } },
  { v: "Dados oficiais", l: { pt: "Oficial", en: "Official", es: "Oficial" } },
  { v: "Ciência", l: { pt: "Acadêmico", en: "Academic", es: "Académico" } },
  { v: "Multiplataforma", l: { pt: "Multi", en: "Multi", es: "Multi" } },
];

const PERIODS = [
  { v: "Última hora", l: { pt: "Última hora", en: "Last hour", es: "Última hora" } },
  { v: "Hoje", l: { pt: "Hoje", en: "Today", es: "Hoy" } },
  { v: "Últimas 24h", l: { pt: "24h", en: "24h", es: "24h" } },
  { v: "Esta semana", l: { pt: "Semana", en: "Week", es: "Semana" } },
  { v: "Última semana", l: { pt: "7 dias", en: "7 days", es: "7 días" } },
  { v: "Este mês", l: { pt: "Mês", en: "Month", es: "Mes" } },
];

const QUICK_COUNTRIES = [
  { value: "global", emoji: "🌐", label: "Global" },
  { value: "BR", emoji: "🇧🇷", label: "Brasil" },
  { value: "US", emoji: "🇺🇸", label: "EUA" },
  { value: "GB", emoji: "🇬🇧", label: "UK" },
  { value: "FR", emoji: "🇫🇷", label: "França" },
  { value: "DE", emoji: "🇩🇪", label: "Alemanha" },
  { value: "JP", emoji: "🇯🇵", label: "Japão" },
];

const defaultFilters: FilterState = { country: "global", period: "Hoje", category: "Todas", type: "Todas mídias", query: "" };

const FilterBlock = ({ filters, onChange, onReset }: FilterBlockProps) => {
  const { lang } = useLanguage();
  const [moreCountries, setMoreCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const update = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });

  const hasActive = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type;

  const activePills = useMemo(() => {
    const pills: { key: keyof FilterState; label: string; def: string }[] = [];
    if (filters.country !== "global") {
      const all = countries.flatMap(g => g.items);
      const found = all.find(c => c.value === filters.country);
      pills.push({ key: "country", label: found?.label || filters.country, def: "global" });
    }
    if (filters.category !== "Todas") pills.push({ key: "category", label: filters.category, def: "Todas" });
    if (filters.type !== "Todas mídias") pills.push({ key: "type", label: filters.type, def: "Todas mídias" });
    if (filters.period !== "Hoje") pills.push({ key: "period", label: filters.period, def: "Hoje" });
    return pills;
  }, [filters]);

  const filteredCountries = useMemo(() =>
    countries.map(g => ({
      ...g,
      items: g.items.filter(c => !countrySearch || c.label.toLowerCase().includes(countrySearch.toLowerCase())),
    })).filter(g => g.items.length > 0),
    [countrySearch]
  );

  return (
    <div className="sticky top-12 z-40 bg-background/90 backdrop-blur-md border-b border-border/25">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-2">
        {/* Row 1: Country pills + Category pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Country pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {QUICK_COUNTRIES.map(c => (
              <button key={c.value} onClick={() => update("country", c.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.country === c.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}>
                <span className="text-[12px]">{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
            <button onClick={() => setMoreCountries(!moreCountries)}
              className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap shrink-0">
              +{countries.flatMap(g => g.items).length - QUICK_COUNTRIES.length}
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${moreCountries ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="w-px h-4 bg-border/40 hidden md:block" />

          {/* Category pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => update("category", c.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.category === c.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}>
                {c.label[lang as keyof typeof c.label] || c.label.pt}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Source type + Period + Active pills + Reset */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Source type */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {SOURCE_TYPES.map(s => (
              <button key={s.v} onClick={() => update("type", s.v)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.type === s.v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
                }`}>
                {s.l[lang as keyof typeof s.l] || s.l.pt}
              </button>
            ))}
          </div>

          <div className="w-px h-3 bg-border/30" />

          {/* Period */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {PERIODS.map(p => (
              <button key={p.v} onClick={() => update("period", p.v)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  filters.period === p.v
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
                }`}>
                {p.l[lang as keyof typeof p.l] || p.l.pt}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Active filter pills */}
          {activePills.map(pill => (
            <span key={pill.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/5 border border-border/30 text-[9px] font-medium text-foreground">
              {pill.label}
              <button onClick={() => update(pill.key, pill.def)} className="hover:text-destructive transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {hasActive && (
            <button onClick={onReset} className="text-[9px] font-medium text-destructive hover:underline transition-colors">
              {lang === "pt" ? "Limpar" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded country picker */}
      <AnimatePresence>
        {moreCountries && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder={lang === "pt" ? "Buscar país..." : "Search country..."}
                    value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                    className="w-full h-7 pl-7 pr-2 rounded-md border border-border bg-card text-[10px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40" />
                </div>
                <button onClick={() => setMoreCountries(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto scrollbar-thin">
                {filteredCountries.flatMap(g => g.items).map(c => (
                  <button key={c.value} onClick={() => { update("country", c.value); setMoreCountries(false); }}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      filters.country === c.value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(FilterBlock);

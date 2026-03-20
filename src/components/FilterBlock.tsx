import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, ChevronDown, Search, MapPin, Clock, Layers, Radio, RotateCcw, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { FilterState, countries } from "@/components/FilterBar";

interface FilterBlockProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  onSaveFilter?: () => void;
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

/* Dropdown pill component */
function FilterDropdown({ 
  icon: Icon, label, value, defaultValue, options, onSelect, align = "left" 
}: { 
  icon: React.ElementType; label: string; value: string; defaultValue: string;
  options: { value: string; label: string; emoji?: string }[];
  onSelect: (v: string) => void; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== defaultValue;
  const displayLabel = options.find(o => o.value === value)?.label || label;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[10px] font-medium transition-all border ${
          isActive
            ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
            : "bg-card text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
        }`}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate max-w-[90px]">{displayLabel}</span>
        <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(defaultValue); }}
            className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-1.5 z-50 min-w-[160px] max-h-[280px] overflow-y-auto rounded-xl border border-border/50 bg-popover shadow-lg backdrop-blur-xl scrollbar-thin ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="p-1">
              {options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onSelect(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    value === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.emoji && <span className="text-sm">{opt.emoji}</span>}
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Country dropdown with search */
function CountryDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== "global";
  
  const currentLabel = useMemo(() => {
    if (value === "global") return "Global";
    const quick = QUICK_COUNTRIES.find(c => c.value === value);
    if (quick) return `${quick.emoji} ${quick.label}`;
    const all = countries.flatMap(g => g.items);
    const found = all.find(c => c.value === value);
    return found?.label || value;
  }, [value]);

  const filteredCountries = useMemo(() =>
    countries.map(g => ({
      ...g,
      items: g.items.filter(c => !search || c.label.toLowerCase().includes(search.toLowerCase())),
    })).filter(g => g.items.length > 0),
    [search]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 h-[26px] px-2.5 rounded-full text-[10px] font-medium transition-all border ${
          isActive
            ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
            : "bg-card text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
        }`}
      >
        <MapPin className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate max-w-[90px]">{currentLabel}</span>
        <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect("global"); }}
            className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 z-50 w-[260px] rounded-xl border border-border/50 bg-popover shadow-lg backdrop-blur-xl"
          >
            <div className="p-2 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder={lang === "pt" ? "Buscar país..." : "Search country..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-8 pl-7 pr-2 rounded-lg border border-border bg-background text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {QUICK_COUNTRIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { onSelect(c.value); setOpen(false); setSearch(""); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                      value === c.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs">{c.emoji}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[200px] overflow-y-auto scrollbar-thin p-1">
              {filteredCountries.map(g => (
                <div key={g.group}>
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{g.group}</div>
                  {g.items.map(c => (
                    <button
                      key={c.value}
                      onClick={() => { onSelect(c.value); setOpen(false); setSearch(""); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        value === c.value ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FilterBlock = ({ filters, onChange, onReset, onSaveFilter }: FilterBlockProps) => {
  const { lang } = useLanguage();
  const update = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });

  const hasActive = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type;

  const categoryOptions = CATEGORIES.map(c => ({
    value: c.value,
    label: c.label[lang as keyof typeof c.label] || c.label.pt,
  }));

  const sourceOptions = SOURCE_TYPES.map(s => ({
    value: s.v,
    label: s.l[lang as keyof typeof s.l] || s.l.pt,
  }));

  const periodOptions = PERIODS.map(p => ({
    value: p.v,
    label: p.l[lang as keyof typeof p.l] || p.l.pt,
  }));



  return (
    <div className="sticky top-12 z-40 bg-background/90 backdrop-blur-md border-b border-border/25">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CountryDropdown value={filters.country} onSelect={(v) => update("country", v)} />
          
          <FilterDropdown
            icon={Clock}
            label={lang === "pt" ? "Período" : "Period"}
            value={filters.period}
            defaultValue="Hoje"
            options={periodOptions}
            onSelect={(v) => update("period", v)}
          />
          
          <FilterDropdown
            icon={Layers}
            label={lang === "pt" ? "Categorias" : "Categories"}
            value={filters.category}
            defaultValue="Todas"
            options={categoryOptions}
            onSelect={(v) => update("category", v)}
          />
          
          <FilterDropdown
            icon={Radio}
            label={lang === "pt" ? "Mídia" : "Media"}
            value={filters.type}
            defaultValue="Todas mídias"
            options={sourceOptions}
            onSelect={(v) => update("type", v)}
          />



          {/* Separator */}
          <div className="w-px h-4 bg-border/40 mx-0.5 hidden sm:block" />

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={!hasActive}
            title={lang === "pt" ? "Limpar filtros" : "Reset filters"}
            className={`flex items-center gap-1 h-[26px] px-2 rounded-full text-[10px] font-medium transition-all ${
              hasActive
                ? "text-foreground bg-muted hover:bg-destructive/10 hover:text-destructive"
                : "text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">{lang === "pt" ? "Limpar" : "Reset"}</span>
          </button>

          {/* Save filter */}
          {onSaveFilter && (
            <button
              onClick={onSaveFilter}
              disabled={!hasActive}
              title={lang === "pt" ? "Salvar filtro" : "Save filter"}
              className={`flex items-center gap-1 h-[26px] px-2 rounded-full text-[10px] font-medium transition-all ${
                hasActive
                  ? "text-foreground bg-muted hover:bg-primary/10 hover:text-primary"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span className="hidden sm:inline">{lang === "pt" ? "Salvar" : "Save"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterBlock);

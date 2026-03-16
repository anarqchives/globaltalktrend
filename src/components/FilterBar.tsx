import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Globe, Calendar, LayoutGrid, Layers, ChevronDown, X, Bell, RotateCcw, BarChart3, Search, Bookmark } from "lucide-react";
import { useLanguage, LangCode } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
  query: "",
};

export interface FilterState {
  country: string;
  period: string;
  category: string;
  type: string;
  query: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onForceReset?: () => void;
  onSaveFilter?: () => void;
  isLoggedIn?: boolean;
  activeView?: string;
  onViewChange?: (view: string) => void;
  viewCounts?: Record<string, number>;
  workspaceMode?: "explorer" | "analyst";
  onChangeWorkspaceMode?: (mode: "explorer" | "analyst") => void;
  onOpenSavedCollections?: () => void;
}

export const countries = [
  { group: "Global", items: [{ value: "global", label: "🌎 Global" }] },
  { group: "América do Sul", items: [
    { value: "BR", label: "🇧🇷 Brasil" }, { value: "AR", label: "🇦🇷 Argentina" },
    { value: "CO", label: "🇨🇴 Colômbia" }, { value: "CL", label: "🇨🇱 Chile" },
    { value: "PE", label: "🇵🇪 Peru" }, { value: "VE", label: "🇻🇪 Venezuela" }]
  },
  { group: "América do Norte", items: [
    { value: "US", label: "🇺🇸 EUA" }, { value: "CA", label: "🇨🇦 Canadá" }, { value: "MX", label: "🇲🇽 México" }]
  },
  { group: "Europa", items: [
    { value: "GB", label: "🇬🇧 Reino Unido" }, { value: "FR", label: "🇫🇷 França" },
    { value: "DE", label: "🇩🇪 Alemanha" }, { value: "ES", label: "🇪🇸 Espanha" },
    { value: "IT", label: "🇮🇹 Itália" }, { value: "PT", label: "🇵🇹 Portugal" },
    { value: "NL", label: "🇳🇱 Países Baixos" }, { value: "SE", label: "🇸🇪 Suécia" },
    { value: "NO", label: "🇳🇴 Noruega" }, { value: "DK", label: "🇩🇰 Dinamarca" },
    { value: "FI", label: "🇫🇮 Finlândia" }, { value: "CH", label: "🇨🇭 Suíça" },
    { value: "AT", label: "🇦🇹 Áustria" }, { value: "BE", label: "🇧🇪 Bélgica" },
    { value: "IE", label: "🇮🇪 Irlanda" }, { value: "PL", label: "🇵🇱 Polônia" },
    { value: "UA", label: "🇺🇦 Ucrânia" }, { value: "GR", label: "🇬🇷 Grécia" },
    { value: "RU", label: "🇷🇺 Rússia" }, { value: "TR", label: "🇹🇷 Turquia" }]
  },
  { group: "Ásia", items: [
    { value: "JP", label: "🇯🇵 Japão" }, { value: "KR", label: "🇰🇷 Coreia do Sul" },
    { value: "IN", label: "🇮🇳 Índia" }, { value: "CN", label: "🇨🇳 China" },
    { value: "ID", label: "🇮🇩 Indonésia" }, { value: "MY", label: "🇲🇾 Malásia" },
    { value: "SG", label: "🇸🇬 Singapura" }, { value: "TH", label: "🇹🇭 Tailândia" },
    { value: "VN", label: "🇻🇳 Vietnã" }, { value: "PH", label: "🇵🇭 Filipinas" },
    { value: "PK", label: "🇵🇰 Paquistão" }, { value: "BD", label: "🇧🇩 Bangladesh" },
    { value: "SA", label: "🇸🇦 Arábia Saudita" }, { value: "AE", label: "🇦🇪 Emirados Árabes" },
    { value: "IL", label: "🇮🇱 Israel" }, { value: "PS", label: "🇵🇸 Palestina" },
    { value: "IR", label: "🇮🇷 Irã" }, { value: "IQ", label: "🇮🇶 Iraque" },
    { value: "SY", label: "🇸🇾 Síria" }, { value: "LB", label: "🇱🇧 Líbano" },
    { value: "JO", label: "🇯🇴 Jordânia" }]
  },
  { group: "África", items: [
    { value: "ZA", label: "🇿🇦 África do Sul" }, { value: "NG", label: "🇳🇬 Nigéria" },
    { value: "EG", label: "🇪🇬 Egito" }, { value: "KE", label: "🇰🇪 Quênia" },
    { value: "MA", label: "🇲🇦 Marrocos" }, { value: "DZ", label: "🇩🇿 Argélia" },
    { value: "AO", label: "🇦🇴 Angola" }, { value: "MZ", label: "🇲🇿 Moçambique" },
    { value: "CV", label: "🇨🇻 Cabo Verde" }, { value: "ET", label: "🇪🇹 Etiópia" }]
  },
  { group: "Oceania", items: [
    { value: "AU", label: "🇦🇺 Austrália" }, { value: "NZ", label: "🇳🇿 Nova Zelândia" }]
  }
];

interface ChipDropdownProps {
  chipLabel: string;
  value: string;
  options: { value: string; label: string }[];
  isActive: boolean;
  icon: React.ReactNode;
  onChange: (value: string) => void;
  onClear: () => void;
  isGrouped?: boolean;
  groups?: typeof countries;
}

function ChipDropdown({ chipLabel, value, options, isActive, icon, onChange, onClear, isGrouped, groups }: ChipDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate position when opening
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedLabel = isGrouped && groups
    ? groups.flatMap(g => g.items).find(c => c.value === value)?.label
    : options.find(o => o.value === value)?.label;

  const displayText = isActive && selectedLabel
    ? selectedLabel.replace(/^[^\w\s]*\s*/, '')
    : chipLabel;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center transition-all duration-150 h-[28px] sm:h-[32px] px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 border-[1.5px] ${
          isActive
            ? "border-primary bg-primary text-primary-foreground shadow-sm"
            : "border-border bg-card text-foreground/70 hover:border-primary/40 hover:bg-accent hover:text-foreground"
        }`}
      >
        <span className="flex-shrink-0 flex items-center">{icon}</span>
        <span className="truncate max-w-[72px] sm:max-w-[100px]">{displayText}</span>
        {isActive ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            className="flex-shrink-0 cursor-pointer hover:opacity-70 ml-0.5 flex items-center"
          >
            <X size={10} />
          </span>
        ) : (
          <ChevronDown size={10} className="flex-shrink-0 opacity-50 ml-0.5" />
        )}
      </button>

      {/* Portal-rendered dropdown */}
      {open && pos && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="fixed z-[9999] bg-popover border border-border rounded-xl p-1 shadow-xl"
            style={{ top: pos.top, left: pos.left, minWidth: 200, maxHeight: 360, overflowY: "auto" }}
          >
            {isGrouped && groups ? (
              groups.map(group => (
                <div key={group.group}>
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">{group.group}</div>
                  {group.items.map(item => (
                    <button
                      key={item.value}
                      onClick={() => { onChange(item.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-lg transition-colors text-[12px] ${
                        value === item.value
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{item.label}</span>
                      {value === item.value && <span className="text-primary text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between rounded-lg transition-colors text-[12px] ${
                    value === opt.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <span className="text-primary text-xs">✓</span>}
                </button>
              ))
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const FilterBar = ({ filters, onChange, onForceReset, onSaveFilter, isLoggedIn, workspaceMode, onChangeWorkspaceMode, onOpenSavedCollections }: FilterBarProps) => {
  const { t, lang } = useLanguage();

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type ||
    filters.query !== defaultFilters.query;

  const healthLabel: Record<string, string> = { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit", it: "Salute", zh: "健康", ja: "健康", ko: "건강", ar: "صحة", hi: "स्वास्थ्य", ru: "Здоровье" };

  const periodOptions = [
    { value: "Última hora", label: t("lastHour") },
    { value: "Hoje", label: t("today") },
    { value: "Esta semana", label: t("thisWeek") },
    { value: "Este mês", label: t("thisMonth") }
  ];

  const categoryOptions = [
    { value: "Todas", label: t("all") },
    { value: "Política", label: t("politics") },
    { value: "Economia", label: t("business") },
    { value: "Tecnologia", label: t("technology") },
    { value: "Ciência", label: t("science") },
    { value: "Saúde", label: healthLabel[lang] || "Saúde" },
    { value: "Esportes", label: t("sports") },
    { value: "Entretenimento", label: t("entertainment") },
    { value: "Cultura", label: t("culture") }
  ];

  const typeOptions = [
    { value: "Todas mídias", label: t("allMedia") },
    { value: "Multiplataforma", label: "Multiplataforma" },
    { value: "Redes sociais", label: t("socialMedia") },
    { value: "Imprensa", label: t("press") },
    { value: "Buscas (Google)", label: t("searches") },
    { value: "Dados oficiais", label: "Dados Oficiais" }
  ];

  // Active filter summary
  const activeFilterLabels: string[] = [];
  if (filters.country !== defaultFilters.country) {
    const cl = countries.flatMap(g => g.items).find(c => c.value === filters.country)?.label?.replace(/^[^\w\s]*\s*/, '');
    if (cl) activeFilterLabels.push(cl);
  }
  if (filters.period !== defaultFilters.period) activeFilterLabels.push(filters.period);
  if (filters.category !== defaultFilters.category) activeFilterLabels.push(filters.category);
  if (filters.type !== defaultFilters.type) activeFilterLabels.push(filters.type);
  if (filters.query) activeFilterLabels.push(`"${filters.query}"`);

  return (
    <div className="sticky top-[52px] z-40 bg-card dark:bg-card border-b-2 border-border shadow-sm" style={{ minHeight: 44 }}>
      <div className="h-full px-2 sm:px-4 py-1 flex items-center gap-1 sm:gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex items-center h-[28px] sm:h-[32px] w-[140px] sm:w-[180px]">
          <Search className="absolute left-2 text-muted-foreground w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <input
            type="text"
            placeholder={lang === "pt" ? "Buscar..." : "Search..."}
            value={filters.query || ""}
            onChange={(e) => update("query", e.target.value)}
            className="w-full h-full pl-6 sm:pl-7 pr-2 rounded-lg border border-border bg-card text-[11px] sm:text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {filters.query && (
            <button
              onClick={() => update("query", "")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <ChipDropdown
          chipLabel="Global"
          value={filters.country}
          options={[]}
          isActive={filters.country !== defaultFilters.country}
          icon={<Globe size={13} />}
          onChange={(v) => update("country", v)}
          onClear={() => update("country", defaultFilters.country)}
          isGrouped
          groups={countries}
        />
        <ChipDropdown
          chipLabel={lang === "pt" ? "Hoje" : "Today"}
          value={filters.period}
          options={periodOptions}
          isActive={filters.period !== defaultFilters.period}
          icon={<Calendar size={13} />}
          onChange={(v) => update("period", v)}
          onClear={() => update("period", defaultFilters.period)}
        />
        <ChipDropdown
          chipLabel={lang === "pt" ? "Categoria" : "Category"}
          value={filters.category}
          options={categoryOptions}
          isActive={filters.category !== defaultFilters.category}
          icon={<LayoutGrid size={13} />}
          onChange={(v) => update("category", v)}
          onClear={() => update("category", defaultFilters.category)}
        />
        <ChipDropdown
          chipLabel={lang === "pt" ? "Mídia" : "Media"}
          value={filters.type}
          options={typeOptions}
          isActive={filters.type !== defaultFilters.type}
          icon={<Layers size={13} />}
          onChange={(v) => update("type", v)}
          onClear={() => update("type", defaultFilters.type)}
        />

        {/* Reset button */}
        {isFiltered && (
          <button
            onClick={() => { onChange(defaultFilters); onForceReset?.(); }}
            className="flex items-center justify-center group w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex-shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
            aria-label={lang === "pt" ? "Limpar filtros" : "Clear filters"}
            title={lang === "pt" ? "Limpar filtros" : "Clear filters"}
          >
            <RotateCcw size={12} className="group-hover:animate-[spin_0.3s_ease-in-out]" />
          </button>
        )}

        {/* Alert bell */}
        <button
          onClick={() => onSaveFilter?.()}
          className="flex items-center justify-center w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex-shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground transition-all duration-150"
          aria-label={lang === "pt" ? "Criar alerta" : "Create alert"}
          title={lang === "pt" ? "Criar alerta" : "Create alert"}
        >
          <Bell size={12} />
        </button>

        {/* Saved Collections */}
        <button
          onClick={() => onOpenSavedCollections?.()}
          className="flex items-center justify-center w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex-shrink-0 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground transition-all duration-150"
          aria-label={lang === "pt" ? "Coleções Salvas" : "Saved Collections"}
          title={lang === "pt" ? "Coleções Salvas" : "Saved Collections"}
        >
          <Bookmark size={12} />
        </button>

        {/* Active filter summary — hidden on mobile to save space */}
        {isFiltered && activeFilterLabels.length > 0 && (
          <span className="hidden sm:inline text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap ml-1">
            {lang === "pt" ? "Filtrando" : "Filtering"}: <span className="font-medium text-foreground/70">{activeFilterLabels.join(" · ")}</span>
          </span>
        )}

        {/* Spacer to push toggle to the right */}
        <div className="flex-1 min-w-4" />

        {/* Workspace Mode Toggle */}
        {workspaceMode && onChangeWorkspaceMode && (
          <div className="hidden sm:flex bg-secondary/30 p-0.5 rounded-lg border border-border/40">
            <button
              onClick={() => onChangeWorkspaceMode("explorer")}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-md transition-all ${
                workspaceMode === "explorer" ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={13} />
              <span>{lang === "pt" ? "Explorador" : "Explorer"}</span>
            </button>
            <button
              onClick={() => onChangeWorkspaceMode("analyst")}
              className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-md transition-all ${
                workspaceMode === "analyst" ? "bg-background shadow-sm text-foreground border border-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 size={13} />
              <span>{lang === "pt" ? "Analista" : "Analyst"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FilterBar);

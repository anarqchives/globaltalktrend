import { useState, useRef, useEffect } from "react";
import { Globe, Calendar, LayoutGrid, Layers, ChevronDown, X, Bell, RotateCcw } from "lucide-react";
import { useLanguage, LangCode } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias"
};

export interface FilterState {
  country: string;
  period: string;
  category: string;
  type: string;
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // For active state, show the selected value label; otherwise show chipLabel
  const selectedLabel = isGrouped && groups
    ? groups.flatMap(g => g.items).find(c => c.value === value)?.label
    : options.find(o => o.value === value)?.label;

  const displayText = isActive && selectedLabel
    ? selectedLabel.replace(/^[^\w\s]*\s*/, '')
    : chipLabel;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center transition-all duration-[120ms]"
        style={{
          height: 30,
          padding: "0 10px",
          borderRadius: 8,
          border: isActive ? "1px solid hsl(var(--foreground))" : "1px solid #E5E7EB",
          background: isActive ? "hsl(var(--foreground))" : "hsl(var(--card))",
          color: isActive ? "hsl(var(--background))" : "#374151",
          fontSize: 12,
          fontWeight: 500,
          gap: 5,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.borderColor = "#9CA3AF";
            e.currentTarget.style.background = "#F9FAFB";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.borderColor = "#E5E7EB";
            e.currentTarget.style.background = "hsl(var(--card))";
          }
        }}
      >
        <span className="flex-shrink-0" style={{ display: "flex", alignItems: "center" }}>{icon}</span>
        <span className="truncate max-w-[100px]">{displayText}</span>
        {isActive ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            className="flex-shrink-0 cursor-pointer hover:opacity-70"
            style={{ marginLeft: 4, display: "flex", alignItems: "center" }}
          >
            <X size={10} />
          </span>
        ) : (
          <ChevronDown size={10} className="flex-shrink-0 opacity-60" style={{ marginLeft: 4 }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl p-1"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08)", minWidth: 180, maxHeight: 320, overflowY: "auto" }}
          >
            {isGrouped && groups ? (
              groups.map(group => (
                <div key={group.group}>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">{group.group}</div>
                  {group.items.map(item => (
                    <button
                      key={item.value}
                      onClick={() => { onChange(item.value); setOpen(false); }}
                      className={`w-full text-left px-2.5 flex items-center justify-between rounded-lg transition-colors ${
                        value === item.value
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                      style={{ height: 32, fontSize: 12 }}
                    >
                      <span>{item.label}</span>
                      {value === item.value && <span className="text-primary">✓</span>}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-2.5 flex items-center justify-between rounded-lg transition-colors ${
                    value === opt.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground"
                  }`}
                  style={{ height: 32, fontSize: 12 }}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <span className="text-primary">✓</span>}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FilterBar = ({ filters, onChange, onForceReset, onSaveFilter, isLoggedIn }: FilterBarProps) => {
  const { t, lang } = useLanguage();

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type;

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

  return (
    <div className="sticky top-[52px] z-40 bg-card/95 dark:bg-card/95 backdrop-blur-sm border-b border-border" style={{ height: 44 }}>
      <div className="h-full px-4 flex items-center" style={{ gap: 8 }}>
        <ChipDropdown
          chipLabel="Global"
          value={filters.country}
          options={[]}
          isActive={filters.country !== defaultFilters.country}
          icon={<Globe size={12} />}
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
          icon={<Calendar size={12} />}
          onChange={(v) => update("period", v)}
          onClear={() => update("period", defaultFilters.period)}
        />
        <ChipDropdown
          chipLabel={lang === "pt" ? "Categoria" : "Category"}
          value={filters.category}
          options={categoryOptions}
          isActive={filters.category !== defaultFilters.category}
          icon={<LayoutGrid size={12} />}
          onChange={(v) => update("category", v)}
          onClear={() => update("category", defaultFilters.category)}
        />
        <ChipDropdown
          chipLabel={lang === "pt" ? "Mídia" : "Media"}
          value={filters.type}
          options={typeOptions}
          isActive={filters.type !== defaultFilters.type}
          icon={<Layers size={12} />}
          onChange={(v) => update("type", v)}
          onClear={() => update("type", defaultFilters.type)}
        />

        {/* Spacer before action buttons */}
        <div style={{ width: 8, flexShrink: 0 }} />

        {/* Reset button — only when filters active */}
        {isFiltered && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { onChange(defaultFilters); onForceReset?.(); }}
                className="flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all group"
                style={{ width: 28, height: 28, flexShrink: 0 }}
                aria-label={lang === "pt" ? "Limpar filtros" : "Clear filters"}
              >
                <RotateCcw size={14} className="group-hover:animate-[spin_0.3s_ease-in-out]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[10px]">{lang === "pt" ? "Limpar filtros" : "Clear filters"}</TooltipContent>
          </Tooltip>
        )}

        {/* Alert bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSaveFilter?.()}
              className="flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
              style={{ width: 28, height: 28, flexShrink: 0 }}
              aria-label={lang === "pt" ? "Criar alerta" : "Create alert"}
            >
              <Bell size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[10px]">{lang === "pt" ? "Criar alerta" : "Create alert"}</TooltipContent>
        </Tooltip>

        <div className="flex-1" />
      </div>
    </div>
  );
};

export default FilterBar;

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, ChevronDown, Bell, X } from "lucide-react";
import { useLanguage, LangCode } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

const selectClass = "appearance-none bg-card text-foreground font-medium pl-2.5 pr-7 rounded-lg cursor-pointer min-w-0 hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 box-border touch-manipulation border border-border" + " " + "h-8 text-xs";

const FilterBar = ({ filters, onChange, onForceReset, onSaveFilter, isLoggedIn }: FilterBarProps) => {
  const { t, lang } = useLanguage();

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type;

  const isCountryFiltered = filters.country !== defaultFilters.country;
  const isPeriodFiltered = filters.period !== defaultFilters.period;
  const isCategoryFiltered = filters.category !== defaultFilters.category;
  const isTypeFiltered = filters.type !== defaultFilters.type;

  const periodOptions = [
    { value: "Última hora", label: t("lastHour") },
    { value: "Hoje", label: t("today") },
    { value: "Esta semana", label: t("thisWeek") },
    { value: "Este mês", label: t("thisMonth") }
  ];

  const healthLabel: Record<string, string> = { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit", it: "Salute", zh: "健康", ja: "健康", ko: "건강", ar: "صحة", hi: "स्वास्थ्य", ru: "Здоровье" };

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

  const renderFilterChip = (
    value: string,
    options: { value: string; label: string }[],
    key: keyof FilterState,
    isActive: boolean,
    label: string,
    isGrouped?: boolean,
    groups?: typeof countries,
  ) => (
    <div className="relative flex-shrink-0">
      {isGrouped && groups ? (
        <select
          className={`${selectClass} ${isActive ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : ''}`}
          value={value}
          onChange={(e) => update(key, e.target.value)}
          aria-label={label}
        >
          {groups.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </optgroup>
          ))}
        </select>
      ) : (
        <select
          className={`${selectClass} ${isActive ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : ''}`}
          value={value}
          onChange={(e) => update(key, e.target.value)}
          aria-label={label}
        >
          {options.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      )}
      {isActive ? (
        <button
          onClick={() => update(key, defaultFilters[key])}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      ) : (
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
      )}
    </div>
  );

  return (
    <div className="sticky top-[52px] z-40 bg-card/95 backdrop-blur-sm border-b border-border">
      {/* ROW 1: Filters — 40px */}
      <div className="h-10 px-3 md:px-6 flex items-center gap-sp-2 overflow-x-auto scrollbar-thin flex-nowrap" style={{ WebkitOverflowScrolling: 'touch' }}>
        {renderFilterChip(filters.country, [], "country", isCountryFiltered, t("country"), true, countries)}
        {renderFilterChip(filters.period, periodOptions, "period", isPeriodFiltered, t("period"))}
        {renderFilterChip(filters.category, categoryOptions, "category", isCategoryFiltered, t("category"))}
        {renderFilterChip(filters.type, typeOptions, "type", isTypeFiltered, t("type"))}

        <div className="flex-1" />

        {/* Alert bell */}
        {isLoggedIn && onSaveFilter && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSaveFilter}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-primary bg-primary/6 hover:bg-primary hover:text-primary-foreground transition-all flex-shrink-0 min-w-[44px] min-h-[44px]"
                aria-label={t("createAlert")}
              >
                <Bell className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-caption">{t("createAlert")}</TooltipContent>
          </Tooltip>
        )}

        {/* Clear filters — text link style */}
        {isFiltered && (
          <button
            onClick={() => { onChange(defaultFilters); onForceReset?.(); }}
            className="flex items-center gap-1 px-2 text-caption font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 whitespace-nowrap min-h-[44px]"
          >
            <RotateCcw className="w-3 h-3" />
            {lang === "pt" ? "Limpar filtros" : "Clear filters"}
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;

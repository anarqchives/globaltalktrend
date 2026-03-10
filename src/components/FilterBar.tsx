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
  /* View mode tabs */
  activeView?: string;
  onViewChange?: (view: string) => void;
  viewCounts?: Record<string, number>;
}

export const countries = [
{ group: "Global", items: [{ value: "global", label: "🌎 Global" }] },
{ group: "América do Sul", items: [
  { value: "BR", label: "🇧🇷 Brasil" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "CO", label: "🇨🇴 Colômbia" },
  { value: "CL", label: "🇨🇱 Chile" },
  { value: "PE", label: "🇵🇪 Peru" },
  { value: "VE", label: "🇻🇪 Venezuela" }]
},
{ group: "América do Norte", items: [
  { value: "US", label: "🇺🇸 EUA" },
  { value: "CA", label: "🇨🇦 Canadá" },
  { value: "MX", label: "🇲🇽 México" }]
},
{ group: "Europa", items: [
  { value: "GB", label: "🇬🇧 Reino Unido" },
  { value: "FR", label: "🇫🇷 França" },
  { value: "DE", label: "🇩🇪 Alemanha" },
  { value: "ES", label: "🇪🇸 Espanha" },
  { value: "IT", label: "🇮🇹 Itália" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "NL", label: "🇳🇱 Países Baixos" },
  { value: "SE", label: "🇸🇪 Suécia" },
  { value: "NO", label: "🇳🇴 Noruega" },
  { value: "DK", label: "🇩🇰 Dinamarca" },
  { value: "FI", label: "🇫🇮 Finlândia" },
  { value: "CH", label: "🇨🇭 Suíça" },
  { value: "AT", label: "🇦🇹 Áustria" },
  { value: "BE", label: "🇧🇪 Bélgica" },
  { value: "IE", label: "🇮🇪 Irlanda" },
  { value: "PL", label: "🇵🇱 Polônia" },
  { value: "UA", label: "🇺🇦 Ucrânia" },
  { value: "GR", label: "🇬🇷 Grécia" },
  { value: "RU", label: "🇷🇺 Rússia" },
  { value: "TR", label: "🇹🇷 Turquia" }]
},
{ group: "Ásia", items: [
  { value: "JP", label: "🇯🇵 Japão" },
  { value: "KR", label: "🇰🇷 Coreia do Sul" },
  { value: "IN", label: "🇮🇳 Índia" },
  { value: "CN", label: "🇨🇳 China" },
  { value: "ID", label: "🇮🇩 Indonésia" },
  { value: "MY", label: "🇲🇾 Malásia" },
  { value: "SG", label: "🇸🇬 Singapura" },
  { value: "TH", label: "🇹🇭 Tailândia" },
  { value: "VN", label: "🇻🇳 Vietnã" },
  { value: "PH", label: "🇵🇭 Filipinas" },
  { value: "PK", label: "🇵🇰 Paquistão" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "SA", label: "🇸🇦 Arábia Saudita" },
  { value: "AE", label: "🇦🇪 Emirados Árabes" },
  { value: "IL", label: "🇮🇱 Israel" },
  { value: "PS", label: "🇵🇸 Palestina" },
  { value: "IR", label: "🇮🇷 Irã" },
  { value: "IQ", label: "🇮🇶 Iraque" },
  { value: "SY", label: "🇸🇾 Síria" },
  { value: "LB", label: "🇱🇧 Líbano" },
  { value: "JO", label: "🇯🇴 Jordânia" }]
},
{ group: "África", items: [
  { value: "ZA", label: "🇿🇦 África do Sul" },
  { value: "NG", label: "🇳🇬 Nigéria" },
  { value: "EG", label: "🇪🇬 Egito" },
  { value: "KE", label: "🇰🇪 Quênia" },
  { value: "MA", label: "🇲🇦 Marrocos" },
  { value: "DZ", label: "🇩🇿 Argélia" },
  { value: "AO", label: "🇦🇴 Angola" },
  { value: "MZ", label: "🇲🇿 Moçambique" },
  { value: "CV", label: "🇨🇻 Cabo Verde" },
  { value: "ET", label: "🇪🇹 Etiópia" }]
},
{ group: "Oceania", items: [
  { value: "AU", label: "🇦🇺 Austrália" },
  { value: "NZ", label: "🇳🇿 Nova Zelândia" }]
}];

const selectClass = "appearance-none bg-secondary/50 text-foreground text-[12px] font-medium pl-3 pr-7 h-8 min-h-[32px] max-h-[32px] rounded-full cursor-pointer min-w-0 hover:bg-secondary/80 dark:bg-secondary/50 dark:hover:bg-secondary/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 box-border touch-manipulation border-none";

const FilterBar = ({ filters, onChange, onForceReset, onSaveFilter, isLoggedIn }: FilterBarProps) => {
  const { t } = useLanguage();

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
  { value: "Este mês", label: t("thisMonth") }];

  const healthLabel: Record<string, string> = { pt: "Saúde", en: "Health", es: "Salud", fr: "Santé", de: "Gesundheit", it: "Salute", zh: "健康", ja: "健康", ko: "건강", ar: "صحة", hi: "स्वास्थ्य", ru: "Здоровье" };
  const { lang: currentLang } = useLanguage();

  const categoryOptions = [
  { value: "Todas", label: t("all") },
  { value: "Política", label: t("politics") },
  { value: "Economia", label: t("business") },
  { value: "Tecnologia", label: t("technology") },
  { value: "Ciência", label: t("science") },
  { value: "Saúde", label: healthLabel[currentLang] || "Saúde" },
  { value: "Esportes", label: t("sports") },
  { value: "Entretenimento", label: t("entertainment") },
  { value: "Cultura", label: t("culture") }];

  const typeOptions = [
  { value: "Todas mídias", label: t("allMedia") },
  { value: "Multiplataforma", label: "Multiplataforma" },
  { value: "Redes sociais", label: t("socialMedia") },
  { value: "Imprensa", label: t("press") },
  { value: "Buscas (Google)", label: t("searches") },
  { value: "Dados oficiais", label: "Dados Oficiais" }];

  return (
    <div className="px-3 md:px-6 py-1.5 sticky top-12 z-40 bg-secondary/20 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-thin flex-nowrap pb-1 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Filter chips with inline reset × */}
        <div className="relative flex-shrink-0">
          <select className={selectClass} value={filters.country} onChange={(e) => update("country", e.target.value)} aria-label={t("country")}>
            {countries.map((group) =>
            <optgroup key={group.group} label={group.group}>
                {group.items.map((c) =>
              <option key={c.value} value={c.value}>{c.label}</option>
              )}
              </optgroup>
            )}
          </select>
          {isCountryFiltered ? (
            <button onClick={() => update("country", defaultFilters.country)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          )}
        </div>

        <div className="relative flex-shrink-0">
          <select className={selectClass} value={filters.period} onChange={(e) => update("period", e.target.value)} aria-label={t("period")}>
            {periodOptions.map((p) =>
            <option key={p.value} value={p.value}>{p.label}</option>
            )}
          </select>
          {isPeriodFiltered ? (
            <button onClick={() => update("period", defaultFilters.period)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          )}
        </div>

        <div className="relative flex-shrink-0">
          <select className={selectClass} value={filters.category} onChange={(e) => update("category", e.target.value)} aria-label={t("category")}>
            {categoryOptions.map((c) =>
            <option key={c.value} value={c.value}>{c.label}</option>
            )}
          </select>
          {isCategoryFiltered ? (
            <button onClick={() => update("category", defaultFilters.category)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          )}
        </div>

        <div className="relative flex-shrink-0">
          <select className={selectClass} value={filters.type} onChange={(e) => update("type", e.target.value)} aria-label={t("type")}>
            {typeOptions.map((opt) =>
            <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
          </select>
          {isTypeFiltered ? (
            <button onClick={() => update("type", defaultFilters.type)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          )}
        </div>

        {/* Create alert — icon only with tooltip */}
        {isLoggedIn && onSaveFilter &&
        <Tooltip>
            <TooltipTrigger asChild>
              <button
              onClick={onSaveFilter}
              className="flex items-center justify-center w-8 h-8 rounded-full text-primary bg-primary/6 hover:bg-primary hover:text-primary-foreground transition-all flex-shrink-0 focus:outline-none"
              aria-label={t("createAlert")}>
                <Bell className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              {t("createAlert")}
            </TooltipContent>
          </Tooltip>
        }

        <div className="flex-1" />

        {/* Force reset — only visible when filtered */}
        {isFiltered && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { onChange(defaultFilters); onForceReset?.(); }}
                className="flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium text-muted-foreground hover:bg-secondary/50 transition-colors flex-shrink-0 focus:outline-none"
                aria-label="Reset">
                <RotateCcw className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {t("forceResetTooltip")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>);
};

export default FilterBar;
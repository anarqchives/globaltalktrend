import { RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
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
}

const countries = [
  { group: "Global", items: [{ value: "global", label: "🌎 Global" }] },
  { group: "América do Sul", items: [
    { value: "BR", label: "🇧🇷 Brasil" },
    { value: "AR", label: "🇦🇷 Argentina" },
    { value: "CO", label: "🇨🇴 Colômbia" },
    { value: "CL", label: "🇨🇱 Chile" },
  ]},
  { group: "América do Norte", items: [
    { value: "US", label: "🇺🇸 EUA" },
    { value: "CA", label: "🇨🇦 Canadá" },
    { value: "MX", label: "🇲🇽 México" },
  ]},
  { group: "Europa", items: [
    { value: "GB", label: "🇬🇧 UK" },
    { value: "FR", label: "🇫🇷 França" },
    { value: "DE", label: "🇩🇪 Alemanha" },
    { value: "ES", label: "🇪🇸 Espanha" },
    { value: "IT", label: "🇮🇹 Itália" },
    { value: "PT", label: "🇵🇹 Portugal" },
  ]},
  { group: "Ásia", items: [
    { value: "JP", label: "🇯🇵 Japão" },
    { value: "KR", label: "🇰🇷 Coreia" },
    { value: "IN", label: "🇮🇳 Índia" },
    { value: "CN", label: "🇨🇳 China" },
  ]},
  { group: "África", items: [
    { value: "ZA", label: "🇿🇦 África do Sul" },
    { value: "NG", label: "🇳🇬 Nigéria" },
    { value: "EG", label: "🇪🇬 Egito" },
  ]},
  { group: "Oceania", items: [
    { value: "AU", label: "🇦🇺 Austrália" },
    { value: "NZ", label: "🇳🇿 Nova Zelândia" },
  ]},
];

const FilterBar = ({ filters, onChange }: FilterBarProps) => {
  const { t } = useLanguage();

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const isFiltered = filters.country !== defaultFilters.country ||
    filters.period !== defaultFilters.period ||
    filters.category !== defaultFilters.category ||
    filters.type !== defaultFilters.type;

  const periodOptions = [
    { value: "Última hora", label: t("lastHour") },
    { value: "Hoje", label: t("today") },
    { value: "Esta semana", label: t("thisWeek") },
    { value: "Este mês", label: t("thisMonth") },
  ];

  const categoryOptions = [
    { value: "Todas", label: t("all") },
    { value: "Política", label: t("politics") },
    { value: "Entretenimento", label: t("entertainment") },
    { value: "Tecnologia", label: t("technology") },
    { value: "Esportes", label: t("sports") },
    { value: "Cultura", label: t("culture") },
    { value: "Negócios/Finanças", label: t("business") },
    { value: "Ciência", label: t("science") },
  ];

  const typeOptions = [
    { value: "Todas mídias", label: t("allMedia") },
    { value: "Redes sociais", label: t("socialMedia") },
    { value: "Imprensa", label: t("press") },
    { value: "Buscas (Google)", label: t("searches") },
    { value: "Dados oficiais", label: "📊 Dados Oficiais" },
    { value: "Ciência", label: "🔬 Ciência" },
  ];

  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-1.5 bg-card/60 backdrop-blur-md border-b border-border overflow-x-auto scrollbar-thin">
      <select className="filter-pill-inline" value={filters.country} onChange={(e) => update("country", e.target.value)}>
        {countries.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </optgroup>
        ))}
      </select>
      <select className="filter-pill-inline" value={filters.period} onChange={(e) => update("period", e.target.value)}>
        {periodOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <select className="filter-pill-inline" value={filters.category} onChange={(e) => update("category", e.target.value)}>
        {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <select className="filter-pill-inline" value={filters.type} onChange={(e) => update("type", e.target.value)}>
        {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {isFiltered && (
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          title="Limpar filtros"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      )}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142, 72%, 45%)" }} />
        {t("live")}
      </div>
    </div>
  );
};

export default FilterBar;

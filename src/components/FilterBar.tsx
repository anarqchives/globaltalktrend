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

export const countries = [
  { group: "Global", items: [{ value: "global", label: "🌎 Global" }] },
  { group: "América do Sul", items: [
    { value: "BR", label: "🇧🇷 Brasil" },
    { value: "AR", label: "🇦🇷 Argentina" },
    { value: "CO", label: "🇨🇴 Colômbia" },
    { value: "CL", label: "🇨🇱 Chile" },
    { value: "PE", label: "🇵🇪 Peru" },
    { value: "VE", label: "🇻🇪 Venezuela" },
  ]},
  { group: "América do Norte", items: [
    { value: "US", label: "🇺🇸 EUA" },
    { value: "CA", label: "🇨🇦 Canadá" },
    { value: "MX", label: "🇲🇽 México" },
  ]},
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
    { value: "TR", label: "🇹🇷 Turquia" },
  ]},
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
  ]},
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
    { value: "ET", label: "🇪🇹 Etiópia" },
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
    { value: "Tech", label: "💻 Tech" },
    { value: "Enciclopédia", label: "📖 Enciclopédia" },
  ];

  return (
    <div className="flex flex-col bg-card/60 backdrop-blur-md border-b border-border">
      {/* Row 1: País, Período, Categoria */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-1.5 overflow-x-auto scrollbar-thin">
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
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex-shrink-0">Categoria:</span>
        <select className="filter-pill-inline" value={filters.category} onChange={(e) => update("category", e.target.value)}>
          {categoryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
      {/* Row 2: Tipo de Mídia (fonte) */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-1 overflow-x-auto scrollbar-thin border-t border-border/50">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex-shrink-0">Fonte:</span>
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => update("type", opt.value)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors flex-shrink-0 ${
              filters.type === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;

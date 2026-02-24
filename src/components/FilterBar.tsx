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

const selectClass = "appearance-none bg-transparent text-[#1d1d1f] dark:text-foreground text-[13px] font-medium px-3 py-2 rounded-lg cursor-pointer min-w-0 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors";

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
  ];

  return (
    <div
      className="mx-2 md:mx-4 my-1.5 rounded-[12px] bg-white/95 dark:bg-card/80 backdrop-blur-md"
      style={{ border: '1px solid #eaeaea', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
    >
      <div className="flex items-center gap-1 px-2 md:px-3 py-1.5 overflow-x-auto scrollbar-thin flex-nowrap">
        <select
          className={selectClass}
          value={filters.country}
          onChange={(e) => update("country", e.target.value)}
          style={{ outline: 'none' }}
        >
          {countries.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.period}
          onChange={(e) => update("period", e.target.value)}
          style={{ outline: 'none' }}
        >
          {periodOptions.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.category}
          onChange={(e) => update("category", e.target.value)}
          style={{ outline: 'none' }}
        >
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
          style={{ outline: 'none' }}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {isFiltered && (
          <button
            onClick={() => onChange(defaultFilters)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-medium text-primary hover:bg-black/[0.02] transition-colors flex-shrink-0"
            style={{ outline: 'none' }}
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
    </div>
  );
};

export default FilterBar;

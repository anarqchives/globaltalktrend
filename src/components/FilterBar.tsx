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

const categories = [
  "Todas", "Política", "Entretenimento", "Tecnologia",
  "Esportes", "Cultura", "Negócios/Finanças", "Ciência",
];

const periods = ["Última hora", "Hoje", "Esta semana", "Este mês"];
const types = ["Todas mídias", "Redes sociais", "Imprensa", "Buscas (Google)"];

const FilterBar = ({ filters, onChange }: FilterBarProps) => {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center px-4 md:px-6 py-2 bg-card/80 backdrop-blur-sm border-b border-border">
      <select className="filter-pill-compact" value={filters.country} onChange={(e) => update("country", e.target.value)}>
        {countries.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </optgroup>
        ))}
      </select>
      <select className="filter-pill-compact" value={filters.period} onChange={(e) => update("period", e.target.value)}>
        {periods.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select className="filter-pill-compact" value={filters.category} onChange={(e) => update("category", e.target.value)}>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="filter-pill-compact" value={filters.type} onChange={(e) => update("type", e.target.value)}>
        {types.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(142, 72%, 45%)" }} />
        ao vivo
      </div>
    </div>
  );
};

export default FilterBar;

import { useState } from "react";

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
    { value: "GB", label: "🇬🇧 Reino Unido" },
    { value: "FR", label: "🇫🇷 França" },
    { value: "DE", label: "🇩🇪 Alemanha" },
    { value: "ES", label: "🇪🇸 Espanha" },
    { value: "IT", label: "🇮🇹 Itália" },
    { value: "PT", label: "🇵🇹 Portugal" },
  ]},
  { group: "Ásia", items: [
    { value: "JP", label: "🇯🇵 Japão" },
    { value: "KR", label: "🇰🇷 Coreia do Sul" },
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
  "Esportes", "Cultura", "Negócios/Finanças", "Ciência", "Notícias",
];

const periods = ["Última hora", "Hoje", "Esta semana", "Este mês"];
const types = ["Todas mídias", "Redes sociais", "Imprensa", "Buscas (Google)"];

const FilterBar = ({ filters, onChange }: FilterBarProps) => {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-card rounded-[20px] p-4 md:p-5 border border-border flex flex-col sm:flex-row flex-wrap gap-3 md:gap-5 items-stretch sm:items-center" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">País</span>
        <select
          className="filter-pill"
          value={filters.country}
          onChange={(e) => update("country", e.target.value)}
        >
          {countries.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.items.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Período</span>
        <select
          className="filter-pill"
          value={filters.period}
          onChange={(e) => update("period", e.target.value)}
        >
          {periods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Categoria</span>
        <select
          className="filter-pill"
          value={filters.category}
          onChange={(e) => update("category", e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Tipo</span>
        <select
          className="filter-pill"
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
        >
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterBar;

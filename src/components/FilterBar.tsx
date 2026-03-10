import { useState, useEffect, useCallback } from "react";
import { RotateCcw, ChevronDown, Bell, Info } from "lucide-react";
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
        <div className="relative flex-shrink-0">
          <select
            className={selectClass}
            value={filters.country}
            onChange={(e) => update("country", e.target.value)}
            aria-label={t("country")}>
            
            {countries.map((group) =>
            <optgroup key={group.group} label={group.group}>
                {group.items.map((c) =>
              <option key={c.value} value={c.value}>{c.label}</option>
              )}
              </optgroup>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative flex-shrink-0">
          <select
            className={selectClass}
            value={filters.period}
            onChange={(e) => update("period", e.target.value)}
            aria-label={t("period")}>
            
            {periodOptions.map((p) =>
            <option key={p.value} value={p.value}>{p.label}</option>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative flex-shrink-0">
          <select
            className={selectClass}
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
            aria-label={t("category")}>
            
            {categoryOptions.map((c) =>
            <option key={c.value} value={c.value}>{c.label}</option>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative flex-shrink-0">
          <select
            className={selectClass}
            value={filters.type}
            onChange={(e) => update("type", e.target.value)}
            aria-label={t("type")}>
            
            {typeOptions.map((opt) =>
            <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {isFiltered &&
        <Tooltip>
            <TooltipTrigger asChild>
              <button
              onClick={() => onChange(defaultFilters)}
              className="flex items-center gap-1 px-3 h-8 min-h-[32px] max-h-[32px] rounded-full text-[12px] font-medium text-primary hover:bg-primary/8 transition-colors flex-shrink-0 focus:outline-none"
              aria-label={t("all")}>
              
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px] text-xs">
              Limpar todos os filtros e voltar ao padrão (Global · Hoje · Todas categorias)
            </TooltipContent>
          </Tooltip>
        }

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onForceReset?.()}
              className="flex items-center gap-1 px-3 h-8 min-h-[32px] max-h-[32px] rounded-full text-[12px] font-medium text-muted-foreground hover:bg-secondary/50 transition-colors flex-shrink-0 focus:outline-none"
              aria-label="Reset forçado">
              
              <RotateCcw className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px] text-xs">
            {t("forceResetTooltip")}
          </TooltipContent>
        </Tooltip>

        {isLoggedIn && onSaveFilter &&
        <Tooltip>
            <TooltipTrigger asChild>
              <button
              onClick={onSaveFilter}
              className="flex items-center gap-1.5 px-3.5 h-8 min-h-[32px] max-h-[32px] rounded-full text-[12px] font-medium text-primary bg-primary/6 hover:bg-primary hover:text-primary-foreground transition-all flex-shrink-0 focus:outline-none"
              aria-label={t("createAlert")}>
              
                <Bell className="w-3 h-3" />
                {t("createAlert")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              Salvar filtros atuais e criar um alerta para receber notificações quando estes critérios forem atingidos.
            </TooltipContent>
          </Tooltip>
        }

        <div className="flex items-center gap-2 ml-auto flex-shrink-0 whitespace-nowrap pl-2 border-l border-border/30 leading-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 cursor-help leading-none">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "hsl(142, 72%, 45%)" }} />
                <span className="text-[11px] font-medium text-foreground leading-none">{t("live")}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              {t("liveTooltip")}
            </TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground/20 leading-none">·</span>
          <OnlineUsersCount />
          <span className="text-muted-foreground/20 leading-none">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center cursor-help leading-none">
                <CountdownTimer />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              {t("countdownTooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>);

};

const OnlineUsersCount = () => {
  const [count, setCount] = useState(() => Math.floor(80 + Math.random() * 60));
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        return Math.max(20, prev + delta);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground tabular-nums leading-none">
      <span className="text-sm leading-none">👥</span><span className="leading-none">{count}</span>
    </span>);

};

const REFRESH_INTERVAL_SECONDS = 10 * 60;

const CountdownTimer = () => {
  const [seconds, setSeconds] = useState(() => {
    const now = Date.now();
    const interval = REFRESH_INTERVAL_SECONDS * 1000;
    const remaining = interval - now % interval;
    return Math.floor(remaining / 1000);
  });
  const [fading, setFading] = useState(false);

  const onRefresh = useCallback(() => {
    window.dispatchEvent(new Event("trend-refresh"));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setFading(true);
          setTimeout(() => {
            setFading(false);
            onRefresh();
          }, 300);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-mono text-muted-foreground tabular-nums leading-none transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <span className="leading-none">⏱️</span>
      <span className="leading-none">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </span>);

};

export default FilterBar;
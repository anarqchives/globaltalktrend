import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Global abbreviation tooltip map.
 * Every abbreviation in the platform gets a tooltip via this component.
 */
const abbreviationMap: Record<string, string> = {
  // Metrics
  "TVI": "Trend Velocity Index — mede a velocidade de propagação de uma tendência em tempo real (0–100)",
  // Countries
  "EUA": "Estados Unidos da América",
  "AU": "Austrália",
  "FR": "França",
  "DE": "Alemanha",
  "MX": "México",
  "BR": "Brasil",
  "IN": "Índia",
  "TH": "Tailândia",
  "TR": "Turquia",
  "IT": "Itália",
  "CO": "Colômbia",
  "US": "Estados Unidos",
  "GB": "Reino Unido",
  "CA": "Canadá",
  "JP": "Japão",
  "KR": "Coreia do Sul",
  "AR": "Argentina",
  "ES": "Espanha",
  "PT": "Portugal",
  "NL": "Países Baixos",
  "SE": "Suécia",
  "PL": "Polônia",
  "CN": "China",
  "ID": "Indonésia",
  "VN": "Vietnã",
  "PH": "Filipinas",
  "SG": "Singapura",
  "NZ": "Nova Zelândia",
  "ZA": "África do Sul",
  "NG": "Nigéria",
  "KE": "Quênia",
  "EG": "Egito",
  "AE": "Emirados Árabes Unidos",
  "SA": "Arábia Saudita",
  "IL": "Israel",
  "PS": "Palestina",
  "RU": "Rússia",
  "UA": "Ucrânia",
  "GL": "Global",
  // IDs
  "PMID": "PubMed ID — identificador único de artigo científico",
  "PubMed": "PubMed — base de dados científica do NIH (EUA). Artigos revisados por pares em medicina e ciências da vida.",
  // Tags
  "+novo": "Tendência nova — surgiu nas últimas horas",
  "+trending": "Em aceleração — volume crescendo rapidamente",
  "+boosts": "Impulsionado — recebeu engajamento acima do normal",
  // Section labels
  "ANOMALIAS": "Picos anômalos de volume — crescimento atípico detectado por algoritmo",
  "PREVISÃO": "Projeção algorítmica de viralização nas próximas 2–6h",
  "SINAIS EMERGENTES": "Tendências em estágio inicial de aceleração — monitorar antes de viralizar",
  // Signal descriptions
  "Pico anômalo": "Volume cresceu de forma anormal em curto período",
  "Crescimento rápido": "Taxa de crescimento acima da média histórica",
  "Sinal emergente": "Tendência nova com aceleração detectada",
};

/**
 * Lookup a tooltip for any abbreviation or code.
 * Handles "TVI 5", "TVI 100", "Confiança: 42%" patterns.
 */
export function getAbbrTooltip(text: string): string | null {
  // Direct match
  if (abbreviationMap[text]) return abbreviationMap[text];
  // TVI with number
  if (/^TVI\s*\d*$/i.test(text.trim())) return abbreviationMap["TVI"];
  // Confiança: X%
  if (/^Confiança:\s*\d+%$/i.test(text.trim())) {
    return "Índice de confiança da fonte — baseado em histórico de precisão e verificação editorial";
  }
  // Country code (2-letter uppercase)
  const upper = text.trim().toUpperCase();
  if (upper.length === 2 && abbreviationMap[upper]) return abbreviationMap[upper];
  return null;
}

/**
 * AbbrTooltip — wraps any abbreviation with a tooltip.
 * Usage: <AbbrTooltip text="TVI" /> or <AbbrTooltip text="US">🇺🇸 US</AbbrTooltip>
 */
export default function AbbrTooltip({ 
  text, 
  children, 
  className = "" 
}: { 
  text: string; 
  children?: React.ReactNode; 
  className?: string;
}) {
  const tooltip = getAbbrTooltip(text);
  if (!tooltip) return <span className={className}>{children || text}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help border-b border-dotted border-muted-foreground/30 ${className}`}>
          {children || text}
        </span>
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="max-w-[200px] text-[11px] leading-snug px-2 py-1 rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 break-words z-[100]"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

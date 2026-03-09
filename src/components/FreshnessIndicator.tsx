import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMemo } from "react";

interface FreshnessIndicatorProps {
  publishedAt?: string;
  time?: string;
}

export default function FreshnessIndicator({ publishedAt, time }: FreshnessIndicatorProps) {
  const { lang } = useLanguage();

  const { color, label, exactTime, ageMinutes } = useMemo(() => {
    const now = Date.now();
    let ts: number | null = null;

    if (publishedAt) {
      const d = new Date(publishedAt);
      if (!isNaN(d.getTime())) ts = d.getTime();
    }

    if (!ts && time) {
      const m = time.match(/(\d+)\s*(min|m|h|hora|hour|d|dia|day)/i);
      if (m) {
        const val = parseInt(m[1]);
        const unit = m[2].toLowerCase();
        if (unit.startsWith("min") || unit === "m") ts = now - val * 60_000;
        else if (unit.startsWith("h")) ts = now - val * 3_600_000;
        else ts = now - val * 86_400_000;
      }
    }

    if (!ts) ts = now - 7_200_000;

    const diffMin = Math.floor((now - ts) / 60_000);
    const date = new Date(ts);
    const exact = date.toLocaleTimeString(lang === "en" ? "en-US" : "pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const freshLabels: Record<string, { fresh: string; recent: string; old: string }> = {
      pt: { fresh: "🟢 Dados frescos", recent: "🟡 Dados recentes", old: "🔴 Dados antigos" },
      en: { fresh: "🟢 Fresh data", recent: "🟡 Recent data", old: "🔴 Older data" },
      es: { fresh: "🟢 Datos frescos", recent: "🟡 Datos recientes", old: "🔴 Datos antiguos" },
    };
    const fl = freshLabels[lang] || freshLabels.pt;

    const ageLabels: Record<string, { age: string; time: string }> = {
      pt: { age: "Idade", time: "Hora" },
      en: { age: "Age", time: "Time" },
      es: { age: "Edad", time: "Hora" },
    };
    const al = ageLabels[lang] || ageLabels.pt;

    if (diffMin < 10) {
      const ageText = diffMin < 1 ? (lang === "pt" ? "agora" : "now") : `${diffMin}min`;
      return { color: "bg-green-500", label: fl.fresh, exactTime: exact, ageMinutes: diffMin, ageText, al };
    } else if (diffMin < 60) {
      return { color: "bg-yellow-500", label: fl.recent, exactTime: exact, ageMinutes: diffMin, ageText: `${diffMin}min`, al };
    } else {
      const hours = Math.floor(diffMin / 60);
      return { color: "bg-red-500", label: fl.old, exactTime: exact, ageMinutes: diffMin, ageText: `${hours}h+`, al };
    }
  }, [publishedAt, time, lang]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${color} ${ageMinutes < 10 ? 'animate-pulse' : ''}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] space-y-0.5">
        <div className="font-semibold">{label}</div>
        <div className="text-muted-foreground">{exactTime}</div>
      </TooltipContent>
    </Tooltip>
  );
}

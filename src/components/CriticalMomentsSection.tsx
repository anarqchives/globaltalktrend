import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock, Bookmark, Bell, Share2, Flag, Globe2 } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import type { CriticalMoment } from "@/hooks/use-critical-moments";
import AbbrTooltip from "./AbbrTooltip";

const countryCodeToFlag = (code?: string) => {
  if (!code || code.length !== 2) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const platformColors: Record<string, string> = {
  YouTube: "#FF0000",
  Reddit: "hsl(16, 100%, 50%)",
  "Google Trends": "#4285F4",
  NewsAPI: "hsl(142, 60%, 40%)",
  Bluesky: "hsl(200, 100%, 50%)",
  Mastodon: "#6364FF",
  "Hacker News": "#FF6600",
  GitHub: "#24292E",
  "The Guardian": "#0D6EFD",
  GNews: "hsl(160, 60%, 45%)",
  PubMed: "#007CBB",
  "X (Twitter)": "hsl(0, 0%, 15%)",
};

function emBrveToast() {
  toast({ title: "⏳ Em breve", description: "Funcionalidade em desenvolvimento." });
}

interface Props {
  moments: CriticalMoment[];
  onSelectTrend?: (trend: any) => void;
  onClose?: () => void;
  horizontal?: boolean;
}

export default function CriticalMomentsSection({ moments, onSelectTrend }: Props) {
  const { lang } = useLanguage();

  if (!moments.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {lang === "pt"
            ? "Nenhum momento crítico detectado agora."
            : "No critical moments detected right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 pb-2.5" style={{
        background: 'linear-gradient(90deg, hsl(0 100% 97%) 0%, transparent 50%)',
        borderBottom: '2px solid #FF4D4F',
        padding: '10px 16px',
        margin: '-16px -16px 16px -16px',
        borderRadius: '0',
      }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#CF1322', letterSpacing: '0.5px' }}>
          🔴 {lang === "pt" ? "CRÍTICO" : "CRITICAL"} · {moments.length}
        </span>
      </div>

      {/* 2-column masonry grid */}
      <div className="columns-1 sm:columns-2 gap-4">
        {moments.slice(0, 12).map((m, i) => {
          const trend = m.trend;
          const sparkData = trend.sparkData?.map((v, idx) => ({ value: v, time: idx })) || [];
          const pColor = platformColors[trend.platform] || "#666";
          const flag = countryCodeToFlag(trend.countryCode);
          const changeNum = Math.round(m.changePercent);
          const isFlat = sparkData.length > 0 && new Set(sparkData.map(d => d.value)).size <= 2;

          const tviScore = Math.min(Math.round(Math.abs(changeNum) * 0.2 + m.platformCount * 10 + m.countryCount * 5 + m.mediaTypes.length * 8), 100);
          const tviLabel = tviScore >= 91 ? "Viral" : tviScore >= 61 ? "High" : tviScore >= 31 ? "Medium" : "Low";
          const tviColor = tviScore >= 91 ? "#FF2D2D" : tviScore >= 61 ? "#FA8C16" : tviScore >= 31 ? "#F5A623" : "#9CA3AF";

          // Generate context subtitle
          const adjective = changeNum > 200 ? (lang === "pt" ? "intensa" : "intense")
            : changeNum > 50 ? (lang === "pt" ? "elevada" : "elevated")
            : (lang === "pt" ? "significativa" : "significant");
          const contextLine = lang === "pt"
            ? `${trend.title.split(" ").slice(0, 3).join(" ")} mostra atividade ${adjective} (+${Math.abs(changeNum)}%), discutido em ${m.platformCount} plataforma${m.platformCount > 1 ? "s" : ""}, alcance em ${m.countryCount} país${m.countryCount > 1 ? "es" : ""}.`
            : `${trend.title.split(" ").slice(0, 3).join(" ")} shows ${adjective} activity (+${Math.abs(changeNum)}%), discussed on ${m.platformCount} platform${m.platformCount > 1 ? "s" : ""}, reach in ${m.countryCount} countr${m.countryCount > 1 ? "ies" : "y"}.`;

          return (
            <motion.div
              key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="break-inside-avoid mb-4 rounded-[14px] overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 group"
              style={{
                borderColor: 'rgba(255,45,45,0.15)',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,45,45,0.4)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,45,45,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,45,45,0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* ① ACCENT BAR */}
              <div className="w-full h-[3px]" style={{ background: 'linear-gradient(90deg, #FF2D2D, #FF6B00)' }} />

              {/* ① SOURCE HEADER */}
              <div className="flex items-center gap-1.5 px-3.5 pt-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pColor }} />
                <span className="text-[11px] font-medium" style={{ color: pColor }}>{trend.platform}</span>
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                {flag && <span className="text-[11px]">{flag}</span>}
                {trend.countryCode && (
                  <AbbrTooltip text={trend.countryCode.toUpperCase()} className="text-[11px] text-muted-foreground uppercase" />
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {trend.time || (lang === "pt" ? "agora" : "now")}
                </span>
              </div>

              {/* ② TITLE BLOCK */}
              <div className="px-3.5 pt-2">
                <h3 className="text-[15px] font-bold text-foreground leading-[1.35] line-clamp-3">
                  {trend.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                  {contextLine}
                </p>
              </div>

              {/* ③ CRITICALITY BADGE */}
              {changeNum > 0 && (
                <div className="px-3.5 pt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,45,45,0.08), rgba(255,107,0,0.08))',
                      border: '1px solid rgba(255,45,45,0.19)',
                      color: '#CF1322',
                    }}>
                    📈 +{changeNum}% {lang === "pt" ? "de variação em" : "variation on"} {trend.platform}
                  </span>
                </div>
              )}

              {/* ④ SPARKLINE AREA */}
              <div className="px-3.5 pt-2 h-14 relative">
                {sparkData.length > 3 && !isFlat ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData}>
                        <defs>
                          <linearGradient id={`crit-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF2D2D" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#FF2D2D" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <RTooltip
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '10px' }}
                          formatter={(v: any) => [v, 'Volume']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#FF2D2D" strokeWidth={2} fill={`url(#crit-g-${i})`} dot={false}
                          activeDot={{ r: 4, fill: '#FF2D2D', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#FF2D2D]"
                      style={{ animation: 'pulse-critical 2s infinite' }} />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center">
                    <div className="w-full border-t-2 border-dashed border-muted-foreground/15" />
                  </div>
                )}
              </div>

              {/* ⑤ METRICS STRIP */}
              <div className="mx-3.5 mt-2 p-2 rounded-lg bg-muted/30 flex items-center justify-between text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <AbbrTooltip text="TVI" className="text-[9px] uppercase text-muted-foreground tracking-wide" />
                      <div className="text-lg font-black leading-none" style={{ color: tviColor }}>{tviScore}</div>
                      <div className="text-[9px] font-medium" style={{ color: tviColor }}>{tviLabel}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px] max-w-[200px]">
                    Trend Velocity Index — mede a velocidade de propagação (0–100)
                  </TooltipContent>
                </Tooltip>
                <div className="w-px h-6 bg-border/40" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help text-center">
                      <div className="text-[9px] text-muted-foreground">{lang === "pt" ? "Plataformas" : "Platforms"}</div>
                      <div className="text-sm font-bold text-foreground">{m.platformCount}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    {m.mediaTypes.join(", ") || `${m.platformCount} plataformas`}
                  </TooltipContent>
                </Tooltip>
                <div className="w-px h-6 bg-border/40" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help text-center flex items-center gap-1">
                      <Globe2 className="w-2.5 h-2.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-bold text-foreground">{m.countryCount}</div>
                        <div className="text-[9px] text-muted-foreground">{lang === "pt" ? "países" : "countries"}</div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-[10px]">
                    {lang === "pt" ? "Países com tendência detectada" : "Countries with detected trend"}
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* ⑥ ACTIONS ROW */}
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-0.5" onClick={ev => ev.stopPropagation()}>
                  {[
                    { icon: Bookmark, tip: lang === "pt" ? "Salvar" : "Save", action: emBrveToast },
                    { icon: Bell, tip: lang === "pt" ? "Criar alerta" : "Create alert", action: emBrveToast },
                    { icon: Share2, tip: lang === "pt" ? "Compartilhar" : "Share", action: () => {
                      const url = trend.sourceUrl || window.location.href;
                      if (navigator.share) navigator.share({ title: trend.title, url }).catch(() => {});
                      else { navigator.clipboard.writeText(`${trend.title} — ${url}`); toast({ title: "🔗 Link copiado!" }); }
                    }},
                    { icon: Flag, tip: lang === "pt" ? "Denunciar" : "Report", action: () => toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${trend.title.slice(0, 40)}` }) },
                  ].map(({ icon: Icon, tip, action }, j) => (
                    <Tooltip key={j}>
                      <TooltipTrigger asChild>
                        <button onClick={action}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:bg-muted/50 hover:text-foreground/70 transition-all duration-[120ms]">
                          <Icon className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">{tip}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                {trend.sourceUrl && (
                  <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                    onClick={ev => ev.stopPropagation()}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-all duration-[120ms]">
                    <ExternalLink className="w-3 h-3" />
                    {lang === "pt" ? "Ver fonte original" : "View source"}
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-critical {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

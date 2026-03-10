import { useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock, Bookmark, Bell, Share2, Flag } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
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
  toast({ title: "⏳ Em breve", description: "Esta funcionalidade será implementada em breve." });
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
      <div className="px-3 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          {lang === "pt"
            ? "Nenhum momento crítico detectado agora."
            : "No critical moments detected right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {moments.slice(0, 12).map((m, i) => {
        const trend = m.trend;
        const sparkData = trend.sparkData?.map((v) => ({ value: v })) || [];
        const pColor = platformColors[trend.platform] || "#666";
        const flag = countryCodeToFlag(trend.countryCode);
        const changeNum = Math.round(m.changePercent);

        const tviScore = Math.min(Math.round(changeNum * 0.2 + m.platformCount * 10 + m.countryCount * 5 + m.mediaTypes.length * 8), 100);
        const tviLabel = tviScore >= 91 ? "Viral" : tviScore >= 61 ? "High" : tviScore >= 31 ? "Medium" : "Low";
        const tviColor = tviScore >= 91 ? "text-red-500" : tviScore >= 61 ? "text-orange-500" : tviScore >= 31 ? "text-amber-500" : "text-muted-foreground";

        const signalDetail = lang === "pt"
          ? `+${changeNum}% de variação em ${trend.platform}`
          : `+${changeNum}% variation on ${trend.platform}`;

        return (
          <motion.div
            key={`crit-${trend.platform}-${trend.title.slice(0, 20)}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            className="hover:bg-muted/30 transition-colors duration-[120ms]"
            style={{
              padding: "14px 16px",
              borderLeft: "3px solid #FF2D2D",
              background: "linear-gradient(135deg, hsl(0 100% 97% / 0.5) 0%, transparent 40%)",
            }}
          >
            {/* ① SOURCE + TIME ROW */}
            <div className="flex items-center gap-1.5 h-5">
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

            {/* ② TITLE */}
            <h3 className="text-[14px] font-bold text-foreground leading-[1.35] line-clamp-2 mt-1.5">
              {trend.title}
            </h3>

            {/* ③ CONTEXT */}
            {(m.summary || trend.description) && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                {m.summary || trend.description}
              </p>
            )}

            {/* ④ SIGNAL BADGE */}
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold bg-[#FFF1F0] dark:bg-red-900/20 text-[#CF1322] dark:text-red-400 border-[#FFCCC7] dark:border-red-800">
              <AbbrTooltip text="Pico anômalo">
                <span>📈 {signalDetail}</span>
              </AbbrTooltip>
            </div>

            {/* ⑤ SPARKLINE */}
            {sparkData.length > 3 && (
              <div className="mt-2 h-9 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <defs>
                      <linearGradient id={`crit-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF2D2D" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#FF2D2D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#FF2D2D" strokeWidth={1.5} fill={`url(#crit-g-${i})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#FF2D2D] animate-pulse" />
              </div>
            )}

            {/* ⑥ METRICS + ACTIONS ROW */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <AbbrTooltip text="TVI" className="text-[9px] uppercase text-muted-foreground tracking-wide" />
                  <span className={`text-base font-bold leading-none ${tviColor}`}>{tviScore}</span>
                  <span className={`text-[10px] ${tviColor}`}>{tviLabel}</span>
                </div>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {trend.time || (lang === "pt" ? "agora" : "now")}
                </span>
                {m.platformCount > 1 && <span className="text-[10px] text-muted-foreground/60">{m.platformCount} plat.</span>}
              </div>
              <div className="flex items-center gap-0.5" onClick={ev => ev.stopPropagation()}>
                <button onClick={() => emBrveToast()} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors">
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => emBrveToast()} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors">
                  <Bell className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => {
                  const url = trend.sourceUrl || window.location.href;
                  if (navigator.share) navigator.share({ title: trend.title, url }).catch(() => {});
                  else { navigator.clipboard.writeText(`${trend.title} — ${url}`); toast({ title: "🔗 Link copiado!" }); }
                }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toast({ title: "⚠️ Denúncia enviada", description: `Obrigado por reportar: ${trend.title.slice(0, 40)}` })}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors">
                  <Flag className="w-3.5 h-3.5" />
                </button>
                {trend.sourceUrl && (
                  <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

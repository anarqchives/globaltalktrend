import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight, BarChart3, Globe, Compass, Shield, Zap, Layers,
  TrendingUp, MapPin, Newspaper, FlaskConical, BookOpen,
  Activity, ArrowUpRight, Clock, ChevronRight
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useTrends } from "@/hooks/use-trends";
import { useTranslatedTrends } from "@/hooks/use-translated-trends";
import { FilterState } from "@/components/FilterBar";
import SparklineArea from "@/components/SparklineArea";
import { countryCodeToFlag } from "@/lib/shared-utils";
import { cn } from "@/lib/utils";

/* ─── ANIMATION VARIANTS ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ─── FEATURES ─── */
const FEATURES = [
  {
    icon: Compass, accent: "var(--accent-blue)",
    titlePt: "Descoberta Editorial", titleEn: "Editorial Discovery",
    descPt: "Grid visual interativo para explorar tendências como uma publicação digital de inteligência.",
    descEn: "Interactive visual grid to explore trends like a digital intelligence publication.",
    metric: "21+", metricLabel: "sources",
  },
  {
    icon: BarChart3, accent: "var(--accent-lime)",
    titlePt: "Dashboard Analítico", titleEn: "Analytical Dashboard",
    descPt: "Radar de sinais, timeline inteligente e heatmaps temporais em tempo real.",
    descEn: "Signal radar, smart timeline and real-time temporal heatmaps.",
    metric: "~15m", metricLabel: "refresh",
  },
  {
    icon: Globe, accent: "var(--accent-cyan)",
    titlePt: "Mapa Global", titleEn: "Global Signal Map",
    descPt: "Heatmaps geográficos com camadas de sentimento, fluxo e intensidade de sinais.",
    descEn: "Geographic heatmaps with sentiment, flow and signal intensity layers.",
    metric: "50+", metricLabel: "countries",
  },
  {
    icon: Zap, accent: "var(--accent-amber)",
    titlePt: "IA Contextual", titleEn: "Contextual AI",
    descPt: "Contexto gerado por IA para cada tendência, detectando padrões emergentes.",
    descEn: "AI-generated context for each trend, detecting emerging patterns.",
    metric: "AI", metricLabel: "powered",
  },
  {
    icon: Layers, accent: "var(--accent-purple)",
    titlePt: "21+ Fontes de Sinais", titleEn: "21+ Signal Sources",
    descPt: "Fusão cross-platform: imprensa, redes sociais, buscas, ciência e dados oficiais.",
    descEn: "Cross-platform fusion: press, social media, search, science and official data.",
    metric: "12", metricLabel: "categories",
  },
  {
    icon: Shield, accent: "var(--accent-neutral)",
    titlePt: "Transparência Total", titleEn: "Full Transparency",
    descPt: "Dados brutos, verificáveis, metodologia aberta. Zero bolhas editoriais.",
    descEn: "Raw, verifiable data with open methodology. Zero editorial bubbles.",
    metric: "100%", metricLabel: "open",
  },
];

/* ─── STATS ─── */
const STATS = [
  { value: "21+", labelPt: "Fontes de sinais", labelEn: "Signal sources", accent: "var(--accent-blue)" },
  { value: "50+", labelPt: "Países monitorados", labelEn: "Countries monitored", accent: "var(--accent-cyan)" },
  { value: "12", labelPt: "Categorias analíticas", labelEn: "Analytical categories", accent: "var(--accent-purple)" },
  { value: "~15min", labelPt: "Ciclo de atualização", labelEn: "Refresh cycle", accent: "var(--accent-lime)" },
];

/* ─── PLATFORM COLORS ─── */
const platformAccent: Record<string, string> = {
  "The Guardian": "var(--accent-blue)",
  "Reddit": "var(--accent-coral)",
  "Google Trends": "var(--accent-blue)",
  "YouTube": "var(--accent-coral)",
  "Hacker News": "var(--accent-amber)",
  "Wikipedia": "var(--accent-neutral)",
};
const getAccent = (platform: string) => platformAccent[platform] || "var(--accent-neutral)";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

/* ─── ANIMATED SECTION ─── */
const AnimatedSection = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? "visible" : "hidden"} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  );
};

/* ─── SIGNAL PREVIEW CARD ─── */
const SignalPreviewCard = ({ trend, index, en }: { trend: any; index: number; en: boolean }) => {
  const accent = getAccent(trend.platform);
  const flag = trend.countryCode ? countryCodeToFlag(trend.countryCode) : null;
  const change = parseFloat((trend.change || "0").replace(/[^0-9.-]/g, ""));
  const isLead = index === 0;

  return (
    <motion.div
      variants={fadeUp}
      custom={index + 1}
      className={cn(
        "signal-card group relative flex flex-col overflow-hidden",
        isLead ? "sm:col-span-2 lg:col-span-2 sm:row-span-2" : ""
      )}
    >
      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      
      <div className={cn("relative flex flex-col flex-1", isLead ? "p-6 gap-3" : "p-5 gap-2.5")}>
        {/* Platform + meta */}
        <div className="flex items-center justify-between">
          <span className="signal-platform-badge" style={{ '--accent': accent } as React.CSSProperties}>
            {trend.icon} {trend.platform}
          </span>
          <div className="flex items-center gap-1.5">
            {flag && <span className="text-xs">{flag}</span>}
            <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {trend.time}
            </span>
          </div>
        </div>
        
        {/* Title */}
        <h3 className={cn(
          "font-bold leading-[1.08] tracking-[-0.02em] text-foreground line-clamp-3",
          isLead ? "text-lg sm:text-xl" : "text-sm"
        )}>
          {trend.title}
        </h3>
        
        {isLead && trend.description && (
          <p className="text-[13px] text-muted-foreground/50 leading-relaxed line-clamp-2">{trend.description}</p>
        )}
        
        <div className="mt-auto" />
        
        {/* Sparkline */}
        {trend.sparkData?.length > 2 && (
          <SparklineArea data={trend.sparkData} color={accent} height={isLead ? 48 : 32} width={isLead ? 200 : 120} />
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/10 px-5 pb-3 pt-2">
        <div className="flex items-center gap-2.5">
          {trend.volume && <span className="text-[10px] font-medium text-muted-foreground/50 tabular-nums">{trend.volume}</span>}
          {change !== 0 && (
            <span className={cn("text-[10px] font-semibold tabular-nums", trend.changePositive ? "text-[var(--accent-lime)]" : "text-[var(--accent-coral)]")}>
              {trend.changePositive ? "+" : ""}{trend.change}
            </span>
          )}
        </div>
        <ArrowUpRight className="w-3 h-3 text-muted-foreground/10 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
};

/* ─── MAIN COMPONENT ─── */
const Welcome = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const en = lang === "en";

  const [, setTrendCounts] = useState<Record<string, number>>({});
  const { filteredTrends: rawTrends } = useTrends(defaultFilters, setTrendCounts, lang);
  const { translatedTrends } = useTranslatedTrends(rawTrends, lang);

  const previewSignals = useMemo(() => {
    const seen = new Set<string>();
    return translatedTrends
      .filter(t => {
        const key = t.title.toLowerCase().slice(0, 30);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [translatedTrends]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {});
  }, []);

  return (
    <div className="min-h-screen bg-background page-enter">
      <AppHeader minimal />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-40 left-[5%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: 'var(--accent-blue)' }} />
          <div className="absolute bottom-[-80px] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'var(--accent-lime)' }} />
          <div className="absolute top-[20%] right-[30%] w-[200px] h-[200px] rounded-full opacity-[0.02]" style={{ background: 'var(--accent-purple)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-20">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl">
            {/* Live badge */}
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-8 live-badge">
                <span className="relative flex items-center justify-center w-1.5 h-1.5">
                  <span className="absolute w-full h-full rounded-full bg-[var(--accent-lime)] animate-ping opacity-60" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
                </span>
                {en ? "Live intelligence · 21+ sources" : "Inteligência ao vivo · 21+ fontes"}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp} custom={1}
              className="font-bold tracking-[-0.045em] leading-[0.98] text-foreground"
              style={{ fontSize: 'clamp(2.5rem, 7vw + 0.5rem, 5rem)' }}
            >
              {en ? (
                <>Understand the<br className="hidden sm:block" /> world's signals.</>
              ) : (
                <>Compreenda os<br className="hidden sm:block" /> sinais do mundo.</>
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp} custom={2}
              className="mt-6 text-muted-foreground/50 leading-relaxed max-w-xl"
              style={{ fontSize: 'clamp(0.9375rem, 1.5vw + 0.25rem, 1.125rem)' }}
            >
              {en
                ? "A visual intelligence platform that fuses signals from 21+ global sources — press, social media, search engines, science and government data — into a single analytical experience."
                : "Uma plataforma de inteligência visual que fusiona sinais de 21+ fontes globais — imprensa, redes sociais, buscas, ciência e dados governamentais — em uma experiência analítica única."
              }
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} custom={3} className="mt-10 flex items-center gap-3 flex-wrap">
              <Link
                to="/"
                className="cta-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[14px] font-semibold"
              >
                {en ? "Start exploring" : "Começar a explorar"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/metodologia"
                className="cta-secondary inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-medium"
              >
                {en ? "Our methodology" : "Nossa metodologia"}
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats — glassmorphic cards */}
          <motion.div
            initial="hidden" animate="visible" variants={staggerContainer}
            className="mt-16 sm:mt-24 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl"
          >
            {STATS.map((s, i) => (
              <motion.div key={s.value} variants={fadeUp} custom={i + 4} className="stat-glass-card group">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-foreground tracking-[-0.04em] leading-none tabular-nums" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
                    {s.value}
                  </p>
                  <div className="w-2 h-2 rounded-full mt-1 opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: s.accent }} />
                </div>
                <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-muted-foreground/40">
                  {en ? s.labelEn : s.labelPt}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ LIVE SIGNAL PREVIEW ═══════════════════ */}
      {previewSignals.length > 0 && (
        <section className="section-divider">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-14 sm:py-20">
            <AnimatedSection>
              <motion.div variants={fadeUp} custom={0} className="flex items-end justify-between mb-8">
                <div>
                  <p className="section-overline flex items-center gap-1.5">
                    <span className="relative flex items-center justify-center w-1.5 h-1.5">
                      <span className="absolute w-full h-full rounded-full bg-[var(--accent-lime)] animate-ping opacity-60" />
                      <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)]" />
                    </span>
                    {en ? "Live signals right now" : "Sinais ao vivo agora"}
                  </p>
                  <h2 className="section-title">
                    {en ? "What the world is talking about" : "O que o mundo está falando"}
                  </h2>
                </div>
                <Link
                  to="/"
                  className="compact-link hidden sm:inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-foreground transition-colors"
                >
                  {en ? "Explore all signals" : "Explorar todos os sinais"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {previewSignals.map((trend, i) => (
                  <SignalPreviewCard key={i} trend={trend} index={i} en={en} />
                ))}
              </div>

              <motion.div variants={fadeUp} custom={6} className="mt-6 sm:hidden text-center">
                <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
                  {en ? "Explore all signals" : "Explorar todos os sinais"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ═══════════════════ FEATURES — MODULAR CARDS ═══════════════════ */}
      <section className="section-divider">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 sm:py-24">
          <AnimatedSection>
            <motion.div variants={fadeUp} custom={0} className="mb-12">
              <p className="section-overline">{en ? "Capabilities" : "Capacidades"}</p>
              <h2 className="section-title">
                {en ? "Platform capabilities" : "Capacidades da plataforma"}
              </h2>
              <p className="mt-3 text-[14px] text-muted-foreground/40 max-w-xl leading-relaxed">
                {en
                  ? "Every module designed for speed, clarity and analytical depth."
                  : "Cada módulo projetado para velocidade, clareza e profundidade analítica."
                }
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.titleEn}
                    variants={fadeUp}
                    custom={i + 1}
                    className="feature-card group"
                    style={{ '--accent-card': f.accent } as React.CSSProperties}
                  >
                    <style>{`.feature-card:nth-child(${i + 1})::before { background: ${f.accent}; }`}</style>
                    <div className="flex items-start justify-between mb-5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${f.accent} 12%, transparent)`, color: f.accent }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <p className="text-[28px] font-bold text-foreground leading-none tabular-nums tracking-[-0.03em]">{f.metric}</p>
                        <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.1em] font-medium">{f.metricLabel}</p>
                      </div>
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground mb-2 tracking-[-0.01em]">
                      {en ? f.titleEn : f.titlePt}
                    </h3>
                    <p className="text-[13px] text-muted-foreground/45 leading-relaxed">
                      {en ? f.descEn : f.descPt}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════ CAPABILITIES LIST ═══════════════════ */}
      <section className="section-divider bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 sm:py-24">
          <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
            <motion.div variants={fadeUp} custom={0}>
              <p className="section-overline">{en ? "For professionals" : "Para profissionais"}</p>
              <h2 className="section-title whitespace-pre-line">
                {en ? "Built for analysts,\nresearchers & strategists" : "Feito para analistas,\npesquisadores e estrategistas"}
              </h2>
              <p className="mt-4 text-[14px] text-muted-foreground/45 leading-relaxed max-w-md">
                {en
                  ? "From early signal detection to deep analytical reports. Every feature designed for professional intelligence workflows."
                  : "Da detecção precoce de sinais a relatórios analíticos profundos. Cada recurso projetado para fluxos de inteligência profissionais."
                }
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 mt-8 text-[13px] font-semibold text-foreground hover:text-primary transition-colors"
              >
                {en ? "Explore the platform" : "Explorar a plataforma"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>

            <div className="space-y-0">
              {[
                { icon: TrendingUp, labelPt: "Detecção de tendências emergentes", labelEn: "Emerging trend detection" },
                { icon: Activity, labelPt: "Índice de velocidade de tendência (TVI)", labelEn: "Trend Velocity Index (TVI)" },
                { icon: Newspaper, labelPt: "Monitoramento cross-platform", labelEn: "Cross-platform monitoring" },
                { icon: MapPin, labelPt: "Inteligência geográfica de sinais", labelEn: "Geographic signal intelligence" },
                { icon: FlaskConical, labelPt: "Dados científicos e governamentais integrados", labelEn: "Integrated scientific & government data" },
                { icon: BookOpen, labelPt: "Relatórios analíticos automatizados", labelEn: "Automated analytical reports" },
              ].map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <motion.div
                    key={cap.labelEn}
                    variants={fadeUp}
                    custom={i + 1}
                    className="capability-item flex items-center gap-4 py-4 border-b border-border/15 last:border-0"
                  >
                    <span className="number-tag shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[14px] font-medium text-foreground/80 flex-1">
                      {en ? cap.labelEn : cap.labelPt}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/15 shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      <section className="section-divider">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-20 sm:py-28 text-center">
          <AnimatedSection>
            <motion.h2 variants={fadeUp} custom={0} className="section-title">
              {en ? "Start exploring global signals" : "Comece a explorar sinais globais"}
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-[14px] text-muted-foreground/35 max-w-lg mx-auto">
              {en
                ? "Free, open and transparent. No account required to start."
                : "Gratuito, aberto e transparente. Nenhuma conta necessária para começar."
              }
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8">
              <Link
                to="/"
                className="cta-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-semibold"
              >
                {en ? "Enter the platform" : "Entrar na plataforma"}
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-border/10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-4 text-center">
          <p className="text-[11px] text-muted-foreground/25 leading-relaxed max-w-2xl mx-auto">
            {en
              ? "Global Talk Trend is a free and transparent monitoring platform. It does not produce editorial content, does not make recommendations and does not store personal data. All data comes from public APIs and is documented in our methodology."
              : "O Global Talk Trend é uma plataforma gratuita e transparente de monitoramento. Não produz conteúdo editorial, não faz recomendações e não armazena dados pessoais. Todos os dados provêm de APIs públicas e são documentados na nossa metodologia."
            }
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/25">
            <span>© {new Date().getFullYear()} Global Talk Trend</span>
            <span className="w-px h-3 bg-border/15" />
            <Link to="/metodologia" className="hover:text-foreground transition-colors">
              {en ? "Methodology" : "Metodologia"}
            </Link>
            <span className="w-px h-3 bg-border/15" />
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              {en ? "Privacy" : "Privacidade"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;

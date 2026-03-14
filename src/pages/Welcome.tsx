import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight, BarChart3, Globe, Compass, Shield, Zap, Layers,
  TrendingUp, MapPin, Newspaper, FlaskConical, Search, BookOpen,
  Activity, Clock
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

/* ─── ANIMATION VARIANTS ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── FEATURES ─── */
const FEATURES = [
  {
    icon: Compass, accent: "220 70% 50%",
    titlePt: "Descoberta Editorial", titleEn: "Editorial Discovery",
    descPt: "Grid visual interativo para explorar tendências como uma publicação digital de inteligência.",
    descEn: "Interactive visual grid to explore trends like a digital intelligence publication.",
  },
  {
    icon: BarChart3, accent: "162 100% 39%",
    titlePt: "Dashboard Analítico", titleEn: "Analytical Dashboard",
    descPt: "Radar de sinais, timeline inteligente e heatmaps temporais em tempo real.",
    descEn: "Signal radar, smart timeline and real-time temporal heatmaps.",
  },
  {
    icon: Globe, accent: "200 80% 45%",
    titlePt: "Mapa Global", titleEn: "Global Signal Map",
    descPt: "Heatmaps geográficos com camadas de sentimento, fluxo e intensidade de sinais.",
    descEn: "Geographic heatmaps with sentiment, flow and signal intensity layers.",
  },
  {
    icon: Zap, accent: "38 91% 55%",
    titlePt: "IA Contextual", titleEn: "Contextual AI",
    descPt: "Contexto gerado por IA para cada tendência, detectando padrões emergentes e ciclos de vida.",
    descEn: "AI-generated context for each trend, detecting emerging patterns and lifecycle stages.",
  },
  {
    icon: Layers, accent: "270 60% 50%",
    titlePt: "21+ Fontes de Sinais", titleEn: "21+ Signal Sources",
    descPt: "Fusão cross-platform: imprensa, redes sociais, buscas, ciência e dados oficiais.",
    descEn: "Cross-platform fusion: press, social media, search, science and official data.",
  },
  {
    icon: Shield, accent: "0 0% 40%",
    titlePt: "Transparência Total", titleEn: "Full Transparency",
    descPt: "Dados brutos, verificáveis, metodologia aberta. Zero bolhas editoriais.",
    descEn: "Raw, verifiable data with open methodology. Zero editorial bubbles.",
  },
];

/* ─── CAPABILITIES ─── */
const CAPABILITIES = [
  { icon: TrendingUp, labelPt: "Detecção de tendências emergentes", labelEn: "Emerging trend detection" },
  { icon: Activity, labelPt: "Índice de velocidade de tendência (TVI)", labelEn: "Trend Velocity Index (TVI)" },
  { icon: Newspaper, labelPt: "Monitoramento cross-platform", labelEn: "Cross-platform monitoring" },
  { icon: MapPin, labelPt: "Inteligência geográfica de sinais", labelEn: "Geographic signal intelligence" },
  { icon: FlaskConical, labelPt: "Dados científicos e governamentais integrados", labelEn: "Integrated scientific & government data" },
  { icon: BookOpen, labelPt: "Relatórios analíticos automatizados", labelEn: "Automated analytical reports" },
];

/* ─── STATS ─── */
const STATS = [
  { value: "21+", labelPt: "Fontes de sinais", labelEn: "Signal sources" },
  { value: "50+", labelPt: "Países monitorados", labelEn: "Countries monitored" },
  { value: "12", labelPt: "Categorias analíticas", labelEn: "Analytical categories" },
  { value: "~15min", labelPt: "Ciclo de atualização", labelEn: "Refresh cycle" },
];

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

/* ─── MAIN COMPONENT ─── */
const Welcome = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const en = lang === "en";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Don't auto-redirect, let them see the landing
    });
  }, []);

  return (
    <div className="min-h-screen bg-background page-enter">
      <AppHeader minimal />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative overflow-hidden">
        {/* Abstract gradient backdrop — refined, asymmetric */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-20 left-[10%] w-[700px] h-[700px] rounded-full bg-primary/[0.03] blur-[100px]" />
          <div className="absolute bottom-[-100px] right-[5%] w-[500px] h-[500px] rounded-full bg-[hsl(162_100%_39%_/_0.025)] blur-[80px]" />
          <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] rounded-full bg-[hsl(38_91%_55%_/_0.02)] blur-[60px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-20 sm:pt-28 lg:pt-36 pb-20 sm:pb-28">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl">
            {/* Badge */}
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-8">
                <span className="relative flex items-center justify-center w-1.5 h-1.5">
                  <span className="absolute w-full h-full rounded-full bg-[hsl(var(--color-positive))] animate-ping opacity-60" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-positive))]" />
                </span>
                {en ? "Live intelligence · 21+ sources" : "Inteligência ao vivo · 21+ fontes"}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp} custom={1}
              className="font-bold tracking-[-0.04em] leading-[1.02] text-foreground"
              style={{ fontSize: 'clamp(2.25rem, 6vw + 0.5rem, 4.25rem)' }}
            >
              {en ? (
                <>Understand the world's<br className="hidden sm:block" /> signals, <span className="text-muted-foreground/70">before everyone else.</span></>
              ) : (
                <>Compreenda os sinais<br className="hidden sm:block" /> do mundo, <span className="text-muted-foreground/70">antes de todos.</span></>
              )}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp} custom={2}
              className="mt-7 text-muted-foreground leading-relaxed max-w-2xl"
              style={{ fontSize: 'clamp(0.9375rem, 1.5vw + 0.25rem, 1.125rem)' }}
            >
              {en
                ? "A visual intelligence platform that fuses signals from 21+ global sources — press, social media, search engines, science and government data — into a single analytical experience."
                : "Uma plataforma de inteligência visual que fusiona sinais de 21+ fontes globais — imprensa, redes sociais, buscas, ciência e dados governamentais — em uma experiência analítica única."
              }
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} custom={3} className="mt-10 flex items-center gap-4 flex-wrap">
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-foreground text-background text-[14px] font-semibold hover:opacity-90 transition-all duration-200 shadow-[var(--shadow-md)]"
              >
                {en ? "Start exploring" : "Começar a explorar"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/metodologia"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-border/60 text-foreground text-[14px] font-medium hover:bg-secondary/50 hover:border-border transition-all"
              >
                {en ? "Our methodology" : "Nossa metodologia"}
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial="hidden" animate="visible" variants={staggerContainer}
            className="mt-20 sm:mt-24 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 max-w-3xl"
          >
            {STATS.map((s, i) => (
              <motion.div key={s.value} variants={fadeUp} custom={i + 4} className="space-y-1.5">
                <p className="text-[32px] sm:text-[36px] font-bold text-foreground tracking-tight leading-none tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">{en ? s.labelEn : s.labelPt}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES GRID ═══════════════════ */}
      <section className="border-t border-border/30 bg-secondary/20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 sm:py-28">
          <AnimatedSection>
            <motion.div variants={fadeUp} custom={0} className="mb-12">
              <h2 className="font-bold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                {en ? "Platform capabilities" : "Capacidades da plataforma"}
              </h2>
              <p className="mt-2.5 text-[14px] text-muted-foreground max-w-xl leading-relaxed">
                {en
                  ? "Every module designed for speed, clarity and analytical depth."
                  : "Cada módulo projetado para velocidade, clareza e profundidade analítica."
                }
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.titleEn}
                    variants={fadeUp}
                    custom={i + 1}
                    className="group p-6 rounded-2xl border border-border/40 bg-card hover:shadow-[var(--shadow-lg)] hover:border-border/60 transition-all duration-300"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: `hsl(${f.accent} / 0.08)`, color: `hsl(${f.accent})` }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground mb-2 tracking-tight">
                      {en ? f.titleEn : f.titlePt}
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
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
      <section className="border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 sm:py-28">
          <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
            <motion.div variants={fadeUp} custom={0}>
              <h2 className="font-bold tracking-tight text-foreground whitespace-pre-line" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
                {en ? "Built for analysts,\nresearchers & strategists" : "Feito para analistas,\npesquisadores e estrategistas"}
              </h2>
              <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed max-w-md">
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
              {CAPABILITIES.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <motion.div
                    key={cap.labelEn}
                    variants={fadeUp}
                    custom={i + 1}
                    className="flex items-center gap-4 py-4.5 border-b border-border/30 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground/60 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      {en ? cap.labelEn : cap.labelPt}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      <section className="border-t border-border/30 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-20 sm:py-28 text-center">
          <AnimatedSection>
            <motion.h2
              variants={fadeUp} custom={0}
              className="font-bold tracking-tight text-foreground"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {en ? "Start exploring global signals" : "Comece a explorar sinais globais"}
            </motion.h2>
            <motion.p
              variants={fadeUp} custom={1}
              className="mt-3 text-[14px] text-muted-foreground max-w-lg mx-auto"
            >
              {en
                ? "Free, open and transparent. No account required to start."
                : "Gratuito, aberto e transparente. Nenhuma conta necessária para começar."
              }
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-foreground text-background text-[15px] font-semibold hover:opacity-90 transition-all shadow-[var(--shadow-lg)]"
              >
                {en ? "Enter the platform" : "Entrar na plataforma"}
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════ DISCLAIMER / FOOTER ═══════════════════ */}
      <footer className="border-t border-border/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-4 text-center">
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed max-w-2xl mx-auto">
            {en
              ? "Global Talk Trend is a free and transparent monitoring platform. It does not produce editorial content, does not make recommendations and does not store personal data. All data comes from public APIs and is documented in our methodology."
              : "O Global Talk Trend é uma plataforma gratuita e transparente de monitoramento. Não produz conteúdo editorial, não faz recomendações e não armazena dados pessoais. Todos os dados provêm de APIs públicas e são documentados na nossa metodologia."
            }
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/40">
            <span>© {new Date().getFullYear()} Global Talk Trend</span>
            <span className="w-px h-3 bg-border/30" />
            <Link to="/metodologia" className="hover:text-foreground transition-colors">
              {en ? "Methodology" : "Metodologia"}
            </Link>
            <span className="w-px h-3 bg-border/30" />
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

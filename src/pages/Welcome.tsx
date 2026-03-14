import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Globe, Compass, Shield, Zap, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";

const FEATURES = [
  {
    icon: Compass,
    titlePt: "Descoberta Editorial",
    titleEn: "Editorial Discovery",
    descPt: "Explore tendências globais através de um grid visual interativo com cards ricos em dados.",
    descEn: "Explore global trends through an interactive visual grid with data-rich cards.",
    color: "text-primary",
  },
  {
    icon: BarChart3,
    titlePt: "Dashboard Analítico",
    titleEn: "Analytical Dashboard",
    descPt: "Visualize padrões com gráficos interativos, heatmaps temporais e métricas em tempo real.",
    descEn: "Visualize patterns with interactive charts, temporal heatmaps and real-time metrics.",
    color: "text-chart-2",
  },
  {
    icon: Globe,
    titlePt: "Mapa Global Interativo",
    titleEn: "Interactive Global Map",
    descPt: "Navegue geograficamente pelos dados com heatmaps, fluxos e sentimento por região.",
    descEn: "Navigate geographically through data with heatmaps, flows and regional sentiment.",
    color: "text-chart-3",
  },
  {
    icon: Zap,
    titlePt: "Inteligência por IA",
    titleEn: "AI Intelligence",
    descPt: "Contexto gerado por IA para cada tendência, detectando padrões emergentes automaticamente.",
    descEn: "AI-generated context for each trend, automatically detecting emerging patterns.",
    color: "text-chart-4",
  },
  {
    icon: Layers,
    titlePt: "21+ Fontes de Dados",
    titleEn: "21+ Data Sources",
    descPt: "Fusão cross-platform de imprensa, redes sociais, buscas, dados governamentais e ciência.",
    descEn: "Cross-platform fusion of press, social media, search, government data and science.",
    color: "text-chart-5",
  },
  {
    icon: Shield,
    titlePt: "Transparência Radical",
    titleEn: "Radical Transparency",
    descPt: "Zero bolhas algorítmicas. Dados brutos, verificáveis e com metodologia aberta.",
    descEn: "Zero algorithmic bubbles. Raw, verifiable data with open methodology.",
    color: "text-chart-6",
  },
];

const STATS = [
  { value: "21+", labelPt: "Fontes de dados", labelEn: "Data sources" },
  { value: "50+", labelPt: "Países", labelEn: "Countries" },
  { value: "12", labelPt: "Categorias", labelEn: "Categories" },
  { value: "15min", labelPt: "Atualização", labelEn: "Refresh rate" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const Welcome = () => {
  const { lang } = useLanguage();
  const en = lang === "en";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader minimal />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 pt-16 sm:pt-24 pb-12 sm:pb-20 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <span className="relative flex items-center justify-center w-1.5 h-1.5">
                <span className="absolute w-full h-full rounded-full live-pulse-dot bg-positive" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-positive" />
              </span>
              {en ? "Real-time intelligence" : "Inteligência em tempo real"}
            </span>
          </motion.div>

          <motion.h2
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] max-w-3xl mx-auto"
          >
            {en
              ? "Discover global trends before they go mainstream"
              : "Descubra tendências globais antes que se tornem mainstream"
            }
          </motion.h2>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            {en
              ? "A trend intelligence platform that fuses signals from press, social media, search, science and government data into a single analytical experience."
              : "Uma plataforma de inteligência de tendências que fusiona sinais de imprensa, redes sociais, buscas, ciência e dados governamentais em uma experiência analítica única."
            }
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {en ? "Start exploring" : "Começar a explorar"}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/metodologia"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-secondary/50 transition-colors"
            >
              {en ? "Our methodology" : "Nossa metodologia"}
            </Link>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="mt-12 flex items-center justify-center gap-6 sm:gap-10 flex-wrap"
          >
            {STATS.map((s) => (
              <div key={s.value} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{en ? s.labelEn : s.labelPt}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.titleEn}
                variants={fadeUp}
                custom={i}
                className="group p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:shadow-sm transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center mb-3 ${f.color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">
                  {en ? f.titleEn : f.titlePt}
                </h3>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  {en ? f.descEn : f.descPt}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══ DISCLAIMER ═══ */}
      <section className="border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p className="text-caption text-muted-foreground leading-relaxed">
            {en
              ? "Global Talk Trend is a free and transparent monitoring platform. It does not produce editorial content, does not make recommendations and does not store personal data. All data comes from public APIs and is documented in our methodology."
              : "O Global Talk Trend é uma plataforma gratuita e transparente de monitoramento. Não produz conteúdo editorial, não faz recomendações e não armazena dados pessoais. Todos os dados provêm de APIs públicas e são documentados na nossa metodologia."
            }
          </p>
          <p className="mt-3 text-micro text-muted-foreground/60">
            © {new Date().getFullYear()} Global Talk Trend · {en ? "Maintained by voluntary donations" : "Mantido por doações voluntárias"}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Welcome;

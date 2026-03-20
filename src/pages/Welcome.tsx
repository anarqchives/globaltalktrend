import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Globe, TrendingUp, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "@/components/AppHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

const Welcome = () => {
  const { lang } = useLanguage();
  const en = lang === "en";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* ═══ HERO ═══ */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          className="max-w-xl w-full text-center py-20 sm:py-28"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} custom={0} className="mb-8">
            <span className="text-[28px] sm:text-[32px] font-bold tracking-[-0.04em] text-foreground select-none">
              Global Talk Trend
            </span>
          </motion.div>

          {/* Description */}
          <motion.p
            variants={fadeUp} custom={1}
            className="text-muted-foreground text-[15px] sm:text-[16px] leading-relaxed max-w-md mx-auto"
          >
            {en
              ? "A visual intelligence platform for discovering global trends and cultural signals across multiple sources."
              : "Uma plataforma de inteligência visual para descobrir tendências globais e sinais culturais em múltiplas fontes."
            }
          </motion.p>

          {/* Key points */}
          <motion.div variants={fadeUp} custom={2} className="mt-8 space-y-3 text-left max-w-md mx-auto">
            {[
              {
                icon: Globe,
                textEn: "Real-time signals from news, social media and search engines worldwide.",
                textPt: "Sinais em tempo real de notícias, redes sociais e buscadores de todo o mundo.",
              },
              {
                icon: TrendingUp,
                textEn: "Insights represent analytical signals — not predictions or recommendations.",
                textPt: "Os insights representam sinais analíticos — não previsões ou recomendações.",
              },
              {
                icon: Shield,
                textEn: "Data is aggregated from public sources. No personal data is collected.",
                textPt: "Os dados são agregados de fontes públicas. Nenhum dado pessoal é coletado.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {en ? item.textEn : item.textPt}
                </p>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} custom={3} className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all"
              style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
            >
              {en ? "Start Exploring" : "Começar a Explorar"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border/10">
        <div className="max-w-xl mx-auto px-4 py-6 text-center">
          <p className="text-[10px] text-muted-foreground/30 leading-relaxed max-w-md mx-auto">
            {en
              ? "Global Talk Trend is a free and transparent monitoring platform. It does not produce editorial content, does not make recommendations and does not store personal data."
              : "O Global Talk Trend é uma plataforma gratuita e transparente de monitoramento. Não produz conteúdo editorial, não faz recomendações e não armazena dados pessoais."
            }
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground/25">
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

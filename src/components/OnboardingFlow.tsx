import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

const CATEGORIES = [
  { id: "Tecnologia", emoji: "💻", label: "Tecnologia" },
  { id: "Política", emoji: "🗳️", label: "Política" },
  { id: "Entretenimento", emoji: "🎬", label: "Entretenimento" },
  { id: "Esportes", emoji: "⚽", label: "Esportes" },
  { id: "Negócios/Finanças", emoji: "📈", label: "Negócios" },
  { id: "Ciência", emoji: "🔬", label: "Ciência" },
  { id: "Saúde", emoji: "🏥", label: "Saúde" },
  { id: "Cultura", emoji: "🎭", label: "Cultura" },
];

const SOURCES = [
  { id: "YouTube", emoji: "▶️", label: "YouTube" },
  { id: "Reddit", emoji: "🔶", label: "Reddit" },
  { id: "Google Trends", emoji: "🔍", label: "Google Trends" },
  { id: "NewsAPI", emoji: "📰", label: "Imprensa" },
  { id: "Hacker News", emoji: "💻", label: "Hacker News" },
  { id: "Wikipedia", emoji: "📖", label: "Wikipedia" },
];

const STORAGE_KEY = "gtt_onboarding_done";
const PREFS_KEY = "gtt_user_prefs";

export function hasCompletedOnboarding(userId?: string): boolean {
  try {
    const done = localStorage.getItem(STORAGE_KEY);
    return done === "true" || done === userId;
  } catch { return false; }
}

export default function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSource = (id: string) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && keywords.length < 5 && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
  };

  const handleComplete = async () => {
    const prefs = {
      categories: selectedCategories,
      keywords,
      sources: selectedSources,
      completedAt: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, userId);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    // Save preferences to profile metadata
    try {
      await supabase
        .from("profiles")
        .update({
          privacy_settings: {
            timeline: "public",
            boards: "public",
            comments: "public",
            reports: "followers",
            onboarding_prefs: prefs,
          } as any,
        })
        .eq("user_id", userId);
    } catch (err) {
      console.error("Failed to save onboarding prefs:", err);
    }

    onComplete();
  };

  const steps = [
    // Step 0: Categories
    <motion.div key="cats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">Quais categorias te interessam?</h3>
        <p className="text-xs text-muted-foreground mt-1">Selecione ao menos 1 para personalizar seu feed</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left text-sm font-medium ${
              selectedCategories.includes(cat.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/30 text-foreground"
            }`}
          >
            <span className="text-lg">{cat.emoji}</span>
            <span>{cat.label}</span>
            {selectedCategories.includes(cat.id) && <Check className="w-3.5 h-3.5 ml-auto" />}
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 1: Keywords
    <motion.div key="kws" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">Adicione palavras-chave para monitorar</h3>
        <p className="text-xs text-muted-foreground mt-1">Ex: Bitcoin, IA, Copa do Mundo (até 5)</p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={keywordInput}
          onChange={e => setKeywordInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addKeyword()}
          placeholder="Digite e pressione Enter..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={30}
        />
        <button onClick={addKeyword} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">+</button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {keywords.map(kw => (
          <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {kw}
            <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">×</button>
          </span>
        ))}
        {keywords.length === 0 && (
          <span className="text-xs text-muted-foreground italic">Nenhuma keyword adicionada (opcional)</span>
        )}
      </div>
    </motion.div>,

    // Step 2: Sources
    <motion.div key="srcs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">Escolha suas fontes preferidas</h3>
        <p className="text-xs text-muted-foreground mt-1">Selecione as fontes que mais importam para você</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SOURCES.map(src => (
          <button
            key={src.id}
            onClick={() => toggleSource(src.id)}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left text-sm font-medium ${
              selectedSources.includes(src.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/30 text-foreground"
            }`}
          >
            <span className="text-lg">{src.emoji}</span>
            <span>{src.label}</span>
            {selectedSources.includes(src.id) && <Check className="w-3.5 h-3.5 ml-auto" />}
          </button>
        ))}
      </div>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl border shadow-2xl p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Passo {step + 1} de 3</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {steps[step]}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          ) : (
            <button onClick={handleComplete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pular
            </button>
          )}

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && selectedCategories.length === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Próximo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Começar
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

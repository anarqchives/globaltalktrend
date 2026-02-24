import { useState } from "react";
import { ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TrendFeedbackProps {
  title: string;
  platform: string;
  userId?: string | null;
}

export default function TrendFeedback({ title, platform, userId }: TrendFeedbackProps) {
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleFeedback = async (type: "useful" | "not_useful" | "report", e: React.MouseEvent) => {
    e.stopPropagation();
    if (submitted) return;

    try {
      const sessionId = `anon-${Math.random().toString(36).slice(2, 10)}`;
      await (supabase.from("trend_feedback") as any).insert({
        trend_title: title,
        platform,
        feedback_type: type,
        user_id: userId || null,
        session_id: userId ? null : sessionId,
      });
      setSubmitted(type);
      if (type === "report") {
        toast({ title: "🚩 Denúncia enviada", description: "Obrigado por nos ajudar a melhorar." });
      } else {
        toast({ title: "Obrigado!", description: "Seu feedback foi registrado." });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar feedback.", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
      <span className="text-[10px] text-muted-foreground mr-1">Útil?</span>
      <button
        onClick={(e) => handleFeedback("useful", e)}
        className={`p-1.5 rounded-lg transition-colors ${
          submitted === "useful"
            ? "bg-green-500/20 text-green-600"
            : "text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
        }`}
        disabled={!!submitted}
        title="Útil"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => handleFeedback("not_useful", e)}
        className={`p-1.5 rounded-lg transition-colors ${
          submitted === "not_useful"
            ? "bg-red-500/20 text-red-500"
            : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
        }`}
        disabled={!!submitted}
        title="Não útil"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
      <div className="w-px h-3 bg-border mx-1" />
      <button
        onClick={(e) => handleFeedback("report", e)}
        className={`p-1.5 rounded-lg transition-colors ${
          submitted === "report"
            ? "bg-amber-500/20 text-amber-600"
            : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
        }`}
        disabled={!!submitted}
        title="Denunciar erro"
      >
        <Flag className="w-3 h-3" />
      </button>
      {submitted && (
        <span className="text-[9px] text-muted-foreground ml-1">✓ Enviado</span>
      )}
    </div>
  );
}
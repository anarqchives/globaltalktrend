import { useState } from "react";
import { X, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CreateAlertInput } from "@/hooks/use-alerts";

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAlertInput) => void;
  defaultKeyword?: string;
  defaultCategory?: string;
}

const AlertModal = ({ open, onClose, onSubmit, defaultKeyword = "", defaultCategory = "" }: AlertModalProps) => {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [threshold, setThreshold] = useState(50);
  const [frequency, setFrequency] = useState("daily");
  const [method, setMethod] = useState("in_app");

  const handleSubmit = () => {
    onSubmit({
      keyword: keyword || undefined,
      category: defaultCategory || undefined,
      threshold,
      frequency,
      notification_method: method,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" />
            Criar Alerta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Palavra-chave (opcional)</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex: Bitcoin, Eleições..."
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Alerta quando crescer mais de</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-bold text-primary min-w-[40px] text-right">{threshold}%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequência</label>
            <div className="flex gap-2">
              {[
                { value: "instant", label: "Imediato" },
                { value: "daily", label: "Diário" },
                { value: "weekly", label: "Semanal" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    frequency === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notificação via</label>
            <div className="flex gap-2">
              {[
                { value: "in_app", label: "🔔 No site" },
                { value: "email", label: "📧 Email" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMethod(opt.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    method === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Criar Alerta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertModal;

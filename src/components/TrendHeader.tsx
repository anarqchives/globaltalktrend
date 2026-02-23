import { useState } from "react";
import { Info } from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TrendHeader = () => {
  const { lang, setLang, t } = useLanguage();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2 h-12 flex items-center">
        <div className="w-full flex items-center justify-between gap-3">
          <h1 className="text-base font-light tracking-tight whitespace-nowrap select-none">
            <span className="font-semibold text-foreground">Global-Talk-Trending</span>
            <span className="text-muted-foreground hidden sm:inline">: real time monitor</span>
          </h1>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex gap-0.5 overflow-x-auto scrollbar-thin">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 whitespace-nowrap ${
                    lang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  title={l.name}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => setAboutOpen(true)}
              className="px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              {t("about")}
            </button>
          </div>
        </div>
      </header>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t("aboutTitle")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              {t("aboutDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { name: "YouTube", color: "hsl(0, 72%, 51%)" },
                { name: "Reddit", color: "hsl(16, 100%, 50%)" },
                { name: "Google Trends", color: "hsl(210, 100%, 40%)" },
                { name: "NewsAPI", color: "hsl(142, 60%, 40%)" },
              ].map((src) => (
                <div key={src.name} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <span className="w-2 h-2 rounded-full" style={{ background: src.color }} />
                  <span className="font-medium text-foreground">{src.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrendHeader;

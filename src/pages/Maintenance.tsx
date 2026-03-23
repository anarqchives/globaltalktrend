import React, { useState } from "react";
import { Copy, Check, Globe2, ChevronDown } from "lucide-react";
import { useLanguage, languages } from "@/contexts/LanguageContext";

const copy = {
  pt: { heading: "O GTT está em obra e retorna em breve.", copied: "Copiado!" },
  en: { heading: "GTT is under construction and will return soon.", copied: "Copied!" },
  es: { heading: "GTT está en construcción y volverá pronto.", copied: "¡Copiado!" },
  fr: { heading: "GTT est en construction et revient bientôt.", copied: "Copié !" },
  de: { heading: "GTT wird überarbeitet und kehrt bald zurück.", copied: "Kopiert!" },
  it: { heading: "GTT è in fase di aggiornamento e tornerà presto.", copied: "Copiato!" },
  zh: { heading: "GTT 正在建设中，即将回归。", copied: "已复制！" },
  ja: { heading: "GTT は現在改修中です。まもなく再開します。", copied: "コピーしました！" },
  ko: { heading: "GTT는 공사 중이며 곧 돌아옵니다.", copied: "복사됨!" },
  ar: { heading: "GTT قيد الإنشاء وسيعود قريبًا.", copied: "تم النسخ!" },
  hi: { heading: "GTT निर्माणाधीन है और जल्द ही वापस आएगा।", copied: "कॉपी किया गया!" },
  ru: { heading: "GTT на реконструкции и скоро вернётся.", copied: "Скопировано!" },
} as const;

const EMAIL = "gtt@vila.ind.br";

const Maintenance = () => {
  const { lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = copy[lang] || copy.en;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentLang = languages.find((l) => l.code === lang);

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center px-6 relative">
      {/* Language selector — top right */}
      <div className="absolute top-5 right-5">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <Globe2 size={16} />
            <span>{currentLang?.label || "PT"}</span>
            <ChevronDown size={14} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-8 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 transition-colors ${
                      l.code === lang ? "font-semibold text-neutral-900" : "text-neutral-600"
                    }`}
                  >
                    {l.label} — {l.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        {/* Logo */}
        <h1
          className="text-3xl tracking-tight font-bold"
          style={{ fontFamily: "var(--font-heading, 'Inter', sans-serif)" }}
        >
          GTT<span className="text-neutral-400 font-light ml-1">Monitor</span>
        </h1>

        {/* Message */}
        <p className="text-base text-neutral-600 leading-relaxed">
          {t.heading}
        </p>

        {/* Email with copy */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${EMAIL}`}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors"
          >
            {EMAIL}
          </a>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-700"
            title={copied ? t.copied : "Copy"}
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>
        </div>

        {copied && (
          <span className="text-xs text-emerald-500 -mt-5 animate-in fade-in">{t.copied}</span>
        )}
      </div>
    </div>
  );
};

export default Maintenance;

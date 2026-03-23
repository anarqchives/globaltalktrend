import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

const EMAIL = "gtt@vila.ind.br";

const Maintenance = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        <p className="text-base text-neutral-600 leading-relaxed">
          O GTT está em obra e retorna em breve.
        </p>

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
            title={copied ? "Copiado!" : "Copiar"}
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>
        </div>

        {copied && (
          <span className="text-xs text-emerald-500 -mt-5 animate-in fade-in">Copiado!</span>
        )}
      </div>
    </div>
  );
};

export default Maintenance;

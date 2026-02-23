import { useState } from "react";

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "عربي" },
];

const TrendHeader = () => {
  const [activeLang, setActiveLang] = useState("pt");

  return (
    <header className="glass-header sticky top-0 z-50 px-4 md:px-6 py-2.5 h-14 flex items-center">
      <div className="w-full flex items-center justify-between gap-3">
        <h1 className="text-lg font-light tracking-tight whitespace-nowrap">
          <span className="font-semibold text-foreground">Global-Talk-Trending</span>
          <span className="text-muted-foreground">: real time monitor</span>
        </h1>
        <div className="flex gap-1 flex-shrink-0">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang.code)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                activeLang === lang.code
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default TrendHeader;

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
    <header className="glass-header sticky top-0 z-50 px-4 md:px-8 py-3">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="brand-gradient-text">TrendSphere</span>
          <span className="text-muted-foreground font-normal"> · real-time global monitor</span>
        </h1>
        <div className="flex gap-1 flex-wrap justify-center">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang.code)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeLang === lang.code
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
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

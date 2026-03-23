import { describe, it, expect } from "vitest";
import {
  canonicalizeCategory,
  categorizeTrend,
  detectCountryFromContent,
  countryCodeToFlag,
  formatVolume,
} from "@/lib/categorize-trend";

// ─── canonicalizeCategory ───────────────────────────────────────────

describe("canonicalizeCategory", () => {
  it("mapeia Política → Geopolítica", () => {
    expect(canonicalizeCategory("Política")).toBe("Geopolítica");
  });

  it("mapeia Conflitos/Crises → Geopolítica", () => {
    expect(canonicalizeCategory("Conflitos/Crises")).toBe("Geopolítica");
  });

  it("mapeia Negócios/Finanças → Economia", () => {
    expect(canonicalizeCategory("Negócios/Finanças")).toBe("Economia");
  });

  it("mapeia Clima/Meio Ambiente → Meio Ambiente", () => {
    expect(canonicalizeCategory("Clima/Meio Ambiente")).toBe("Meio Ambiente");
  });

  it("mapeia Conhecimento → Cultura", () => {
    expect(canonicalizeCategory("Conhecimento")).toBe("Cultura");
  });

  it("retorna a categoria original se não for legacy", () => {
    expect(canonicalizeCategory("Tecnologia")).toBe("Tecnologia");
    expect(canonicalizeCategory("Saúde")).toBe("Saúde");
    expect(canonicalizeCategory("Geral")).toBe("Geral");
  });
});

// ─── categorizeTrend ────────────────────────────────────────────────

describe("categorizeTrend — keywords no título", () => {
  it("detecta Tecnologia para título com 'artificial intelligence'", () => {
    expect(categorizeTrend("OpenAI releases new artificial intelligence model", "NewsAPI")).toBe("Tecnologia");
  });

  it("detecta Esportes para título com 'Champions League'", () => {
    expect(categorizeTrend("Champions League final result", "NewsAPI")).toBe("Esportes");
  });

  it("detecta Entretenimento para título com 'Netflix'", () => {
    expect(categorizeTrend("Netflix releases new series trailer", "NewsAPI")).toBe("Entretenimento");
  });

  it("detecta Economia para título com 'Wall Street'", () => {
    expect(categorizeTrend("Wall Street reacts to Fed rate decision", "NewsAPI")).toBe("Economia");
  });

  it("detecta Saúde para título com 'pandemic'", () => {
    expect(categorizeTrend("New pandemic threat detected by WHO", "NewsAPI")).toBe("Saúde");
  });

  it("detecta Meio Ambiente para título com 'climate'", () => {
    expect(categorizeTrend("Climate crisis worsens in 2026", "NewsAPI")).toBe("Meio Ambiente");
  });

  it("detecta Geopolítica para título com 'election'", () => {
    expect(categorizeTrend("US election results certified by Congress", "NewsAPI")).toBe("Geopolítica");
  });

  it("detecta Ciência para título com 'nasa'", () => {
    expect(categorizeTrend("NASA discovers new exoplanet", "NewsAPI")).toBe("Ciência");
  });

  it("detecta Educação para título com 'university'", () => {
    expect(categorizeTrend("University students protest tuition increase", "NewsAPI")).toBe("Educação");
  });

  it("detecta Cultura para título com 'museum'", () => {
    expect(categorizeTrend("New exhibition opens at the museum", "NewsAPI")).toBe("Cultura");
  });
});

describe("categorizeTrend — plataformas com defaults", () => {
  it("retorna Economia para World Bank", () => {
    expect(categorizeTrend("GDP growth rate", "World Bank")).toBe("Economia");
  });

  it("retorna Ciência para arXiv", () => {
    expect(categorizeTrend("New paper on quantum computing", "arXiv")).toBe("Ciência");
  });

  it("retorna Saúde para PubMed", () => {
    expect(categorizeTrend("Clinical trial results", "PubMed")).toBe("Saúde");
  });

  it("retorna Meio Ambiente para NOAA", () => {
    expect(categorizeTrend("Storm forecast for Atlantic coast", "NOAA")).toBe("Meio Ambiente");
  });

  it("retorna Geopolítica para GDELT", () => {
    expect(categorizeTrend("Conflict report", "GDELT")).toBe("Geopolítica");
  });

  it("retorna Cultura para Wikipedia", () => {
    expect(categorizeTrend("Most viewed article this week", "Wikipedia")).toBe("Cultura");
  });

  it("retorna Tecnologia para Lobsters", () => {
    expect(categorizeTrend("New programming language released", "Lobsters")).toBe("Tecnologia");
  });
});

describe("categorizeTrend — YouTube category ID", () => {
  it("mapeia categoryId 17 → Esportes", () => {
    expect(categorizeTrend("NBA Finals highlights", "YouTube", undefined, { categoryId: "17" })).toBe("Esportes");
  });

  it("mapeia categoryId 28 → Tecnologia", () => {
    expect(categorizeTrend("New GPU benchmark", "YouTube", undefined, { categoryId: "28" })).toBe("Tecnologia");
  });

  it("mapeia categoryId 25 → Geopolítica", () => {
    expect(categorizeTrend("Breaking news", "YouTube", undefined, { categoryId: "25" })).toBe("Geopolítica");
  });
});

describe("categorizeTrend — Reddit subreddit", () => {
  it("mapeia r/technology → Tecnologia", () => {
    expect(categorizeTrend("New chip released", "Reddit", undefined, { subreddit: "technology" })).toBe("Tecnologia");
  });

  it("mapeia r/worldnews → Geopolítica", () => {
    expect(categorizeTrend("International summit results", "Reddit", undefined, { subreddit: "worldnews" })).toBe("Geopolítica");
  });

  it("mapeia r/nba → Esportes", () => {
    expect(categorizeTrend("Player trade deadline", "Reddit", undefined, { subreddit: "nba" })).toBe("Esportes");
  });
});

describe("categorizeTrend — Entretenimento tem prioridade sobre Geopolítica", () => {
  it("BBB é Entretenimento, não Geopolítica", () => {
    expect(categorizeTrend("Paredão do BBB define eliminado", "Google Trends")).toBe("Entretenimento");
  });

  it("Big Brother Brasil é Entretenimento", () => {
    expect(categorizeTrend("Big Brother Brasil: confira o resultado", "NewsAPI")).toBe("Entretenimento");
  });
});

// ─── detectCountryFromContent ───────────────────────────────────────

describe("detectCountryFromContent", () => {
  it("detecta Brasil para título com 'brasil'", () => {
    expect(detectCountryFromContent("Eleições no Brasil 2026", "Google Trends")).toBe("BR");
  });

  it("detecta US para título com 'white house'", () => {
    expect(detectCountryFromContent("White House announces new policy", "NewsAPI")).toBe("US");
  });

  it("detecta GB para título com 'premier league'", () => {
    expect(detectCountryFromContent("Premier League results this weekend", "NewsAPI")).toBe("GB");
  });

  it("detecta JP para título com 'tokyo'", () => {
    expect(detectCountryFromContent("Tokyo hosts international summit", "NewsAPI")).toBe("JP");
  });

  it("detecta UA para título com 'zelensky'", () => {
    expect(detectCountryFromContent("Zelensky addresses the nation", "NewsAPI")).toBe("UA");
  });

  it("usa sourceCountryMap quando title não tem pistas", () => {
    expect(detectCountryFromContent("Annual report released", "IBGE")).toBe("BR");
  });

  it("retorna undefined para conteúdo sem pistas de país", () => {
    expect(detectCountryFromContent("Random topic with no country clues", "Unknown")).toBeUndefined();
  });
});

// ─── countryCodeToFlag ──────────────────────────────────────────────

describe("countryCodeToFlag", () => {
  it("retorna bandeira do Brasil para BR", () => {
    expect(countryCodeToFlag("BR")).toBe("🇧🇷");
  });

  it("retorna bandeira dos EUA para US", () => {
    expect(countryCodeToFlag("US")).toBe("🇺🇸");
  });

  it("retorna 🌐 para GL (global)", () => {
    expect(countryCodeToFlag("GL")).toBe("🌐");
  });

  it("retorna null para código inválido", () => {
    expect(countryCodeToFlag("XYZ")).toBeNull();
    expect(countryCodeToFlag(undefined)).toBeNull();
    expect(countryCodeToFlag("")).toBeNull();
  });
});

// ─── formatVolume ───────────────────────────────────────────────────

describe("formatVolume", () => {
  it("formata milhões corretamente", () => {
    expect(formatVolume("1500000")).toBe("1.5M");
  });

  it("formata milhares corretamente", () => {
    expect(formatVolume("45000")).toBe("45K");
  });

  it("retorna número pequeno sem formatação", () => {
    expect(formatVolume("500")).toBe("500");
  });

  it("retorna string original se não for número", () => {
    expect(formatVolume("N/A")).toBe("N/A");
  });

  it("retorna string vazia para volume vazio", () => {
    expect(formatVolume("")).toBe("");
  });
});

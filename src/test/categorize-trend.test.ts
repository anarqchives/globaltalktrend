import { describe, it, expect } from "vitest";
import { canonicalizeCategory, categorizeTrend, detectCountryFromContent, countryCodeToFlag } from "@/lib/categorize-trend";

describe("canonicalizeCategory", () => {
  it("mapeia Política → Geopolítica", () => {
    expect(canonicalizeCategory("Política")).toBe("Geopolítica");
  });
  it("mapeia Negócios/Finanças → Economia", () => {
    expect(canonicalizeCategory("Negócios/Finanças")).toBe("Economia");
  });
  it("retorna a categoria original se não for legacy", () => {
    expect(canonicalizeCategory("Tecnologia")).toBe("Tecnologia");
  });
});

describe("categorizeTrend — keywords", () => {
  it("detecta Tecnologia para artificial intelligence", () => {
    expect(categorizeTrend("OpenAI releases new artificial intelligence model", "NewsAPI")).toBe("Tecnologia");
  });
  it("detecta Esportes para Champions League", () => {
    expect(categorizeTrend("Champions League final result", "NewsAPI")).toBe("Esportes");
  });
  it("detecta Economia para Wall Street", () => {
    expect(categorizeTrend("Wall Street reacts to Fed rate decision", "NewsAPI")).toBe("Economia");
  });
  it("detecta Meio Ambiente para climate", () => {
    expect(categorizeTrend("Climate crisis worsens in 2026", "NewsAPI")).toBe("Meio Ambiente");
  });
  it("BBB é Entretenimento, não Geopolítica", () => {
    expect(categorizeTrend("Paredão do BBB define eliminado", "Google Trends")).toBe("Entretenimento");
  });
});

describe("categorizeTrend — plataformas", () => {
  it("retorna Economia para World Bank", () => {
    expect(categorizeTrend("GDP growth rate", "World Bank")).toBe("Economia");
  });
  it("retorna Geopolítica para GDELT", () => {
    expect(categorizeTrend("Conflict report", "GDELT")).toBe("Geopolítica");
  });
  it("retorna Cultura para Wikipedia", () => {
    expect(categorizeTrend("Most viewed article", "Wikipedia")).toBe("Cultura");
  });
});

describe("detectCountryFromContent", () => {
  it("detecta Brasil para título com brasil", () => {
    expect(detectCountryFromContent("Eleições no Brasil 2026", "Google Trends")).toBe("BR");
  });
  it("detecta US para white house", () => {
    expect(detectCountryFromContent("White House announces new policy", "NewsAPI")).toBe("US");
  });
  it("retorna undefined sem pistas", () => {
    expect(detectCountryFromContent("Random topic", "Unknown")).toBeUndefined();
  });
});

describe("countryCodeToFlag", () => {
  it("retorna bandeira do Brasil para BR", () => {
    expect(countryCodeToFlag("BR")).toBe("🇧🇷");
  });
  it("retorna 🌐 para GL", () => {
    expect(countryCodeToFlag("GL")).toBe("🌐");
  });
  it("retorna null para código inválido", () => {
    expect(countryCodeToFlag(undefined)).toBeNull();
  });
});

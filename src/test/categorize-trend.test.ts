import { describe, it, expect } from "vitest";
import { canonicalizeCategory, categorizeTrend } from "@/lib/categorize-trend";

describe("canonicalizeCategory", () => {
  it("Política → Geopolítica", () => {
    expect(canonicalizeCategory("Política")).toBe("Geopolítica");
  });
  it("Negócios/Finanças → Economia", () => {
    expect(canonicalizeCategory("Negócios/Finanças")).toBe("Economia");
  });
  it("Clima/Meio Ambiente → Meio Ambiente", () => {
    expect(canonicalizeCategory("Clima/Meio Ambiente")).toBe("Meio Ambiente");
  });
  it("mantém categoria canônica", () => {
    expect(canonicalizeCategory("Tecnologia")).toBe("Tecnologia");
  });
});

describe("categorizeTrend — keywords em inglês", () => {
  it("Tecnologia para artificial intelligence", () => {
    expect(categorizeTrend("OpenAI artificial intelligence model", "NewsAPI")).toBe("Tecnologia");
  });
  it("Esportes para football", () => {
    expect(categorizeTrend("football championship final result", "NewsAPI")).toBe("Esportes");
  });
  it("Economia para stock market", () => {
    expect(categorizeTrend("stock market economy finance business", "NewsAPI")).toBe("Economia");
  });
  it("Meio Ambiente para climate warming", () => {
    expect(categorizeTrend("climate warming deforestation pollution", "NewsAPI")).toBe("Meio Ambiente");
  });
  it("Entretenimento para BBB", () => {
    expect(categorizeTrend("Paredão do BBB define eliminado", "Google Trends")).toBe("Entretenimento");
  });
  it("Geopolítica para election congress", () => {
    expect(categorizeTrend("US election congress senate voting", "NewsAPI")).toBe("Geopolítica");
  });
  it("Saúde para health disease", () => {
    expect(categorizeTrend("health disease outbreak epidemic who", "NewsAPI")).toBe("Saúde");
  });
  it("Ciência para nasa space", () => {
    expect(categorizeTrend("NASA space discovery science research", "NewsAPI")).toBe("Ciência");
  });
});

describe("categorizeTrend — plataformas default", () => {
  it("Economia para World Bank", () => {
    expect(categorizeTrend("GDP growth rate", "World Bank")).toBe("Economia");
  });
  it("Cultura para Wikipedia", () => {
    expect(categorizeTrend("Most viewed article", "Wikipedia")).toBe("Cultura");
  });
  it("Meio Ambiente para NOAA", () => {
    expect(categorizeTrend("Atlantic storm forecast", "NOAA")).toBe("Meio Ambiente");
  });
  it("Tecnologia para Lobsters", () => {
    expect(categorizeTrend("New programming language", "Lobsters")).toBe("Tecnologia");
  });
  it("Geopolítica para ACLED", () => {
    expect(categorizeTrend("Violence report", "ACLED")).toBe("Geopolítica");
  });
});

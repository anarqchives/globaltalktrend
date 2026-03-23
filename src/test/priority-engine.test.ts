import { describe, it, expect } from "vitest";
import { getSourceType } from "@/lib/priority-engine";

describe("getSourceType", () => {
  it("classifica Reuters como imprensa", () => {
    expect(getSourceType("Reuters")).toBe("imprensa");
  });
  it("classifica Reddit como redes_sociais", () => {
    expect(getSourceType("Reddit")).toBe("redes_sociais");
  });
  it("classifica Google Trends como google_trends", () => {
    expect(getSourceType("Google Trends")).toBe("google_trends");
  });
  it("classifica World Bank como dados_oficiais", () => {
    expect(getSourceType("World Bank")).toBe("dados_oficiais");
  });
  it("classifica PubMed como cientifico", () => {
    expect(getSourceType("PubMed")).toBe("cientifico");
  });
  it("retorna imprensa como fallback", () => {
    expect(getSourceType("Fonte Desconhecida")).toBe("imprensa");
  });
});

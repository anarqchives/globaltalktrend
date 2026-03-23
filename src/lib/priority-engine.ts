import { describe, it, expect } from "vitest";
import { computePriority, getSourceType, getConfidenceLabel } from "@/lib/priority-engine";

const baseOpts = {
  multiplatformTitles: new Set<string>(),
  maxVolumeInFeed: 1_000_000,
  lang: "pt",
};

const baseTrend = {
  icon: "📰",
  platform: "NewsAPI",
  title: "Teste de trend",
  category: "Geral",
  time: "agora",
  volume: "10K",
  change: "+15%",
  changePositive: true,
  sparkData: [10, 20, 30, 40, 50],
};

describe("computePriority — tier", () => {
  it("retorna tier high para trend verificada com alto crescimento e múltiplas fontes", () => {
    const result = computePriority(
      {
        ...baseTrend,
        platform: "Reuters",
        volume: "5.2M",
        change: "+340%",
        sources: ["Reuters", "BBC", "AP News"],
        publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      { ...baseOpts, maxVolumeInFeed: 5_200_000 }
    );
    expect(result.tier).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(8);
  });

  it("retorna tier low para trend com fonte única e baixo crescimento", () => {
    const result = computePriority(
      { ...baseTrend, volume: "100", change: "+5%", sources: [] },
      baseOpts
    );
    expect(result.tier).toBe("low");
    expect(result.score).toBeLessThan(4);
  });

  it("retorna tier medium para trend com crescimento moderado", () => {
    const result = computePriority(
      { ...baseTrend, volume: "50K", change: "+60%", sources: ["Reddit", "Bluesky"] },
      baseOpts
    );
    expect(result.tier).toBe("medium");
  });
});

describe("computePriority — lifecycle", () => {
  it("retorna emerging para trend publicada há menos de 3 horas", () => {
    const result = computePriority(
      {
        ...baseTrend,
        change: "+10%",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      baseOpts
    );
    expect(result.lifecycle).toBe("emerging");
  });

  it("retorna accelerating para change maior que 50%", () => {
    const result = computePriority(
      { ...baseTrend, change: "+75%" },
      baseOpts
    );
    expect(result.lifecycle).toBe("accelerating");
  });

  it("retorna declining para change negativo maior que 20%", () => {
    const result = computePriority(
      { ...baseTrend, change: "-45%", changePositive: false },
      baseOpts
    );
    expect(result.lifecycle).toBe("declining");
  });

  it("retorna stable para change entre -10% e +10%", () => {
    const result = computePriority(
      {
        ...baseTrend,
        change: "+5%",
        publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      },
      baseOpts
    );
    expect(result.lifecycle).toBe("stable");
  });
});

describe("computePriority — confidence", () => {
  it("retorna high confidence para fonte verificada com múltiplas fontes", () => {
    const result = computePriority(
      {
        ...baseTrend,
        platform: "BBC",
        sources: ["BBC", "Reuters", "AP News"],
      },
      baseOpts
    );
    expect(result.confidence).toBe("high");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
  });

  it("retorna low confidence para fonte única não verificada", () => {
    const result = computePriority(
      { ...baseTrend, platform: "Reddit", sources: [] },
      baseOpts
    );
    expect(result.confidence).toBe("low");
    expect(result.confidenceScore).toBeLessThan(0.4);
  });
});

describe("computePriority — multiplatform boost", () => {
  it("aplica boost de prioridade para trends multiplataforma", () => {
    const title = "guerra na ucrania";
    const multiOpts = {
      ...baseOpts,
      multiplatformTitles: new Set([title]),
    };
    const withBoost = computePriority(
      { ...baseTrend, title: "Guerra na Ucrânia", sources: [] },
      multiOpts
    );
    const withoutBoost = computePriority(
      { ...baseTrend, title: "Guerra na Ucrânia", sources: [] },
      baseOpts
    );
    expect(withBoost.score).toBeGreaterThan(withoutBoost.score);
    expect(withBoost.sourceCount).toBeGreaterThanOrEqual(3);
  });
});

describe("computePriority — volume normalization", () => {
  it("normaliza volume corretamente em relação ao feed", () => {
    const result = computePriority(
      { ...baseTrend, volume: "500K" },
      { ...baseOpts, maxVolumeInFeed: 1_000_000 }
    );
    expect(result.normalizedVolume).toBeCloseTo(0.5, 1);
  });

  it("normalizedVolume não excede 1", () => {
    const result = computePriority(
      { ...baseTrend, volume: "2M" },
      { ...baseOpts, maxVolumeInFeed: 1_000_000 }
    );
    expect(result.normalizedVolume).toBeLessThanOrEqual(1);
  });
});

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

  it("retorna imprensa como fallback para fonte desconhecida", () => {
    expect(getSourceType("Fonte Desconhecida")).toBe("imprensa");
  });
});

describe("getConfidenceLabel", () => {
  it("retorna Alta confiança para score >= 0.7 em pt", () => {
    expect(getConfidenceLabel(0.9, "pt")).toBe("Alta confiança");
  });

  it("retorna Confiança moderada para score entre 0.4 e 0.7 em pt", () => {
    expect(getConfidenceLabel(0.5, "pt")).toBe("Confiança moderada");
  });

  it("retorna Baixa confiança para score < 0.4 em pt", () => {
    expect(getConfidenceLabel(0.2, "pt")).toBe("Baixa confiança");
  });

  it("retorna High confidence em inglês", () => {
    expect(getConfidenceLabel(0.9, "en")).toBe("High confidence");
  });
});

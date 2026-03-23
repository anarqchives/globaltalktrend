import { describe, it, expect } from "vitest";
import { computePriority } from "@/lib/priority-engine";

const baseOpts = {
  multiplatformTitles: new Set<string>(),
  maxVolumeInFeed: 1_000_000,
  lang: "pt",
};

const baseTrend = {
  icon: "📰", platform: "NewsAPI", title: "Teste",
  category: "Geral", time: "agora", volume: "10K",
  change: "+15%", changePositive: true, sparkData: [10, 20, 30],
};

describe("computePriority — tier", () => {
  it("tier high para trend verificada com alto crescimento", () => {
    const result = computePriority(
      { ...baseTrend, platform: "Reuters", volume: "5M", change: "+340%",
        sources: ["Reuters", "BBC", "AP News"],
        publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
      { ...baseOpts, maxVolumeInFeed: 5_000_000 }
    );
    expect(result.tier).toBe("high");
  });

  it("tier low para fonte única e baixo crescimento", () => {
    const result = computePriority(
      { ...baseTrend, volume: "100", change: "+5%", sources: [] },
      baseOpts
    );
    expect(result.tier).toBe("low");
  });

  it("tier medium para crescimento moderado", () => {
    const result = computePriority(
      { ...baseTrend, volume: "50K", change: "+60%", sources: ["Reddit", "Bluesky"] },
      baseOpts
    );
    expect(result.tier).toBe("medium");
  });
});

describe("computePriority — lifecycle", () => {
  it("emerging para trend publicada há menos de 3h", () => {
    const result = computePriority(
      { ...baseTrend, change: "+10%",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
      baseOpts
    );
    expect(result.lifecycle).toBe("emerging");
  });

  it("accelerating para change maior que 50%", () => {
    const result = computePriority({ ...baseTrend, change: "+75%" }, baseOpts);
    expect(result.lifecycle).toBe("accelerating");
  });

  it("stable para change entre -10% e +10%", () => {
    const result = computePriority(
      { ...baseTrend, change: "+5%",
        publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString() },
      baseOpts
    );
    expect(result.lifecycle).toBe("stable");
  });
});

describe("computePriority — confidence", () => {
  it("high confidence para fonte verificada com múltiplas fontes", () => {
    const result = computePriority(
      { ...baseTrend, platform: "BBC", sources: ["BBC", "Reuters", "AP News"] },
      baseOpts
    );
    expect(result.confidence).toBe("high");
  });

  it("low confidence para fonte única não verificada", () => {
    const result = computePriority(
      { ...baseTrend, platform: "Reddit", sources: [] }, baseOpts
    );
    expect(result.confidence).toBe("low");
  });
});

describe("computePriority — volume", () => {
  it("normalizedVolume não excede 1", () => {
    const result = computePriority(
      { ...baseTrend, volume: "2M" },
      { ...baseOpts, maxVolumeInFeed: 1_000_000 }
    );
    expect(result.normalizedVolume).toBeLessThanOrEqual(1);
  });
});

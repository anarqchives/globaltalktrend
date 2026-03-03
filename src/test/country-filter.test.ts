import { describe, it, expect } from "vitest";

/**
 * Regression tests for country filtering logic.
 * These mirror the normalization + strict filter pipeline in use-trends.ts.
 */

function normalizeCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const cleaned = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2);
  return undefined;
}

interface MockTrend {
  title: string;
  countryCode?: string;
  platform: string;
}

function strictCountryFilter(trends: MockTrend[], countryFilter: string): MockTrend[] {
  if (countryFilter === "global") return trends;

  const filterCode = normalizeCountryCode(countryFilter);
  return trends.filter((t) => {
    const trendCountry = normalizeCountryCode(t.countryCode) || "GL";
    return trendCountry === filterCode;
  });
}

describe("Country filter — strict mode", () => {
  const trends: MockTrend[] = [
    { title: "Eleições 2026", countryCode: "BR", platform: "Folha" },
    { title: "Trump speech", countryCode: "US", platform: "CNN" },
    { title: "Brexit update", countryCode: "GB", platform: "BBC" },
    { title: "Global warming", countryCode: "GL", platform: "Google Trends" },
    { title: "Moscow protest", countryCode: "RU", platform: "Reuters" },
    { title: "No country", countryCode: undefined, platform: "Unknown" },
    { title: "Gaza ceasefire talks", countryCode: "PS", platform: "Al Jazeera" },
    { title: "Conflito na Ucrânia", countryCode: "UA", platform: "BBC" },
  ];

  it("selecting BR shows ONLY BR trends", () => {
    const result = strictCountryFilter(trends, "BR");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Eleições 2026");
  });

  it("selecting RU shows ONLY RU trends", () => {
    const result = strictCountryFilter(trends, "RU");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Moscow protest");
  });

  it("selecting US shows ONLY US trends", () => {
    const result = strictCountryFilter(trends, "US");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Trump speech");
  });

  it("selecting PS shows ONLY PS trends", () => {
    const result = strictCountryFilter(trends, "PS");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Gaza ceasefire talks");
  });

  it("selecting UA shows ONLY UA trends", () => {
    const result = strictCountryFilter(trends, "UA");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Conflito na Ucrânia");
  });

  it("global shows ALL trends", () => {
    const result = strictCountryFilter(trends, "global");
    expect(result).toHaveLength(trends.length);
  });

  it("GL (global) trends do NOT leak into specific country filters", () => {
    const result = strictCountryFilter(trends, "BR");
    const hasGlobal = result.some((t) => normalizeCountryCode(t.countryCode) === "GL");
    expect(hasGlobal).toBe(false);
  });

  it("trends without countryCode (undefined) do NOT leak into specific country filters", () => {
    const result = strictCountryFilter(trends, "GB");
    const hasUndefined = result.some((t) => !t.countryCode);
    expect(hasUndefined).toBe(false);
  });

  it("case-insensitive matching works", () => {
    const result = strictCountryFilter(trends, "br");
    expect(result).toHaveLength(1);
    expect(result[0].countryCode).toBe("BR");
  });

  it("multiplataforma filter: detects trends appearing on 2+ platforms", () => {
    const multiTrends: MockTrend[] = [
      { title: "Gaza ceasefire talks resume today", countryCode: "PS", platform: "Al Jazeera" },
      { title: "Gaza ceasefire talks resume today", countryCode: "PS", platform: "BBC" },
      { title: "Trump speech at rally", countryCode: "US", platform: "CNN" },
    ];
    // Group by exact title, check for 2+ unique platforms
    const grouped: Record<string, Set<string>> = {};
    for (const t of multiTrends) {
      const key = t.title.toLowerCase().slice(0, 50);
      if (!grouped[key]) grouped[key] = new Set();
      grouped[key].add(t.platform);
    }
    const multiplatformKeys = new Set(
      Object.entries(grouped).filter(([, platforms]) => platforms.size >= 2).map(([key]) => key)
    );
    const result = multiTrends.filter(t => multiplatformKeys.has(t.title.toLowerCase().slice(0, 50)));
    expect(result).toHaveLength(2);
    expect(result.every(t => t.title.includes("Gaza"))).toBe(true);
  });
});

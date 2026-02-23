import { useState, useMemo } from "react";
import TrendHeader from "@/components/TrendHeader";
import FilterBar, { FilterState } from "@/components/FilterBar";
import WorldMapPlaceholder from "@/components/WorldMapPlaceholder";
import TrendsSection from "@/components/TrendsSection";
import TrendFooter from "@/components/TrendFooter";

const defaultFilters: FilterState = {
  country: "global",
  period: "Hoje",
  category: "Todas",
  type: "Todas mídias",
};

const Index = () => {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [trendCounts, setTrendCounts] = useState<Record<string, number>>({});

  const handleMapClick = (code: string) => {
    setFilters((f) => ({ ...f, country: code }));
  };

  return (
    <div className="min-h-screen bg-background">
      <TrendHeader />
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        <FilterBar filters={filters} onChange={setFilters} />
        <div className="mt-6">
          <WorldMapPlaceholder
            trendCounts={trendCounts}
            selectedCountry={filters.country}
            onSelectCountry={handleMapClick}
          />
        </div>
        <TrendsSection
          filters={filters}
          onTrendCountsChange={setTrendCounts}
        />
      </main>
      <TrendFooter />
    </div>
  );
};

export default Index;

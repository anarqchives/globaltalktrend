import TrendHeader from "@/components/TrendHeader";
import FilterBar from "@/components/FilterBar";
import WorldMapPlaceholder from "@/components/WorldMapPlaceholder";
import TrendsSection from "@/components/TrendsSection";
import TrendFooter from "@/components/TrendFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TrendHeader />
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-6">
        <FilterBar />
        <div className="mt-6">
          <WorldMapPlaceholder />
        </div>
        <TrendsSection />
      </main>
      <TrendFooter />
    </div>
  );
};

export default Index;

const WorldMapPlaceholder = () => {
  return (
    <div className="bg-card rounded-3xl p-4 border border-border mb-8" style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
      <div className="h-[400px] w-full rounded-2xl bg-secondary/50 flex items-center justify-center relative overflow-hidden">
        {/* Decorative map dots */}
        <svg viewBox="0 0 800 400" className="w-full h-full opacity-20" preserveAspectRatio="xMidYMid meet">
          {/* Simplified world map dots */}
          {[
            // Americas
            [200, 120], [210, 130], [190, 140], [195, 160], [205, 180], [210, 200], [215, 220], [220, 250], [210, 270], [200, 290],
            [180, 110], [170, 100], [160, 105], [220, 140], [230, 150],
            // Europe
            [400, 100], [410, 95], [420, 100], [415, 110], [405, 115], [430, 90], [440, 95],
            [390, 105], [395, 95], [425, 105],
            // Africa
            [410, 170], [420, 180], [415, 200], [410, 220], [420, 240], [405, 190],
            // Asia
            [500, 100], [520, 110], [540, 120], [560, 130], [580, 120], [600, 110], [620, 130],
            [510, 130], [530, 140], [550, 150], [570, 160], [590, 150],
            [640, 140], [650, 150], [660, 160],
            // Oceania
            [620, 260], [640, 270], [650, 280], [630, 275],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={3} fill="hsl(210, 100%, 40%)" />
          ))}
          {/* Pulse dots for active trends */}
          {[
            [200, 120], [410, 100], [560, 130], [420, 180],
          ].map(([cx, cy], i) => (
            <circle key={`pulse-${i}`} cx={cx} cy={cy} r={6} fill="none" stroke="hsl(210, 100%, 40%)" strokeWidth={1.5}>
              <animate attributeName="r" values="6;14" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-sm font-medium bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full">
            🌍 Mapa global de tendências
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorldMapPlaceholder;

/**
 * Mobile bottom navigation bar
 */
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Compass, FileText, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_ITEMS = [
  { path: "/", icon: Home, labelPt: "Feed", labelEn: "Feed" },
  { path: "/discover", icon: Compass, labelPt: "Explorar", labelEn: "Discover" },
  { path: "/reports", icon: FileText, labelPt: "Relatórios", labelEn: "Reports" },
  { path: "/perfil", icon: User, labelPt: "Perfil", labelEn: "Profile" },
];

const BottomNav: React.FC = () => {
  const { lang } = useLanguage();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/30 safe-area-pb md:hidden"
      style={{ WebkitBackdropFilter: "blur(16px) saturate(1.5)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around h-12 max-w-md mx-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const label = lang === "pt" ? item.labelPt : item.labelEn;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors touch-manipulation
                ${isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(BottomNav);

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "src/integrations/**",
        "src/components/ui/**",
        "src/pages/Maintenance.tsx",
        "src/pages/Teste.tsx",
        "src/vite-env.d.ts",
        "src/main.tsx",
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 35,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

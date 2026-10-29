import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // The profile tests read the shared fixtures in ../docs and the seed profiles in ../backend.
  server: { fs: { allow: [path.resolve(__dirname, "..")] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // Generated route tree, app entry and shadcn primitives are not our logic.
      exclude: ["src/test/**", "src/routeTree.gen.ts", "src/main.tsx", "src/components/ui/**"],
      reporter: ["text-summary", "lcov"],
      thresholds: { lines: 70, statements: 70, functions: 60, branches: 60 },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

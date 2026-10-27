import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts only calls listen(); the seed data files are static tables.
      exclude: ["src/server.ts", "src/data/**"],
      reporter: ["text-summary", "lcov"],
      thresholds: { lines: 85, statements: 80, functions: 70, branches: 65 },
    },
  },
});

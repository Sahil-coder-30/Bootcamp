import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts only calls listen(); migrate.ts and pgStore.ts need a live Postgres.
      exclude: ["src/server.ts", "src/migrate.ts", "src/services/pgStore.ts"],
      reporter: ["text-summary", "lcov"],
      thresholds: { lines: 85, statements: 80, functions: 70, branches: 65 },
    },
  },
});

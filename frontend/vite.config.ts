import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// The backend (../backend) serves /api. In dev, Vite proxies /api to it so the
// browser talks to one origin. In production set VITE_API_URL to the backend URL.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    port: 5173,
    proxy: {
      // more specific first: sign-in (and the Google callback) go to the auth service
      "/api/auth": "http://localhost:4100",
      "/api": "http://localhost:4000",
    },
  },
});

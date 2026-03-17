import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load parent .env so WEB_UI_PORT is available without extra env vars
config({ path: resolve(import.meta.dirname, "../.env") });

const apiPort = process.env.WEB_UI_PORT ?? "3001";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});

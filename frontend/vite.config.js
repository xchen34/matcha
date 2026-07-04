import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiProxyTarget =
  process.env.VITE_API_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});

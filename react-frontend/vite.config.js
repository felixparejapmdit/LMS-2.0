import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/directus': {
        target: 'http://localhost:8055',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/directus/, '')
      }
    }
  }
});

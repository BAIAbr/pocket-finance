import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// ⚠️ GITHUB PAGES CONFIGURATION
// Change "finance-app" to your repository name
// Example: If your repo is github.com/username/my-finance → use "my-finance"
const REPO_NAME = "finance-app";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // For GitHub Pages: uses repo name as base path in production
  base: mode === "production" ? `/${REPO_NAME}/` : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

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
  /**
   * Base path strategy:
   * - Lovable hosting (default): served at domain root → base "/"
   * - GitHub Pages: served under "/<repo>/" → build with `--mode gh-pages`
   */
  base: mode === "gh-pages" ? `/${REPO_NAME}/` : "/",
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

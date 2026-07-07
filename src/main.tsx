import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { preHydrateTheme } from "./contexts/ThemeContext";

// Redirect clean URLs (e.g. /vip/CODE) to the HashRouter equivalent (/#/vip/CODE)
// so that shared VIP links without the "#" still work.
(() => {
  const { pathname, search, hash } = window.location;
  if (pathname && pathname !== "/" && !hash) {
    const normalized = pathname.replace(/\/+$/, "");
    window.history.replaceState(null, "", `/#${normalized}${search}`);
  }
})();

// Apply saved theme + color scheme synchronously BEFORE React renders,
// so the Profile header (and rest of the UI) never flashes the default palette.
preHydrateTheme();

createRoot(document.getElementById("root")!).render(<App />);

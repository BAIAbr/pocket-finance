import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
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

// On a fresh app launch (new session), if the user landed on /settings,
// redirect to the home dashboard so the app always opens on Início.
// This prevents the PWA/browser from restoring the last visited settings page.
(() => {
  const redirectFlag = "finango.homeRedirectDone";
  if (!sessionStorage.getItem(redirectFlag) && window.location.hash === "#/settings") {
    window.history.replaceState(null, "", "/#/");
  }
  sessionStorage.setItem(redirectFlag, "1");
})();

// Apply saved theme + color scheme synchronously BEFORE React renders,
// so the Profile header (and rest of the UI) never flashes the default palette.
preHydrateTheme();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider><App /></HelmetProvider>
);

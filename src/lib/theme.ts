export const themeStorageKey = "nutria-theme";

export type Theme = "light" | "dark";

export const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark";

/**
 * Runs in <head> while the HTML is parsed, so the stored theme is applied
 * before the first paint. Falls back to the OS preference when nothing is
 * stored, and to the OS preference when localStorage is unavailable.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(
  themeStorageKey,
)})}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")})()`;

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Persistence is best-effort; the class on <html> is the source of truth.
  }
}

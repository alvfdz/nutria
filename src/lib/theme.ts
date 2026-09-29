/** localStorage key holding the user's explicit theme choice. */
export const themeStorageKey = "nutria-theme";

/** The two themes the app supports. */
export type Theme = "light" | "dark";

/** Narrows an unknown value to a {@link Theme}. */
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

/**
 * Reads the theme the user last chose.
 *
 * @returns The stored theme, or `null` when nothing valid is stored or
 * localStorage is unavailable.
 */
export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Switches the document to a theme by toggling the `dark` class on `<html>`.
 * That class is the single source of truth for the whole app.
 */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** @returns Whether the dark theme is currently active. */
export function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

/**
 * Persists the user's choice so the inline theme script can restore it before
 * the first paint. Best-effort: the class on `<html>` remains authoritative.
 */
export function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Persistence is best-effort; the class on <html> is the source of truth.
  }
}

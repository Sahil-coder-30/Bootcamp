import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

export function applyTheme(theme: ThemeMode): void {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light-theme", !isDark);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("placeintel_theme") || localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("placeintel_theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}

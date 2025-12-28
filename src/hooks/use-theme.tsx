"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { detectWhopContext } from "@/lib/embed";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "formify-crm-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;

    const isWhop = detectWhopContext();
    if (isWhop) {
      return "system";
    }

    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    return stored || defaultTheme;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    const applyTheme = (next: Theme) => {
      root.classList.remove("light", "dark");
      if (next === "system") {
        const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(systemDark ? "dark" : "light");
      } else {
        root.classList.add(next);
      }
    };

    applyTheme(theme);

    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme("system");
    };

    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined") {
        const isWhop = detectWhopContext();
        if (!isWhop) {
          window.localStorage.setItem(storageKey, theme);
        }
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const LoginThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

/**
 * Login-only theme state. There is no app-wide theme persistence layer to
 * reuse (no next-themes/ThemeProvider, no localStorage theme key anywhere
 * in this codebase — grepped before adding this), so this is plain React
 * state seeded from prefers-color-scheme on mount. The data-theme attribute
 * is set only on this wrapper, never on document.documentElement, so it
 * cannot leak into other routes.
 */
export default function LoginThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <LoginThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="rsx-shell" data-theme={theme}>
        {children}
      </div>
    </LoginThemeContext.Provider>
  );
}

export function useLoginTheme() {
  const context = useContext(LoginThemeContext);

  if (!context) {
    throw new Error("useLoginTheme must be used within LoginThemeProvider");
  }

  return context;
}

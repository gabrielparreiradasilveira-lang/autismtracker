import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
export type FontSize = "small" | "medium" | "large" | "extra-large";

export const FONT_SIZES: FontSize[] = ["small", "medium", "large", "extra-large"];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Aparência e acessibilidade aplicadas no elemento raiz.
 *
 * fontSize e reduceMotion eram salvos em Settings e lidos em lugar
 * nenhum. Agora moram aqui, junto do tema, pelos mesmos motivos: o valor
 * é lido do localStorage na primeira renderização (evita piscar com o
 * tamanho errado) e a classe correspondente vai para o <html>, onde o
 * CSS em index.css age sobre a interface inteira.
 *
 * Settings.tsx chama os setters direto, de modo que a mudança aparece no
 * instante em que a pessoa mexe no controle, antes mesmo de salvar.
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : defaultTheme;
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const stored = localStorage.getItem("fontSize");
    return FONT_SIZES.includes(stored as FontSize) ? (stored as FontSize) : "medium";
  });

  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => localStorage.getItem("reduceMotion") === "true"
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...FONT_SIZES.map((s) => `app-font-${s}`));
    root.classList.add(`app-font-${fontSize}`);
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduce-motion", reduceMotion);
    localStorage.setItem("reduceMotion", String(reduceMotion));
  }, [reduceMotion]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, fontSize, setFontSize, reduceMotion, setReduceMotion }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}

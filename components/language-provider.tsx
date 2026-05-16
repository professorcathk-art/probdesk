"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lang, Strings } from "@/lib/i18n/strings";
import { STRINGS } from "@/lib/i18n/strings";

const STORAGE_KEY = "vennode-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  strings: Strings;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  const nav = navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read localStorage / navigator after mount to avoid SSR mismatch */
    setLangState(detectInitialLang());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  const strings = useMemo(() => STRINGS[lang] as Strings, [lang]);

  const value = useMemo(() => ({ lang, setLang, strings }), [lang, setLang, strings]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider } from "next-themes";

import {
  translations,
  type Locale,
  type MessageKey,
} from "@/config/i18n";

type AppSettingsContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);
const localeStorageKey = "todo-admin-locale";

function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedLocale = window.localStorage.getItem(localeStorageKey);
      if (storedLocale === "vi" || storedLocale === "en") {
        setLocaleState(storedLocale);
        document.documentElement.lang = storedLocale;
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(localeStorageKey, nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const t = useCallback(
    (key: MessageKey) => translations[locale][key],
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings phải được dùng trong AppSettingsProvider.");
  }

  return context;
}

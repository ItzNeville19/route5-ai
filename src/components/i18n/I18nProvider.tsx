"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import {
  resolveUiLocale,
  resolveUiLocaleFromBrowser,
  toIntlLocale,
} from "@/lib/i18n/ui-locales";
import { translate } from "@/lib/i18n/translate";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  loadWorkspacePrefs,
  mergeWorkspacePrefsPatch,
  saveWorkspacePrefs,
} from "@/lib/workspace-prefs";

const PREFS_STORAGE_KEY = "route5:workspacePrefs.v1";

export type I18nContextValue = {
  /** Resolved locale code (never auto — browser is folded in). */
  uiLocale: UiLocaleCode;
  /** BCP 47 tag for `Intl`, dates, `toLocaleDateString`, etc. */
  intlLocale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setUiLocale: (code: UiLocaleCode | undefined) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Marketing / signed-out routes: reads `uiLocale` from workspace prefs in localStorage (same key as the app). */
export function PublicI18nProvider({ children }: { children: React.ReactNode }) {
  const [uiLocale, setUiLocaleState] = useState<UiLocaleCode>(() =>
    typeof window === "undefined" ? "en" : resolveUiLocaleFromBrowser()
  );

  useEffect(() => {
    const prefs = loadWorkspacePrefs();
    setUiLocaleState(resolveUiLocale(prefs.uiLocale));
  }, []);

  useEffect(() => {
    const syncFromPrefs = () => {
      const prefs = loadWorkspacePrefs();
      setUiLocaleState(resolveUiLocale(prefs.uiLocale));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== PREFS_STORAGE_KEY) return;
      syncFromPrefs();
    };
    const onPrefsChanged = () => syncFromPrefs();
    window.addEventListener("storage", onStorage);
    window.addEventListener("route5:workspace-prefs-changed", onPrefsChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("route5:workspace-prefs-changed", onPrefsChanged);
    };
  }, []);

  const intlLocale = useMemo(() => toIntlLocale(uiLocale), [uiLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(uiLocale, key, vars),
    [uiLocale]
  );

  const setUiLocale = useCallback((code: UiLocaleCode | undefined) => {
    const prev = loadWorkspacePrefs();
    const next = mergeWorkspacePrefsPatch(prev, {
      uiLocale: code === undefined ? null : code,
    });
    saveWorkspacePrefs(next);
    setUiLocaleState(resolveUiLocale(code));
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const lang = intlLocale.split("-")[0] ?? "en";
    document.documentElement.lang = lang;
  }, [intlLocale]);

  const value = useMemo(
    () => ({ uiLocale, intlLocale, t, setUiLocale }),
    [uiLocale, intlLocale, t, setUiLocale]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const exp = useWorkspaceExperience();

  const uiLocale = useMemo(
    () => resolveUiLocale(exp.prefs.uiLocale),
    [exp.prefs.uiLocale]
  );

  const intlLocale = useMemo(() => toIntlLocale(uiLocale), [uiLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(uiLocale, key, vars),
    [uiLocale]
  );

  const setUiLocale = useCallback(
    (code: UiLocaleCode | undefined) => {
      exp.setPrefs({ uiLocale: code === undefined ? null : code });
    },
    [exp]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const lang = intlLocale.split("-")[0] ?? "en";
    document.documentElement.lang = lang;
  }, [intlLocale]);

  const value = useMemo(
    () => ({ uiLocale, intlLocale, t, setUiLocale }),
    [uiLocale, intlLocale, t, setUiLocale]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within PublicI18nProvider or I18nProvider");
  }
  return ctx;
}

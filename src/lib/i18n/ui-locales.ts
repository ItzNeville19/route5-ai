/** Short UI locale codes stored in workspace prefs (maps to full BCP 47 for Intl). */

export const UI_LOCALES = [
  { code: "en", label: "English", native: "English", intl: "en-US" },
  { code: "es", label: "Spanish", native: "Español", intl: "es" },
  { code: "fr", label: "French", native: "Français", intl: "fr" },
  { code: "de", label: "German", native: "Deutsch", intl: "de" },
  { code: "pt", label: "Portuguese", native: "Português", intl: "pt-BR" },
  { code: "it", label: "Italian", native: "Italiano", intl: "it" },
  { code: "ja", label: "Japanese", native: "日本語", intl: "ja" },
  { code: "zh-Hans", label: "Chinese (Simplified)", native: "简体中文", intl: "zh-Hans-CN" },
  { code: "ko", label: "Korean", native: "한국어", intl: "ko" },
  { code: "nl", label: "Dutch", native: "Nederlands", intl: "nl" },
  { code: "pl", label: "Polish", native: "Polski", intl: "pl" },
  { code: "hi", label: "Hindi (India)", native: "हिन्दी", intl: "hi-IN" },
] as const;

export type UiLocaleCode = (typeof UI_LOCALES)[number]["code"];

const CODE_SET = new Set<string>(UI_LOCALES.map((x) => x.code));

export function isUiLocaleCode(s: string): s is UiLocaleCode {
  return CODE_SET.has(s);
}

export function toIntlLocale(code: UiLocaleCode): string {
  const row = UI_LOCALES.find((x) => x.code === code);
  return row?.intl ?? "en-US";
}

/** Map browser language to our nearest supported code. */
export function resolveUiLocaleFromBrowser(): UiLocaleCode {
  if (typeof navigator === "undefined") return "en";
  const raw = (navigator.language || "en").toLowerCase();
  if (raw.startsWith("zh")) return "zh-Hans";
  if (raw.startsWith("hi")) return "hi";
  for (const row of UI_LOCALES) {
    if (row.code === "zh-Hans") continue;
    const c = row.code.toLowerCase();
    if (raw === c || raw.startsWith(`${c}-`)) return row.code;
  }
  return "en";
}

/** Stored pref, or browser when unset. */
export function resolveUiLocale(pref?: string | null): UiLocaleCode {
  if (pref && isUiLocaleCode(pref)) return pref;
  return resolveUiLocaleFromBrowser();
}

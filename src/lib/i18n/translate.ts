import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { MESSAGE_PACKS } from "@/lib/i18n/packs";

export function translate(
  code: UiLocaleCode,
  key: string,
  vars?: Record<string, string | number>
): string {
  const base = MESSAGE_PACKS.en;
  const overlay = code === "en" ? undefined : MESSAGE_PACKS[code];
  let s = (overlay?.[key] ?? base[key]) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

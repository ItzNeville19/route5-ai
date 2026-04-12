import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { MESSAGE_PACKS } from "@/lib/i18n/packs";

export function translate(
  code: UiLocaleCode,
  key: string,
  vars?: Record<string, string | number>
): string {
  const pack = MESSAGE_PACKS[code] ?? MESSAGE_PACKS.en;
  let s = pack[key] ?? MESSAGE_PACKS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

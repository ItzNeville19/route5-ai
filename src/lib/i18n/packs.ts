import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { en } from "@/lib/i18n/locales/en";
import { es } from "@/lib/i18n/locales/es";
import esFill from "@/lib/i18n/locales/es-fill.json";
import { fr } from "@/lib/i18n/locales/fr";
import { de } from "@/lib/i18n/locales/de";
import { pt } from "@/lib/i18n/locales/pt";
import { it } from "@/lib/i18n/locales/it";
import { ja } from "@/lib/i18n/locales/ja";
import { zhHans } from "@/lib/i18n/locales/zh-Hans";
import { ko } from "@/lib/i18n/locales/ko";
import { nl } from "@/lib/i18n/locales/nl";
import { pl } from "@/lib/i18n/locales/pl";
import { hi } from "@/lib/i18n/locales/hi";

/**
 * Every non-English pack is merged on top of `en` so all keys exist and the UI
 * never shows raw message ids; missing per-locale strings fall back to English.
 */
export const MESSAGE_PACKS: Record<UiLocaleCode, Record<string, string>> = {
  en,
  es: { ...en, ...es, ...(esFill as Record<string, string>) },
  fr: { ...en, ...fr },
  de: { ...en, ...de },
  pt: { ...en, ...pt },
  it: { ...en, ...it },
  ja: { ...en, ...ja },
  "zh-Hans": { ...en, ...zhHans },
  ko: { ...en, ...ko },
  nl: { ...en, ...nl },
  pl: { ...en, ...pl },
  hi: { ...en, ...hi },
};

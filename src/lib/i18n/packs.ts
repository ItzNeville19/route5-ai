import type { UiLocaleCode } from "@/lib/i18n/ui-locales";
import { en } from "@/lib/i18n/locales/en";
import { es } from "@/lib/i18n/locales/es";
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

/** Full translations for every selectable UI locale. */
export const MESSAGE_PACKS: Record<UiLocaleCode, Record<string, string>> = {
  en,
  es,
  fr,
  de,
  pt,
  it,
  ja,
  "zh-Hans": zhHans,
  ko,
  nl,
  pl,
  hi,
};

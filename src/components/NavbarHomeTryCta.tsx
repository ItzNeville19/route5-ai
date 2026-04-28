"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Home-only mobile CTA: signed-in users open the app; others start signup. */
export default function NavbarHomeTryCta() {
  const { t } = useI18n();
  const tryClass =
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[#0071e3] px-3.5 text-[12px] font-semibold text-white shadow-md shadow-[#0071e3]/30 transition hover:bg-[#0077ed] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/40";

  return (
    <>
      <Show when="signed-in">
        <Link href="/desk" className={tryClass}>
          {t("landing.hero.ctaOpenDesk")}
        </Link>
      </Show>
      <Show when="signed-out">
        <Link href="/sign-up" className={tryClass}>
          {t("marketing.nav.tryRoute5")}
        </Link>
      </Show>
    </>
  );
}

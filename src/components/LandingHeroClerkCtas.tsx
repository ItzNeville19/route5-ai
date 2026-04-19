"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { useI18n } from "@/components/i18n/I18nProvider";

export function LandingHeroClerkCtas() {
  const { t } = useI18n();
  return (
    <>
      <Show when="signed-in">
        <Link
          href="/feed"
          className="inline-flex rounded-full border border-violet-500/35 bg-violet-500/10 px-5 py-2.5 text-[13px] font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
        >
          {t("marketing.hero.openFeed")}
        </Link>
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-up"
          className="inline-flex rounded-full border border-white/12 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.06]"
        >
          {t("marketing.landing.hero.ctaSignup")}
        </Link>
      </Show>
    </>
  );
}

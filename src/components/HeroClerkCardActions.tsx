"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { useI18n } from "@/components/i18n/I18nProvider";

type HeroClerkCardActionsProps = {
  emphasis: string;
  small: string;
  secondaryBtn: string;
};

export function HeroClerkCardActions({ emphasis, small, secondaryBtn }: HeroClerkCardActionsProps) {
  const { t } = useI18n();
  return (
    <>
      <Show when="signed-in">
        <p className={`mt-2 text-[15px] font-medium ${emphasis}`}>{t("marketing.hero.signedInTitle")}</p>
        <p className={`mt-1 text-[13px] leading-snug ${small}`}>{t("marketing.hero.signedInBody")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/feed"
            className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
          >
            {t("marketing.hero.openFeed")}
          </Link>
          <Link href="/settings#connections" className={secondaryBtn}>
            {t("sidebar.integrations")}
          </Link>
        </div>
      </Show>
      <Show when="signed-out">
        <p className={`mt-2 text-[15px] font-medium ${emphasis}`}>{t("marketing.hero.signedOutTitle")}</p>
        <p className={`mt-1 text-[13px] leading-snug ${small}`}>{t("marketing.hero.signedOutBody")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/sign-up"
            className="inline-flex rounded-full bg-[#0071e3] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
          >
            {t("marketing.hero.createAccount")}
          </Link>
          <Link href="/login" className={secondaryBtn}>
            {t("marketing.hero.logIn")}
          </Link>
          <Link href="/overview" className={secondaryBtn}>
            {t("marketing.hero.dashboard")}
          </Link>
        </div>
      </Show>
    </>
  );
}

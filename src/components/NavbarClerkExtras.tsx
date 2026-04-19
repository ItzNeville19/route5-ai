"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { useI18n } from "@/components/i18n/I18nProvider";

type NavbarClerkExtrasProps = {
  variant: "mobile" | "desktop";
  isCommandHome: boolean;
  mobileLink: string;
  onMobileNavigate?: () => void;
};

/**
 * Isolated so the parent Navbar can `next/dynamic(..., { ssr: false })` this module.
 * Otherwise a static `@clerk/nextjs` import in Navbar pulls Clerk onto the server during SSR
 * and throws when `CLERK_SECRET_KEY` is missing (e.g. standalone without env).
 */
export function NavbarClerkExtras({
  variant,
  isCommandHome,
  mobileLink,
  onMobileNavigate,
}: NavbarClerkExtrasProps) {
  const { t } = useI18n();

  const desktopLogInClass = isCommandHome
    ? "px-2 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
    : "px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]";

  if (variant === "mobile") {
    return (
      <>
        <Show when="signed-out">
          <Link
            href="/login"
            className={mobileLink}
            onClick={() => onMobileNavigate?.()}
          >
            {t("marketing.hero.logIn")}
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/settings"
            className={mobileLink}
            onClick={() => onMobileNavigate?.()}
          >
            {t("marketing.nav.settings")}
          </Link>
        </Show>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Link href="/login" className={desktopLogInClass}>
          {t("marketing.hero.logIn")}
        </Link>
      </Show>
      <Show when="signed-in">
        <UserButton
          userProfileMode="navigation"
          userProfileUrl="/settings"
          showName={false}
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "rounded-2xl",
            },
          }}
        />
      </Show>
    </>
  );
}

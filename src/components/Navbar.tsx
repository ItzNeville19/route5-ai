"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";

const NavbarClerkExtrasLazy = dynamic(
  () => import("./NavbarClerkExtras").then((m) => m.NavbarClerkExtras),
  { ssr: false, loading: () => null }
);

export default function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { open: openCommandPalette } = useCommandPalette();
  const navLinks = useMemo(
    () => [
      { href: "/product", label: t("marketing.nav.product") },
      { href: "/pricing", label: t("marketing.nav.pricing") },
      { href: "/download", label: t("marketing.nav.download") },
      { href: "/contact", label: t("marketing.nav.contact") },
    ],
    [t]
  );
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHomeSection, setActiveHomeSection] = useState<string | null>(
    null
  );

  useEffect(() => {
    const onClose = () => setMobileOpen(false);
    window.addEventListener("close-site-mobile-nav", onClose);
    return () => window.removeEventListener("close-site-mobile-nav", onClose);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const observers = new Map<string, IntersectionObserver>();
    const ids = ["showcase", "story", "contact"];

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setActiveHomeSection(id);
          },
          { threshold: [0.2], rootMargin: "-35% 0px -35% 0px" }
        );
        observer.observe(element);
        observers.set(id, observer);
      }
    });

    return () => {
      observers.forEach((o) => o.disconnect());
      observers.clear();
    };
  }, [pathname]);

  const clerkConfigured = useClerkRuntimeEnabled();
  /** Marketing home uses the same dark command shell as the workspace. */
  const isCommandHome = pathname === "/";
  /** Login / sign-up use dark chrome so nav + Clerk stay readable on black. */
  const isAuthPage =
    pathname === "/login" ||
    pathname?.startsWith("/login/") ||
    pathname === "/sign-up" ||
    pathname?.startsWith("/sign-up/");
  const navUsesDarkChrome = isCommandHome || isAuthPage;

  const navLinkClass = navUsesDarkChrome
    ? "text-[13px] font-medium text-zinc-300 transition-colors duration-200 hover:text-white"
    : "text-[13px] font-medium text-[#1d1d1f]/65 transition-colors duration-200 hover:text-[#1d1d1f]";

  function linkIsActive(href: string) {
    if (href === "/product") return pathname === "/product";
    if (href === "/pricing") return pathname === "/pricing";
    if (href === "/download") return pathname === "/download";
    if (href === "/contact") return pathname === "/contact";
    return false;
  }

  function linkIsHighlighted(link: (typeof navLinks)[0]) {
    if (linkIsActive(link.href)) return true;
    if (pathname !== "/") return false;
    if (link.href === "/product" && ["showcase", "story"].includes(activeHomeSection ?? ""))
      return true;
    if (link.href === "/contact" && activeHomeSection === "contact")
      return true;
    return false;
  }

  const mobileLink =
    "block px-4 py-3 text-[15px] transition " +
    (navUsesDarkChrome
      ? "font-medium text-zinc-200 hover:bg-white/10"
      : "font-medium text-[#1d1d1f] hover:bg-[#0071e3]/10");
  const mobileCta =
    "block px-4 py-3 text-[15px] font-semibold transition " +
    (navUsesDarkChrome
      ? "text-sky-400 hover:bg-white/10"
      : "text-[#0071e3] hover:bg-[#0071e3]/10");

  const mobileMenu = (
    <AnimatePresence>
      {mobileOpen ? (
        <motion.div
          key="mobile-nav-layer"
          id="site-mobile-nav"
          className="fixed inset-0 z-[10050]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0c0c14]/55 backdrop-blur-[10px]"
            aria-label={t("marketing.nav.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <motion.div
            role="navigation"
            aria-label={t("marketing.nav.mobileNav")}
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className={
              navUsesDarkChrome
                ? "absolute right-3 top-[56px] w-[min(calc(100vw-1.5rem),300px)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 py-2 shadow-2xl backdrop-blur-xl"
                : "glass-liquid absolute right-3 top-[56px] w-[min(calc(100vw-1.5rem),300px)] overflow-hidden rounded-2xl py-2"
            }
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={mobileLink}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {clerkConfigured ? (
              <NavbarClerkExtrasLazy
                variant="mobile"
                isCommandHome={navUsesDarkChrome}
                mobileLink={mobileLink}
                onMobileNavigate={() => setMobileOpen(false)}
              />
            ) : (
              <Link
                href="/login"
                className={mobileLink}
                onClick={() => setMobileOpen(false)}
              >
                {t("marketing.hero.logIn")}
              </Link>
            )}
            <Link
              href="/feed"
              onClick={() => setMobileOpen(false)}
              className={mobileLink}
            >
              {t("marketing.nav.workspace")}
            </Link>
            <Link
              href="/contact"
              className={mobileCta}
              onClick={() => setMobileOpen(false)}
            >
              {t("marketing.nav.getInTouch")}
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <header className="site-safe-top fixed left-0 right-0 top-0 z-[1000]">
      <motion.nav
        className={`relative z-[20] border-b transition-[background,box-shadow,border-color] duration-500 ease-out ${
          navUsesDarkChrome
            ? scrolled
              ? "agent-header-liquid border-white/12 shadow-[0_12px_48px_-20px_rgba(0,0,0,0.55)]"
              : "border-transparent bg-zinc-950/40 backdrop-blur-2xl"
            : scrolled
              ? "border-white/50 glass-liquid-nav shadow-[0_12px_40px_-16px_rgba(99,102,241,0.18)]"
              : "border-transparent bg-white/40 backdrop-blur-2xl"
        }`}
      >
        <div className="relative mx-auto flex max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:h-14 lg:px-12">
          <Link
            href="/"
            title="Route5 home"
            className="relative z-[30] flex flex-shrink-0 items-center py-3 touch-manipulation lg:py-0"
          >
            <span
              className={
                navUsesDarkChrome
                  ? "site-brand-wordmark text-white"
                  : "site-brand-wordmark text-[#1d1d1f]"
              }
            >
              Route5
            </span>
          </Link>

          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${navLinkClass} relative pb-0.5`}
              >
                {link.label}
                {linkIsHighlighted(link) && (
                  <span
                    className={
                      navUsesDarkChrome
                        ? "absolute -bottom-1 left-0 right-0 h-px bg-sky-400"
                        : "absolute -bottom-1 left-0 right-0 h-px bg-[#0071e3]"
                    }
                    aria-hidden
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => openCommandPalette()}
              title={t("marketing.nav.searchTitle")}
              className={
                navUsesDarkChrome
                  ? "rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  : "rounded-lg p-2 text-[#1d1d1f]/70 transition hover:bg-black/[0.06] hover:text-[#1d1d1f]"
              }
              aria-label={t("marketing.nav.searchAria")}
            >
              <Search className="h-[20px] w-[20px]" strokeWidth={2} aria-hidden />
            </button>
            {clerkConfigured ? (
              <NavbarClerkExtrasLazy variant="desktop" isCommandHome={navUsesDarkChrome} mobileLink="" />
            ) : (
              <Link
                href="/login"
                className={
                  navUsesDarkChrome
                    ? "px-2 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
                    : "px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]"
                }
              >
                {t("marketing.hero.logIn")}
              </Link>
            )}
            <Link
              href="/feed"
              title="Signed-in workspace — Feed, projects, Overview"
              className={
                navUsesDarkChrome
                  ? "px-2 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
                  : "px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]"
              }
            >
              {t("marketing.nav.workspace")}
            </Link>
            <Link
              href="/contact"
              title="Contact sales or support"
              className="ml-1 rounded-full bg-[#0071e3] px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
            >
              {t("marketing.nav.getInTouch")}
            </Link>
          </div>

          <div className="flex items-center gap-0.5 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openCommandPalette();
              }}
              title={t("marketing.nav.searchTitle")}
              className={
                navUsesDarkChrome
                  ? "rounded-lg p-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  : "rounded-lg p-2.5 text-[#1d1d1f]/75 transition hover:bg-black/[0.06] active:scale-[0.97]"
              }
              aria-label={t("marketing.nav.searchAria")}
            >
              <Search className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className={
                navUsesDarkChrome
                  ? "rounded-lg p-2.5 text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  : "rounded-lg p-2.5 text-[#1d1d1f]/75 transition hover:bg-black/[0.06] active:scale-[0.97]"
              }
              aria-label={mobileOpen ? t("marketing.nav.closeMenu") : t("marketing.nav.openMenu")}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
              ) : (
                <Menu className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </motion.nav>
      {typeof document !== "undefined"
        ? createPortal(mobileMenu, document.body)
        : null}
    </header>
  );
}

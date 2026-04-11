"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import { useCommandPalette } from "@/components/CommandPalette";
import { hasClerkPublishableKey } from "@/lib/clerk-env";

const navLinks = [
  { href: "/pitch", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

function Route5Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="flex-shrink-0"
    >
      <path
        d="M14 2 L22 6 L22 14 C22 19 14 25 14 25 C14 25 6 19 6 14 L6 6 Z"
        fill="#0071e3"
      />
      <text
        x="14"
        y="18"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        5
      </text>
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { open: openCommandPalette } = useCommandPalette();
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
    const ids = ["product", "contact"];

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

  const clerkConfigured = hasClerkPublishableKey();

  const navLinkClass =
    "text-[13px] font-medium text-[#1d1d1f]/65 transition-colors duration-200 hover:text-[#1d1d1f]";

  function linkIsActive(href: string) {
    if (href === "/pitch") return pathname === "/pitch";
    if (href === "/pricing") return pathname === "/pricing";
    if (href === "/contact") return pathname === "/contact";
    return false;
  }

  function linkIsHighlighted(link: (typeof navLinks)[0]) {
    if (linkIsActive(link.href)) return true;
    if (pathname !== "/") return false;
    if (link.href === "/pitch" && activeHomeSection === "product") return true;
    if (link.href === "/contact" && activeHomeSection === "contact")
      return true;
    return false;
  }

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
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <motion.div
            role="navigation"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="glass-liquid absolute right-3 top-[56px] w-[min(calc(100vw-1.5rem),300px)] overflow-hidden rounded-2xl py-2"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-[15px] font-medium text-[#1d1d1f] transition hover:bg-[#0071e3]/10"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {clerkConfigured ? (
              <>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    className="block px-4 py-3 text-[15px] text-[#1d1d1f] transition hover:bg-[#0071e3]/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/settings"
                    className="block px-4 py-3 text-[15px] text-[#1d1d1f] transition hover:bg-[#0071e3]/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    Settings
                  </Link>
                </Show>
              </>
            ) : (
              <Link
                href="/login"
                className="block px-4 py-3 text-[15px] text-[#1d1d1f] transition hover:bg-[#0071e3]/10"
                onClick={() => setMobileOpen(false)}
              >
                Log in
              </Link>
            )}
            <Link
              href="/projects"
              className="block px-4 py-3 text-[15px] text-[#1d1d1f] transition hover:bg-[#0071e3]/10"
              onClick={() => setMobileOpen(false)}
            >
              Workspace
            </Link>
            <Link
              href="/contact"
              className="block px-4 py-3 text-[15px] font-semibold text-[#0071e3] transition hover:bg-[#0071e3]/10"
              onClick={() => setMobileOpen(false)}
            >
              Get in touch
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-[1000]">
      <motion.nav
        className={`relative z-[20] border-b transition-[background,box-shadow,border-color] duration-500 ease-out ${
          scrolled
            ? "border-white/50 glass-liquid-nav shadow-[0_12px_40px_-16px_rgba(99,102,241,0.18)]"
            : "border-transparent bg-white/40 backdrop-blur-2xl"
        }`}
      >
        <div className="relative mx-auto flex max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:h-14 lg:px-12">
          <Link
            href="/"
            className="relative z-[30] flex flex-shrink-0 items-center gap-2.5 py-3 touch-manipulation lg:py-0"
          >
            <Route5Logo />
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
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
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#0071e3]"
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
              className="p-2 text-[#1d1d1f]/70 transition hover:bg-black/[0.06] hover:text-[#1d1d1f] rounded-lg"
              aria-label="Search (⌘K)"
            >
              <Search className="h-[20px] w-[20px]" strokeWidth={2} aria-hidden />
            </button>
            {clerkConfigured ? (
              <>
                <Show when="signed-out">
                  <Link
                    href="/login"
                    className="px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]"
                  >
                    Log in
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
            ) : (
              <Link
                href="/login"
                className="px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]"
              >
                Log in
              </Link>
            )}
            <Link
              href="/projects"
              className="px-2 py-2 text-[13px] font-medium text-[#1d1d1f]/65 transition-colors hover:text-[#1d1d1f]"
            >
              Workspace
            </Link>
            <Link
              href="/contact"
              className="ml-1 rounded-full bg-[#0071e3] px-4 py-2 text-[13px] font-semibold text-white shadow-md shadow-[#0071e3]/20 transition hover:bg-[#0077ed]"
            >
              Get in touch
            </Link>
          </div>

          <div className="flex items-center gap-0.5 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openCommandPalette();
              }}
              className="p-2.5 text-[#1d1d1f]/75 transition hover:bg-black/[0.06] rounded-lg active:scale-[0.97]"
              aria-label="Search (⌘K)"
            >
              <Search className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2.5 text-[#1d1d1f]/75 transition hover:bg-black/[0.06] rounded-lg active:scale-[0.97]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
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

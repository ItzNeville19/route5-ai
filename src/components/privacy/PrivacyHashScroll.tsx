"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Ensures `#section` links scroll into view: full page load, SPA navigation, and hash changes. */
export default function PrivacyHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [pathname]);

  return null;
}

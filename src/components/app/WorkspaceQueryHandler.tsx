"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCommandPalette } from "@/components/CommandPalette";

/**
 * Handles deep links from marketplace / bookmarks (e.g. ?tool=palette, ?focus=new-project).
 */
export default function WorkspaceQueryHandler() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const handledPalette = useRef(false);
  const handledNewProject = useRef(false);

  useEffect(() => {
    if (searchParams.get("tool") !== "palette") {
      handledPalette.current = false;
      return;
    }
    if (handledPalette.current) return;
    handledPalette.current = true;
    openPalette();
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tool");
    next.delete("origin");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [openPalette, pathname, router, searchParams]);

  useEffect(() => {
    if (pathname !== "/overview" || searchParams.get("focus") !== "new-project") {
      handledNewProject.current = false;
      return;
    }
    if (handledNewProject.current) return;
    handledNewProject.current = true;
    window.setTimeout(() => {
      document.getElementById("new-project-name")?.focus();
    }, 100);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("focus");
    next.delete("origin");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}

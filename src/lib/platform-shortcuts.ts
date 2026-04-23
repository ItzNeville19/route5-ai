export function primaryModLabelFromNavigator(): "⌘" | "Ctrl" {
  if (typeof navigator === "undefined") return "⌘";
  const platform = navigator.platform?.toLowerCase() ?? "";
  const ua = navigator.userAgent?.toLowerCase() ?? "";
  /** iPadOS 13+ often reports as MacIntel with touch points */
  const iPadOs =
    /\biPad\b/i.test(navigator.platform ?? "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    /\biPad\b/i.test(navigator.userAgent ?? "");
  if (
    platform.includes("mac") ||
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    iPadOs
  ) {
    return "⌘";
  }
  if (ua.includes("mac os")) return "⌘";
  return "Ctrl";
}

export function isWindowsPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Win/i.test(navigator.platform ?? "") || navigator.userAgent?.includes("Windows") === true;
}

/** iPad / iPadOS detection (includes desktop-mode Safari UA quirks). */
export function isIPadOs(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /\biPad\b/i.test(navigator.platform ?? "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    /\biPad\b/i.test(navigator.userAgent ?? "")
  );
}

/** Primary input is coarse (finger) — shortcuts may need an external keyboard. */
export function isCoarsePointerPrimary(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Short context lines for the shortcuts sheet — MacBook, Windows, iPad, touch.
 */
export function shortcutsSheetPlatformNotes(): string[] {
  const mod = primaryModLabelFromNavigator();
  const lines: string[] = [];

  if (isWindowsPlatform()) {
    lines.push(
      "Windows: use Ctrl wherever you see ⌘ in other docs; this sheet shows Ctrl when you’re on Windows."
    );
  } else if (mod === "⌘") {
    lines.push("MacBook & iPad (Magic Keyboard): ⌘ is the Command key next to the space bar.");
  }

  if (isIPadOs() && isCoarsePointerPrimary()) {
    lines.push(
      "iPad (touch): plug in a Magic Keyboard or USB keyboard to use chord shortcuts; tap Shortcuts anytime to read the list."
    );
  } else if (!isIPadOs() && isCoarsePointerPrimary()) {
    lines.push("Touch-first device: connect a hardware keyboard for shortcuts that use two or three keys together.");
  }

  return lines;
}

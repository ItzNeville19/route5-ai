/**
 * Copy text with Clipboard API; falls back to execCommand for older browsers / denied permissions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const execFallback = (): boolean => {
    try {
      if (typeof document === "undefined") return false;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.setAttribute("aria-hidden", "true");
      ta.style.position = "fixed";
      ta.style.left = "0";
      ta.style.top = "0";
      ta.style.width = "2rem";
      ta.style.height = "2rem";
      ta.style.margin = "0";
      ta.style.padding = "0";
      ta.style.border = "0";
      ta.style.opacity = "0";
      ta.style.zIndex = "-1";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Permission denied or insecure context — try fallback */
  }

  return execFallback();
}

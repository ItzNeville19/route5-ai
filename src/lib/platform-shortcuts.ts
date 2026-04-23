export function primaryModLabelFromNavigator(): "⌘" | "Ctrl" {
  if (typeof navigator === "undefined") return "⌘";
  const platform = navigator.platform?.toLowerCase() ?? "";
  const ua = navigator.userAgent?.toLowerCase() ?? "";
  if (platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad")) {
    return "⌘";
  }
  if (ua.includes("mac os")) return "⌘";
  return "Ctrl";
}

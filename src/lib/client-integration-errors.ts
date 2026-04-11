/**
 * Maps raw API errors to customer-safe copy — never exposes env var names or tokens.
 */
export function sanitizeIntegrationClientError(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return "Something went wrong. Try again.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("linear_api_key") ||
    lower.includes("github_token") ||
    lower.includes("openai_api_key") ||
    lower.includes("api_key") ||
    lower.includes("not set") ||
    lower.includes("not configured") ||
    lower.includes("personal access token")
  ) {
    return "This integration isn’t available in your workspace yet.";
  }
  return raw.length > 280 ? `${raw.slice(0, 277)}…` : raw;
}

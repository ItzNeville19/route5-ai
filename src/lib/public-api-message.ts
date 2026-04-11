/**
 * Maps internal failures to a single calm client message — no env var names or stack traces.
 * Logs the cause in development for debugging.
 */
export function publicWorkspaceError(cause?: unknown): string {
  if (process.env.NODE_ENV === "development" && cause != null) {
    console.error("[route5 workspace]", cause);
  }
  return "Workspace is finishing sync. Try again in a moment.";
}

export function publicAIServiceError(cause?: unknown): string {
  if (process.env.NODE_ENV === "development" && cause != null) {
    console.error("[route5 intelligence]", cause);
  }
  return "Intelligence is finishing this request. Try again in a moment.";
}

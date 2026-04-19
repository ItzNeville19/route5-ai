/**
 * Maps internal failures to a single calm client message — no env var names or stack traces.
 * Logs the cause in development for debugging.
 */
export function publicWorkspaceError(cause?: unknown): string {
  if (process.env.NODE_ENV === "development" && cause != null) {
    console.error("[route5 workspace]", cause);
  }
  if (
    cause &&
    typeof cause === "object" &&
    "code" in cause &&
    "message" in cause &&
    (cause as { code?: unknown }).code === "PGRST205"
  ) {
    const message = String((cause as { message?: unknown }).message ?? "");
    if (message.toLowerCase().includes("could not find the table")) {
      return "Workspace database is not initialized yet. Run the SQL files in supabase/migrations on your Supabase project, then redeploy.";
    }
  }
  return "Workspace is finishing sync. Try again in a moment.";
}

export function publicAIServiceError(cause?: unknown): string {
  if (process.env.NODE_ENV === "development" && cause != null) {
    console.error("[route5 intelligence]", cause);
  }
  return "Intelligence is finishing this request. Try again in a moment.";
}

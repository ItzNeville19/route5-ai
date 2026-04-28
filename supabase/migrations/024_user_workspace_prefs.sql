-- Workspace UI preferences synced from app settings (mirrors Clerk privateMetadata route5WorkspacePrefs).
-- Scoped by Clerk user id string.

CREATE TABLE IF NOT EXISTS user_workspace_prefs (
  clerk_user_id TEXT PRIMARY KEY,
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_workspace_prefs_updated
  ON user_workspace_prefs (updated_at DESC);

COMMENT ON TABLE user_workspace_prefs IS 'Merged workspace prefs JSON; accessed via Next.js API with service role only.';

/** Bot token OAuth scopes for Route5 Slack app (document in README). */
export const SLACK_OAUTH_BOT_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:read",
  "mpim:read",
  "users:read",
  "users:read.email",
  "chat:write",
  "commands",
  "incoming-webhook",
].join(",");

export type IntegrationType = "slack" | "gmail" | "notion" | "zoom" | "teams" | "calendar";

export type IntegrationStatus = "connected" | "disconnected" | "error";

export type OrgIntegrationMetadata = {
  /** Slack channel IDs to subscribe for message events (bot must be in channel). */
  monitored_channel_ids?: string[];
  digest_channel_id?: string | null;
  escalation_channel_id?: string | null;
  /** slack user id -> clerk user id when linked */
  slack_user_to_clerk?: Record<string, string>;
  /** Gmail OAuth access token expiry (ms since epoch) for refresh rotation. */
  gmail_access_token_expires_at_ms?: number;
  /** Google OAuth `sub` (user id) — maps Workspace Events / Meet notifications to this org. */
  google_oauth_sub?: string | null;
  /** Zoom OAuth token expiry (ms since epoch). */
  zoom_access_token_expires_at_ms?: number;
  /** Microsoft Graph token expiry (ms since epoch). */
  teams_access_token_expires_at_ms?: number;
  /** Teams + Outlook: monitored channel IDs (Graph). */
  teams_monitored_channel_ids?: string[];
  /** Graph subscription for Teams messages. */
  teams_graph_subscription_id?: string | null;
  teams_graph_subscription_expires_at?: string | null;
  /** Google Workspace Events subscription name for Meet (optional). */
  gmeet_workspace_subscription_name?: string | null;
  gmeet_workspace_subscription_expire_time?: string | null;
};

export type OrgIntegrationRow = {
  id: string;
  orgId: string;
  type: IntegrationType;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  teamId: string | null;
  teamName: string | null;
  botUserId: string | null;
  webhookUrl: string | null;
  scope: string | null;
  status: IntegrationStatus;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastUsedAt: string | null;
  metadata: OrgIntegrationMetadata;
  createdAt: string;
  updatedAt: string;
};

export type SlackCapturedMessageRow = {
  id: string;
  orgId: string;
  slackTeamId: string;
  slackChannelId: string;
  slackMessageTs: string;
  slackUserId: string | null;
  content: string;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  capturedAt: string;
  confidenceScore: number | null;
  decisionText: string | null;
};

export type GmailCapturedEmailRow = {
  id: string;
  orgId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  receivedAt: string;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId: string | null;
  capturedAt: string;
  confidenceScore: number | null;
  decisionText: string | null;
};

export type GmailWatchRow = {
  id: string;
  orgId: string;
  historyId: string;
  expiration: string;
  createdAt: string;
  updatedAt: string;
};

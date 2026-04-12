/**
 * Slack connector — optional server env. When set, Pro+ users see “connected” in the integration UI.
 * Live ingestion (events API) is roadmap; paste-to-Desk and marketplace app work today.
 */
export function isSlackBotConfigured(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN?.trim());
}

export function isSlackWebhookConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL?.trim());
}

export function isSlackIntegrationConfigured(): boolean {
  return isSlackBotConfigured() || isSlackWebhookConfigured();
}

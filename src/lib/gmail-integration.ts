/** Gmail OAuth + Pub/Sub — optional env; Pro+ uses org_integrations row when connected. */
export function isGmailOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

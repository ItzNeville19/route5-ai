export function isNotionOAuthConfigured(): boolean {
  return Boolean(process.env.NOTION_CLIENT_ID?.trim() && process.env.NOTION_CLIENT_SECRET?.trim());
}

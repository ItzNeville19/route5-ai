/**
 * DM a user by email using a Slack bot token (org integration or legacy env token).
 */
export async function slackDmWithToken(
  botToken: string,
  email: string,
  text: string
): Promise<boolean> {
  const token = botToken.trim();
  if (!token) return false;
  const lu = await fetch(
    `https://slack.com/api/users.lookupByEmail?${new URLSearchParams({ email })}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const uj = (await lu.json().catch(() => ({}))) as { ok?: boolean; user?: { id?: string } };
  const uid = uj.ok && uj.user?.id ? uj.user.id : null;
  if (!uid) return false;
  const open = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ users: uid }),
  });
  const oj = (await open.json().catch(() => ({}))) as { ok?: boolean; channel?: { id?: string } };
  const ch = oj.ok && oj.channel?.id ? oj.channel.id : null;
  if (!ch) return false;
  const pm = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: ch, text }),
  });
  const pj = (await pm.json().catch(() => ({}))) as { ok?: boolean };
  return Boolean(pj.ok);
}

export async function slackApi(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok?: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
}

export async function slackPostMessage(
  token: string,
  channel: string,
  payload: { text?: string; blocks?: unknown[]; thread_ts?: string }
): Promise<boolean> {
  const j = await slackApi(token, "chat.postMessage", {
    channel,
    ...payload,
  });
  return Boolean(j.ok);
}

export async function googleCalendarInsertEvent(
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const j = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!j.id) throw new Error(j.error?.message || "google calendar insert failed");
  return { id: j.id };
}

export async function googleCalendarPatchEvent(
  accessToken: string,
  eventId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(j.error?.message || "google calendar patch failed");
  }
}

export async function googleCalendarDeleteEvent(accessToken: string, eventId: string): Promise<void> {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  ).catch(() => {});
}

export async function outlookCreateEvent(
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!j.id) throw new Error(j.error?.message || "outlook event create failed");
  return { id: j.id };
}

export async function outlookPatchEvent(
  accessToken: string,
  eventId: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(j.error?.message || "outlook patch failed");
  }
}

export async function outlookDeleteEvent(accessToken: string, eventId: string): Promise<void> {
  await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

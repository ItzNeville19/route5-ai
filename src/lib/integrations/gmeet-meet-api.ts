/** Google Meet REST v2 — transcript entries (requires `meetings.space.readonly`). */

export async function listTranscriptEntries(accessToken: string, transcriptResourceName: string): Promise<string[]> {
  const texts: string[] = [];
  let pageToken: string | undefined;
  const parent = transcriptResourceName.replace(/^\//, "");
  do {
    const u = new URL(`https://meet.googleapis.com/v2/${parent}/entries`);
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const j = (await res.json()) as {
      transcriptEntries?: { text?: string }[];
      entries?: { text?: string }[];
      nextPageToken?: string;
    };
    const list = j.transcriptEntries ?? j.entries ?? [];
    for (const e of list) {
      if (e.text?.trim()) texts.push(e.text.trim());
    }
    pageToken = j.nextPageToken;
  } while (pageToken);
  return texts;
}

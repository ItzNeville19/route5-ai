import { getServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase-env";

function sendBroadcast(channelName: string, event: string, payload: Record<string, unknown>): void {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getServiceClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: false } },
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel
          .send({
            type: "broadcast",
            event,
            payload,
          })
          .finally(() => {
            supabase.removeChannel(channel);
          });
      }
    });
  } catch {
    /* non-fatal */
  }
}

/**
 * Broadcasts a lightweight event so open tracker UIs can refresh without polling.
 * Uses Supabase Realtime broadcast (clients subscribe on the same channel with the anon key).
 */
export function broadcastOrgCommitmentEvent(
  orgId: string,
  payload: Record<string, unknown>
): void {
  sendBroadcast(`org-commitments:${orgId}`, "change", payload);
  broadcastOrgDashboardEvent(orgId);
}

/** Executive dashboard — refresh metrics when commitments change. */
export function broadcastOrgDashboardEvent(orgId: string): void {
  sendBroadcast(`org-dashboard:${orgId}`, "refresh", { t: Date.now() });
}

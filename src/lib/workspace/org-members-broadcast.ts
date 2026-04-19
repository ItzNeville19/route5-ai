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
        void channel.send({ type: "broadcast", event, payload }).finally(() => {
          supabase.removeChannel(channel);
        });
      }
    });
  } catch {
    /* non-fatal */
  }
}

export function broadcastOrgMembersChanged(orgId: string, payload: Record<string, unknown>): void {
  sendBroadcast(`org-members:${orgId}`, "changed", payload);
}

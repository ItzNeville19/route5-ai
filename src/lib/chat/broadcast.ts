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
          .send({ type: "broadcast", event, payload })
          .finally(() => {
            supabase.removeChannel(channel);
          });
      }
    });
  } catch {
    /* non-fatal */
  }
}

export function broadcastChatChannel(channelId: string, payload: Record<string, unknown>): void {
  sendBroadcast(`chat:channel:${channelId}`, "message", payload);
}

export function broadcastChatUnread(userId: string, payload: Record<string, unknown>): void {
  sendBroadcast(`chat:unread:${userId}`, "unread", payload);
}

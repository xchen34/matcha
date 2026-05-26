import { useEffect } from "react";
import { onRealtimeEvent } from "@/realtime/socket.js";

export function useUserRealtime({
  id,
  currentUser,
  setData,
  onMatchNotification,
}) {
  useEffect(() => {
    if (!id) return undefined;

    const viewedUserId = Number(id);

    if (!Number.isInteger(viewedUserId)) return undefined;

    /* ========== Listen for real-time presence updates ========== */
    const offPresence = onRealtimeEvent("presence:update", (payload) => {
      const targetUserId = Number(payload?.user_id);
      if (targetUserId !== viewedUserId) return;

      // Update the user's online status and last seen time
      setData((prev) => {
        if (!prev || !prev.user) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            is_online: Boolean(payload.is_online),
            last_seen_at: payload.last_seen_at || prev.user.last_seen_at,
          },
        };
      });
    });

    /* ============ Listen for real-time notifications ========== */
    const offNotification = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        if (!incoming) return;

        if (Number(incoming.actor_user_id) !== viewedUserId) return;
        if (Number(incoming.user_id) !== Number(currentUser?.id)) return;

        if (incoming.type === "match") {
          onMatchNotification?.({ type: "match" });
          return;
        }

        if (incoming.type === "like_received") {
          onMatchNotification?.({ type: "like_received" });
          return;
        }

        if (incoming.type === "unlike") {
          onMatchNotification?.({ type: "unlike" });
        }
      },
    );

    return () => {
      offPresence();
      offNotification();
    };
  }, [id, currentUser, setData, onMatchNotification]);
}

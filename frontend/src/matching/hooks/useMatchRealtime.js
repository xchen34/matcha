import { useEffect } from "react";
import { onRealtimeEvent } from "@/realtime/socket";

export function useMatchRealtime(currentUser, setUsers) {
  useEffect(() => {
    if (!currentUser?.id) return;

    /* ========== Realtime: Presence ========== */
    const offPresence = onRealtimeEvent("presence:update", (payload) => {
      const id = Number(payload?.user_id);
      setUsers((prev) =>
        Array.isArray(prev)
          ? prev.map((u) =>
              Number(u.id) === id ? { ...u, is_online: payload.is_online } : u,
            )
          : prev,
      );
    });

    /* ========== Realtime: Notifications (matches/unlikes) ========== */
    const offNotif = onRealtimeEvent("notification:created", (payload) => {
      const n = payload?.notification;
      if (!n || Number(n.user_id) !== Number(currentUser.id)) return;

      setUsers((prev) =>
        Array.isArray(prev)
          ? prev.map((u) => {
              if (Number(u.id) !== Number(n.actor_user_id)) return u;

              if (n.type === "match")
                return { ...u, liked: true, is_match: true };
              if (n.type === "unlike") return { ...u, is_match: false };
              return u;
            })
          : prev,
      );
    });

    /* ========== Realtime: Profile updates ========== */
    const offProfile = onRealtimeEvent("profile:updated", (payload) => {
      const id = Number(payload?.user_id);
      const profile = payload?.profile || {};

      setUsers((prev) =>
        Array.isArray(prev)
          ? prev.map((u) => (Number(u.id) === id ? { ...u, ...profile } : u))
          : prev,
      );
    });

    return () => {
      offPresence();
      offNotif();
      offProfile();
    };
  }, [currentUser?.id, setUsers]);
}

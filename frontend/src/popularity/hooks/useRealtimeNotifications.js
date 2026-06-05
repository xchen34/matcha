import { useEffect } from "react";
import { upsertUserById, removeUserById } from "../utils/popularityUtils.js";
import { getRealtimeSocket, onRealtimeEvent } from "@/realtime/socket.js";

function useRealtimeNotifications(currentUser, fetchLists, setLists) {
  useEffect(() => {
    if (!currentUser?.id) return;

    const offNotificationCreated = onRealtimeEvent(
      "notification:created", 
      (payload) => {
        const notification = payload?.notification;
        const type = notification?.type;
        
        if (!type || !["profile_view", "like_received", "unlike", "match"].includes(type)) {
          return;
        }

        // Validate actor (user who triggered the notification)
        const actorUserId = Number(notification?.actor_user_id);
        if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
          return;
        }

        // Minimal actor info for UI
        const actorInfo = {
          id: actorUserId,
          username: notification?.actor_username || `user-${actorUserId}`,
          email: "",
        };

        setLists((prev) => {
          const next = {
            views: [...(prev.views || [])],
            likes: [...(prev.likes || [])],
            matches: [...(prev.matches || [])],
          };

          // Profile view
          if (type === "profile_view") {
            next.views = upsertUserById(next.views, { ...actorInfo, created_at: notification?.created_at }, "views");
            return next;
          }

          // Like received
          if (type === "like_received") {
            next.likes = upsertUserById(next.likes, { ...actorInfo, created_at: notification?.created_at }, "likes");
            return next;
          }

          // Unlike
          if (type === "unlike") {
            next.likes = removeUserById(next.likes, actorUserId);
            next.matches = removeUserById(next.matches, actorUserId);
            return next;
          }

          // Match
          if (type === "match") {
            next.matches = upsertUserById(next.matches, { ...actorInfo, matched_at: notification?.created_at }, "matches");
            return next;
          }

          return next;
        });
      }
    );

    /* ========== Sync on reconnect ========== */
    const socket = getRealtimeSocket();
    const syncOnReconnect = () => {
      void fetchLists();
    };
    socket.on("connect", syncOnReconnect);

    // Cleanup
    return () => {
      offNotificationCreated();
      socket.off("connect", syncOnReconnect);
    };
  }, [currentUser?.id, fetchLists]);
}

export default useRealtimeNotifications;
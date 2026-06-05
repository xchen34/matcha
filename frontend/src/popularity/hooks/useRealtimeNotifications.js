import { useEffect } from "react";
import { upsertUserById, removeUserById } from "../utils/popularityUtils.js";
import { getRealtimeSocket, onRealtimeEvent } from "@/realtime/socket.js";

/**
 * Keeps the popularity lists in sync with realtime notification events.
 *
 * This hook listens for backend notifications that describe relationship
 * changes such as profile views, new likes, unlikes, and matches. When a
 * relevant event arrives, it updates the local lists immediately so the UI
 * does not have to wait for a full refetch. It also re-syncs the lists when
 * the socket reconnects, which acts as a safety net in case an event was
 * missed while the connection was down.
 */
function useRealtimeNotifications(currentUser, fetchLists, setLists) {
  useEffect(() => {
    if (!currentUser?.id) return;

    // Subscribe to the notification stream and update the matching popularity
    // list based on the notification type sent by the backend.
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

    // If the socket reconnects, fetch the full set of lists again so any
    // missed events are reconciled with the server state.
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

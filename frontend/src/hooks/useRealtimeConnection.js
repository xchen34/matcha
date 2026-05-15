import { useEffect } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeSocket,
} from "@/realtime/socket.js";
import { buildApiHeaders } from "@/utils/utils.js";
import { writeStoredUser } from "@/utils/userStorage.js";

export function useRealtimeConnection(currentUser, setCurrentUser) {
  /* ========== Ensure realtime token is available and refreshed ========== */
  useEffect(() => {
    let cancelled = false;

    async function ensureRealtimeToken() {
      if (!currentUser?.id || currentUser?.realtime_token) {
        return;
      }

      try {
        const response = await fetch("/api/auth/realtime-token", 
          {
            headers: buildApiHeaders(currentUser),
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            realtime_token: payload.realtime_token,
          };
          writeStoredUser(next);
          return next;
        });
      } catch {
        // Keep app usable even if realtime token refresh fails temporarily.
      }
    }

    ensureRealtimeToken();

    return () => {
      cancelled = true;
    };
  }, [currentUser, setCurrentUser]);

  /* ========== Manage realtime connection lifecycle ========== */
  useEffect(() => {
    if (currentUser?.id && currentUser?.realtime_token) {
      connectRealtime(currentUser.id, currentUser.realtime_token);

      return () => {
        disconnectRealtime();
      };
    }

    disconnectRealtime();
    return undefined;
  }, [currentUser?.id, currentUser?.realtime_token]);

  /* ========== Handle connection errors and token refresh ========== */
  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const socket = getRealtimeSocket();
    let cancelled = false;
    let refreshing = false;

    async function refreshRealtimeToken() {
      if (refreshing || cancelled) return;
      refreshing = true;

      try {
        const response = await fetch("/api/auth/realtime-token", 
          {
            headers: buildApiHeaders({ id: currentUser.id }),
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        /* Update the currentUser with the new token and reconnect the socket */
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            realtime_token: payload.realtime_token,
          };
          writeStoredUser(next);
          return next;
        });

        connectRealtime(currentUser.id, payload.realtime_token);
      } catch {
        // Keep app usable and let polling continue if token refresh fails.
      } finally {
        refreshing = false;
      }
    }

    /* Listen for connection errors */
    function onConnectError(error) {
      const message = String(error?.message || "");
      if (message.includes("Unauthorized")) {
        void refreshRealtimeToken();
      }
    }

    socket.on("connect_error", onConnectError);

    return () => {
      cancelled = true;
      socket.off("connect_error", onConnectError);
    };
  }, [currentUser?.id, setCurrentUser]);
}

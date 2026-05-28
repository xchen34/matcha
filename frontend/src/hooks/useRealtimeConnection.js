import { useCallback, useEffect } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeSocket,
} from "@/realtime/socket.js";
import { buildApiHeaders, shouldRefreshToken } from "@/utils/utils.js";
import { clearStoredUser, writeStoredUser } from "@/utils/userStorage.js";

export function useRealtimeConnection(currentUser, setCurrentUser) {
  const forceRelogin = useCallback(() => {
    disconnectRealtime();
    clearStoredUser();
    setCurrentUser(null);
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, [setCurrentUser]);

  /* ========== Ensure realtime token is available and refreshed ========== */
  useEffect(() => {
    let cancelled = false;

    async function ensureRealtimeToken(forceRefresh = false) {
      if (!currentUser?.id) return;

      try {
        const needsRefresh =
          forceRefresh ||
          !currentUser?.realtime_token ||
          shouldRefreshToken(currentUser.realtime_token, 120);
        if (!needsRefresh) return;

        const response = await fetch("/api/auth/realtime-token", 
          {
            headers: buildApiHeaders(currentUser),
          }
        );
        if ([401, 403].includes(response.status)) {
          forceRelogin();
          return;
        }

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

    void ensureRealtimeToken();
    const intervalId = window.setInterval(() => {
      void ensureRealtimeToken(true);
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser, forceRelogin, setCurrentUser]);

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
        if ([401, 403].includes(response.status)) {
          forceRelogin();
          return;
        }

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
  }, [currentUser?.id, forceRelogin, setCurrentUser]);
}

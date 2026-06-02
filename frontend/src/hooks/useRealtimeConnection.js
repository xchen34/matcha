import { useCallback, useEffect } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeSocket,
} from "@/realtime/socket.js";
import { buildApiHeaders, shouldRefreshToken } from "@/utils/utils.js";
import { clearStoredUser, writeStoredUser } from "@/utils/userStorage.js";

/**
 * 这个 Hook 的定位（上层调度）：
 * - 决定“什么时候需要 realtime token”。
 * - 决定“什么时候连接/断开 socket”。
 * - 处理 token 过期导致的 Unauthorized（刷新 token 或强制重新登录）。
 *
 * 它不实现 socket 细节（那些在 realtime/socket.js 里）。
 */
export function useRealtimeConnection(currentUser, setCurrentUser) {
  // 当登录态失效（401/403）时，统一执行“安全退出并回登录页”。
  const forceRelogin = useCallback(() => {
    disconnectRealtime();
    clearStoredUser();
    setCurrentUser(null);
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, [setCurrentUser]);

  /* ========== 1) 确保 realtime token 可用，并定时刷新 ========== */
  useEffect(() => {
    let cancelled = false;

    /**
     * 目标：拿到一个“可用的 realtime_token”。
     * - forceRefresh=false：按需刷新（缺 token 或即将过期）
     * - forceRefresh=true：强制请求新 token（用于定时轮询）
     */
    async function ensureRealtimeToken(forceRefresh = false) {
      // 没登录用户就不做任何 realtime 相关动作。
      if (!currentUser?.id) return;

      try {
        // shouldRefreshToken(token, 120): 剩余不到 120 秒时，提前刷新。
        const needsRefresh =
          forceRefresh ||
          !currentUser?.realtime_token ||
          shouldRefreshToken(currentUser.realtime_token, 120);

        if (!needsRefresh) return;

        // 向后端请求新的 realtime token。
        const response = await fetch("/api/auth/realtime-token", {
          headers: buildApiHeaders(currentUser),
        });

        // 主登录态失效：直接强制回登录。
        if ([401, 403].includes(response.status)) {
          forceRelogin();
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        // 把新 token 写回 React 状态 + 本地存储。
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
        // 临时失败不阻塞页面主功能；下次轮询或错误回调会继续尝试。
      }
    }

    // 首次进入页面先做一次按需刷新。
    void ensureRealtimeToken();

    // 每 5 分钟强制刷新一次，降低 token 过期导致的断连概率。
    const intervalId = window.setInterval(() => {
      void ensureRealtimeToken(true);
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentUser, forceRelogin, setCurrentUser]);

  /* ========== 2) 按 currentUser 状态管理 socket 生命周期 ========== */
  useEffect(() => {
    // 只有“既有 id 又有 realtime_token”才允许连接。
    if (currentUser?.id && currentUser?.realtime_token) {
      connectRealtime(currentUser.id, currentUser.realtime_token);

      // 依赖变化或组件卸载时，断开连接并清理心跳。
      return () => {
        disconnectRealtime();
      };
    }

    // 用户登出/缺 token 时，确保连接关闭。
    disconnectRealtime();
    return undefined;
  }, [currentUser?.id, currentUser?.realtime_token]);

  /* ========== 3) 监听 Unauthorized 并即时刷新 token（自愈） ========== */
  useEffect(() => {
    // 未登录用户不需要监听 realtime 错误恢复。
    if (!currentUser?.id) return undefined;

    const socket = getRealtimeSocket();
    let cancelled = false;
    let refreshing = false;

    /**
     * 当连接因 Unauthorized 失败时调用：
     * - 重新向后端拿 realtime token
     * - 更新 currentUser
     * - 用新 token 立即 reconnect
     */
    async function refreshRealtimeToken() {
      // 防止并发重复刷新。
      if (refreshing || cancelled) return;
      refreshing = true;

      try {
        const response = await fetch("/api/auth/realtime-token", {
          headers: buildApiHeaders({ id: currentUser.id }),
        });

        if ([401, 403].includes(response.status)) {
          forceRelogin();
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        // 把新 token 写回用户状态。
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            realtime_token: payload.realtime_token,
          };
          writeStoredUser(next);
          return next;
        });

        // 立刻用新 token 重连，缩短不可用窗口。
        connectRealtime(currentUser.id, payload.realtime_token);
      } catch {
        // 失败时保持页面可用，后续还会继续触发刷新流程。
      } finally {
        refreshing = false;
      }
    }

    // 只针对 Unauthorized 做自动修复。
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

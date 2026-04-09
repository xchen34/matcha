import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "./useNotifications.js";

function createCardMessage(primaryName, verb, count) {
  const others = Math.max(0, count - 1);
  if (others === 0) {
    return `${primaryName} ${verb} 你`;
  }
  return `${primaryName} 等 ${others} 人 ${verb} 你`;
}

function formatNotificationDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isAuthenticated,
    refresh,
    markAllAsRead,
    markNotificationAsRead,
    notificationGroups,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  function handleGroupClick(group) {
    const unreadIds = notifications
      .filter((item) => !item.is_read && item.type === group.type)
      .map((item) => item.id)
      .filter(Boolean);

    if (unreadIds.length > 0) {
      void Promise.all(unreadIds.map((id) => markNotificationAsRead(id)));
    }

    setOpen(false);
    navigate(`/popularity/${group.section}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={!isAuthenticated}
        aria-label="Ouvrir les notifications"
        title="Notifications"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-300 bg-orange-500 text-white shadow-md shadow-orange-200 transition enabled:hover:-translate-y-0.5 enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h11" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {notifications.length > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                onClick={markAllAsRead}
              >
                标记为已读
              </button>
            )}
          </div>

          {loading && <p className="text-xs text-slate-500">Loading...</p>}

          {!loading && error && <p className="text-xs text-red-600">{error}</p>}

          {!loading && notificationGroups.length === 0 && (
            <p className="text-xs text-slate-500">No notifications yet.</p>
          )}

          {!loading && notificationGroups.length > 0 && (
            <div className="space-y-2">
              {notificationGroups.map((group) => (
                <button
                  key={group.type}
                  type="button"
                  onClick={() => handleGroupClick(group)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white">
                    <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-400 to-brand text-white flex items-center justify-center text-lg font-semibold">
                      {group.primaryActor.charAt(0) || "?"}
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" aria-label="New" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                      <p className="text-xs text-slate-500">{createCardMessage(group.primaryActor, group.verb, group.count)}</p>
                      {group.latestAt && (
                        <p className="mt-1 text-[11px] text-slate-400">{formatNotificationDateTime(group.latestAt)}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-brand">查看</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "./NotificationsProvider.jsx";

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function renderNotificationMessage(item) {
  const actorName = item.actor_username ? `@${item.actor_username}` : "Someone";

  if (item.type === "like_received") {
    return (
      <p className="text-sm text-slate-800">
        <span className="font-semibold text-slate-950">{actorName}</span> liked you.
      </p>
    );
  }

  if (item.type === "match") {
    return (
      <p className="text-sm text-slate-800">
        <span className="font-semibold text-slate-950">{actorName}</span> matched with you.
      </p>
    );
  }

  return <p className="text-sm text-slate-800">{item.message}</p>;
}

export default function NotificationsBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isAuthenticated,
    refresh,
    markAllAsRead,
    markNotificationAsRead,
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
                Mark all as read
              </button>
            )}
          </div>

          {loading && <p className="text-xs text-slate-500">Loading...</p>}

          {!loading && error && <p className="text-xs text-red-600">{error}</p>}

          {!loading && notifications.length === 0 && (
            <p className="text-xs text-slate-500">No notifications yet.</p>
          )}

          {!loading && notifications.length > 0 && (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {notifications.map((item) => (
                <li
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) {
                      markNotificationAsRead(item.id);
                    }
                  }}
                  className={`rounded-xl border px-3 py-2 ${
                    item.is_read
                      ? "border-slate-200 bg-slate-50"
                      : "border-orange-200 bg-orange-50 cursor-pointer"
                  }`}
                >
                  {renderNotificationMessage(item)}
                  <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(item.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

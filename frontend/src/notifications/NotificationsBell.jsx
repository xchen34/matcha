import { useEffect, useRef, useState } from "react";
import { FaEye, FaHeart, FaHeartBroken } from "react-icons/fa";
import { useNotifications } from "./useNotifications.js";

function createCardMessage(primaryName, verb, count) {
  const others = Math.max(0, count - 1);
  if (others === 0) {
    return `${verb} you`;
  }
  return `and ${others} others ${verb} you`;
}

function formatNotificationDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function GroupTypeIcon({ type }) {
  if (type === "profile_view") {
    return <FaEye className="h-5 w-5" aria-hidden="true" />;
  }
  if (type === "like_received") {
    return <FaHeart className="h-5 w-5" aria-hidden="true" />;
  }
  if (type === "unlike") {
    return <FaHeartBroken className="h-5 w-5" aria-hidden="true" />;
  }
  if (type === "match") {
    return (
      <span className="relative inline-flex h-5 w-6 items-center justify-center" aria-hidden="true">
        <FaHeart className="absolute left-0 h-4 w-4" />
        <FaHeart className="absolute right-0 h-4 w-4" />
      </span>
    );
  }

  return <FaHeart className="h-5 w-5" aria-hidden="true" />;
}

function getGroupAccentClass(type) {
  if (type === "profile_view") {
    return "bg-blue-100 text-blue-700";
  }
  if (type === "like_received") {
    return "bg-orange-100 text-orange-700";
  }
  if (type === "unlike") {
    return "bg-slate-200 text-slate-700";
  }
  if (type === "match") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getGroupBorderClass(type) {
  if (type === "profile_view") {
    return "border-blue-200";
  }
  if (type === "like_received") {
    return "border-orange-200";
  }
  if (type === "unlike") {
    return "border-slate-300";
  }
  if (type === "match") {
    return "border-red-200";
  }

  return "border-slate-200";
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
    notificationGroups,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissingGroups, setDismissingGroups] = useState([]);
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
  }, [open, unreadCount, markAllAsRead]);

  function handleGotItClick() {
    if (unreadCount > 0) {
      void markAllAsRead();
    }
    setOpen(false);
  }

  function handleBellClick() {
    setOpen((prev) => !prev);
  }

  async function handleGroupClick(group) {
    const relatedUnreadNotifications = notifications.filter(
      (item) => !item.is_read && item.type === group.type,
    );

    setDismissingGroups((prev) =>
      prev.includes(group.type) ? prev : [...prev, group.type],
    );

    if (relatedUnreadNotifications.length > 0) {
      await Promise.all(
        relatedUnreadNotifications.map((item) => markNotificationAsRead(item.id)),
      );
    }

    window.setTimeout(() => {
      setDismissingGroups((prev) => prev.filter((type) => type !== group.type));
    }, 180);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleBellClick}
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
                onClick={handleGotItClick}
              >
                Got it
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
                  onClick={() => void handleGroupClick(group)}
                  className="w-full text-left"
                >
                  <div
                    className={`flex items-center gap-3 rounded-2xl border bg-slate-50 p-3 transition duration-200 hover:bg-white ${getGroupBorderClass(group.type)} ${dismissingGroups.includes(group.type) ? "translate-x-5 opacity-0 scale-95" : "hover:border-slate-300"}`}
                  >
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-lg font-semibold ${getGroupAccentClass(group.type)}`}>
                      <GroupTypeIcon type={group.type} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{group.primaryActor}</span>{" "}
                        {createCardMessage(group.primaryActor, group.verb, group.count)}
                      </p>
                      {group.latestAt && (
                        <p className="mt-1 text-[11px] text-slate-400">{formatNotificationDateTime(group.latestAt)}</p>
                      )}
                    </div>
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

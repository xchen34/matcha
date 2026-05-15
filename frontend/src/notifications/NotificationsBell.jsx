import { useEffect, useRef, useState } from "react";
import { sanitizeText } from "@/utils/xssEscape.js";
import { useNotifications } from "./hooks/useNotifications.js";
import { 
  createCardMessage, 
  formatNotificationDateTime,
} from "./utils/notificationFormatters.js";
import { 
  GroupTypeIcon,
  getGroupAccentClass,
  getGroupBorderClass,
} from "./components/notificationGroupUI.jsx";
import { BellRing, Check, Bell, LoaderCircle } from "lucide-react"
import { notificationBadgeClass } from "@/styles/UIClasses.jsx";

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

  /* ========== Auto-refresh when opening ========== */
  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  /* ========== Close on outside click ========== */
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

  /* ========== Mark all as read ========== */
  function handleGotItClick() {
    if (unreadCount > 0) {
      void markAllAsRead();
    }
    setOpen(false);
  }

  /* ========== Toggle bell click ========== */
  function handleBellClick() {
    setOpen((prev) => !prev);
  }

  /* ========== Handle group click ========== */
  async function handleGroupClick(group) {
    const relatedUnreadNotifications = notifications.filter(
      (item) => 
        !item.is_read && 
        item.type === group.type,
    );

    setDismissingGroups((prev) =>
      prev.includes(group.type) 
      ? prev 
      : [...prev, group.type],
    );

    if (relatedUnreadNotifications.length > 0) {
      await Promise.all(
        relatedUnreadNotifications.map((item) => 
          markNotificationAsRead(item.id)),
      );
    }

    window.setTimeout(() => {
      setDismissingGroups((prev) => 
        prev.filter((type) => type !== group.type),
      );
    }, 180);
  }

  return (
    <div ref={rootRef} className="relative">
     {/* ========== Bell Button ========== */}
     <button
        type="button"
        onClick={handleBellClick}
        disabled={!isAuthenticated}
        aria-label="Ouvrir les notifications"
        title="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition enabled:hover:-translate-y-0.5 enabled:hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        <BellRing
          size={22}
          className="hover:animate-[bellSwing_0.4s_ease-in-out]"
        />

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className={notificationBadgeClass}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ========== Dropdown ========== */}
      {open && (
        <div className="fixed left-2 right-2 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto max-w-[98vw] sm:w-[340px]">
          <div className="mb-2 flex items-center justify-between">
            {/* Header */}
            <h3 className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-dark">
              <Bell size={13} aria-hidden="true" />
              <span>Notifications</span>
            </h3>

            {/* Mark all as read button */}
            {notifications.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-neutral-dark"
                onClick={handleGotItClick}
              >
                <Check size={12} aria-hidden="true" />
                Got it
              </button>
            )}
          </div>

          {/* Loading indicator */}
          {loading && (
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
              Loading...
            </p>
          )}
          
          {/* Error message */}
          {!loading && error && <p className="text-xs text-red-600">{error}</p>}

          {/* Empty state */}
          {!loading && notificationGroups.length === 0 && (
            <p className="text-xs text-slate-500">No notifications yet.</p>
          )}

          {/* Notification groups */}
          {!loading && notificationGroups.length > 0 && (
            <div className="space-y-2">
              {notificationGroups.map((group) => (
                <button
                  key={group.type}
                  type="button"
                  onClick={() => void handleGroupClick(group)}
                  className="w-full text-left"
                >
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border bg-slate-50 p-3 transition duration-200 hover:bg-white ${getGroupBorderClass(group.type)} ${dismissingGroups.includes(group.type) ? "translate-x-5 opacity-0 scale-95" : "hover:border-primary-medium"}`}>
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-lg font-semibold mx-auto sm:mx-0 ${getGroupAccentClass(group.type)}`} >
                      <GroupTypeIcon type={group.type} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm text-slate-700 text-center sm:text-left">
                        <span className="font-semibold text-neutral-dark">{sanitizeText(group.primaryActor)}</span>{" "}
                        {createCardMessage(group.primaryActor, group.verb, group.count)}
                      </p>

                      {group.latestAt && (
                        <p className="mt-1 text-center text-[11px] text-slate-400 sm:text-left">{formatNotificationDateTime(group.latestAt)}</p>
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

import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildApiHeaders } from "@/utils/utils.js";
import { cardClass } from "@/styles/UIClasses.jsx";
import { LoaderCircle } from "lucide-react";
import { User, Ban } from "lucide-react";

function BlockedUsers({ currentUser }) {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  /* ============= Fetch blocked users ============= */
  useEffect(() => {
    let cancelled = false;

    async function fetchBlockedUsers() {
      if (!currentUser) return;

      setLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/moderation/blocked-users", 
          {
            headers: buildApiHeaders(currentUser),
          }
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (!cancelled) {
            setBlockedUsers([]);
            setMessage(payload.error || "Failed to load blocked users.");
          }
          return;
        }

        if (!cancelled) {
          setBlockedUsers(Array.isArray(payload.users) ? payload.users : []);
        }
      } catch {
        if (!cancelled) {
          setBlockedUsers([]);
          setMessage("Failed to load blocked users.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBlockedUsers();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  /* ============= Unblock user ============= */
  async function handleUnblockUser(userId) {
    if (!currentUser) return;

    try {
      const response = await fetch(`/api/users/${userId}/block`, {
        method: "DELETE",
        headers: buildApiHeaders(currentUser),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(payload.error || "Failed to unblock user.");
        return;
      }

      setBlockedUsers((prev) =>
        prev.filter((user) => String(user.id) !== String(userId)),
      );
      setMessage("User unblocked successfully.");
    } catch {
      setMessage("Failed to unblock user.");
    }
  }

  /* ============= Redirect if not logged in ============= */
  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className={`${cardClass} w-full`}>
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-neutral-dark">Blocked users</h2>
      </div>

      <p className="text-sm text-slate-500">
        Manage users you blocked. You can unblock them at any time.
      </p>

      {/* Message status */}
      {message && <p className="text-sm text-slate-700">{message}</p>}

      {/* Blocked users list */}
      <div className="min-h-[120px] w-full">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            Loading blocked users...
          </p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.length === 0 && (
              <div className="rounded-xl border border-dashed border-primary-medium bg-slate-50 px-4 py-5 text-center text-slate-600">
                No blocked users.
              </div>
            )}

            {blockedUsers.map((user) => (
              <div
                key={user.id}
                className="
                  relative flex items-center justify-between
                  rounded-2xl bg-white px-4 py-3
                  border border-slate-200/70 shadow-sm
                  transition-all duration-200
                  hover:shadow-md hover:-translate-y-0.5   
                "
              >
                {/* User info */}
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-dark truncate">@{user.username}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="inline-flex items-center justify-center rounded-full border border-primary-medium bg-white px-2 sm:px-3 py-1.5 text-xs font-semibold text-primary-dark hover:scale-105 hover:bg-primary-light transition duration-150"
                  >
                    <User size={16} aria-hidden="true" />
                    <span className="ml-1 sm:hidden">View</span>
                    <span className="ml-1 hidden sm:inline">View profile</span>
                  </button>

                  {/* Unblock button */}
                  <button
                    type="button"
                    onClick={() => handleUnblockUser(user.id)}
                    className="inline-flex items-center justify-center rounded-full border border-primary-dark bg-primary-dark px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark-deep disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Ban size={14} aria-hidden="true" />
                    <span className="ml-1 sm:hidden">Unblock</span>
                    <span className="ml-1 hidden sm:inline">Unblock user</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BlockedUsers;
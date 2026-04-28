import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function BlockedUsersPage({ currentUser }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchBlockedUsers() {
      if (!currentUser) return;
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch("/api/moderation/blocked-users", {
          headers: buildApiHeaders(currentUser),
        });
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

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading blocked users...</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Safety
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Blocked users</h2>
      </div>

      <p className="text-sm text-slate-500">
        Manage users you blocked. You can unblock them at any time.
      </p>

      {message && <p className="text-sm text-slate-700">{message}</p>}

      <div className="space-y-2">
        {blockedUsers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-slate-600">
            No blocked users.
          </div>
        )}

        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div>
              <p className="font-semibold text-slate-900">@{user.username}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => handleUnblockUser(user.id)}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BlockedUsersPage;

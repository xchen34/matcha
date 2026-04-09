import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

const MODE_CONFIG = {
  views: {
    title: "Who viewed me",
    subtitle: "People who opened your profile.",
    endpoint: "/api/profile/views",
    emptyText: "No views yet.",
    helperText: "Viewed your profile",
  },
  likes: {
    title: "Who liked me",
    subtitle: "People who liked your profile.",
    endpoint: "/api/profile/likes",
    emptyText: "No likes yet.",
    helperText: "Liked your profile",
  },
  matches: {
    title: "Who matched with me",
    subtitle: "People who liked you back.",
    endpoint: "/api/profile/matches",
    emptyText: "No matches yet.",
    helperText: "Mutual like",
  },
};

function PopularityListPage({ currentUser, mode = "views" }) {
  const ROLLING_THRESHOLD = 8;
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ views: 0, likes: 0, matches: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const config = useMemo(() => MODE_CONFIG[mode] || MODE_CONFIG.views, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLists() {
      if (!currentUser) return;
      setLoading(true);
      setError("");

      try {
        const [viewsRes, likesRes, matchesRes] = await Promise.all([
          fetch(MODE_CONFIG.views.endpoint, {
            headers: buildApiHeaders(currentUser),
          }),
          fetch(MODE_CONFIG.likes.endpoint, {
            headers: buildApiHeaders(currentUser),
          }),
          fetch(MODE_CONFIG.matches.endpoint, {
            headers: buildApiHeaders(currentUser),
          }),
        ]);

        const [viewsPayload, likesPayload, matchesPayload] = await Promise.all([
          viewsRes.json().catch(() => ({})),
          likesRes.json().catch(() => ({})),
          matchesRes.json().catch(() => ({})),
        ]);

        if (!viewsRes.ok || !likesRes.ok || !matchesRes.ok) {
          if (!cancelled) {
            setUsers([]);
            setError("Failed to load data.");
          }
          return;
        }

        if (!cancelled) {
          const viewsUsers = Array.isArray(viewsPayload.users)
            ? viewsPayload.users
            : [];
          const likesUsers = Array.isArray(likesPayload.users)
            ? likesPayload.users
            : [];
          const matchesUsers = Array.isArray(matchesPayload.users)
            ? matchesPayload.users
            : [];

          setCounts({
            views: viewsUsers.length,
            likes: likesUsers.length,
            matches: matchesUsers.length,
          });

          if (mode === "likes") {
            setUsers(likesUsers);
          } else if (mode === "matches") {
            setUsers(matchesUsers);
          } else {
            setUsers(viewsUsers);
          }
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setCounts({ views: 0, likes: 0, matches: 0 });
          setError("Failed to load data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLists();

    return () => {
      cancelled = true;
    };
  }, [currentUser, mode]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Popularity
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">{config.title}</h2>
        <p className="text-sm text-slate-500">{config.subtitle}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm w-full">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {mode === "views" && "My total views"}
          {mode === "likes" && "My total likes"}
          {mode === "matches" && "My total matches"}
        </p>
        <p className="mt-2 text-3xl font-bold">
          {mode === "views" && counts.views}
          {mode === "likes" && counts.likes}
          {mode === "matches" && counts.matches}
        </p>
      </div>

      <div className="space-y-2">
        {users.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-slate-600">
            {config.emptyText}
          </div>
        )}

        {mode === "views" && users.length > ROLLING_THRESHOLD ? (
          <div className="popularity-rolling-shell">
            <div className="popularity-rolling-track">
              {[...users, ...users].map((user, index) => (
                <div
                  key={`${user.id}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">@{user.username}</p>
                    <p className="text-xs text-slate-500">{config.helperText}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/users/${user.id}`)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    View profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={`${user.id}-${user.created_at ?? user.matched_at ?? mode}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-900">@{user.username}</p>
                <p className="text-xs text-slate-500">{config.helperText}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/users/${user.id}`)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                View profile
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default PopularityListPage;

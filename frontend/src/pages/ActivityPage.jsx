import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function ActivityPage({ currentUser }) {
  const [tab, setTab] = useState("views");
  const [viewsList, setViewsList] = useState([]);
  const [likesList, setLikesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchViews() {
      setLoading(true);
      try {
        const response = await fetch("/api/profile/views", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (response.ok) {
          setViewsList(Array.isArray(data.users) ? data.users : []);
        }
      } catch {
        setViewsList([]);
      } finally {
        setLoading(false);
      }
    }

    async function fetchLikes() {
      setLoading(true);
      try {
        const response = await fetch("/api/profile/likes", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (response.ok) {
          setLikesList(Array.isArray(data.users) ? data.users : []);
        }
      } catch {
        setLikesList([]);
      } finally {
        setLoading(false);
      }
    }

    if (tab === "views") fetchViews();
    if (tab === "likes") fetchLikes();
  }, [currentUser, tab]);

  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Activity
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Views and likes</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "views", label: "Who viewed me" },
          { key: "likes", label: "Who liked me" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              tab === item.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700">
        {loading && <p className="text-slate-500">Loading...</p>}

        {!loading && tab === "views" && (
          <div className="space-y-2">
            {viewsList.length === 0 && <p className="text-slate-500">No views yet.</p>}
            {viewsList.map((user) => (
              <div key={`${user.id}-${user.created_at ?? "view"}`} className="flex items-center justify-between">
                <span>@{user.username}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "likes" && (
          <div className="space-y-2">
            {likesList.length === 0 && <p className="text-slate-500">No likes yet.</p>}
            {likesList.map((user) => (
              <div key={`${user.id}-${user.created_at ?? "like"}`} className="flex items-center justify-between">
                <span>@{user.username}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ActivityPage;

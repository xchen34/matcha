import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaFire } from "react-icons/fa";
import { buildApiHeaders } from "../utils.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function MyPopularityPage({ currentUser }) {
  const [fameRating, setFameRating] = useState(0);
  const [viewsList, setViewsList] = useState([]);
  const [likesList, setLikesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchPopularity() {
      if (!currentUser) return;
      setLoading(true);
      setError("");

      try {
        const [viewsRes, likesRes, meRes] = await Promise.all([
          fetch("/api/profile/views", { headers: buildApiHeaders(currentUser) }),
          fetch("/api/profile/likes", { headers: buildApiHeaders(currentUser) }),
          fetch("/api/profile/me", { headers: buildApiHeaders(currentUser) }),
        ]);

        const [viewsData, likesData, meData] = await Promise.all([
          viewsRes.json().catch(() => ({})),
          likesRes.json().catch(() => ({})),
          meRes.json().catch(() => ({})),
        ]);

        if (cancelled) return;

        setViewsList(viewsRes.ok && Array.isArray(viewsData.users) ? viewsData.users : []);
        setLikesList(likesRes.ok && Array.isArray(likesData.users) ? likesData.users : []);
        setFameRating(Number(meData.profile?.fame_rating || 0));
      } catch {
        if (!cancelled) {
          setError("Failed to load popularity data");
          setViewsList([]);
          setLikesList([]);
          setFameRating(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPopularity();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading popularity...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Popularity
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">My popularity</h2>
        <p className="text-sm text-slate-500">Who viewed me and who liked me</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-brand-deep text-white shadow-md shadow-orange-200/60">
            <FaFire size={22} />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Fame note
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{fameRating}</p>
            <p className="text-xs text-slate-500">hot score (recent activity)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Who viewed me
          </p>
          <p className="mt-2 text-3xl font-bold">{viewsList.length}</p>
          <p className="text-xs text-white/70">people have opened your profile</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-brand-deep p-4 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Who liked me
          </p>
          <p className="mt-2 text-3xl font-bold">{likesList.length}</p>
          <p className="text-xs text-white/80">users liked your profile</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Who viewed me
              </p>
              <p className="mt-2 text-sm text-white/80">Latest profile visitors</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {viewsList.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {viewsList.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-white/70">
                No views yet.
              </div>
            )}
            {viewsList.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/70">Viewed your profile</p>
                </div>
                <span className="text-xs text-white/70">{user.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand via-brand/90 to-brand-deep p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Who liked me
              </p>
              <p className="mt-2 text-sm text-white/85">People who liked your profile</p>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {likesList.length}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {likesList.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-center text-white/70">
                No likes yet.
              </div>
            )}
            {likesList.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur"
              >
                <div>
                  <p className="font-semibold text-white">@{user.username}</p>
                  <p className="text-xs text-white/70">Liked your profile</p>
                </div>
                <span className="text-xs text-white/70">{user.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MyPopularityPage;

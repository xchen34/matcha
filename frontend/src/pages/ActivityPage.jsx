import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";
import { useNotifications } from "../notifications/useNotifications.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function ActivityPage({ currentUser }) {
  const [tab, setTab] = useState("views");
  const [viewsList, setViewsList] = useState([]);
  const [likesList, setLikesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const scrollTargetRef = useRef(null);
  const {
    sectionBadges = { views: false, likes: false },
    unreadUsersBySection = {},
  } = useNotifications();

  const normalizedUnreadSets = useMemo(
    () => ({
      views: unreadUsersBySection.views instanceof Set ? unreadUsersBySection.views : new Set(),
      likes: unreadUsersBySection.likes instanceof Set ? unreadUsersBySection.likes : new Set(),
    }),
    [unreadUsersBySection],
  );

  const hasUserNewActivity = (section, userId) => {
    const set = normalizedUnreadSets[section];
    if (!set) return false;
    return set.has(String(userId));
  };

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

  useEffect(() => {
    const hashTarget = location.hash.replace("#", "");
    const stateTarget = location.state?.scrollTo;
    const target = stateTarget || hashTarget;
    if (target !== "views" && target !== "likes") return;

    if (scrollTargetRef.current === target) return;
    scrollTargetRef.current = target;
    setTab(target);

    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(`activity-section-${target}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (stateTarget) {
        const cleanUrl = `${window.location.pathname}${window.location.search}#${target}`;
        window.history.replaceState({}, "", cleanUrl);
      }
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.hash, location.state]);

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
            <span className="inline-flex items-center gap-1">
              {item.label}
              {sectionBadges[item.key] && (
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700">
        {loading && <p className="text-slate-500">Loading...</p>}

        {!loading && tab === "views" && (
          <div
            id="activity-section-views"
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Who viewed me
              </p>
              {sectionBadges.views && (
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </div>
            {viewsList.length === 0 && <p className="text-slate-500">No views yet.</p>}
            {viewsList.map((user) => (
              <div
                key={`${user.id}-${user.created_at ?? "view"}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1">
                  <span>@{user.username}</span>
                  {hasUserNewActivity("views", user.id) && (
                    <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New viewer" />
                  )}
                </div>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "likes" && (
          <div
            id="activity-section-likes"
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Who liked me
              </p>
              {sectionBadges.likes && (
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </div>
            {likesList.length === 0 && <p className="text-slate-500">No likes yet.</p>}
            {likesList.map((user) => (
              <div
                key={`${user.id}-${user.created_at ?? "like"}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1">
                  <span>@{user.username}</span>
                  {hasUserNewActivity("likes", user.id) && (
                    <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New liker" />
                  )}
                </div>
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

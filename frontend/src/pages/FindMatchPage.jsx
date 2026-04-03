// Moved to pages/FindMatchPage.jsx
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import UserCard from "../components/UserCard.jsx";
import { buildApiHeaders } from "../utils.js";

const PAGE_SIZE = 20;

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function FindMatchPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [insightsTab, setInsightsTab] = useState("fame");
  const [viewsList, setViewsList] = useState([]);
  const [likesList, setLikesList] = useState([]);
  const [fameRating, setFameRating] = useState(0);
  const [draftFilters, setDraftFilters] = useState({
    q: "",
    min_age: "",
    max_age: "",
    min_fame: "",
    max_fame: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    q: "",
    min_age: "",
    max_age: "",
    min_fame: "",
    max_fame: "",
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchMatches = useCallback(async (options = {}) => {
    const { append = false, requestOffset = 0 } = options;
    if (!currentUser) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) {
          params.append(key, val);
        }
      });
      params.append("limit", String(PAGE_SIZE));
      params.append("offset", String(requestOffset));

      const qs = params.toString();
      const url = qs ? `/api/matches?${qs}` : "/api/matches";
      const response = await fetch(url, {
        headers: buildApiHeaders(currentUser),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setHasMore(data.length === PAGE_SIZE);
        setUsers((prev) => (append ? [...prev, ...data] : data));
        setOffset(requestOffset + data.length);
      } else {
        setUsers([]);
        setOffset(0);
        setHasMore(false);
        setError("No matches found.");
      }
    } catch {
      setError("Failed to load matches");
      if (!options.append) {
        setUsers([]);
        setOffset(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser, appliedFilters]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    async function fetchViews() {
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
      }
    }

    async function fetchLikes() {
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
      }
    }

    async function fetchFame() {
      try {
        const response = await fetch("/api/profile/me", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (response.ok) {
          setFameRating(Number(data.profile?.fame_rating || 0));
        }
      } catch {
        setFameRating(0);
      }
    }

    if (!currentUser) return;
    if (insightsTab === "views") fetchViews();
    if (insightsTab === "likes") fetchLikes();
    if (insightsTab === "fame") fetchFame();
  }, [currentUser, insightsTab]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setOffset(0);
  }

  function resetFilters() {
    const empty = { q: "", min_age: "", max_age: "", min_fame: "", max_fame: "" };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setOffset(0);
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading matches...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Discover
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Find your match</h2>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {["fame", "views", "likes"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setInsightsTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                insightsTab === tab
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              {tab === "fame" ? "Fame rating" : tab === "views" ? "Who viewed me" : "Who liked me"}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-700">
          {insightsTab === "fame" && (
            <div className="flex items-center justify-between">
              <span>Fame rating</span>
              <span className="font-semibold text-slate-900">{fameRating}</span>
            </div>
          )}
          {insightsTab === "views" && (
            <div className="space-y-2">
              {viewsList.length === 0 && <p className="text-slate-500">No views yet.</p>}
              {viewsList.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <span>@{user.username}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              ))}
            </div>
          )}
          {insightsTab === "likes" && (
            <div className="space-y-2">
              {likesList.length === 0 && <p className="text-slate-500">No likes yet.</p>}
              {likesList.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <span>@{user.username}</span>
                  <span className="text-xs text-slate-500">{user.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-500">Search username</label>
          <input
            type="text"
            name="q"
            value={draftFilters.q}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Search by username"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Min age</label>
          <input
            type="number"
            name="min_age"
            value={draftFilters.min_age}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="e.g. 18"
            min="0"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Max age</label>
          <input
            type="number"
            name="max_age"
            value={draftFilters.max_age}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="e.g. 40"
            min="0"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Min fame</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            name="min_fame"
            value={draftFilters.min_fame}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="0 - 100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Max fame</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            name="max_fame"
            value={draftFilters.max_fame}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="0 - 100"
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:-translate-y-0.5 transition"
        >
          Search
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(!Array.isArray(users) || users.length === 0) && <p>No users found.</p>}
        {Array.isArray(users) &&
          users.map((user) => (
            <UserCard key={user.id} user={user} currentUser={currentUser} />
          ))}
      </div>

      {hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => fetchMatches({ append: true, requestOffset: offset })}
            disabled={loadingMore}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}

export default FindMatchPage;

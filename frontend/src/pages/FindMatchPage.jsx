// Moved to pages/FindMatchPage.jsx
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaFire } from "react-icons/fa";
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
  const [fameRating, setFameRating] = useState(0);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    username: "",
    min_age: "",
    max_age: "",
    min_fame: "",
    max_fame: "",
    city: "",
    tags: [],
    sort_by: "",
    sort_dir: "desc",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    username: "",
    min_age: "",
    max_age: "",
    min_fame: "",
    max_fame: "",
    city: "",
    tags: [],
    sort_by: "",
    sort_dir: "desc",
  });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchMatches = useCallback(async (options = {}) => {
    const { append = false, requestOffset = 0, silent = false } = options;
    if (!currentUser) return;
    if (append) {
      setLoadingMore(true);
    } else if (!silent) {
      setLoading(true);
    }
    if (!silent) {
      setError("");
    }

    try {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          if (val.length > 0) {
            params.append(key, val.join(","));
          }
          return;
        }
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
      if (!silent) {
        setError("Failed to load matches");
      }
      if (!options.append) {
        setUsers([]);
        setOffset(0);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  }, [currentUser, appliedFilters]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!currentUser) return undefined;

    const intervalId = setInterval(() => {
      fetchMatches({ requestOffset: 0, silent: true });
    }, 15000);

    return () => clearInterval(intervalId);
  }, [currentUser, fetchMatches]);

  useEffect(() => {
    async function fetchFame() {
      try {
        const response = await fetch("/api/profile/me", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (response.ok) {
          setFameRating(Number(data.profile?.fame_rating || 0));
          const photos = Array.isArray(data.profile?.photos)
            ? data.profile.photos
            : [];
          setCanLikeProfiles(photos.some((photo) => photo.is_primary));
        }
      } catch {
        setFameRating(0);
        setCanLikeProfiles(false);
      }
    }

    if (!currentUser) return;
    fetchFame();
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTagOptions() {
      if (!currentUser) return;

      try {
        const response = await fetch("/api/profile/tags?limit=40", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }
        const tags = Array.isArray(data?.tags)
          ? data.tags.map((item) => item.name).filter(Boolean)
          : [];
        setTagOptions(tags);
      } catch {
        if (!cancelled) {
          setTagOptions([]);
        }
      }
    }

    fetchTagOptions();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCitySuggestions() {
      if (!currentUser) return;
      if (cityConfirmed) return;

      const query = draftFilters.city.trim();
      if (query.length < 2) {
        setCitySuggestions([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("query", query);
        params.set("limit", "8");
        const response = await fetch(
          `/api/profile/city-suggestions?${params.toString()}`,
          {
            headers: buildApiHeaders(currentUser),
          },
        );
        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setCitySuggestions(
          Array.isArray(data?.suggestions)
            ? data.suggestions.map((item) => ({
                city: item.city,
                label: item.display_name || item.city,
              }))
            : [],
        );
      } catch {
        if (!cancelled) {
          setCitySuggestions([]);
        }
      }
    }

    const timeoutId = setTimeout(fetchCitySuggestions, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [currentUser, draftFilters.city, cityConfirmed]);

  function handleFilterChange(e) {
    const { name, value } = e.target;

    if (name === "city") {
      setDraftFilters((prev) => ({ ...prev, city: value }));
      setCityConfirmed(false);
      return;
    }

    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  }

  function toggleTag(tagName) {
    setDraftFilters((prev) => {
      const exists = prev.tags.includes(tagName);
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter((tag) => tag !== tagName)
          : [...prev.tags, tagName],
      };
    });
  }

  function applyCitySuggestion(city) {
    setDraftFilters((prev) => ({ ...prev, city }));
    setCityConfirmed(true);
    setCitySuggestions([]);
  }

  async function applyFilters() {
    const city = draftFilters.city.trim();
    if (city) {
      if (!currentUser) return;

      if (!cityConfirmed) {
        try {
          const params = new URLSearchParams();
          params.set("city", city);
          params.set("limit", "5");

          const response = await fetch(
            `/api/profile/validate-location?${params.toString()}`,
            {
              headers: buildApiHeaders(currentUser),
            },
          );
          const data = await response.json();
          if (!response.ok || !data?.validation?.city_exists) {
            setError("Please select a valid city suggestion before searching.");
            return;
          }

          const normalizedCity =
            data?.matched_suggestion?.city || data?.suggestions?.[0]?.city || city;
          setDraftFilters((prev) => ({ ...prev, city: normalizedCity }));
          setAppliedFilters((prev) => ({
            ...prev,
            ...draftFilters,
            city: normalizedCity,
          }));
          setCityConfirmed(true);
          setCitySuggestions([]);
          setOffset(0);
          return;
        } catch {
          setError("Failed to validate city. Please try again.");
          return;
        }
      }
    }

    setAppliedFilters(draftFilters);
    setOffset(0);
  }

  function resetFilters() {
    const empty = {
      username: "",
      min_age: "",
      max_age: "",
      min_fame: "",
      max_fame: "",
      city: "",
      tags: [],
      sort_by: "",
      sort_dir: "desc",
    };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setCityConfirmed(false);
    setCitySuggestions([]);
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
        <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
        {!canLikeProfiles && (
          <p className="text-xs text-amber-700">
            Add a primary profile photo in your profile to enable likes.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-500">Search username</label>
          <input
            type="text"
            name="username"
            value={draftFilters.username}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Search by username"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2 relative">
          <label className="text-xs font-semibold text-slate-500">City</label>
          <input
            type="text"
            name="city"
            value={draftFilters.city}
            onChange={handleFilterChange}
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand ${cityConfirmed ? "border-green-500" : "border-slate-200"}`}
            placeholder="Type and choose a city"
          />
          {cityConfirmed && draftFilters.city.trim() ? (
            <p className="text-[11px] text-green-700">City validated.</p>
          ) : null}
          {!cityConfirmed && citySuggestions.length > 0 ? (
            <div className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {citySuggestions.map((item) => (
                <button
                  key={`${item.city}-${item.label}`}
                  type="button"
                  onClick={() => applyCitySuggestion(item.city)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Sort by</label>
          <select
            name="sort_by"
            value={draftFilters.sort_by}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          >
            <option value="">Suggested</option>
            <option value="age">Age</option>
            <option value="location">Location</option>
            <option value="fame_rating">Fame rating</option>
            <option value="tags">Tags</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Order</label>
          <select
            name="sort_dir"
            value={draftFilters.sort_dir}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-semibold text-slate-500">Interest tags</label>
          <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
            {tagOptions.length === 0 ? (
              <span className="text-xs text-slate-500">No tags available.</span>
            ) : (
              tagOptions.slice(0, 24).map((tagName) => {
                const selected = draftFilters.tags.includes(tagName);
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${selected ? "border-brand bg-brand text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    {tagName}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:-translate-y-0.5 transition"
        >
          Apply filters
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
            <UserCard
              key={user.id}
              user={user}
              currentUser={currentUser}
              canLikeProfiles={canLikeProfiles}
            />
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

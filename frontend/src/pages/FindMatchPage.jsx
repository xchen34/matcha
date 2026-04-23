// Moved to pages/FindMatchPage.jsx
import { useCallback, useEffect, useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { Navigate } from "react-router-dom";
import { FaFire, FaCheck, FaRedo, FaSearch, FaUserFriends, FaFilter, FaSort, FaMapMarkerAlt, FaTag, FaUser, FaStar, FaArrowDown, FaArrowUp } from "react-icons/fa";
import UserCard from "../components/UserCard.jsx";
import { buildApiHeaders } from "../utils.js";
import { onRealtimeEvent } from "../realtime/socket.js";

const PAGE_SIZE = 18;

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

function FindMatchPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [fameRating, setFameRating] = useState(0);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    username: "",
    min_age: 18,
    max_age: 150,
    min_fame: 0,
    max_fame: 100,
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
      }
    } catch {
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
    if (!currentUser?.id) return undefined;

    const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
      const targetUserId = Number(payload?.user_id);
      if (!Number.isInteger(targetUserId)) return;

      setUsers((prev) =>
        prev.map((entry) =>
          Number(entry.id) === targetUserId
            ? {
                ...entry,
                is_online: Boolean(payload.is_online),
                last_seen_at: payload.last_seen_at || entry.last_seen_at,
              }
            : entry,
        ),
      );
    });

    const offNotificationCreated = onRealtimeEvent(
      "notification:created",
      (payload) => {
        const incoming = payload?.notification;
        if (!incoming) return;
        if (Number(incoming.user_id) !== Number(currentUser.id)) return;

        const actorUserId = Number(incoming.actor_user_id);
        if (!Number.isInteger(actorUserId)) return;

        setUsers((prev) =>
          prev.map((entry) => {
            if (Number(entry.id) !== actorUserId) return entry;

            if (incoming.type === "match") {
              return {
                ...entry,
                liked: true,
                is_match: true,
              };
            }

            if (incoming.type === "unlike") {
              return {
                ...entry,
                is_match: false,
              };
            }

            return entry;
          }),
        );
      },
    );

    const offProfileUpdated = onRealtimeEvent("profile:updated", (payload) => {
      const targetUserId = Number(payload?.user_id);
      if (!Number.isInteger(targetUserId)) return;

      const profile = payload?.profile || {};

      setUsers((prev) =>
        prev.map((entry) => {
          if (Number(entry.id) !== targetUserId) return entry;

          return {
            ...entry,
            username:
              typeof profile.username === "string" && profile.username.trim().length > 0
                ? profile.username
                : entry.username,
            gender: profile.gender ?? entry.gender,
            sexual_preference: profile.sexual_preference ?? entry.sexual_preference,
            city: profile.city ?? entry.city,
            neighborhood: profile.neighborhood ?? entry.neighborhood,
            age: profile.age ?? entry.age,
            fame_rating: profile.fame_rating ?? entry.fame_rating,
            tags: Array.isArray(profile.tags) ? profile.tags : entry.tags,
            primary_photo_url:
              profile.primary_photo_url !== undefined
                ? profile.primary_photo_url
                : entry.primary_photo_url,
          };
        }),
      );
    });

    return () => {
      offPresenceUpdate();
      offNotificationCreated();
      offProfileUpdated();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    async function fetchFame() {
      try {
        const response = await fetch("/api/profile/me", {
          headers: buildApiHeaders(currentUser),
        });
        const data = await response.json();
        if (response.ok) {
          setFameRating(Math.floor(Number(data.profile?.fame_rating || 0)));
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
    setFilterError("");

    if (name === "city") {
      setDraftFilters((prev) => ({ ...prev, city: value }));
      setCityConfirmed(false);
      return;
    }

    if (name === "min_fame" || name === "max_fame") {
      if (value === "") {
        setDraftFilters((prev) => ({ ...prev, [name]: "" }));
        return;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return;
      setDraftFilters((prev) => ({ ...prev, [name]: String(parsed) }));
      return;
    }

    setDraftFilters((prev) => ({ ...prev, [name]: value }));
  }

  // Handler for double slider (age)
  function handleAgeSliderChange([min, max]) {
    setDraftFilters((prev) => ({ ...prev, min_age: min, max_age: max }));
  }

  // Handler for double slider (fame)
  function handleFameSliderChange([min, max]) {
    setDraftFilters((prev) => ({ ...prev, min_fame: min, max_fame: max }));
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
    // Validate age range
    const minAge = draftFilters.min_age ? Number(draftFilters.min_age) : null;
    const maxAge = draftFilters.max_age ? Number(draftFilters.max_age) : null;
    
    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      setFilterError("Min age cannot be greater than max age");
      return;
    }
    
    if (minAge !== null && (minAge < 18 || minAge > 150)) {
      setFilterError("Min age must be between 18 and 150");
      return;
    }
    
    if (maxAge !== null && (maxAge < 18 || maxAge > 150)) {
      setFilterError("Max age must be between 18 and 150");
      return;
    }
    
    // Validate fame range
    const minFame = draftFilters.min_fame ? Number(draftFilters.min_fame) : null;
    const maxFame = draftFilters.max_fame ? Number(draftFilters.max_fame) : null;
    
    if (minFame !== null && maxFame !== null && minFame > maxFame) {
      setFilterError("Min fame cannot be greater than max fame");
      return;
    }
    
    if (minFame !== null && (minFame < 0 || minFame > 100)) {
      setFilterError("Min fame must be between 0 and 100");
      return;
    }
    
    if (maxFame !== null && (maxFame < 0 || maxFame > 100)) {
      setFilterError("Max fame must be between 0 and 100");
      return;
    }

    const nextFilters = {
      ...draftFilters,
    };

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
            setFilterError("Please select a valid city suggestion before searching.");
            return;
          }

          const normalizedCity =
            data?.matched_suggestion?.city || data?.suggestions?.[0]?.city || city;
          setDraftFilters((prev) => ({ ...prev, city: normalizedCity }));
          setAppliedFilters((prev) => ({
            ...prev,
            ...nextFilters,
            city: normalizedCity,
          }));
          setCityConfirmed(true);
          setCitySuggestions([]);
          setOffset(0);
          setFilterError("");
          return;
        } catch {
          setFilterError("Failed to validate city. Please try again.");
          return;
        }
      }
    }

    setAppliedFilters(nextFilters);
    setOffset(0);
    setFilterError("");
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

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-1 mb-12">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <FaUserFriends size={22} aria-hidden="true" />
              <span>Find your match</span>
            </h2>

            <p className="text-sm text-slate-500">
              Suggested results are ranked intelligently by compatibility,
              proximity, shared tags, and fame rating.
            </p>

            {!canLikeProfiles && (
              <p className="text-[11px] text-amber-700 leading-snug max-w-md">
                Add a primary profile photo in your profile to enable likes.
              </p>
            )}
          </div>

          <div className="shrink-0">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-brand-deep text-white shadow-md shadow-orange-200/60">
                <FaFire size={16} aria-hidden="true" />
              </div>

              <div className="leading-tight">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>My fame</span>
                </p>

                <p className="text-lg font-bold text-slate-900 leading-none">
                  {fameRating}
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative flex flex-col gap-1 col-span-2 sm:col-span-2 lg:col-span-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FaSearch size={12} aria-hidden="true" />
            <span>Search username</span>
          </label>
          <input
            type="text"
            name="username"
            value={draftFilters.username}
            onChange={handleFilterChange}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Search by username"
          />
        </div>
        
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-2 lg:col-span-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FaMapMarkerAlt size={12} aria-hidden="true" />
            <span>City</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="city"
              value={draftFilters.city}
              onChange={handleFilterChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand ${cityConfirmed ? "border-green-500" : "border-slate-200"}`}
              placeholder="Type and choose a city"
            />
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
          {cityConfirmed && draftFilters.city.trim() ? (
            <p className="text-[11px] text-green-700">City validated.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <FaUser size={12} className="text-slate-500" aria-hidden="true" />
              <span>Age</span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {draftFilters.min_age} – {draftFilters.max_age}
            </span>
          </label>
          <div className="px-2">
            <Slider
              range
              min={18}
              max={150}
              allowCross={false}
              value={[draftFilters.min_age, draftFilters.max_age]}
              onChange={handleAgeSliderChange}
              trackStyle={[
                {
                  backgroundColor: '#f59e42',
                  height: 4,
                  borderRadius: 999,
                },
              ]}
              handleStyle={[
                {
                  borderColor: '#f59e42',
                  backgroundColor: '#fff',
                  height: 14,
                  width: 14,
                  marginTop: -5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                },
                {
                  borderColor: '#f59e42',
                  backgroundColor: '#fff',
                  height: 14,
                  width: 14,
                  marginTop: -5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                },
              ]}
              railStyle={{
                backgroundColor: '#e5e7eb',
                height: 4,
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="flex items-center justify-between text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <FaStar size={12} className="text-slate-500" aria-hidden="true" />
              <span>Popularity</span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {draftFilters.min_fame} – {draftFilters.max_fame}
            </span>
          </label>
          <div className="px-2">
            <Slider
              range
              min={0}
              max={100}
              allowCross={false}
              value={[draftFilters.min_fame, draftFilters.max_fame]}
              onChange={handleFameSliderChange}
              trackStyle={[
                {
                  backgroundColor: '#f59e42',
                  height: 4,
                  borderRadius: 999,
                },
              ]}
              handleStyle={[
                {
                  borderColor: '#f59e42',
                  backgroundColor: '#fff',
                  height: 14,
                  width: 14,
                  marginTop: -5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                },
                {
                  borderColor: '#f59e42',
                  backgroundColor: '#fff',
                  height: 14,
                  width: 14,
                  marginTop: -5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                },
              ]}
              railStyle={{
                backgroundColor: '#e5e7eb',
                height: 4,
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FaSort size={12} className="text-slate-500" aria-hidden="true" />
            <span>Sort by</span>
          </label>
          <div className="relative">
            <select
              name="sort_by"
              value={draftFilters.sort_by}
              onChange={handleFilterChange}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              <option value="">Suggested smart ranking</option>
              <option value="age">Age</option>
              <option value="location">Location</option>
              <option value="fame_rating">Fame rating</option>
              <option value="tags">Tags</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              ▾
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FaArrowDown size={12} className="text-slate-500" aria-hidden="true" />
            <span>Order</span>
          </label>
          <div className="relative">
            <select
              name="sort_dir"
              value={draftFilters.sort_dir}
              onChange={handleFilterChange}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              ▾
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <FaTag size={12} className="text-slate-500" aria-hidden="true" />
            <span>Interest tags</span>
          </label>
          <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/70 backdrop-blur border border-white/50 shadow-sm">
            {tagOptions.length === 0 ? (
              <span className="text-xs text-slate-500">No tags available.</span>
            ) : (
              tagOptions.slice()
              .sort((a, b) => a.localeCompare(b))
              .slice(0, 24)
              .map((tagName) => {
                const selected = draftFilters.tags.includes(tagName);
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-semibold 
                      transition-all duration-200
                      flex items-center gap-1

                      ${selected
                        ? "bg-orange-600 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600"
                      }

                      hover:scale-105 active:scale-95
                    `}
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
          <FaCheck size={12}  aria-hidden="true" />
          <span className="ml-1">
            Apply filters
          </span>
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition"
        >
          <FaRedo size={12}  aria-hidden="true" />
          <span className="ml-1">
            Reset
          </span>
        </button>
      </div>

      {filterError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {filterError}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

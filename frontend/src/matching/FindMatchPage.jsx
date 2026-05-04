import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import UserCard from "../components/UserCard.jsx";
import { buildApiHeaders } from "../utils.js";
import { cardClass } from "../styles/UIClasses.jsx";
import FindMatchHeader from "./components/FindMatchHeader";
import MatchFilters from "./components/MatchFilters.jsx";
import { useMatchFilters } from "./hooks/useMatchFilters.js";
import { useMatches } from "./hooks/useMatches.js";
import { useMatchRealtime } from "./hooks/useMatchRealtime.js";

const PAGE_SIZE = 18;

function FindMatchPage({ currentUser }) {
  const [fameRating, setFameRating] = useState(0);
  const [canLikeProfiles, setCanLikeProfiles] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);

  const {
    draftFilters,
    appliedFilters,
    filterError,
    citySuggestions,
    cityConfirmed,
    handleFilterChange,
    handleAgeSliderChange,
    handleFameSliderChange,
    toggleTag,
    applyCitySuggestion,
    applyFilters: filterApplyFilters,
    resetFilters: filterResetFilters,
  } = useMatchFilters(currentUser);

  const {
    users,
    setUsers,
    loading,
    loadingMore,
    offset,
    hasMore,
    fetchMatches,
    setOffset,
  } = useMatches(currentUser, appliedFilters);

  // Wrap filter functions to reset offset
  const applyFilters = useCallback(async () => {
    await filterApplyFilters();
    setOffset(0);
  }, [filterApplyFilters, setOffset]);

  const resetFilters = useCallback(() => {
    filterResetFilters();
    setOffset(0);
  }, [filterResetFilters, setOffset]);

  useMatchRealtime(currentUser, setUsers);

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

  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading matches...</p>;

  return (
    <section className={cardClass}>
      <FindMatchHeader fameRating={fameRating} canLikeProfiles={canLikeProfiles} />

      <MatchFilters
        draftFilters={draftFilters}
        handleFilterChange={handleFilterChange}
        handleAgeSliderChange={handleAgeSliderChange}
        handleFameSliderChange={handleFameSliderChange}
        cityConfirmed={cityConfirmed}
        citySuggestions={citySuggestions}
        applyCitySuggestion={applyCitySuggestion}
        tagOptions={tagOptions}
        toggleTag={toggleTag}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        filterError={filterError}
      />

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

import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import UserCard from "../components/UserCard.jsx";
import { buildApiHeaders } from "@/utils/utils.js";
import { cardClass } from "../styles/UIClasses.jsx";
import FindMatchHeader from "./components/FindMatchHeader";
import MatchFilters from "./components/MatchFilters.jsx";
import { useMatchFilters } from "./hooks/useMatchFilters.js";
import { useMatches } from "./hooks/useMatches.js";
import { useMatchRealtime } from "./hooks/useMatchRealtime.js";
import { tertiaryButtonClass } from "@/styles/UIClasses.jsx"
import { LoaderCircle } from "lucide-react";

const PAGE_SIZE = 18;

function FindMatchPage({ currentUser }) {
  // Local page state that feeds the header and filtering UI.
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

  // The match list is driven by the currently applied filter snapshot.
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

  // When filters change, restart paging from the first result.
  const applyFilters = useCallback(async () => {
    await filterApplyFilters();
    setOffset(0);
  }, [filterApplyFilters, setOffset]);

  const resetFilters = useCallback(() => {
    filterResetFilters();
    setOffset(0);
  }, [filterResetFilters, setOffset]);

  // Keep the visible user cards in sync with realtime presence/profile updates.
  useMatchRealtime(currentUser, setUsers);

  /* ========== Fetch current user's fame rating ========== */
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

  /* ========== Fetch available tags for filtering ========== */
  useEffect(() => {
    // Tags are loaded independently so the filter panel can stay responsive.
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

  /* ============= Redirect if not logged in ============= */
  if (!currentUser?.id) {
    return <Navigate to="/login" replace />;
  }
  

  return (
    <section className={cardClass}>
      {/* ======== HEADER ======== */}
      <FindMatchHeader fameRating={fameRating} canLikeProfiles={canLikeProfiles} />
      
      {/* ======== FILTERS ======== */}
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

      {/* ======== USERS ======== */}
      <div className="mt-12">
        {loading ? (
          // Initial load state for the first page of matches.
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            Loading matches...
          </p>
        ) : !Array.isArray(users) || users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUser={currentUser}
                canLikeProfiles={canLikeProfiles}
              />
            ))}
          </div>
        )}
      </div>

      {/* ======== LOAD MORE ======== */}
      {hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => fetchMatches({ append: true, requestOffset: offset })}
            disabled={loadingMore}
            className={tertiaryButtonClass}
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-1.5">
                <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                Loading...
              </span>
            ) : (
              "+ Load more"
            )}
          </button>
        </div>
      )}
    </section>
  );
}

export default FindMatchPage;

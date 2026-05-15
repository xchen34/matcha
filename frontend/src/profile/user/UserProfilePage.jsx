import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { cardClass } from "@/styles/UIClasses.jsx";
import { sanitizeText } from "@/utils/xssEscape.js";
import { buildApiHeaders } from "@/utils/utils.js";

import { useUserProfile } from "./hooks/useUserProfile";
import { useUserRelations } from "./hooks/useUserRelations";
import { useUserModeration } from "./hooks/useUserModeration";
import { useUserRealtime } from "./hooks/useUserRealtime";
import { useReportUser } from "./hooks/useReportUser";

import ProfileActions from "./components/ProfileActions.jsx";
import ProfileInfoGrid from "./components/ProfileInfoGrid.jsx";
import ProfileBio from "./components/ProfileBio.jsx";
import ProfileTags from "./components/ProfileTags.jsx";
import { ProfilePhotosGrid } from "@/components/ProfilePhotosGrid.jsx";
import { Flame, ImageIcon, LoaderCircle } from "lucide-react";

function UserProfilePage({ currentUser }) {
  const { id } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const recordedViewsRef = useRef(new Set());

  // DATA
  const { data, loading, error, setData } = useUserProfile(id, currentUser);

  // RELATIONS (likes / match)
  const {
    liked,
    likedByProfile,
    isMatch,
    canLikeProfiles,
    loadingLike,
    likeError,
    toggleLike,
    applyRealtimeRelationUpdate,
  } = useUserRelations(id, currentUser, data);

  // MODERATION (block / report API state)
  const {
    reportedFake,
    blockedUser,
    moderationMessage,
    blocking,
    unblocking,
    blockUser,
    unblockUser,
    setModerationMessage,
  } = useUserModeration(id, currentUser, data);

  // REPORT FORM (UI + submit logic)
  const report = useReportUser({
    id,
    currentUser,
    reportFake: () => {},
    setModerationMessage,
  });

  /* ========== REALTIME : socket events for status / notifications ========== */
  useUserRealtime({
    id,
    currentUser,
    setData,
    onMatchNotification: (evt) => {
      applyRealtimeRelationUpdate?.(evt?.type);
    },
  });

  /* ========== Record profile view ========== */
  useEffect(() => {
    const viewedUserId = Number(id);
    const viewerUserId = Number(currentUser?.id);
    if (!Number.isInteger(viewedUserId) || viewedUserId <= 0) return;
    if (!Number.isInteger(viewerUserId) || viewerUserId <= 0) return;
    if (viewerUserId === viewedUserId) return;

    const dedupeKey = `${viewerUserId}:${viewedUserId}`;
    if (recordedViewsRef.current.has(dedupeKey)) return;
    recordedViewsRef.current.add(dedupeKey);

    void fetch(`/api/users/${viewedUserId}/view`, {
      method: "POST",
      headers: buildApiHeaders(currentUser, {
        "Content-Type": "application/json",
      }),
    }).catch(() => {});
  }, [id, currentUser]);

  // AUTH GUARD & LOADING/ERROR STATES
  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading profile...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { user, profile } = data;
  
  const hasProfilePhoto =
    profile?.photos?.length > 0 ||
    user?.profile_photo_url ||
    user?.avatarUrl ||
    user?.primary_photo_url ||
    user?.photo_url;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const isOwnProfile = String(currentUser?.id) === String(user.id);

  const relationLabel = isMatch
    ? "Match"
    : likedByProfile
    ? "Liked you"
    : liked
    ? "You liked"
    : "Not liked";

  return (
    <section className={cardClass}>
      {/* ========== HEADER ==========*/}
      <div className="space-y-1">
        { /* Alert for missing profile photo */ }
        {!canLikeProfiles && (
          <div className="flex items-center rounded-xl text-primary-dark text-center border border-primary/30 bg-primary-light px-2 py-1 shadow-sm gap-2">
            <ImageIcon size={16} />
            <p className="text-sm">
              You must add a primary profile photo to enable likes.
            </p>
          </div>
        )}
        {!hasProfilePhoto && (
          <div className="flex items-center rounded-xl text-primary-dark text-center border border-primary/30 bg-primary-light px-2 py-1 shadow-sm gap-2">
            <ImageIcon size={16} />
            This user has no profile photo — you cannot like them.
          </div>
        )}

        {/* SECTION LABEL */ }
        <p className="text-xs uppercase tracking-[0.14em] text-primary-dark font-semibold">
          Profile
        </p>

        {/* NAME, USERNAME, ACTIONS */ }
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-dark break-words">
              {fullName || `@${user.username}`}
            </h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </div>

          {!isOwnProfile && (
            <ProfileActions
              user={user}
              profile={profile}
              currentUser={currentUser}
              liked={liked}
              likedByProfile={likedByProfile}
              isMatch={isMatch}
              canLikeProfiles={canLikeProfiles}
              loadingLike={loadingLike}
              likeError={likeError}
              onToggleLike={toggleLike}
              onBlock={blockUser}
              onUnblock={unblockUser}
              onOpenReport={report.openReportForm}
              blockedUser={blockedUser}
              blocking={blocking}
              unblocking={unblocking}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              relationLabel={relationLabel}
            />
          )}
        </div>
      </div>

      {/* REPORT FORM */}
      {report.showReportForm && !isOwnProfile && (
        <form
          onSubmit={report.submitReport}
          className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Reason for reporting
          </label>

          {/* REASON TEXTAREA */ }
          <textarea
            value={report.reportReason}
            onChange={(e) => report.setReportReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-dark focus:outline-none focus:ring-2 focus:ring-brand"
            rows={4}
            maxLength={200}
            placeholder="Explain why this profile looks fake"
          />

          {report.error && (
            <p className="text-sm text-red-600">{report.error}</p>
          )}

          {/* SUBMIT BUTTON */ }
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={report.reporting}
              className="rounded-full bg-primary-dark px-4 py-2 text-xs font-semibold text-white"
            >
              {report.reporting ? (
                <span className="inline-flex items-center gap-1.5">
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  Submitting...
                </span>
              ) : (
                "Submit report"
              )}
            </button>

            <button
              type="button"
              onClick={report.closeReportForm}
              className="rounded-full border px-4 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* MESSAGES */}
      {moderationMessage && (
        <p className="text-sm text-red-600">{moderationMessage}</p>
      )}

      {reportedFake && (
        <p className="text-sm text-primary-dark">
          You already reported this user as fake account.
        </p>
      )}

      {blockedUser && (
        <p className="text-sm text-primary-dark">
          You already blocked this user.
        </p>
      )}

      {/* PHOTOS */}
      {Array.isArray(profile.photos) && profile.photos.length > 0 && (
        <ProfilePhotosGrid photos={profile.photos} />
      )}

      {/* INFO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileInfoGrid
          user={user}
          profile={profile}
          isOwnProfile={isOwnProfile}
        />

        <div className="space-y-3 rounded-xl bg-white/70 p-4">
          <ProfileBio biography={sanitizeText(profile.biography)} />
          <ProfileTags tags={profile.tags} />
        </div>
      </div>

      {/* FAME RATING */}
      <div className="rounded-3xl bg-primary-dark p-6 text-white shadow-md">
        <p className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Flame size={14} />
          Fame rating
        </p>

        {/* FAME RATING VALUE */ }
        <div className="mt-3 text-5xl font-bold">
          {Math.floor(profile.fame_rating ?? 0)}
        </div>

        {/* FAME RATING INFO */ }
        <p className="mt-2 text-xs opacity-70 leading-relaxed">
          Based on likes and profile interactions 
        </p>
      </div>
    </section>
  );
}

export default UserProfilePage;

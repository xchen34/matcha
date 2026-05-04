import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { cardClass } from "@/styles/UIClasses.jsx";
import { sanitizeText } from "@/utils/xssEscape.js";
import { buildApiHeaders } from "@/utils.js";

import { useUserProfile } from "./hooks/useUserProfile";
import { useUserRelations } from "./hooks/useUserRelations";
import { useUserModeration } from "./hooks/useUserModeration";
import { useUserRealtime } from "./hooks/useUserRealtime";
import { useReportUser } from "./hooks/useReportUser";

import ProfileActions from "./components/ProfileActions.jsx";
import ProfileInfoGrid from "./components/ProfileInfoGrid.jsx";
import ProfileBio from "./components/ProfileBio.jsx";
import ProfileTags from "./components/ProfileTags.jsx";
import { ProfilePhotosGrid } from "./components/ProfilePhotosGrid.jsx";

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

  // REALTIME (socket events)
  useUserRealtime({
    id,
    currentUser,
    setData,
    onMatchNotification: (evt) => {
      applyRealtimeRelationUpdate?.(evt?.type);
    },
  });

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

  // AUTH GUARD
  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading profile...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { user, profile } = data;

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
      {/* HEADER */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Profile
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 break-words">
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

          <textarea
            value={report.reportReason}
            onChange={(e) => report.setReportReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            rows={4}
            maxLength={200}
            placeholder="Explain why this profile looks fake"
          />

          {report.error && (
            <p className="text-sm text-red-600">{report.error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={report.reporting}
              className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white"
            >
              {report.reporting ? "Submitting..." : "Submit report"}
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
        <p className="text-sm text-amber-700">
          You already reported this user as fake account.
        </p>
      )}

      {blockedUser && (
        <p className="text-sm text-amber-700">
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
      <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-deep p-5 text-white">
        <p className="text-xs uppercase tracking-widest opacity-80">
          Fame rating
        </p>

        <div className="mt-3 text-5xl font-bold">
          {Math.floor(profile.fame_rating ?? 0)}
        </div>

        <p className="mt-2 text-xs opacity-70">
          This reflects how many users have liked and viewed this profile.
        </p>
      </div>
    </section>
  );
}

export default UserProfilePage;

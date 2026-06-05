import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { cardClass } from "@/styles/UIClasses.jsx";
import { Flame } from "lucide-react";
import { sanitizeText } from "@/utils/xssEscape.js";
import { buildApiHeaders } from "@/utils/utils.js";
import { ProfilePhotosGrid } from "@/components/ProfilePhotosGrid.jsx";
import UserNotFoundPage from "./components/UserNotFoundPage.jsx";

import {
  useUserProfile,
  useUserRelations,
  useUserModeration,
  useUserRealtime,
  useReportUser,
} from "./hooks";

import {
  ProfileActions,
  ProfileInfoGrid,
  ProfileBio,
  ProfileTags,
  ProfileReportForm,
  ProfileAlerts,
} from "./components";

function UserProfilePage({ currentUser }) {
  const { id } = useParams(); // user ID from URL params
  const [menuOpen, setMenuOpen] = useState(false); 
  // Remember which viewer/profile pairs have already been recorded during
  // this session so the same page open does not create duplicate view writes.
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

  // Subscribe to realtime updates for moderation, relation changes, and any
  // profile data that can change while this page is open.
  useUserRealtime({
    id,
    currentUser,
    setData,
    onMatchNotification: (evt) => {
      applyRealtimeRelationUpdate?.(evt?.type);
    },
  });

  // Record one profile view per viewer/profile pair. This avoids sending the
  // same view event repeatedly when the page re-renders.
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

  // Auth guard and early exits keep the rest of the component focused on the
  // profile UI only when the user is allowed to view it.
  if (!currentUser) return <Navigate to="/login" replace />;
  if (loading) return <p className="text-sm text-slate-600">Loading profile...</p>;
  if (error === "User not found") {
    return <UserNotFoundPage currentUser={currentUser} />;
  }
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

  // Human-readable summary of the relation state shown in the profile actions.
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
        <ProfileAlerts
          canLikeProfiles={canLikeProfiles}
          hasProfilePhoto={hasProfilePhoto}
          moderationMessage={moderationMessage}
          reportedFake={reportedFake}
          blockedUser={blockedUser}
        />

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
        <ProfileReportForm report={report} />
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

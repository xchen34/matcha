import { Heart, Zap, BadgeAlert, Ban, BadgeCheck } from "lucide-react";

export default function ProfileActions({
  user,
  profile,
  currentUser,
  isOwnProfile,
  liked,
  likedByProfile,
  isMatch,
  canLikeProfiles,
  loadingLike,
  likeError,
  onToggleLike,
  onBlock,
  onUnblock,
  onOpenReport,
  blockedUser,
  blocking,
  unblocking,
  menuOpen,
  setMenuOpen,
}) {
  const safeSetMenuOpen = typeof setMenuOpen === "function" ? setMenuOpen : () => {};
  const safeOnUnblock = typeof onUnblock === "function" ? onUnblock : () => {};
  const relationLabel = isMatch ? "Match" : likedByProfile ? "Liked you" : liked ? "You liked" : "Not liked";
  const likeTitle =
    !liked && (!canLikeProfiles || !Array.isArray(profile.photos) || !profile.photos.some((photo) => photo.is_primary))
      ? "Add a profile photo for both accounts first"
      : isMatch
        ? "Disconnect"
        : liked
          ? "Unlike"
          : "Like";
  
  return (
    <div className="relative flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end sm:justify-start">
      {/* RELATION STATUS BADGE (MATCHED, LIKED, ETC) */}
      <span
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border transition
          ${
            isMatch
              ? "bg-primary text-white border-primary"
              : likedByProfile
              ? "bg-primary-light text-primary border-primary"
              : liked
              ? "bg-primary-light text-primary border-primary"
              : "bg-white text-neutral border-neutral"
          }
        `}
      >
        {relationLabel}
      </span>

      {/* ACTION BUTTONS (LIKE, BLOCK, REPORT) */}
      <button
        type="button"
        onClick={onToggleLike}
        disabled={
          loadingLike ||
          user.id === currentUser.id ||
          (!liked &&
            (!canLikeProfiles ||
              !Array.isArray(profile.photos) ||
              !profile.photos.some((p) => p.is_primary)))
        }
        aria-label={
          isMatch ? "Disconnect from this profile" : liked ? "Remove like" : "Like this user"
        }
        title={likeTitle}
        className={`
          h-11 w-11 rounded-full flex items-center justify-center
          border shadow-sm transition-all duration-200
          hover:scale-110 active:scale-95
          ${
            isMatch
              ? "bg-primary border-primary"
              : liked
              ? "bg-primary-light border-primary"
              : "bg-white border-neutral hover:border-primary"
          }
        `}
      >
        {isMatch ? (
          <Zap className="text-white fill-white" size={18} />
        ) : liked ? (
          <Heart className="text-primary fill-primary" size={18} />
        ) : (
          <Heart className="text-neutral fill-white" size={18} />
        )}
      </button>
      
      {/* MORE ACTIONS MENU */}
      <button type="button" onClick={() => safeSetMenuOpen((prev) => !prev)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-primary-light" aria-label="Open actions menu">...</button>

      {/* ACTIONS MENU (BLOCK, UNBLOCK, REPORT) */}
      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {/* REPORT BUTTON */}
          <button
            type="button"
            onClick={() => { onOpenReport(); safeSetMenuOpen(false); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-amber-700 text-sm hover:bg-primary-light"
          >
              <BadgeAlert size={14} aria-hidden="true" />
              <span >Report fake account</span>
          </button>

          {/* Only show block/unblock if it's not own profile */}
          {blockedUser ? (
            <button
              type="button"
              onClick={safeOnUnblock}
              disabled={unblocking}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BadgeCheck size={14} aria-hidden="true" />
              {unblocking ? "Unblocking..." : "Unblock user"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBlock}
              disabled={blocking}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Ban size={14} aria-hidden="true" />
              {blocking ? "Blocking..." : "Block user"}
            </button>
          )}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {likeError && <p className="text-sm text-red-600">{likeError}</p>}
    </div>
  );
}
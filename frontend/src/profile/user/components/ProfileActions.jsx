import { FaHeart } from "react-icons/fa";

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
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isMatch ? "bg-red-600 text-white" : likedByProfile ? "bg-pink-100 text-pink-700" : liked ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
        {relationLabel}
      </span>

      <button
        type="button"
        onClick={onToggleLike}
        disabled={
          loadingLike ||
          user.id === currentUser.id ||
          (!liked && (!canLikeProfiles || !Array.isArray(profile.photos) || !profile.photos.some((p)=>p.is_primary)))
        }
        aria-label={isMatch ? "Disconnect from this profile" : liked ? "Remove like" : "Like this user"}
        title={likeTitle}
        className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${isMatch ? "border-red-700 bg-red-600" : liked ? "border-orange-300 bg-gradient-to-br from-orange-500 to-brand-deep" : "border-slate-300 bg-slate-200 text-slate-700"}`}
      >
        {isMatch ? (
          <span className="relative inline-flex h-4 w-5 items-center justify-center">
            <FaHeart size={12} className="absolute left-0 text-white" />
            <FaHeart size={12} className="absolute right-0 text-white" />
          </span>
        ) : (
          <FaHeart color={liked ? "#fff" : "#fff"} size={16} />
        )}
      </button>

      <button type="button" onClick={() => safeSetMenuOpen((prev) => !prev)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Open actions menu">...</button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <button type="button" onClick={() => { onOpenReport(); safeSetMenuOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Report fake account</button>
          {blockedUser ? (
            <button
              type="button"
              onClick={safeOnUnblock}
              disabled={unblocking}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {unblocking ? "Unblocking..." : "Unblock user"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBlock}
              disabled={blocking}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {blocking ? "Blocking..." : "Block user"}
            </button>
          )}
        </div>
      )}

      {likeError && <p className="text-sm text-red-600">{likeError}</p>}
    </div>
  );
}
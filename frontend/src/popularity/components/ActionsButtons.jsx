import { FaUser, FaCommentDots } from "react-icons/fa";

export default function ActionButtons({
  user,
  mode,
  startingChatFor,
  navigate,
  startChatWith,
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(`/users/${user.id}`)}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
      >
        <FaUser size={12} aria-hidden="true" />
        <span className="ml-1">View profile</span>
      </button>
      {mode === "matches" && (
        <button
          type="button"
          onClick={() => startChatWith?.(user.id)}
          disabled={startingChatFor === user.id}
          className="inline-flex items-center justify-center rounded-full border border-brand bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FaCommentDots size={12} />
          <span className="ml-1">
            {startingChatFor === user.id ? "Opening…" : "Chat"}
          </span>
        </button>
      )}
    </div>
  );
}

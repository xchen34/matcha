import { User, MessageSquareHeart } from "lucide-react"

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
        className="inline-flex items-center justify-center rounded-full border border-primary-medium bg-white px-2 sm:px-3 py-1.5 text-xs font-semibold text-primary-dark hover:scale-105 hover:bg-primary-light transition duration-150"
      >
        <User size={16} aria-hidden="true" />
        {/* Mobile */}
        <span className="ml-1 sm:hidden">
          View
          </span>

        {/* Other */}
        <span className="ml-1 hidden sm:inline">
          View profile
        </span>
      </button>
      {mode === "matches" && (
        <button
          type="button"
          onClick={() => startChatWith?.(user.id)}
          disabled={startingChatFor === user.id}
          className="inline-flex items-center justify-center rounded-full border border-primary-dark bg-primary-dark px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <MessageSquareHeart size={16} />
          <span className="ml-1">
            {startingChatFor === user.id ? "Opening…" : "Chat"}
          </span>
        </button>
      )}
    </div>
  );
}

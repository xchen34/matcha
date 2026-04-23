export default function ChatAvatar({
  name,
  photoUrl,
  isOnline = false,
  showPresence = true,
  sizeClass = "h-12 w-12",
  imageClassName = "",
}) {
  const initial = (name || "?").trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-visible ${sizeClass}`}
      aria-label={`${name || "User"} is ${isOnline ? "online" : "offline"}`}
      title={isOnline ? "Online" : "Offline"}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${name || "User"} avatar`}
            className={`h-full w-full object-cover rounded-full ${imageClassName}`}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {showPresence && (
        <span
          className={`absolute bottom-1 right-1 z-10 h-3.5 w-3.5 translate-x-1/4 translate-y-1/4 rounded-full border-2 border-white shadow-sm ${
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
        />
      )}
    </div>
  );
}

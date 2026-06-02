/**
 * 纯展示组件：渲染用户头像 + 在线状态点。
 *
 * Props 字典：
 * - name: string，用户名字（值）
 * - photoUrl: string，头像 URL（值）
 * - isOnline: boolean，是否在线（值）
 * - showPresence: boolean，是否显示在线状态点（值）
 * - sizeClass: string，头像容器尺寸 class（值）
 * - imageClassName: string，额外图片 class（值）
 */
export default function ChatAvatar({
  name,
  photoUrl,
  isOnline = false,
  showPresence = true,
  sizeClass = "h-12 w-12",
  imageClassName = "",
}) {
  // 没有名字时用 ?；有名字时取首字母作为头像占位。
  const initial = (name || "?").trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-visible ${sizeClass}`}
      aria-label={`${name || "User"} is ${isOnline ? "online" : "offline"}`}
      title={isOnline ? "Online" : "Offline"}
    >
      {/* 头像主体：有图显示图；无图显示首字母 */}
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

      {/* 在线状态点（右下角） */}
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

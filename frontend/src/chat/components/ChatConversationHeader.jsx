import { useNavigate } from "react-router-dom";
import ChatAvatar from "./ChatAvatar.jsx";
import { MoveLeft, Trash2 } from "lucide-react";
import { tertiaryButtonClass, deleteButtonClass } from "@/styles/UIClasses.jsx";

/**
 * 聊天详情页顶部：显示对方信息 + 关系状态 + 操作按钮。
 *
 * Props 字典：
 * - conversation: object，会话详情（对方用户、匹配/拉黑状态等）（值）
 * - embedded: boolean，是否是嵌入模式（值）
 * - deletingConversation: boolean，是否正在删除会话（值）
 * - onDelete: function，删除会话回调（函数）
 */
export default function ChatConversationHeader({
  conversation,
  embedded,
  deletingConversation,
  onDelete,
}) {
  const navigate = useNavigate();

  const conversationTitle = conversation?.other_user?.username
    ? `@${conversation.other_user.username}`
    : "?";

  return (
    <header className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3">
      {/* 左侧：头像 + 用户名 + 关系状态 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/users/${conversation?.other_user?.id}`)}
          className="transition-opacity hover:opacity-75"
        >
          <ChatAvatar
            name={conversation?.other_user?.username || "?"}
            photoUrl={conversation?.other_user?.primary_photo_url}
            isOnline={Boolean(conversation?.other_user?.is_online)}
          />
        </button>

        <div>
          <h2
            className="cursor-pointer text-xl font-bold text-neutral-dark transition-colors hover:text-slate-700"
            onClick={() => navigate(`/users/${conversation?.other_user?.id}`)}
          >
            {conversationTitle}
          </h2>

          {conversation?.blocked_by_you ? (
            <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-[1px] text-[11px] font-medium text-red-700">
              Blocked
            </span>
          ) : conversation?.blocked_you ? (
            <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-[1px] text-[11px] font-medium text-red-700">
              Blocked you
            </span>
          ) : conversation?.is_match ? (
            <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-[1px] text-[11px] font-medium text-green-700">
              Matched
            </span>
          ) : (
            <span className="ml-1 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-[1px] text-[11px] font-medium text-yellow-800">
              Unmatched
            </span>
          )}
        </div>
      </div>

      {/* 右侧：返回收件箱 + 删除会话 */}
      <div className="flex items-center gap-2">
        {!embedded && (
          <button
            type="button"
            onClick={() => navigate("/messages")}
            className={`${tertiaryButtonClass} h-8 px-2 text-xs`}
          >
            <MoveLeft size={14} />
            <span className="ml-1 hidden sm:inline">Back to inbox</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={deletingConversation || !conversation?.id}
          className={`${deleteButtonClass} h-8 px-2 text-xs`}
        >
          <Trash2 size={14} />
          <span className="ml-1 sm:hidden">{deletingConversation ? "..." : "Delete"}</span>
          <span className="ml-1 hidden sm:inline">
            {deletingConversation ? "Deleting…" : "Delete chat"}
          </span>
        </button>
      </div>
    </header>
  );
}

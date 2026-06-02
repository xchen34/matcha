import { useNavigate } from "react-router-dom";
import ChatAvatar from "./ChatAvatar.jsx";
import { MoveLeft, Trash2 } from "lucide-react";
import { tertiaryButtonClass, deleteButtonClass } from "@/styles/UIClasses.jsx";
import { toDisplayHandle, toAvatarName } from "../utils/chatIndicatorUtils.js";

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
  const otherUser = conversation?.other_user;
  const isDeleted = Boolean(otherUser?.is_deleted);

  const conversationTitle = toDisplayHandle(otherUser);

  return (
    <header className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3">
      {/* 左侧：头像 + 用户名 + 关系状态 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isDeleted && otherUser?.id) {
              navigate(`/users/${otherUser.id}`);
            }
          }}
          disabled={isDeleted || !otherUser?.id}
          className={`transition-opacity hover:opacity-75 ${isDeleted ? "cursor-default opacity-70 hover:opacity-70" : ""}`}
        >
          <ChatAvatar
            name={toAvatarName(otherUser)}
            photoUrl={otherUser?.primary_photo_url}
            isOnline={Boolean(otherUser?.is_online)}
          />
        </button>

        <div>
          <h2
            className={`text-xl font-bold text-neutral-dark transition-colors ${
              isDeleted ? "cursor-default" : "cursor-pointer hover:text-slate-700"
            }`}
            onClick={() => {
              if (!isDeleted && otherUser?.id) {
                navigate(`/users/${otherUser.id}`);
              }
            }}
          >
            {conversationTitle}
          </h2>

          {isDeleted ? (
            <span className="ml-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-[1px] text-[11px] font-medium text-slate-700">
              Account deleted
            </span>
          ) : conversation?.blocked_by_you ? (
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
